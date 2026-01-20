# Expiry & Tasks Management System (ETMS) 🚀

[![Production Web](https://img.shields.io/badge/Production-Live-success?style=for-the-badge&logo=react)](https://etms.gt.tc)
[![Backend Status](https://img.shields.io/badge/Backend-Render-blueviolet?style=for-the-badge&logo=render)](https://expiry-system-api.onrender.com/api/health)
[![Mobile](https://img.shields.io/badge/Mobile-Android-green?style=for-the-badge&logo=flutter)](./expiry_mobile)

A sophisticated, full-stack enterprise solution designed to track product expiries, manage branch-specific tasks, and provide real-time inventory analytics. Featuring a premium React Web Dashboard and a high-performance Flutter Android App.

---

## ✨ Key Features

### 🏢 Multi-Branch Management
*   **Role-Based Access Control (RBAC)**: Distinct permissions for Admins, Managers, and Staff.
*   **Branch Filtering**: Users see data relevant only to their assigned branch (with Admin global view).
*   **Audit Logging**: Track actions across the entire system.

### 📦 Inventory & Expiry Tracking
*   **Smart Status Computation**: Automatic categorization (Expired, 0-15 days, 16-45 days, etc.).
*   **Barcode Scanning**: Native mobile scanning with catalog auto-fill for lightning-fast data entry.
*   **PDF/Excel Reports**: Generate professional inventory lists and expiry reports.

### 📅 Task Management
*   **Assignments**: Delegate tasks to specific employees with priority levels.
*   **Real-time Updates**: Status tracking from 'Open' to 'Completed'.
*   **Deadlines**: Automatic flagging for overdue tasks.

### 📱 Performance-First Mobile App
*   **Offline Mode**: Fully functional local database (SQLite) for working in low-signal areas.
*   **Background Sync**: Automatically pushes local changes to the cloud when online.
*   **Native Push Notifications**: Timely alerts for upcoming expiries and assigned tasks.

---

## 🛠 Tech Stack

| Frontend (Web) | Backend (API) | Mobile (Android) | Database & Ops |
| :--- | :--- | :--- | :--- |
| **React 19** | **Node.js + Express** | **Flutter** | **MongoDB Atlas** |
| **TypeScript** | **TypeScript** | **Provider (State)** | **Prisma ORM** |
| **Tailwind CSS** | **JWT Authentication** | **Dio + SQLite** | **Render Hosting** |
| **Recharts** | **Bcrypt Hashing** | **Mobile Scanner** | **GitHub Actions** |

---

## 📁 System Architecture

```text
├── expiry_mobile/      # Flutter Android Application
├── server/             # Node.js TypeScript Backend API
├── components/         # Reusable React UI Components
├── pages/              # React Dashboard View Modules
├── services/           # Frontend API Integration Layer
├── AuthContext.tsx     # JWT Global State Management
└── prisma/             # Schema & Database Migrations
```

---

## 🚀 Getting Started

### 📡 Backend Setup
1. `cd server`
2. `npm install`
3. Create `.env` with `DATABASE_URL` and `JWT_SECRET`.
4. `npx prisma db push`
5. `npm run dev`

### 💻 Web Frontend Setup
1. `npm install`
2. Update `VITE_API_BASE_URL` in `.env.local`.
3. `npm run dev`

### 📱 Mobile App Setup
1. `cd expiry_mobile`
2. `flutter pub get`
3. Update `baseUrl` in `lib/api_client.dart`.
4. `flutter run`

---

## 🎨 Design Aesthetic
The system utilizes a **Premium Dark Theme** with Glassmorphism elements:
*   **Colors**: Deep Slate (`#0F172A`), Electric Blue Accent, and semantic status colors.
*   **Typography**: Clean sans-serif hierarchy for maximum readability.
*   **Animations**: Smooth transitions and micro-interactions for a high-end feel.

---

## 📝 License
This project is proprietary. All rights reserved.

Created with ❤️ by the Munshi Investment Club Development Team.
