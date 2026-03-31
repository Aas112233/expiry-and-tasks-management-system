import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { initSentry, setSentryUser, addBreadcrumb } from './lib/sentry';
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
import { SectionErrorBoundary } from './components/SectionErrorBoundary';

// Initialize Sentry on app load
initSentry();

function AppContent() {
  const { user, isAuthenticated } = useAuth();

  // Update Sentry user context when auth state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      setSentryUser({
        id: user.id || 'unknown',
        email: user.email,
        username: user.name,
      });
      addBreadcrumb('User authenticated', 'auth', 'info', { userId: user.id });
    } else {
      setSentryUser(null);
    }
  }, [isAuthenticated, user]);

  return null; // This component just handles side effects
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
            <BranchProvider>
              <SearchProvider>
                <HashRouter>
                  <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route element={<ProtectedRoute />}>
                      <Route element={<Layout />}>
                        <Route path="/" element={
                          <SectionErrorBoundary sectionName="Dashboard">
                            <Dashboard />
                          </SectionErrorBoundary>
                        } />
                        <Route path="/expired-goods" element={
                          <PermissionRoute module="Inventory">
                            <SectionErrorBoundary sectionName="Expired Goods">
                              <ExpiredGoods />
                            </SectionErrorBoundary>
                          </PermissionRoute>
                        } />
                        <Route path="/catalog" element={
                          <PermissionRoute module="Inventory">
                            <SectionErrorBoundary sectionName="Catalog">
                              <Catalog />
                            </SectionErrorBoundary>
                          </PermissionRoute>
                        } />
                        <Route path="/employees" element={
                          <PermissionRoute module="Employees">
                            <SectionErrorBoundary sectionName="Employees">
                              <Employees />
                            </SectionErrorBoundary>
                          </PermissionRoute>
                        } />
                        <Route path="/tasks" element={
                          <PermissionRoute module="Tasks">
                            <SectionErrorBoundary sectionName="Tasks">
                              <Tasks />
                            </SectionErrorBoundary>
                          </PermissionRoute>
                        } />
                        <Route path="/analysis" element={
                          <SectionErrorBoundary sectionName="Analysis">
                            <Analysis />
                          </SectionErrorBoundary>
                        } />
                        <Route path="/reports" element={
                          <PermissionRoute module="Reports">
                            <SectionErrorBoundary sectionName="Reports">
                              <Reports />
                            </SectionErrorBoundary>
                          </PermissionRoute>
                        } />
                        <Route path="/users" element={
                          <PermissionRoute module="Employees">
                            <SectionErrorBoundary sectionName="Users">
                              <Users />
                            </SectionErrorBoundary>
                          </PermissionRoute>
                        } />
                        <Route path="/branches" element={
                          <PermissionRoute module="Branches">
                            <SectionErrorBoundary sectionName="Branches">
                              <Branches />
                            </SectionErrorBoundary>
                          </PermissionRoute>
                        } />
                        <Route path="/settings" element={
                          <PermissionRoute module="Settings">
                            <SectionErrorBoundary sectionName="Settings">
                              <Settings />
                            </SectionErrorBoundary>
                          </PermissionRoute>
                        } />
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
      {/* React Query Devtools - only in development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
