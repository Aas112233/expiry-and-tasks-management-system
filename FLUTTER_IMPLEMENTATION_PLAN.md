# Flutter Android App Implementation Plan
## Expiry & Tasks Management System Mobile App

### 1. Executive Summary
**Can it be done?**
**YES.** You can absolutely build a Flutter Android app that connects to your existing Render backend.
- **Unified Data**: The app will read/write from the same PostgreSQL database as the web app.
- **Real-time Sync**: If a user adds an expired item on the web, it appears instantly on the mobile app, and vice versa.
- **Authentication**: Users will log in with their existing credentials (email/password).

### 2. Technical Stack
- **Framework**: Flutter (Dart)
- **Networking**: `dio` (for handling HTTP requests, interceptors, and JWT tokens).
- **State Management**: `provider` or `flutter_riverpod` (simple and effective).
- **Security**: `flutter_secure_storage` (to safely store the JWT Auth Token).
- **Charts**: `fl_chart` (to replicate the dashboard analytics visuals).

---

### 3. Implementation Steps

#### Phase 1: Project Setup & Networking
1.  **Initialize Flutter Project**:
    ```bash
    flutter create expiry_manager_mobile
    ```
2.  **Configure API Client**:
    -   Create an `ApiClient` class using `dio`.
    -   **Base URL**: `https://expiry-and-tasks-management-system.onrender.com/api`
    -   **Interceptors**: Automatically attach the `Bearer <token>` header to every request if the user is logged in.

#### Phase 2: Authentication Module
1.  **Login Screen**:
    -   Fields: Email (`admin@company.com`), Password.
    -   Action: POST request to `/auth/login`.
2.  **Session Management**:
    -   On success: Save `token` and `user` details to Secure Storage.
    -   On app restart: Check if a valid token exists; if yes, skip to Dashboard.

#### Phase 3: Dashboard Module
1.  **UI Layout**:
    -   Cards at the top for "Total Expired", "Low Stock", "Pending Tasks" (matching Web Dashboard).
2.  **Data Fetching**:
    -   GET `/analytics/overview` -> Populate the summary cards.
    -   GET `/analytics/trends` -> Render a Line Chart using users `fl_chart`.

#### Phase 4: Inventory Module (The Core)
1.  **Inventory List**:
    -   GET `/inventory` requests.
    -   Display items in a `ListView`.
    -   Color-code items based on status (Red for Expired, Yellow for Critical).
2.  **Add Item Screen**:
    -   Form with fields: Name, Barcode (optional: scan with camera), Quantity, Expiry Date (Date Picker).
    -   POST `/inventory` payload matching your specific Prisma schema.
3.  **Edit/Delete**:
    -   Tap an item -> Open Detail View.
    -   "Edit" -> pre-fill the form -> PUT `/inventory/:id`.
    -   "Delete" -> DELETE `/inventory/:id`.

---

### 4. Data Models (Dart vs TypeScript)

You will need to create Dart models that match your Prisma schema exactly.

**TypeScript (Server)**
```typescript
interface InventoryItem {
  id: string;
  productName: string;
  quantity: number;
  expDate: string; // ISO Date
  status: string;
}
```

**Dart (Flutter)**
```dart
class InventoryItem {
  final String id;
  final String productName;
  final int quantity;
  final DateTime expDate;
  final String status;

  InventoryItem({required this.id, ...});

  factory InventoryItem.fromJson(Map<String, dynamic> json) {
    return InventoryItem(
      id: json['id'],
      productName: json['productName'],
      quantity: json['quantity'],
      expDate: DateTime.parse(json['expDate']),
      status: json['status'],
    );
  }
}
```

### 5. API Endpoints Reference
These are the endpoints your Flutter app will consume immediately:

| Feature | Method | Endpoint |
| :--- | :--- | :--- |
| **Login** | POST | `/auth/login` |
| **Get Stats** | GET | `/analytics/overview` |
| **List Goods** | GET | `/inventory` |
| **Add Good** | POST | `/inventory` |
| **Update Good** | PUT | `/inventory/:id` |
| **Remove Good** | DELETE | `/inventory/:id` |
