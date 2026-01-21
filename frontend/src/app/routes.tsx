import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/Login';
import RegisterPage from '../pages/Register';
import Callback from '../pages/Callback';
import Dashboard from '../pages/Dashboard';
import FileManager from '../pages/Files';
import SettingsPage from '../pages/Settings';
import ProtectedLayout from '../layouts/ProtectedLayout';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans">
      <Sidebar />
      <Header />
      <main className="ml-64 p-10 pt-28 max-w-[1600px]">
        {children}
      </main>
    </div>
  );
}

export const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/callback" element={<Callback />} />

    {/* Protected */}
    <Route element={<ProtectedLayout />}>
      <Route
        path="/app"
        element={
          <AppShell>
            <Dashboard />
          </AppShell>
        }
      />
      <Route
        path="/app/files"
        element={
          <AppShell>
            <FileManager />
          </AppShell>
        }
      />
      <Route
        path="/app/settings"
        element={
          <AppShell>
            <SettingsPage />
          </AppShell>
        }
      />
    </Route>

    {/* Redirects */}
    <Route path="/" element={<Navigate to="/app" replace />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

