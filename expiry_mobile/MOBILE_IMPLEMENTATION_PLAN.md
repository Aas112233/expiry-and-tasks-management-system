# Mobile App Implementation Plan

This plan outlines the steps to build a high-premium Flutter application for the Expiry and Tasks Management System, matching the aesthetics and functionality of the web dashboard.

## Phase 1: Foundation & Authentication
- [x] **API Sync**: Update `ApiClient` to point to the live Render backend (`https://expiry-system-api.onrender.com/api`).
- [x] **Secure Storage**: Finalize `AuthProvider` to handle login, token persistence, and branch info.
- [x] **Main Layout**: Create a `MainLayout` or `AppDrawer` widget to provide consistent sidebar navigation.

## Phase 2: Navigation & Dashboard
- [x] **Side Menu (Drawer)**:
  - Dashboard
  - All Items
  - Add New Item
  - Expired List
  - Reports
  - Profile/Logout
- [x] **Dashboard Screen**:
  - Implement KPI Cards (Total Items, Expired, Near Expiry).
  - Add a summary chart (Near Expiry trends).
  - Branch Selector (if admin).

## Phase 3: Inventory Management
- [x] **All Items Screen**:
  - List of inventory items with search and filters.
  - Branch-specific filtering using the current user's branch.
- [x] **Add Item Screen**:
  - Full-featured form (Product name, Barcode, Dates, Branch selection).
  - Validation matching the backend requirements.
- [x] **Expired List Screen**:
  - Dedicated view for items where `status == 'Expired'`.

## Phase 4: Reports & Polish
- [/] **Reports Screen**:
  - Summary views of inventory health (UI Framework ready).
  - Export/Share functionality (optional).
- [ ] **Premium UI/UX**:
- [ ] **Data Visuals**: Add real charts using `fl_chart` once backend analytics are fully wired.
  - Apply Dark Mode with Glassmorphism effects.
  - Add smooth transitions and loading skeletons.
  - Ensure responsive layout for different screen sizes.

---

### UI/UX Concept
- **Color Palette**: Dark Blue/Gray backgrounds with vibrant accents (Cyan, Sunset Orange, Emerald Green).
- **Typography**: Clean, sans-serif fonts (Roboto/Inter).
- **Components**: Rounded cards, subtle border gradients, and blur effects.
