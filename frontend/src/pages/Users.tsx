import React from 'react';
import { Users as UsersIcon, Search } from 'lucide-react';

const UsersPage = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Users</h1>
        <p className="text-text-secondary text-sm">Manage user accounts and permissions</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
          />
        </div>
        <button className="px-4 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-medium transition-all shadow-sm">
          Add User
        </button>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-border p-16">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <UsersIcon size={32} className="text-brand" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">User Management</h3>
          <p className="text-text-secondary mb-6">
            This module is currently being configured for your organization. Please contact your system administrator for user provisioning.
          </p>
          <button className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-text-secondary rounded-lg text-sm font-medium transition-colors">
            View Documentation
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
