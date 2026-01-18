# Expiry & Tasks Management Mobile App - Implementation Guide

## 1. Project Overview
This is the mobile client for the Expiry & Tasks Management System. It is built with **Flutter** and connects to the existing Render backend.

- **App Name:** Expiry Manager
- **Backend URL:** `https://expiry-and-tasks-management-system.onrender.com/api`
- **Database:** PostgreSQL (hosted on Neon, shared with the web app).
- **Authentication:** JWT (same credentials as the web app).

---

## 2. Environment Setup (CRITICAL)
**⚠️ IMPORTANT:** The project path MUST NOT contain spaces if you want to build on Windows (due to a Flutter SDK limitation).
- **Bad Path:** `D:\personal project\expiry_mobile` ❌
- **Good Path:** `C:\projects\expiry_mobile` ✅

If you are just editing code, the path doesn't matter. But to **build the APK**, you must copy this folder to a path without spaces (like `C:\temp_mobile`).

---

## 3. Key Dependencies
(Defined in `pubspec.yaml`)
- `dio`: Networking client (handles API calls and Interceptors).
- `provider`: State management (handles User Session and Inventory List).
- `flutter_secure_storage`: Securely stores the JWT Login Token.
- `fl_chart`: Uses for rendering Analytics Dashboard charts.

---

## 4. Folder Structure (lib/)
```
lib/
├── screens/
│   ├── login_screen.dart       # Email/Password Login
│   ├── dashboard_screen.dart   # Main menu & Stats
│   └── inventory_screen.dart   # List of Items (Add/Edit logic)
├── providers/
│   ├── auth_provider.dart      # Manages Login State & Token Storage
│   └── inventory_provider.dart # Fetches & Updates Inventory Data
├── api_client.dart             # Dio configuration with Bearer Token Interceptor
└── main.dart                   # App Entry Point & Authentication Check
```

---

## 5. Feature Implementation Details

### A. Authentication (`auth_provider.dart`)
- **Login:** Sends POST to `/auth/login`.
- **Storage:** Saves `token` to Secure Storage.
- **Auto-Login:** On app start, checks Secure Storage. If a token exists, skips the login screen.

### B. Inventory Management (`inventory_provider.dart`)
- **Fetch:** GET `/inventory`
    - Returns a list of items (`productName`, `quantity`, `expDate`).
- **Add Item:** POST `/inventory`
    - Payload: `{ "productName": "Milk", "quantity": 10, "expDate": "2024-12-01" }`
    - **Note:** The backend requires a valid ISO 8601 Date String.

### C. Dashboard (`dashboard_screen.dart`)
- **Goal:** Display real-time stats (Total Expired, Critical Stock).
- **API:** GET `/analytics/overview` (Same endpoint used by the React web dashboard).

---

## 6. How to Build & Run
**1. Run on Emulator:**
```powershell
flutter run
```

**2. Build Release APK:**
*(Remember: Move project to a path without spaces first!)*
```powershell
flutter build apk --release
```
**Output Location:** `build/app/outputs/flutter-apk/app-release.apk`
