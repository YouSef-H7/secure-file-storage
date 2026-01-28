import { useAuth } from '../auth/AuthContext';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Users,
  HardDrive,
  ClipboardList,
  UploadCloud,
  Clock,
  Trash2,
  Folder
} from 'lucide-react';
import { api } from '../lib/api';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Defensive check - if user is not available, don't render
  if (!user) {
    return null;
  }

  const adminMenuItems = [
    { name: 'Dashboard', path: '/app', icon: LayoutDashboard },
    { name: 'Files', path: '/app/files', icon: FileText },
    { name: 'Users', path: '/app/users', icon: Users },
    { name: 'Storage', path: '/app/storage', icon: HardDrive },
    { name: 'Logs', path: '/app/logs', icon: ClipboardList },
  ];

  const employeeMainItems = [
    { name: 'Dashboard', path: '/app/employee/dashboard', icon: LayoutDashboard },
    { name: 'My Files', path: '/app/employee/files', icon: FileText },
    { name: 'Upload', path: '/app/employee/upload', icon: UploadCloud },
    { name: 'Recent', path: '/app/employee/recent', icon: Clock },
    { name: 'Shared with Me', path: '/app/employee/shared', icon: Users },
    { name: 'Trash', path: '/app/employee/trash', icon: Trash2 },
  ];

  const employeeFolderItems = [
    { name: 'My Folders', path: '/app/employee/folders', icon: Folder },
    { name: 'Shared Folders', path: '/app/employee/shared-folders', icon: Folder },
  ];

  const employeeStorageItems = [
    { name: 'Storage Usage', path: '/app/employee/storage', icon: HardDrive },
  ];

  const isAdmin = user?.role === 'admin';

  const NavItem = ({ item }: { item: any }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.name}
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${isActive
          ? 'bg-brand-light text-white shadow-lg shadow-black/20'
          : 'text-slate-300 hover:bg-white/10 hover:text-white hover:translate-x-1'
          }`}
      >
        <item.icon size={18} className={`transition-all duration-300 ${isActive ? 'text-brand-accent' : 'text-slate-400 group-hover:text-slate-200'}`} />
        <span className="text-sm font-medium">{item.name}</span>
      </Link>
    );
  };

  return (
    <aside className="w-64 bg-brand border-r border-brand-dark flex flex-col h-screen fixed z-30 shadow-2xl shadow-black/10">
      <div className="p-6 flex items-center gap-3 border-b border-brand-light/30">
        <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center shadow-sm">
          <span className="text-white text-lg font-bold">S</span>
        </div>
        <span className="font-semibold text-lg text-white tracking-tight">SecureStore</span>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {isAdmin ? (
          <>
            <div className="mb-2 px-3 text-xs font-semibold text-brand-accent uppercase tracking-wider">
              System Admin
            </div>
            {adminMenuItems.map((item) => <NavItem key={item.name} item={item} />)}
          </>
        ) : (
          <>
            <div className="mb-2 px-3 text-xs font-semibold text-brand-accent uppercase tracking-wider">
              Main
            </div>
            {employeeMainItems.map((item) => <NavItem key={item.name} item={item} />)}

            <div className="mt-6 mb-2 px-3 text-xs font-semibold text-brand-accent uppercase tracking-wider">
              Folders
            </div>
            {employeeFolderItems.map((item) => <NavItem key={item.name} item={item} />)}

            <div className="mt-6 mb-2 px-3 text-xs font-semibold text-brand-accent uppercase tracking-wider">
              Storage
            </div>
            {employeeStorageItems.map((item) => <NavItem key={item.name} item={item} />)}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-brand-light/30">
        <button
          onClick={() => { api.clear(); navigate('/login'); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-300 hover:translate-x-1 text-sm"
        >
          <LogOut size={18} className="transition-transform duration-300 group-hover:translate-x-0.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
