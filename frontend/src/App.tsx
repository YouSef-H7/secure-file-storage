
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut, 
  FolderLock, 
  Plus, 
  File, 
  Image as ImageIcon, 
  Download, 
  Trash2,
  AlertCircle,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
  User,
  Search,
  CheckCircle2
} from 'lucide-react';
import { api } from './lib/api';
import { motion, AnimatePresence } from 'framer-motion';

// --- Components ---

const Sidebar = () => {
  const location = useLocation();
  const menuItems = [
    { name: 'Dashboard', path: '/app', icon: LayoutDashboard },
    { name: 'My Files', path: '/app/files', icon: FileText },
    { name: 'Settings', path: '/app/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col h-screen fixed z-30">
      <div className="p-8 flex items-center gap-3">
        <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20">
          <FolderLock className="text-white" size={24} />
        </div>
        <span className="font-bold text-xl text-white tracking-tighter">SecureVault</span>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-6">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                isActive 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-inner' 
                  : 'text-neutral-500 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span className="font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-border">
        <button 
          onClick={() => { localStorage.clear(); window.location.reload(); }}
          className="flex items-center gap-3 w-full px-4 py-3 text-neutral-500 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-colors"
        >
          <LogOut size={18} />
          <span className="font-semibold">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

const Header = () => {
  const userStr = localStorage.getItem('vlt_user');
  const user = userStr ? JSON.parse(userStr) : { email: 'User' };
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'Dashboard';

  return (
    <header className="h-20 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-10 fixed top-0 right-0 left-64 z-20">
      <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-widest">
        <span>Workspace</span>
        <ChevronRight size={14} />
        <span className="text-white capitalize">{currentPath}</span>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
          <input 
            type="text" 
            placeholder="Search assets..." 
            className="bg-surface border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-all w-64"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-white leading-none">{user.email}</p>
            <p className="text-[10px] text-primary font-black uppercase tracking-tighter mt-1">Enterprise Access</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-sm font-black text-white shadow-xl shadow-primary/20">
            {user.email.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

// Fix: Change children to optional to prevent React/TS errors when using the component in element prop of Route
const ProtectedLayout = ({ children }: { children?: React.ReactNode }) => {
  if (!localStorage.getItem('vlt_token')) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-background text-neutral-200">
      <Sidebar />
      <Header />
      <main className="ml-64 p-10 pt-28">
        {children}
      </main>
    </div>
  );
};

// --- Pages ---

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('vlt_token', res.token);
      localStorage.setItem('vlt_user', JSON.stringify(res.user));
      navigate('/app');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-surface border border-border rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-blue-400 to-indigo-600"></div>
        <div className="flex flex-col items-center mb-10">
          <div className="p-5 bg-primary/10 rounded-3xl mb-6 shadow-inner">
            <ShieldCheck className="text-primary" size={48} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Access Vault</h1>
          <p className="text-neutral-500 mt-2 font-medium">Verify your organizational identity</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-neutral-500 uppercase tracking-widest px-1">Institutional Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-black/40 border border-border rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              placeholder="name@corp.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-neutral-500 uppercase tracking-widest px-1">Passcode</label>
            <input 
              type="password" 
              required
              className="w-full bg-black/40 border border-border rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-red-400 text-sm bg-red-400/5 p-4 rounded-2xl border border-red-400/10"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}
          <button 
            disabled={loading}
            className="w-full bg-primary hover:bg-blue-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/30 active:scale-[0.98]"
          >
            {loading ? 'Authenticating...' : 'Authorize Access'}
          </button>
        </form>
        <p className="mt-10 text-center text-sm font-medium text-neutral-500">
          New system user? <Link to="/register" className="text-primary hover:underline font-bold">Initialize Identity</Link>
        </p>
      </motion.div>
    </div>
  );
};

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/register', { email, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-[3rem] p-12 text-center shadow-2xl">
          <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <CheckCircle2 size={56} />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">Identity Ready</h2>
          <p className="text-neutral-500 font-medium">System initialized. Redirecting to terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-surface border border-border rounded-[2.5rem] p-10 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-10">
          <h1 className="text-4xl font-black text-white tracking-tighter">New Node</h1>
          <p className="text-neutral-500 mt-2 font-medium">Provision your secure account credentials</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-neutral-500 uppercase tracking-widest px-1">Institutional Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-black/40 border border-border rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              placeholder="name@corp.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-neutral-500 uppercase tracking-widest px-1">Passcode</label>
            <input 
              type="password" 
              required
              className="w-full bg-black/40 border border-border rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/5 p-4 rounded-2xl border border-red-400/10 font-bold">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          <button 
            disabled={loading}
            className="w-full bg-primary hover:bg-blue-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/30 active:scale-[0.98]"
          >
            {loading ? 'Initializing...' : 'Provision Node'}
          </button>
        </form>
        <p className="mt-10 text-center text-sm font-medium text-neutral-500">
          Already verified? <Link to="/login" className="text-primary hover:underline font-bold">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({ count: 0, size: 0 });

  useEffect(() => {
    api.get('/api/files').then(files => {
      if (Array.isArray(files)) {
        setStats({
          count: files.length,
          size: files.reduce((acc, f) => acc + f.size, 0)
        });
      }
    });
  }, []);

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let val = bytes;
    let unitIdx = 0;
    while (val > 1024 && unitIdx < units.length - 1) {
      val /= 1024;
      unitIdx++;
    }
    return `${val.toFixed(1)} ${units[unitIdx]}`;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-surface border border-border rounded-[2rem] p-10 shadow-sm group hover:border-primary/40 transition-all cursor-default">
          <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest mb-3">Total Objects</p>
          <h2 className="text-5xl font-black text-white group-hover:text-primary transition-colors">{stats.count}</h2>
        </div>
        <div className="bg-surface border border-border rounded-[2rem] p-10 shadow-sm group hover:border-blue-500/40 transition-all cursor-default">
          <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest mb-3">Vault Usage</p>
          <h2 className="text-5xl font-black text-white group-hover:text-blue-500 transition-colors">{formatSize(stats.size)}</h2>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-[2rem] p-10 shadow-sm">
          <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em] mb-3">System Health</p>
          <h2 className="text-5xl font-black text-primary uppercase">Optimal</h2>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-[2.5rem] p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32"></div>
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-2xl font-black text-white tracking-tighter">Recent Telemetry</h3>
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Real-time Sync</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-neutral-700">
          <ShieldCheck size={72} className="mb-6 opacity-5 group-hover:opacity-10 transition-opacity" />
          <p className="text-xs font-black uppercase tracking-[0.4em]">Listening for volume events...</p>
        </div>
      </div>
    </div>
  );
};

const FileManager = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = async () => {
    const data = await api.get('/api/files');
    if (Array.isArray(data)) setFiles(data);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await api.upload('/api/files/upload', formData);
      fetchFiles();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanent asset destruction. Confirm?')) return;
    await api.delete(`/api/files/${id}`);
    fetchFiles();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-surface border border-border p-10 rounded-[2.5rem] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16"></div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Storage Node</h1>
          <p className="text-neutral-500 font-medium text-sm mt-1">Immutable assets stored across production volumes</p>
        </div>
        <label className="cursor-pointer bg-primary hover:bg-blue-600 text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 transition-all shadow-2xl shadow-primary/30 active:scale-95 disabled:opacity-50 text-sm tracking-tight">
          {uploading ? <UploadCloud className="animate-bounce" size={22} /> : <Plus size={22} />}
          {uploading ? 'ENCRYPTING...' : 'DEPOSIT ASSET'}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-white/[0.02] border-b border-border">
            <tr className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">
              <th className="px-10 py-6">Identity</th>
              <th className="px-10 py-6">Format</th>
              <th className="px-10 py-6">Payload</th>
              <th className="px-10 py-6">Registered</th>
              <th className="px-10 py-6 text-right">Ops</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={5} className="px-10 py-32 text-center animate-pulse text-neutral-600 font-black uppercase text-xs tracking-widest">Hydrating Volume Index...</td></tr>
            ) : files.length === 0 ? (
              <tr><td colSpan={5} className="px-10 py-48 text-center text-neutral-800">
                <div className="flex flex-col items-center">
                  <File size={56} className="mb-4 opacity-5" />
                  <p className="text-xs font-black uppercase tracking-[0.3em]">No data segments found</p>
                </div>
              </td></tr>
            ) : (
              files.map((file) => (
                <tr key={file.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className={`p-3.5 rounded-2xl ${file.mimeType.includes('image') ? 'bg-indigo-600/10 text-indigo-400' : 'bg-primary/10 text-primary'}`}>
                        {file.mimeType.includes('image') ? <ImageIcon size={20} /> : <File size={20} />}
                      </div>
                      <span className="font-bold text-neutral-200 text-sm">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="text-[10px] bg-black border border-border px-3 py-1.5 rounded-xl text-neutral-500 font-black uppercase tracking-tighter">
                      {file.mimeType.split('/').pop()}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-xs font-bold text-neutral-600">{(file.size / 1024 / 1024).toFixed(2)} MB</td>
                  <td className="px-10 py-6 text-xs font-bold text-neutral-600">{new Date(file.createdAt).toLocaleDateString()}</td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={api.downloadUrl(file.id)}
                        className="p-3 text-neutral-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        download
                      >
                        <Download size={20} />
                      </a>
                      <button 
                        onClick={() => handleDelete(file.id)}
                        className="p-3 text-neutral-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- App Root ---

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route path="/app" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/app/files" element={<ProtectedLayout><FileManager /></ProtectedLayout>} />
        <Route path="/app/settings" element={<ProtectedLayout>
          <div className="bg-surface border border-border p-12 rounded-[3rem] max-w-2xl shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
             <h2 className="text-3xl font-black text-white mb-10 tracking-tighter">Protocol Configuration</h2>
             <div className="space-y-8">
               <div className="p-6 border border-border rounded-2xl flex items-center justify-between hover:border-primary/20 transition-all cursor-default group">
                 <div>
                   <p className="font-black text-[10px] text-neutral-500 uppercase tracking-widest">Encryption Schema</p>
                   <p className="text-neutral-200 font-bold mt-1 group-hover:text-primary transition-colors">AES-256-GCM Hardware-Accelerated</p>
                 </div>
                 <CheckCircle2 className="text-green-500" size={24} />
               </div>
               <div className="p-6 border border-border rounded-2xl flex items-center justify-between hover:border-primary/20 transition-all cursor-default group">
                 <div>
                   <p className="font-black text-[10px] text-neutral-500 uppercase tracking-widest">Volume Status</p>
                   <p className="text-neutral-200 font-bold mt-1 group-hover:text-primary transition-colors">OCI Block Volume /data [Healthy]</p>
                 </div>
                 <CheckCircle2 className="text-green-500" size={24} />
               </div>
             </div>
          </div>
        </ProtectedLayout>} />
        
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
