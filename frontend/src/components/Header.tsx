import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const pathName = location.pathname.split('/').pop() || 'Dashboard';
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Defensive check - if user is not available, don't render
  if (!user) {
    return null;
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

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

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || 'user@company.com';

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 fixed top-0 right-0 left-64 z-20">
      <div className="flex items-center gap-2 text-[13px] text-slate-500">
        <span className="text-slate-400">Segment</span>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-slate-800 font-medium capitalize">{pathName}</span>
      </div>
      <div className="flex items-center gap-4 relative">
        <div className="text-right">
          <p className="text-[13px] font-medium text-slate-800">{displayName}</p>
          <p className="text-[11px] text-slate-400">{displayEmail}</p>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg transition-all duration-200"
          >
            <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center">
              <span className="text-brand text-xs font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-400 transition-transform duration-200" style={{ transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg shadow-slate-200/50 border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  handleLogout();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors duration-150 rounded-md"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
