import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { ToastContainer } from './components/ui/Toast';
import ProtectedRoute from './components/ProtectedRoute';

import { LanguageProvider } from './context/LanguageContext';

// Public Pages
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
import PublicTransparency from './pages/PublicTransparency';
import PublicVerification from './pages/PublicVerification';

// Student Pages
import Dashboard from './pages/Dashboard';
import ScholarshipApplicationForm from './pages/ScholarshipApplicationForm';
import ApplicationStatus from './pages/ApplicationStatus';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminApplicationsList from './pages/AdminApplicationsList';
import AdminApplicationDetail from './pages/AdminApplicationDetail';
import Reports from './pages/Reports';
import AdminUserManagement from './pages/AdminUserManagement';

// Institution Pages
import InstitutionDashboard from './pages/InstitutionDashboard';

const App = () => {
  return (
    <Provider store={store}>
      <LanguageProvider>
        <BrowserRouter>
          <ToastContainer />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/transparency" element={<PublicTransparency />} />
            <Route path="/verify/:id" element={<PublicVerification />} />

            {/* Student Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles="student">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/application"
              element={
                <ProtectedRoute allowedRoles="student">
                  <ScholarshipApplicationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/status"
              element={
                <ProtectedRoute allowedRoles="student">
                  <ApplicationStatus />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/applications"
              element={
                <ProtectedRoute allowedRoles="admin">
                  <AdminApplicationsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/applications/:id"
              element={
                <ProtectedRoute allowedRoles="admin">
                  <AdminApplicationDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles="admin">
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles="admin">
                  <AdminUserManagement />
                </ProtectedRoute>
              }
            />

            {/* Institution Officer Routes */}
            <Route
              path="/institution"
              element={
                <ProtectedRoute allowedRoles="institution_officer">
                  <InstitutionDashboard />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </Provider>
  );
};

export default App;
