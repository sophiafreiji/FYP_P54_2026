# Secure Signing Portal

A secure multi-platform digital signing system that transforms a smartphone into a trusted cryptographic signing device using hardware-backed key storage and certificate-based authentication.

The project consists of:

- A FastAPI backend server
- A web frontend
- A native Android application
- A native iOS application
- A PostgreSQL database
- A Windows Server 2022 Certificate Authority (AD CS)
- Firebase Authentication and Firebase Cloud Messaging integration

The system enables users to securely approve and sign documents directly from their mobile devices using cryptographic keys stored in secure hardware modules such as the Android Keystore (TEE/StrongBox) and Apple Secure Enclave.

---

# Features

## Authentication & Account Security

- Firebase Authentication
- Email/Password login
- Google Sign-In
- Backup recovery codes
- Account recovery flow
- Read-only mode for unauthorized device access
- Session invalidation and inactivity timeout
- Account blacklisting for compromised devices

## PKI & Cryptography

- Hardware-backed ECDSA P-256 key generation
- Android Keystore integration
- Apple Secure Enclave integration
- X.509 certificate support
- PKCS#7 SignedData support
- PKCS#12 (.pfx) certificate import
- Certificate revocation support
- OCSP and CRL integration
- Windows AD CS Standalone CA integration

## Document Signing

- On-device signing
- WYSIWYS: What you see is what you sign flow
- Real-time signing request management
- Single and dual signer workflows
- PKCS#7 signature generation
- Signature verification

## Notifications & Sessions

- Firebase Cloud Messaging (FCM)
- Real-time WebSocket session management
- Push notification alerts
- Session expiration handling
- Cross-platform session invalidation

---

# System Architecture

The Secure Signing Portal is composed of several interconnected components:

```text
┌─────────────────────┐
│     Web Frontend    │
└─────────┬───────────┘
          │ HTTPS/TLS
          ▼
┌─────────────────────┐
│   FastAPI Backend   │
└───────┬─────┬───────┘
        │     │
        │     ├───────────────► PostgreSQL Database
        │
        ├───────────────► Firebase Authentication
        │
        ├───────────────► Firebase Cloud Messaging
        │
        ├───────────────► Windows AD CS Certificate Authority
        │
        ▼
┌─────────────────────┐
│ Mobile Applications │
├─────────────────────┤
│ Android Application │
│ iOS Application     │
└─────────────────────┘
```

---

# Technologies Used

## Backend

- Python
- FastAPI
- Uvicorn
- Firebase Admin SDK
- PostgreSQL
- WebSockets
- OpenSSL

## Frontend

- HTML
- CSS
- JavaScript
- Firebase JS SDK

## Android

- Kotlin
- Android SDK 36
- Firebase Authentication
- Firebase Cloud Messaging
- Android Keystore
- OkHttp
- Google Sign-In

## iOS

- Swift
- SwiftUI
- Firebase Authentication
- Google Sign-In
- Secure Enclave

## Infrastructure

- Windows Server 2022
- Active Directory Certificate Services (AD CS)
- mkcert
- Oracle VirtualBox

---

# Requirements

## General Requirements

- Python 3.10+
- Node.js
- PostgreSQL
- Firebase Project
- Windows Server 2022 VM
- Android Studio
- Xcode (for iOS)
- Physical Android/iOS device for secure hardware testing

## Android Requirements

- Android 8.0 (API 26) or higher
- Compile SDK 36

## iOS Requirements

- iOS 17+
- Xcode 15.2+
- Real iPhone device (Secure Enclave is unavailable on simulators)

---

# Installation Guide

## 1. Create and Activate Python Virtual Environment in the backend folder

Install virtualenv:

```bash
pip install virtualenv
```

Create the virtual environment:

```bash
python -m venv venv
```

Allow PowerShell script execution:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Activate the virtual environment:

```powershell
.\venv\Scripts\Activate.ps1
```

---

# Install Backend Dependencies

Install FastAPI and Uvicorn:

```bash
pip install fastapi uvicorn
```

Install all required backend packages:

```bash
pip install fastapi uvicorn psycopg2-binary firebase-admin python-dotenv
```

Install recommended Uvicorn extras:

```bash
pip install 'uvicorn[standard]'
```

Install additional required libraries:

```bash
pip install requests urllib3 cryptography psycopg2-binary python-dotenv fastapi "uvicorn[standard]" pydantic firebase-admin
```

---

# Install Node.js

Download and install Node.js:

```text
https://nodejs.org/en/download
```

Verify installation:

```bash
node -v
npm -v
npx -v
```

---

# Install mkcert

Download mkcert:

```text
https://github.com/FiloSottile/mkcert/releases
```

Download:

```text
mkcert-v1.4.4-windows-amd64.exe
```

Rename it to:

```text
mkcert.exe
```

Install local CA:

```bash
mkcert -install
```

Generate local HTTPS certificates:

```bash
mkcert localhost 127.0.0.1 <ip-address>
```

This generates in C:\Users\User (change the names so they macth this):

- localhost.pem
- localhost-key.pem

Replace the certificate files in both backend and frontend folders.

- FYP54-CA.pem should be in the backend folder by default (it is not generated, it is downloaded with the project), it is the result of the CA generated by the VM.

---

# Android Root Certificate Installation

Navigate to:

```text
C:\Users\User\AppData\Local\mkcert
```

Locate the generated root CA certificate for mkcert and:

- Rename it to `rootca.pem`
- Copy it into:

```text
android/app/src/main/res/raw/
```

For Android device installation:

1. Go to Settings
2. About Phone
3. Software Information
4. Tap Build Number multiple times
5. Enable Developer Options
6. Enable USB Debugging

For iOS device installation:
1. Go to Settings
2. Privacy & Security
3. Connect cable to phone
5. Enable Developer Options

Install the certificate on Android and iOS:

1. Settings
2. Security and Privacy
3. Import the two on your phone
4. Install `rootca.crt` and `FYP54-CA.pem`
5. Trust them

---

# Firebase Setup

Firebase is shared across all components:

- Backend
- Android application
- iOS application
- Web frontend

Firebase Console:

```text
https://console.firebase.google.com/
```

---

# Create Firebase Project

1. Open Firebase Console
2. Click "Add Project"
3. Enter project name
4. Disable Google Analytics if not needed
5. Create project

---

# Enable Firebase Authentication

Enable the following providers:

- Email/Password
- Google Sign-In

Steps:

1. Authentication
2. Get Started
3. Sign-In Method
4. Enable providers

---
# Backend Firebase Configuration

## Generate Service Account Key

1. Firebase Console
2. Project Settings
3. Service Accounts
4. Generate New Private Key
5. Download JSON file
6. Place it beside `main.py`

Example:

```python
import firebase_admin
from firebase_admin import credentials, auth

cred = credentials.Certificate("fyp-54-firebase.json")
firebase_admin.initialize_app(cred)
```

---

# Firebase Web API Key

Get the Web API Key from:

1. Firebase Console
2. Project Settings
3. General
4. Web API Key

Add it to `main.py`

---

# Android Firebase Setup

## Register Android App

1. Firebase Console
2. Add App
3. Android
4. Enter package name
5. Download `google-services.json`
6. Place it in `app/`

---

# Android SHA-1 Configuration

Generate SHA-1 fingerprint:

```bash
./gradlew signingReport
```

Add SHA-1 fingerprint in Firebase Console.

---

# Android Gradle Configuration

Project-level `build.gradle.kts`:

```kotlin
plugins {
    id("com.google.gms.google-services") version "4.4.1" apply false
}
```

App-level `build.gradle.kts`:

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:33.1.0"))
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.android.gms:play-services-auth:21.2.0")
    implementation("com.google.firebase:firebase-messaging:23.4.1")
}
```

---

# Android Manifest Configuration

Declare Firebase Cloud Messaging service:

```xml
<service
    android:name=".SecureSigningMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

---

# iOS Application Setup

## Requirements

Before starting, make sure you have:

- A Mac
- Xcode installed (latest version compatible with the iPhone iOS version used for testing)
- An Apple Developer Account (a free account is sufficient for testing on your own device)
- A physical iPhone device  
  > Secure Enclave / secure hardware features are not available on iOS simulators

---

# Create the Xcode Project

1. Open Xcode
2. Click:
   - `Create New Project`
3. Select:
   - `iOS`
   - `App`

Fill the project information:

- **Product Name**: your application name
- **Team**: select your Apple Developer account
- **Organization Name**: your organization or university/project name
- **Bundle Identifier**: unique application identifier (used later in Firebase)

Project configuration:

- **Interface**: `SwiftUI`
- **Language**: `Swift`

---

# Firebase Configuration

Use the same Bundle Identifier configured in Xcode.

## Register iOS App

1. Firebase Console
2. Add App
3. iOS
4. Enter Bundle Identifier
5. Download `GoogleService-Info.plist`
6. Add it to Xcode project

---

# iOS Firebase and Google Sign-In Setup

## Add Firebase SDK

In Xcode:

1. Open your project
2. Click:

```text
File -> Add Package Dependencies
```

3. Add the following package URL:

```text
https://github.com/firebase/firebase-ios-sdk
```

4. Configure the package:

- Package Name: `firebase-ios-sdk`
- Dependency Rule: `Exact Version`
- Version: `10.29.0`

5. Select and add:

- `FirebaseAuth`

---

# Add Google Sign-In SDK

Again in:

```text
File -> Add Package Dependencies
```

Add the following package URL:

```text
https://github.com/google/GoogleSignIn-iOS
```

Configure the package:

- Package Name: `googlesignin-ios`
- Dependency Rule: `Exact Version`
- Version: `7.0.0`

Select and add:

- `GoogleSignIn`
- `GoogleSignInSwift`

---

# Configure Google Sign-In URL Scheme

1. In Xcode, click your project name (blue icon on the left panel)
2. Under:

```text
TARGETS -> Your Project Name
```

3. Open the:

```text
Info
```

tab

4. Scroll down to:

```text
URL Types
```

5. Click the `+` button

6. In:

```text
URL Schemes
```

paste the value of:

```text
REVERSED_CLIENT_ID
```

from your Firebase configuration file.

To find it:

1. Open:

```text
GoogleService-Info.plist
```

2. Locate:

```text
REVERSED_CLIENT_ID
```

Example:

```text
com.googleusercontent.apps.xxxxx
```

3. Copy the entire value
4. Paste it into `URL Schemes`

---

# Configure Local Network Permission

1. In Xcode, open:

```text
Info
```

tab

2. Go to:

```text
Custom iOS Target Properties
```

3. Hover over any row and click the `+` button

4. Add the following entry:

| Key | Type | Value |
|---|---|---|
| Privacy – Local Network Usage Description | String | This app needs local network access to connect to the server |

---

# Configure Bonjour Services

Still inside:

```text
Info -> Custom iOS Target Properties
```

1. Click the `+` button
2. Add:

| Key | Type |
|---|---|
| Bonjour services | Array |

3. Expand the array
4. Click `+` inside the array
5. Add:

| Type | Value |
|---|---|
| String | _https._tcp |

---

# Configure Signing and Capabilities

1. Open:

```text
Signing & Capabilities
```

2. Ensure:

- `Automatically manage signing` is checked
- Your Apple Developer account is selected

---

# Configure Backend IP Address

Open:

```text
APIService.swift
```

Locate the backend IP variable and replace it with the local IP address of the machine running the backend server.

Example:

```swift
let baseURL = "https://192.168.1.104:8000"
```

> The backend machine and the iPhone must be connected to the same local network.
> Now drag and drop all the downloaded files in XCode project folder.
> On the first run and app launch, make sure to accept the application pop up, allowing local network access for the app.
---

# Web Frontend Firebase Setup

## Register Web App

1. Firebase Console
2. Add App
3. Web
4. Copy Firebase config object

---

# Firebase JavaScript SDK

Example:

```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
  reload
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
```

---

# Authorized Domains

If using local IP addresses or custom domains:

1. Firebase Console
2. Authentication
3. Settings
4. Authorized Domains
5. Add your domain/IP

Example:

```text
192.168.1.104
```

---

# Environment Variables

Create `.env` inside backend folder:

```env
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
REVOCATION_API_URL=https://192.168.1.110:5000
REVOCATION_SECRET=fyp54-revocation-secret
CRL_URL=http://192.168.1.110/CertEnroll/FYP54-CA.crl
ADCS_HOST=https://192.168.1.110
ADCS_USERNAME=Administrator
ADCS_PASSWORD=Admin@1234!
CA_CERT_PATH=Fyp54-CA.pem
OCSP_URL=http://192.168.1.110/ocsp
```

---

# IP Configuration

Update all local IP addresses according to your machine and VM network configuration.

To find your IP address:

```bash
ipconfig
```

Update Android configuration files:

```text
android/app/src/main/res/xml/network_security_config.xml
```

and:

```text
android/app/src/main/java/com/android/securesigningportal/ApiService.kt
```
and in iOS too

---

# Windows Server 2022 VM

Import the provided `.ova` image into Oracle VirtualBox.

Credentials:

```text
Username: Administrator
Password: Admin@1234!
```

The VM hosts:

- Active Directory Certificate Services
- Revocation API
- CRL Distribution

# Update CRL and OCSP URLs on the Windows Server CA

link to download:

```link
https://testusjedu-my.sharepoint.com/:u:/r/personal/charbelchawki_attie_net_usj_edu_lb/Documents/Fyp%20Windows%20Server%202022.ova?csf=1&web=1&e=keOqUU&isSPOFile=1&xsdata=MDV8MDJ8fDc4ZDUwZmI2YzZmOTQyM2I1Y2UzMDhkZWIyNjVjNjljfDJhZDk2OTM0NDNlNTQxYzI5NzYxZjMzNWZlMjE0Y2MzfDB8MHw2MzkxNDQzNDczMjY3NzQ5Mzl8VW5rbm93bnxWR1ZoYlhOVFpXTjFjbWwwZVZObGNuWnBZMlY4ZXlKRFFTSTZJbFJsWVcxelgwRlVVRk5sY25acFkyVmZVMUJQVEU5R0lpd2lWaUk2SWpBdU1DNHdNREF3SWl3aVVDSTZJbGRwYmpNeUlpd2lRVTRpT2lKUGRHaGxjaUlzSWxkVUlqb3hNWDA9fDF8TDJOb1lYUnpMekU1T2pNNU9ETXpPVEF6TFRreU5tTXRORFUxTmkwNFpUWXpMVGhpT1RNMk1tWmlZVE5oWkY5a1kyUmhZVEUyTmkxbFpXRTNMVFJtWlRBdE9UQXhOUzB5TlRkbU5UbGhOR1l5TkdGQWRXNXhMbWRpYkM1emNHRmpaWE12YldWemMyRm5aWE12TVRjM09EZ3pOemt6TURneU9RPT18YmI5OTM1NTM3ZjMwNDFhMGY1ZTEwOGRlYjI2NWM2OWJ8NmM2YmFkZDdiNDAzNDY5Yjg2MWM3ZTEyYTcyNzUzOGU%3D&sdata=WGFOdDZaaER4eDQwZjBkVlVyVVdGZHhramRXYjdnWHZhclZ5OVFaZlpGOD0%3D&ovuser=2ad96934-43e5-41c2-9761-f335fe214cc3%2Ccarl.bassous%40net.usj.edu.lb
```

When the VM IP address changes, you must update the Certificate Authority distribution URLs so certificates point to the correct CRL and AIA endpoints.

---

# Open Certification Authority

1. Open:

```text
Server Manager
```

2. Go to:

```text
Tools -> Certification Authority
```

3. In the left panel, locate your CA server
4. Right-click your CA name
5. Select:

```text
Properties
```

---

# Configure CRL Distribution Point (CDP)

1. Open the:

```text
Extensions
```

tab

2. In the dropdown menu, select:

```text
CRL Distribution Point (CDP)
```

3. You will see multiple configured URLs

4. Locate the old HTTP link containing the previous VM IP address

Example:

```text
http://192.168.1.xxx/CertEnroll/FYP-CA.crl
```

5. Select the old link
6. Click:

```text
Delete
```

7. Add the new updated link using the new VM IP address

Example:

```text
http://192.168.1.127/CertEnroll/FYP-CA.crl
```

> Only replace the IP address.

---

# Configure Authority Information Access (AIA)

1. In the same:

```text
Extensions
```

tab

2. From the dropdown menu, select:

```text
Authority Information Access (AIA)
```

3. Locate the old HTTP OCSP URL containing the previous IP address

Example:

```text
http://192.168.1.xxx/ocsp
```

4. Delete the old URL

5. Add the updated URL using the new VM IP address

Example:

```text
http://192.168.1.127/ocsp
```

> Only replace the IP address.

---

# Apply Changes

1. Click:

```text
Apply
```

2. Click:

```text
OK
```

---

# Restart the Certificate Authority Service

Open Command Prompt as Administrator and run the following commands:

Stop the CA service:

```cmd
net stop certsvc
```

Start the CA service again:

```cmd
net start certsvc
```

Republish the CRL:

```cmd
certutil -crl
```

These commands restart the Certificate Authority service and regenerate the updated Certificate Revocation List (CRL).

---

# Database Setup

1. Install PostgreSQL.

2. Run the DB query on a fresh database in PostgreSQL.

3. DB credentials will be used in the .env file.

---

# Database Tables

| Table | Purpose |
|---|---|
| users | Stores user accounts and blacklist status |
| backup_codes | One-time recovery codes |
| sessions | Encrypted session management |
| requests | Signing requests |
| certificates | X.509 certificate storage |
| signatures | PKCS#7 signatures |
| logs | Audit logs |
| device_tokens | Android FCM tokens |

---

# Logged Actions

| Action | Trigger |
|---|---|
| account_created | New registration |
| login | Successful login |
| logout | User logout |
| session_expired | Session inactivity timeout |
| session_ip_mismatch | IP mismatch detection |
| account_blacklisted | Compromised device reported |
| account_recovered | Backup code recovery |
| password_reset | Password reset |
| request_created | New signing request |
| request_status_updated | Request accepted/rejected |

---

# Launching the Backend

Run the FastAPI server with HTTPS:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --ssl-keyfile=localhost-key.pem --ssl-certfile=localhost.pem --reload
```

---

# Launching the Web Frontend

Run local HTTPS server:

```bash
npx http-server -p 5500 --ssl --cert localhost.pem --key localhost-key.pem
```

on an internet search engine (Chrome, Safari, ...):

```
https://localhost:5500
```

---

# Launching the Revocation API

Inside the Windows Server VM:

```bash
python C:\revocation_api.py
```

---

# Launching Android/iOS Applications

1. Connect your device
2. Build and sync the project
3. Run the application

For iOS:

- Use a real iPhone device
- Secure Enclave does not work on simulators

---

# Security Concepts Used

## Hardware-Backed Key Storage

Private keys never leave the device.

Android:

- Android Keystore
- TEE / StrongBox

iOS:

- Secure Enclave

---

# PKCS#7 Signing

The system generates:

- PKCS#7 SignedData (`.p7m`)
- X.509 certificate-based signatures

All signatures are generated locally on the mobile device.

---

# Session Security

- 15-minute inactivity timeout
- AES-256 encrypted session tokens
- Real-time WebSocket invalidation
- IP mismatch detection

---

# Push Notifications

Android devices receive signing alerts using Firebase Cloud Messaging.

Device tokens are stored separately from session tokens.
