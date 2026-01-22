import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function ProtectedLayout() {
  const auth = useAuth();

  if (auth.isLoading) {
    return null;
  }

  if (!auth.user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#050509] text-slate-50">
      <Sidebar />
      <Header />
      <main className="pl-64 pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

