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
    <header className="h-20 border-b border-[#1a1a1a] bg-[#0a0a0a]/90 backdrop-blur-xl flex items-center justify-between px-10 fixed top-0 right-0 left-64 z-20">
      <div className="flex items-center gap-2 text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">
        <span className="opacity-50">Segment</span>
        <ChevronRight size={12} className="opacity-30" />
        <span className="text-blue-500 capitalize">{pathName}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-bold text-white leading-none">{user?.email || 'Authenticated User'}</p>
          <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mt-1">Verified Node</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-xl shadow-blue-600/10">
          {(user?.email?.charAt(0) || 'U').toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="ml-4 p-2 hover:bg-neutral-900 rounded-lg transition-colors disabled:opacity-50"
          title="Logout"
        >
          <LogOut size={18} className="text-neutral-400 hover:text-red-500" />
        </button>
      </div>
    </header>
  );
};

export default Header;
