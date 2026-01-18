import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ExpiredGoods from './pages/ExpiredGoods';
import Employees from './pages/Employees';
import Tasks from './pages/Tasks';
import Analysis from './pages/Analysis';
import Users from './pages/Users';
import Branches from './pages/Branches';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Catalog from './pages/Catalog';
import { BranchProvider } from './BranchContext';
import { SearchProvider } from './SearchContext';
import { AuthProvider, useAuth } from './AuthContext';

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

import NotAuthorized from './pages/NotAuthorized';

// ... other imports

function PermissionRoute({ module, type = 'read', children }: { module: string, type?: 'read' | 'write', children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(module, type)) {
    return <NotAuthorized />;
  }
  return <>{children}</>;
}

import { ToastProvider } from './ToastContext';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BranchProvider>
            <SearchProvider>
              <HashRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />

                  <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/expired-goods" element={<PermissionRoute module="Inventory"><ExpiredGoods /></PermissionRoute>} />
                      <Route path="/catalog" element={<PermissionRoute module="Inventory"><Catalog /></PermissionRoute>} />
                      <Route path="/employees" element={<PermissionRoute module="Employees"><Employees /></PermissionRoute>} />
                      <Route path="/tasks" element={<PermissionRoute module="Tasks"><Tasks /></PermissionRoute>} />
                      <Route path="/analysis" element={<Analysis />} />
                      <Route path="/reports" element={<PermissionRoute module="Reports"><Reports /></PermissionRoute>} />
                      <Route path="/users" element={<PermissionRoute module="Employees"><Users /></PermissionRoute>} />
                      <Route path="/branches" element={<PermissionRoute module="Branches"><Branches /></PermissionRoute>} />
                      <Route path="/settings" element={<PermissionRoute module="Settings"><Settings /></PermissionRoute>} />
                    </Route>
                  </Route>

                  <Route path="/unauthorized" element={<NotAuthorized />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </HashRouter>
            </SearchProvider>
          </BranchProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
