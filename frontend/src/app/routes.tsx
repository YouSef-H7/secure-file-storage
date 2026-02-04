import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import LoginPage from '../pages/Login';
import RegisterPage from '../pages/Register';
import Callback from '../pages/Callback';
import Dashboard from '../pages/Dashboard';
import FileManager from '../pages/Files';
import SettingsPage from '../pages/Settings';
import UsersPage from '../pages/Users';
import LogsPage from '../pages/Logs';
import StoragePage from '../pages/Storage';
import EmployeeDashboard from '../pages/EmployeeDashboard';
import EmployeeFiles from '../pages/EmployeeFiles';
import EmployeeUpload from '../pages/EmployeeUpload';
import EmployeeRecent from '../pages/EmployeeRecent';
import EmployeeShared from '../pages/EmployeeShared';
import EmployeeTrash from '../pages/EmployeeTrash';
import EmployeeStorage from '../pages/EmployeeStorage';
import MyFolders from '../pages/MyFolders';
import SharedFolders from '../pages/SharedFolders';
import PublicShare from '../pages/PublicShare';
import ProtectedLayout from '../layouts/ProtectedLayout';

const AdminGuard = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login?error=unauthorized" replace />;
  }

  // If role is undefined, wait for it to be set (should not happen if backend returns it)
  if (user.role === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading user role...</div>
      </div>
    );
  }

  if (user.role === 'employee') {
    return <Navigate to="/app/employee" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/login?error=unauthorized" replace />;
  }

  return <Outlet />;
};

const EmployeeGuard = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login?error=unauthorized" replace />;
  }

  // If role is undefined, wait for it to be set (should not happen if backend returns it)
  if (user.role === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading user role...</div>
      </div>
    );
  }

  if (user.role === 'admin') {
    return <Navigate to="/app" replace />;
  }

  if (user.role !== 'employee') {
    return <Navigate to="/login?error=unauthorized" replace />;
  }

  return <Outlet />;
};

export const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/callback" element={<Callback />} />
    <Route path="/public/share/:token" element={<PublicShare />} />

    <Route element={<ProtectedLayout />}>
      {/* Admin Routes */}
      <Route element={<AdminGuard />}>
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/files" element={<FileManager />} />
        <Route path="/app/users" element={<UsersPage />} />
        <Route path="/app/storage" element={<StoragePage />} />
        <Route path="/app/logs" element={<LogsPage />} />
        <Route path="/app/settings" element={<SettingsPage />} />
      </Route>

      {/* Employee Routes */}
      <Route element={<EmployeeGuard />}>
        <Route path="/app/employee" element={<Navigate to="/app/employee/dashboard" replace />} />
        <Route path="/app/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/app/employee/files" element={<EmployeeFiles />} />
        <Route path="/app/employee/upload" element={<EmployeeUpload />} />
        <Route path="/app/employee/recent" element={<EmployeeRecent />} />
        <Route path="/app/employee/shared" element={<EmployeeShared />} />
        <Route path="/app/employee/trash" element={<EmployeeTrash />} />
        <Route path="/app/employee/storage" element={<EmployeeStorage />} />
        <Route path="/app/employee/folders" element={<MyFolders />} />
        <Route path="/app/employee/shared-folders" element={<SharedFolders />} />

        {/* Legacy redirect for bookmark safety */}
        <Route path="/app/my-files" element={<Navigate to="/app/employee/files" replace />} />
      </Route>
    </Route>

    <Route path="/" element={<Navigate to="/app" replace />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);
