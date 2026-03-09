import os
import time
from contextlib import asynccontextmanager, contextmanager
from typing import Optional
 
import psycopg2
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, auth
 
# --------------------------------------------------
# Load environment variables
# --------------------------------------------------
load_dotenv()
 
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
 
# --------------------------------------------------
# Initialize Firebase Admin
# --------------------------------------------------
if not firebase_admin._apps:
    cred = credentials.Certificate("fyp-54-firebase.json")
    firebase_admin.initialize_app(cred)
 
# --------------------------------------------------
# Cleanup unverified Firebase email/password users
# --------------------------------------------------
def cleanup_unverified_users(max_age_minutes: int = 15):
    now_ms = int(time.time() * 1000)
    max_age_ms = max_age_minutes * 60 * 1000
    deleted_count = 0
 
    page = auth.list_users()
 
    while page:
        for user in page.users:
            provider_ids = [provider.provider_id for provider in user.provider_data]
            created_at_ms = user.user_metadata.creation_timestamp
 
            is_password_user = "password" in provider_ids
            is_unverified = not user.email_verified
            is_old_enough = (now_ms - created_at_ms) > max_age_ms
 
            if is_password_user and is_unverified and is_old_enough:
                try:
                    auth.delete_user(user.uid)
                    deleted_count += 1
                    print(f"Deleted unverified user: {user.email} ({user.uid})")
                except Exception as e:
                    print(f"Failed to delete user {user.uid}: {e}")
 
        page = page.get_next_page()
 
    print(f"Cleanup complete. Deleted {deleted_count} unverified users.")
 
# --------------------------------------------------
# Lifespan
# --------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_unverified_users(max_age_minutes=15)
    yield
 
# --------------------------------------------------
# FastAPI app
# --------------------------------------------------
app = FastAPI(
    title="Secure Web App Backend",
    lifespan=lifespan
)
 
# --------------------------------------------------
# CORS
# --------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://localhost:5500",
        "https://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "https://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://localhost:8000",
        "https://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
# --------------------------------------------------
# Request models
# --------------------------------------------------
class CreateRequestBody(BaseModel):
    content: str
 
# --------------------------------------------------
# Database helpers
# --------------------------------------------------
def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
 
@contextmanager
def get_cursor():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        yield conn, cur
    except Exception:
        if conn:
            conn.rollback()
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
 
# --------------------------------------------------
# Utility helpers
# --------------------------------------------------
def extract_bearer_token(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
 
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
 
    return authorization.replace("Bearer ", "", 1).strip()
 
def summarize_text(text: str, max_length: int = 120) -> str:
    clean = " ".join(text.split())
    if len(clean) <= max_length:
        return clean
    return clean[:max_length].rstrip() + "..."
 
def derive_username(email: Optional[str], provider: str, display_name: Optional[str]) -> str:
    if provider == "google.com" and display_name:
        return display_name.strip()
 
    if email and "@" in email:
        return email.split("@")[0]
 
    if display_name:
        return display_name.strip()
 
    return "user"
 
def verify_and_decode_token(authorization: Optional[str]):
    token = extract_bearer_token(authorization)
 
    try:
        decoded_token = auth.verify_id_token(token, clock_skew_seconds=10)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
 
def upsert_user_from_token(decoded_token, conn, cur):
    firebase_uid = decoded_token["uid"]
    email = decoded_token.get("email")
    display_name = decoded_token.get("name", "")
    email_verified = decoded_token.get("email_verified", False)
 
    firebase_info = decoded_token.get("firebase", {})
    provider = firebase_info.get("sign_in_provider", "unknown")
 
    if provider == "password" and not email_verified:
        raise HTTPException(
            status_code=403,
            detail="Email not verified. Please verify your email before using the app."
        )
 
    username = derive_username(email, provider, display_name)
 
    cur.execute(
        """
        SELECT id, firebase_uid, email, username, provider, display_name, is_blacklisted, blacklisted_at, created_at
        FROM users
        WHERE firebase_uid = %s
        """,
        (firebase_uid,)
    )
    row = cur.fetchone()
 
    if row:
        user_id = row[0]
 
        cur.execute(
            """
            UPDATE users
            SET email = %s,
                username = %s,
                provider = %s,
                display_name = %s
            WHERE id = %s
            """,
            (email, username, provider, display_name, user_id)
        )
 
        cur.execute(
            """
            SELECT id, firebase_uid, email, username, provider, display_name, is_blacklisted, blacklisted_at, created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )
        updated = cur.fetchone()
        return {
            "id": updated[0],
            "firebase_uid": updated[1],
            "email": updated[2],
            "username": updated[3],
            "provider": updated[4],
            "display_name": updated[5],
            "is_blacklisted": updated[6],
            "blacklisted_at": str(updated[7]) if updated[7] else None,
            "created_at": str(updated[8]),
        }
 
    cur.execute(
        """
        INSERT INTO users (firebase_uid, email, username, provider, display_name)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, firebase_uid, email, username, provider, display_name, is_blacklisted, blacklisted_at, created_at
        """,
        (firebase_uid, email, username, provider, display_name)
    )
    inserted = cur.fetchone()
 
    return {
        "id": inserted[0],
        "firebase_uid": inserted[1],
        "email": inserted[2],
        "username": inserted[3],
        "provider": inserted[4],
        "display_name": inserted[5],
        "is_blacklisted": inserted[6],
        "blacklisted_at": str(inserted[7]) if inserted[7] else None,
        "created_at": str(inserted[8]),
    }
 
def ensure_not_blacklisted(user):
    if user["is_blacklisted"]:
        raise HTTPException(
            status_code=403,
            detail="This account is blacklisted because the device was reported lost."
        )
 
# --------------------------------------------------
# Routes
# --------------------------------------------------
@app.get("/")
def home():
    return {"message": "Backend is running"}
 
@app.get("/profile")
def get_profile(authorization: Optional[str] = Header(default=None)):
    decoded_token = verify_and_decode_token(authorization)
 
    try:
        with get_cursor() as (conn, cur):
            user = upsert_user_from_token(decoded_token, conn, cur)
            conn.commit()
 
        return {
            "status": "success",
            "profile": user
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
 
@app.get("/requests")
def get_requests(authorization: Optional[str] = Header(default=None)):
    decoded_token = verify_and_decode_token(authorization)
 
    try:
        with get_cursor() as (conn, cur):
            user = upsert_user_from_token(decoded_token, conn, cur)
            ensure_not_blacklisted(user)
 
            cur.execute(
                """
                SELECT id, content, summary, status, created_at, updated_at
                FROM requests
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (user["id"],)
            )
            rows = cur.fetchall()
            conn.commit()
 
        requests_data = [
            {
                "id": row[0],
                "content": row[1],
                "summary": row[2],
                "status": row[3],
                "created_at": str(row[4]),
                "updated_at": str(row[5]),
            }
            for row in rows
        ]
 
        return {
            "status": "success",
            "requests": requests_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
 
@app.post("/requests")
def create_request(body: CreateRequestBody, authorization: Optional[str] = Header(default=None)):
    decoded_token = verify_and_decode_token(authorization)
 
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Request content cannot be empty")
 
    summary = summarize_text(content)
 
    try:
        with get_cursor() as (conn, cur):
            user = upsert_user_from_token(decoded_token, conn, cur)
            ensure_not_blacklisted(user)
 
            cur.execute(
                """
                INSERT INTO requests (user_id, content, summary, status)
                VALUES (%s, %s, %s, %s)
                RETURNING id, content, summary, status, created_at, updated_at
                """,
                (user["id"], content, summary, "pending")
            )
            row = cur.fetchone()
            conn.commit()
 
        return {
            "status": "success",
            "request": {
                "id": row[0],
                "content": row[1],
                "summary": row[2],
                "status": row[3],
                "created_at": str(row[4]),
                "updated_at": str(row[5]),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
 
@app.post("/lost-phone")
def report_lost_phone(authorization: Optional[str] = Header(default=None)):
    decoded_token = verify_and_decode_token(authorization)
 
    try:
        with get_cursor() as (conn, cur):
            user = upsert_user_from_token(decoded_token, conn, cur)
 
            cur.execute(
                """
                UPDATE users
                SET is_blacklisted = TRUE,
                    blacklisted_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, username, email, is_blacklisted, blacklisted_at
                """,
                (user["id"],)
            )
            updated = cur.fetchone()
            conn.commit()
 
        return {
            "status": "success",
            "message": "Your account has been blacklisted because the device was reported lost.",
            "profile": {
                "id": updated[0],
                "username": updated[1],
                "email": updated[2],
                "is_blacklisted": updated[3],
                "blacklisted_at": str(updated[4]) if updated[4] else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
 
@app.post("/recover-account")
def recover_account(authorization: Optional[str] = Header(default=None)):
    """
    Recover a blacklisted account — works for both email/password and Google accounts.
    Deletes the DB row (cascading to requests) and the Firebase account.
    """
    decoded_token = verify_and_decode_token(authorization)
 
    firebase_uid = decoded_token["uid"]
    firebase_info = decoded_token.get("firebase", {})
    provider = firebase_info.get("sign_in_provider", "unknown")
 
    # Allow both password and google.com providers
    if provider not in ("password", "google.com"):
        raise HTTPException(
            status_code=400,
            detail="Account recovery is only available for email/password and Google accounts."
        )
 
    try:
        with get_cursor() as (conn, cur):
            cur.execute(
                """
                SELECT id, is_blacklisted
                FROM users
                WHERE firebase_uid = %s
                """,
                (firebase_uid,)
            )
            row = cur.fetchone()
 
            if not row:
                raise HTTPException(status_code=404, detail="User not found in database.")
 
            user_id, is_blacklisted = row
 
            if not is_blacklisted:
                raise HTTPException(
                    status_code=400,
                    detail="This account is not blacklisted, so recovery is not needed."
                )
 
            # Delete database row (requests will cascade)
            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()
 
        # Delete Firebase account
        auth.delete_user(firebase_uid)
 
        return {
            "status": "success",
            "message": "Blacklisted account removed. You can now create a new account."
        }
 
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recovery failed: {str(e)}")