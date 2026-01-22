import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const pathName = location.pathname.split('/').pop() || 'Dashboard';
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="h-20 border-b border-neutral-900 bg-gradient-to-r from-[#050509]/95 via-[#050509]/95 to-[#050509]/95 backdrop-blur-xl flex items-center justify-between px-10 fixed top-0 right-0 left-64 z-20 shadow-[0_0_40px_rgba(15,23,42,0.45)]">
      <div className="flex items-center gap-2 text-[10px] font-black text-neutral-500 uppercase tracking-[0.22em]">
        <span className="opacity-60">Segment</span>
        <ChevronRight size={12} className="opacity-40" />
        <span className="text-blue-400 capitalize">{pathName}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-50 leading-none">
            {user?.email || 'Authenticated User'}
          </p>
          <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.28em] mt-1 flex items-center gap-1 justify-end">
            <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse" />
            Verified Node
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-sky-500 flex items-center justify-center text-xs font-black text-white shadow-xl shadow-blue-600/30 ring-1 ring-white/5">
          {(user?.email?.charAt(0) || 'U').toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="ml-4 p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050509]"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;
