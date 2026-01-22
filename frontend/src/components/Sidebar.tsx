import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  FolderLock
} from 'lucide-react';
import { api } from '../lib/api';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const menuItems = [
    { name: 'Dashboard', path: '/app', icon: LayoutDashboard },
    { name: 'Files', path: '/app/files', icon: FileText },
    { name: 'Security Nodes', path: '/app/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-[#060712] via-[#050510] to-[#04040b] border-r border-neutral-900 flex flex-col h-screen fixed z-30 shadow-[20px_0_60px_rgba(15,23,42,0.55)]">
      <div className="px-7 pt-8 pb-6 flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-blue-500 via-sky-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-600/35 ring-1 ring-white/10">
          <FolderLock className="text-white" size={22} />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-neutral-400 uppercase tracking-[0.3em]">
            Secure Vault
          </span>
          <span className="font-bold text-xl text-slate-50 tracking-tight leading-tight">
            VaultStore
          </span>
        </div>
      </div>
      
      <nav className="flex-1 px-3 space-y-1.5 mt-2 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 border border-transparent relative ${
                isActive 
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/25 shadow-[0_0_24px_rgba(37,99,235,0.35)]'
                  : 'text-neutral-500 hover:bg-white/[0.03] hover:text-slate-50 hover:border-neutral-800'
              }`}
            >
              <span
                className={`absolute left-1 top-2 bottom-2 w-0.5 rounded-full bg-blue-500/80 transition-opacity duration-200 ${
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                }`}
              />
              <item.icon size={18} className="shrink-0" />
              <span className="font-medium text-sm tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-neutral-900/90 bg-gradient-to-t from-black/40 via-transparent">
        <button 
          onClick={() => { api.clear(); navigate('/login'); }}
          className="flex items-center gap-3 w-full px-4 py-3 text-neutral-500 hover:text-red-400 hover:bg-red-500/5 rounded-2xl transition-all duration-150 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050510]"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
