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
    <aside className="w-64 bg-[#0d0d0d] border-r border-[#1a1a1a] flex flex-col h-screen fixed z-30">
      <div className="p-8 flex items-center gap-3">
        <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
          <FolderLock className="text-white" size={22} />
        </div>
        <span className="font-bold text-xl text-white tracking-tighter">VaultStore</span>
      </div>
      
      <nav className="flex-1 px-4 space-y-1.5 mt-4">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600/10 text-blue-500 border border-blue-500/10' 
                  : 'text-neutral-500 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span className="font-semibold text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-[#1a1a1a]">
        <button 
          onClick={() => { api.clear(); navigate('/login'); }}
          className="flex items-center gap-3 w-full px-4 py-3 text-neutral-500 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all"
        >
          <LogOut size={18} />
          <span className="font-semibold text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
