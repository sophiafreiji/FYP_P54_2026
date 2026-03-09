import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
  reload
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --------------------------------------------------
// CHANGE THIS: your Firebase config
// --------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyA43QgLUIiEzW_vyz9iggmmDTDyIMFVuBU",
  authDomain: "fyp-54.firebaseapp.com",
  projectId: "fyp-54",
  storageBucket: "fyp-54.firebasestorage.app",
  messagingSenderId: "560377742692",
  appId: "1:560377742692:web:1140c5d1b82c8b187b6671",
  measurementId: "G-9DLL7CKC1Z"
};

// --------------------------------------------------
// CHANGE THIS if your backend URL differs
// --------------------------------------------------
const API_BASE_URL = "https://localhost:8000";

// --------------------------------------------------
// Firebase init
// --------------------------------------------------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// --------------------------------------------------
// DOM elements — Auth page
// --------------------------------------------------
const authPage = document.getElementById("auth-page");
const appPage = document.getElementById("app-page");

const authChoiceSection = document.getElementById("auth-choice-section");
const emailFormSection = document.getElementById("email-form-section");
const recoveryChoiceSection = document.getElementById("recovery-choice-section");
const recoverySuccessSection = document.getElementById("recovery-success-section");
const verificationSentSection = document.getElementById("verification-sent-section");

const showSignupBtn = document.getElementById("show-signup-btn");
const showLoginBtn = document.getElementById("show-login-btn");
const showRecoveryBtn = document.getElementById("show-recovery-btn");
const googleBtn = document.getElementById("google-btn");

const formTitle = document.getElementById("form-title");
const submitAuthBtn = document.getElementById("submit-auth-btn");
const backBtn = document.getElementById("back-btn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const authStatus = document.getElementById("auth-status");
const formStatus = document.getElementById("form-status");

// Password toggle — main password
const togglePasswordBtn = document.getElementById("toggle-password");
const eyeIcon = document.getElementById("eye-icon");
const eyeOffIcon = document.getElementById("eye-off-icon");

// Confirm password
const confirmPasswordGroup = document.getElementById("confirm-password-group");
const confirmPasswordInput = document.getElementById("confirm-password");
const confirmMatchIcon = document.getElementById("confirm-match-icon");
const confirmPasswordHint = document.getElementById("confirm-password-hint");
const toggleConfirmPasswordBtn = document.getElementById("toggle-confirm-password");
const eyeIconConfirm = document.getElementById("eye-icon-confirm");
const eyeOffIconConfirm = document.getElementById("eye-off-icon-confirm");

// Recovery choice screen
const recoverPasswordBtn = document.getElementById("recover-password-btn");
const recoverGoogleBtn = document.getElementById("recover-google-btn");
const recoveryBackBtn = document.getElementById("recovery-back-btn");
const recoveryStatus = document.getElementById("recovery-status");

// Post-recovery success
const goSignupBtn = document.getElementById("go-signup-btn");

// Post-signup verification
const verificationEmail = document.getElementById("verification-email");
const goLoginBtn = document.getElementById("go-login-btn");

// --------------------------------------------------
// DOM elements — App page
// --------------------------------------------------
const avatar = document.getElementById("avatar");
const profileUsername = document.getElementById("profile-username");
const profileEmail = document.getElementById("profile-email");
const profileProvider = document.getElementById("profile-provider");
const profileBlacklist = document.getElementById("profile-blacklist");

const requestContent = document.getElementById("request-content");
const submitRequestBtn = document.getElementById("submit-request-btn");
const requestStatus = document.getElementById("request-status");
const requestsList = document.getElementById("requests-list");

const lostPhoneBtn = document.getElementById("lost-phone-btn");
const logoutBtn = document.getElementById("logout-btn");

let currentMode = null;
let isRecovering = false;
let isHandlingUnverified = false;
let isSigningUp = false; // Prevents observer from firing during signup flow

// --------------------------------------------------
// Auth page section visibility helpers
// --------------------------------------------------
function hideAllAuthSections() {
  authChoiceSection.classList.add("hidden");
  emailFormSection.classList.add("hidden");
  recoveryChoiceSection.classList.add("hidden");
  recoverySuccessSection.classList.add("hidden");
  verificationSentSection.classList.add("hidden");
  authStatus.textContent = "";
  formStatus.textContent = "";
  if (recoveryStatus) recoveryStatus.textContent = "";
}

function showChoiceScreen() {
  hideAllAuthSections();
  authChoiceSection.classList.remove("hidden");
}

function showEmailForm(mode) {
  currentMode = mode;
  hideAllAuthSections();
  emailFormSection.classList.remove("hidden");
  emailInput.value = "";
  passwordInput.value = "";
  confirmPasswordInput.value = "";

  // Reset password visibility
  passwordInput.type = "password";
  eyeIcon.classList.remove("hidden");
  eyeOffIcon.classList.add("hidden");
  confirmPasswordInput.type = "password";
  eyeIconConfirm.classList.remove("hidden");
  eyeOffIconConfirm.classList.add("hidden");

  // Reset confirm password state
  confirmMatchIcon.classList.add("hidden");
  confirmPasswordHint.textContent = "";
  confirmPasswordHint.className = "password-hint hidden";

  if (mode === "signup") {
    formTitle.textContent = "Create Account";
    submitAuthBtn.textContent = "Register";
    confirmPasswordGroup.classList.remove("hidden");
    confirmPasswordHint.classList.remove("hidden");
  } else {
    confirmPasswordGroup.classList.add("hidden");
    confirmPasswordHint.classList.add("hidden");
    if (mode === "login") {
      formTitle.textContent = "Login";
      submitAuthBtn.textContent = "Login";
    } else if (mode === "recover-password") {
      formTitle.textContent = "Recover Email / Password Account";
      submitAuthBtn.textContent = "Recover";
    }
  }
}

function showRecoveryChoice() {
  hideAllAuthSections();
  recoveryChoiceSection.classList.remove("hidden");
}

function showRecoverySuccess() {
  hideAllAuthSections();
  recoverySuccessSection.classList.remove("hidden");
}

function showVerificationSent(email) {
  hideAllAuthSections();
  verificationEmail.textContent = email;
  verificationSentSection.classList.remove("hidden");
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function statusBadgeClass(status) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "accepted") return "accepted";
  if (normalized === "rejected") return "rejected";
  if (normalized === "error") return "error";
  return "pending";
}

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user.");
  const token = await user.getIdToken(true);
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

async function apiGet(path) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, { method: "GET", headers });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "Request failed");
  return result;
}

async function apiPost(path, body = {}) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "Request failed");
  return result;
}

function formatProvider(raw) {
  if (raw === "google.com") return "Google";
  if (raw === "password") return "System";
  return raw || "Unknown";
}

function setStatus(el, message, type = "success") {
  el.textContent = message;
  el.className = "status " + (type === "error" ? "status-error" : "status-success");
}

function renderProfile(profile) {
  const username = profile.username || "User";
  const email = profile.email || "No email";
  const provider = profile.provider || "unknown";
  const firstLetter = username.charAt(0).toUpperCase();

  avatar.textContent = firstLetter;
  profileUsername.textContent = username;
  profileEmail.textContent = email;
  profileProvider.textContent = `Provider: ${formatProvider(provider)}`;

  if (profile.is_blacklisted) {
    profileBlacklist.classList.remove("hidden");
  } else {
    profileBlacklist.classList.add("hidden");
  }
}

function renderRequests(requests) {
  requestsList.innerHTML = "";

  if (!requests.length) {
    requestsList.innerHTML = `<div class="empty-state">No requests yet.</div>`;
    return;
  }

  requests.forEach((request) => {
    const badgeClass = statusBadgeClass(request.status);

    const card = document.createElement("div");
    card.className = "request-item";

    card.innerHTML = `
      <div class="request-item-top">
        <span class="request-id">Request #${request.id}</span>
        <span class="badge ${badgeClass}">${request.status}</span>
      </div>
      <p class="request-body">${request.content}</p>
      <div class="request-meta">
        <span>Created: ${formatDate(request.created_at)}</span>
        <span>Updated: ${formatDate(request.updated_at)}</span>
      </div>
    `;

    requestsList.appendChild(card);
  });
}

async function loadDashboard() {
  try {
    const profileResponse = await apiGet("/profile");
    const requestsResponse = await apiGet("/requests");

    renderProfile(profileResponse.profile);
    renderRequests(requestsResponse.requests);

    setStatus(requestStatus, ""); // Clear any stale status messages

    authPage.classList.add("hidden");
    appPage.classList.remove("hidden");
  } catch (error) {
    const msg = error.message.toLowerCase();

    if (msg.includes("blacklisted")) {
      alert("This account has been blacklisted because the device was reported lost.");
      await signOut(auth);
      return;
    }

    if (msg.includes("invalid token") || msg.includes("unauthorized") || msg.includes("missing authorization")) {
      setStatus(authStatus, "Session expired. Please log in again.", "error");
      await signOut(auth);
      return;
    }

    setStatus(requestStatus, "Failed to load data. Please refresh the page.", "error");
  }
}

// --------------------------------------------------
// Auth choice screen events
// --------------------------------------------------
showSignupBtn.addEventListener("click", () => showEmailForm("signup"));
showLoginBtn.addEventListener("click", () => showEmailForm("login"));
showRecoveryBtn.addEventListener("click", showRecoveryChoice);

// --------------------------------------------------
// Google login
// --------------------------------------------------
googleBtn.addEventListener("click", async () => {
  setStatus(authStatus, "");
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    setStatus(authStatus, "Google sign-in failed. Please try again.", "error");
  }
});

// --------------------------------------------------
// Email auth form submit
// --------------------------------------------------
backBtn.addEventListener("click", showChoiceScreen);

submitAuthBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  setStatus(formStatus, "");

  if (!email || !password) {
    setStatus(formStatus, "Please enter both email and password.", "error");
    return;
  }

  try {
    if (currentMode === "signup") {
      try {
        if (passwordInput.value !== confirmPasswordInput.value) {
          setStatus(formStatus, "Passwords do not match. Please try again.", "error");
          return;
        }
        isSigningUp = true;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        isSigningUp = false;
        showVerificationSent(email);
      } catch (error) {
        isSigningUp = false;
        if (error.code === "auth/email-already-in-use") {
          setStatus(formStatus, "An account with this email already exists. Please log in instead.", "error");
        } else if (error.code === "auth/weak-password") {
          setStatus(formStatus, "Password is too weak. Please use at least 6 characters.", "error");
        } else if (error.code === "auth/invalid-email") {
          setStatus(formStatus, "Invalid email address. Please check and try again.", "error");
        } else {
          setStatus(formStatus, "Registration failed. Please try again.", "error");
        }
      }
      return;
    }

    if (currentMode === "login") {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await reload(userCredential.user);

        if (!userCredential.user.emailVerified) {
          isHandlingUnverified = true;
          await signOut(auth);
          isHandlingUnverified = false;
          setStatus(formStatus, "Account not verified. Please check your inbox and click the verification link to log in.", "error");
          return;
        }

        setStatus(formStatus, "Login successful.", "success");
      } catch (error) {
        if (
          error.code === "auth/user-not-found" ||
          error.code === "auth/wrong-password" ||
          error.code === "auth/invalid-credential"
        ) {
          setStatus(formStatus, "Login failed. Incorrect email or password.", "error");
        } else {
          setStatus(formStatus, "Login failed. Please try again.", "error");
        }
      }
      return;
    }

    if (currentMode === "recover-password") {
      isRecovering = true;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await reload(userCredential.user);

      const providerId = userCredential.user.providerData[0]?.providerId || "";
      if (providerId !== "password") {
        isRecovering = false;
        await signOut(auth);
        setStatus(formStatus, "This option is only for email/password accounts.", "error");
        return;
      }

      await apiPost("/recover-account", {});
      await signOut(auth);
      isRecovering = false;
      showRecoverySuccess();
      return;
    }
  } catch (error) {
    setStatus(formStatus, "Recovery failed. Please try again.", "error");
  }
});

// --------------------------------------------------
// Recovery choice screen events
// --------------------------------------------------
recoveryBackBtn.addEventListener("click", showChoiceScreen);

recoverPasswordBtn.addEventListener("click", () => showEmailForm("recover-password"));

recoverGoogleBtn.addEventListener("click", async () => {
  setStatus(recoveryStatus, "");
  try {
    isRecovering = true;
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const providerId = user.providerData[0]?.providerId || "";
    if (providerId !== "google.com") {
      isRecovering = false;
      await signOut(auth);
      setStatus(recoveryStatus, "This option is only for Google accounts.", "error");
      return;
    }

    await apiPost("/recover-account", {});
    await signOut(auth);
    isRecovering = false;
    showRecoverySuccess();
  } catch (error) {
    isRecovering = false;
    setStatus(recoveryStatus, "Google recovery failed. Please try again.", "error");
    try { await signOut(auth); } catch (_) {}
  }
});

// --------------------------------------------------
// Post-recovery and post-signup navigation
// --------------------------------------------------
goSignupBtn.addEventListener("click", showChoiceScreen);

goLoginBtn.addEventListener("click", () => showEmailForm("login"));

// --------------------------------------------------
// Password visibility toggles
// --------------------------------------------------
function makeEyeToggle(inputEl, eyeShow, eyeHide) {
  return () => {
    const isHidden = inputEl.type === "password";
    inputEl.type = isHidden ? "text" : "password";
    eyeShow.classList.toggle("hidden", isHidden);
    eyeHide.classList.toggle("hidden", !isHidden);
  };
}

togglePasswordBtn.addEventListener("click", makeEyeToggle(passwordInput, eyeOffIcon, eyeIcon));
toggleConfirmPasswordBtn.addEventListener("click", makeEyeToggle(confirmPasswordInput, eyeOffIconConfirm, eyeIconConfirm));

// --------------------------------------------------
// Confirm password live validation
// --------------------------------------------------
confirmPasswordInput.addEventListener("input", () => {
  const pw = passwordInput.value;
  const cpw = confirmPasswordInput.value;

  if (!cpw) {
    confirmPasswordHint.textContent = "";
    confirmPasswordHint.className = "password-hint";
    confirmMatchIcon.classList.add("hidden");
    return;
  }

  if (pw === cpw) {
    confirmPasswordHint.textContent = "Passwords match.";
    confirmPasswordHint.className = "password-hint hint-success";
    confirmMatchIcon.classList.remove("hidden");
  } else {
    confirmPasswordHint.textContent = "Passwords do not match.";
    confirmPasswordHint.className = "password-hint hint-error";
    confirmMatchIcon.classList.add("hidden");
  }
});

// Also re-validate confirm when the main password changes
passwordInput.addEventListener("input", () => {
  if (currentMode === "signup" && confirmPasswordInput.value) {
    confirmPasswordInput.dispatchEvent(new Event("input"));
  }
});

// --------------------------------------------------
// Auth state observer
// --------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (isRecovering || isHandlingUnverified || isSigningUp) return;

  if (!user) {
    appPage.classList.add("hidden");
    authPage.classList.remove("hidden");
    showChoiceScreen();
    return;
  }

  await reload(user);

  const providerId = user.providerData[0]?.providerId || "";

  if (providerId === "password" && !user.emailVerified) {
    // Only fires on page load with a pre-existing unverified session, not during login flow
    isHandlingUnverified = true;
    await signOut(auth);
    isHandlingUnverified = false;
    return; // Observer will re-fire with user=null and show choice screen cleanly
  }

  await loadDashboard();
});

// --------------------------------------------------
// Submit request
// --------------------------------------------------
submitRequestBtn.addEventListener("click", async () => {
  const content = requestContent.value.trim();
  setStatus(requestStatus, "");

  if (!content) {
    setStatus(requestStatus, "Please enter request content.", "error");
    return;
  }

  try {
    await apiPost("/requests", { content });
    setStatus(requestStatus, "Request submitted successfully.", "success");
    requestContent.value = "";
    await loadDashboard();
  } catch (error) {
    setStatus(requestStatus, "Failed to submit request. Please try again.", "error");
  }
});

// --------------------------------------------------
// Lost phone
// --------------------------------------------------
lostPhoneBtn.addEventListener("click", async () => {
  const confirmed = confirm(
    "This will blacklist your account because the device is reported lost. Continue?"
  );
  if (!confirmed) return;

  try {
    await apiPost("/lost-phone", {});
    alert("Your account has been blacklisted. You will now be logged out.");
    await signOut(auth);
  } catch (error) {
    alert(error.message);
  }
});

// --------------------------------------------------
// Logout
// --------------------------------------------------
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});