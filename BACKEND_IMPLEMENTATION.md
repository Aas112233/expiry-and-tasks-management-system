# Backend Implementation Documentation

This document outlines the architectural plan and technical specifications for building the backend for the **Expiry & Tasks Management System**. The current frontend relies on mock data (`constants.ts`), which will be replaced by API calls to this backend.

## 1. Technology Stack Recommendation

Given the React frontend, a **Node.js** with **Express.js** backend is recommended for a unified JavaScript/TypeScript ecosystem.

*   **Runtime**: Node.js
*   **Framework**: Express.js (or NestJS for more structure)
*   **Database**: **MongoDB Atlas** (Online Cloud Database)
*   **ODM**: Mongoose (recommended for strict schema modeling)
*   **Authentication**: JSON Web Tokens (JWT)
*   **Language**: TypeScript

## 2. Database Schema Design (MongoDB Atlas)

We will use a Document-based model. Below are the proposed collections and their Mongoose schemas.

### Users Service / Collection
*Primary Login Accounts*
```typescript
interface UserSchema {
  _id: ObjectId;
  name: string;
  email: { type: String, unique: true, required: true };
  password_hash: string;
  role: 'Admin' | 'Manager' | 'Employee';
  branch_id?: ObjectId; // Reference to 'branches' collection (nullable for Admin)
  status: 'Active' | 'Suspended';
  last_active: Date;
  createdAt: Date;
}
```

### Branches Collection
```typescript
interface BranchSchema {
  _id: ObjectId;
  name: { type: String, required: true };
  address: String;
  phone: String;
  manager_id: ObjectId; // Reference to 'users' collection
  status: 'Active' | 'Inactive';
  createdAt: Date;
}
```

### Employees Collection
*Staff records per branch (distinct from login users if necessary, otherwise merge)*
```typescript
interface EmployeeSchema {
  _id: ObjectId;
  employee_id_code: { type: String, unique: true }; // e.g., EMP001
  name: String;
  email: String; // Contact email
  phone: String;
  role: 'Manager' | 'Employee';
  branch_id: ObjectId; // Reference to 'branches' 
  status: 'Active' | 'Inactive';
  avatar_url: String;
}
```

### Tasks Collection
```typescript
interface TaskSchema {
  _id: ObjectId;
  title: String;
  description: String;
  assigned_by: ObjectId; // Ref to 'users'
  assigned_to: ObjectId; // Ref to 'users' or 'employees'
  branch_id: ObjectId;   // Ref to 'branches'
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Done' | 'Overdue';
  due_date: Date;
  created_at: { type: Date, default: Date.now };
}
```

### Inventory / Expired Items Collection
```typescript
interface InventoryItemSchema {
  _id: ObjectId;
  product_name: String;
  barcode: { type: String, index: true };
  unit_name: String; // e.g., "1L Carton"
  quantity: Number;
  mfg_date: Date;
  exp_date: { type: Date, index: true }; // Critical for querying expiries
  branch_id: ObjectId; // Ref to 'branches'
  notes: String;
}
```

> **Note on Relationships**: In MongoDB, we use `ObjectId` references. For frequently accessed data (like Branch Name on a User profile), we might consider **embedding** small amounts of data, but for this system, normalization with references is cleaner to avoid update inconsistencies.

---

## 3. API Endpoints Specification

### Authentication
- `POST /api/auth/login` - Authenticate user, return JWT.
- `POST /api/auth/logout` - Invalidate session.
- `GET /api/auth/me` - Get current user profile (protected).

### Dashboard & Analytics
- `GET /api/analytics/overview` - Get stats for top cards.
- `GET /api/analytics/trends` - Get data for "Expiry Trend" chart.
- `GET /api/analytics/branch-distribution` - Get data for "barchart".

### Inventory / Expired Goods
- `GET /api/inventory/expired` - List all items with simple query filters.
    - *Query*: `?branchId=...&status=Critical`
- `POST /api/inventory` - Add new inventory item.
- `PATCH /api/inventory/:id` - Update item.
- `DELETE /api/inventory/:id` - Remove item.

### Tasks
- `GET /api/tasks` - List tasks.
- `POST /api/tasks` - Create a new task.
- `PATCH /api/tasks/:id/status` - Update task status.

### Branches & Employees
- `GET /api/branches` - List all branches.
- `GET /api/branches/:id/employees` - List employees for a specific branch.
- `POST /api/employees` - Register a new employee record.

---

## 4. Implementation Logic & Next Steps

1.  **Repo Setup**: Initialize `backend` folder.
2.  **Environment**: Create `.env` for `MONGO_URI`, `JWT_SECRET`.
3.  **Mongoose Setup**: Connect to MongoDB Atlas using `mongoose.connect()`.
4.  **Models**: Create `User.ts`, `Branch.ts`, etc., using Schema definitions above.
5.  **Controllers**: Implement logic to query Mongoose models.
    - *Example*: `await TaskModel.find({ status: 'Open' }).populate('assigned_to')`.
6.  **Frontend Integration**: Replace `constants.ts` with API calls.

## 5. Security Recommended Priorities
1.  **Input Sanitize**: Use `express-mongo-sanitize` to prevent NoSQL injection.
2.  **Validation**: Use `zod` to validate incoming JSON.
3.  **RBAC**: Middleware to check `req.user.role` before allowed sensitive actions.
