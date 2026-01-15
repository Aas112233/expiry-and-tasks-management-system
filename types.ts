/* 
   --- BACKEND INTEGRATION NOTES ---
   
   DATA MODELING:
   These interfaces represent the expected JSON shape of HTTP responses.
   
   1. Enums (Role, TaskStatus, etc.) should match database ENUM types or string constraints.
   2. IDs should be UUIDs or database integers (currently strings in frontend).
   3. Date strings should be ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ).
*/

export enum Role {
  Admin = 'Admin',
  Manager = 'Manager',
  Employee = 'Employee',
}

export enum TaskStatus {
  Open = 'Open',
  InProgress = 'In Progress',
  Done = 'Done',
  Overdue = 'Overdue',
}

export enum TaskPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export enum ExpiryStatus {
  Expired = 'Expired',
  Critical = '0-15 days',
  Warning = '16-45 days',
  Good = '46-60 days',
  Safe = '60+',
}

// API Endpoint: /api/users/me or /api/users/:id
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchId: string | 'all';
  status: 'Active' | 'Suspended';
  lastActive: string;
  permissions?: string; // JSON string
}

// API Endpoint: /api/employees
export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  avatar: string;
  role: Role;
  branch: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
}

// API Endpoint: /api/tasks
export interface Task {
  id: string;
  title: string;
  description: string;
  assignedBy: string;
  assignedTo: string; // Employee ID or Name
  branch: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
}

// API Endpoint: /api/inventory/expired
export interface ExpiredItem {
  id: string;
  productName: string;
  unitName: string;
  barcode: string;
  remainingQty: number;
  mfgDate: string;
  expDate: string;
  branch: string;
  status: ExpiryStatus; // Computed by backend or frontend based on dates
  notes?: string;
}

// API Endpoint: /api/branches
export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  status: 'Active' | 'Inactive';
}
