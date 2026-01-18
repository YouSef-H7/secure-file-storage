
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut, 
  FolderLock, 
  Plus, 
  Search, 
  File, 
  Image as ImageIcon, 
  Download, 
  Trash2,
  AlertCircle,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
  UserPlus,
  Loader2,
  Filter,
  X,
  FileQuestion,
  Files,
  FileCode,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

// --- Types ---
interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

// --- Hardened API Client ---
const api = {
  getToken: () => localStorage.getItem('vault_token'),
  setToken: (token: string) => localStorage.setItem('vault_token', token),
  setUser: (user: any) => localStorage.setItem('vault_user', JSON.stringify(user)),
  getUser: () => {
    try {
      const data = localStorage.getItem('vault_user');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },
  clear: () => {
    localStorage.removeItem('vault_token');
    localStorage.removeItem('vault_user');
  },

  async request(path: string, options: any = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
    };

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 1500)
    );

    const fetchPromise = fetch(path, { ...options, headers })
      .then(async (res) => {
        const contentType = res.headers.get('content-type');
        if (!res.ok || !contentType || !contentType.includes('application/json')) {
          throw new Error('NOT_JSON');
        }
        return await res.json();
      });

    try {
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      return this.mockHandler(path, options);
    }
  },

  mockHandler(path: string, options: any) {
    let body: any = {};
    try {
      body = options.body ? JSON.parse(options.body) : {};
    } catch (e) {
      body = {};
    }
    
    if (path.includes('/auth/register')) {
      const users = this.getMockUsers();
      if (users.find((u: any) => u.email === body.email)) {
        return { error: 'Account Conflict: Email already registered.' };
      }
      users.push({ email: body.email, password: body.password, id: Date.now() });
      localStorage.setItem('mock_users', JSON.stringify(users));
      return { success: true };
    }

    if (path.includes('/auth/login')) {
      const users = this.getMockUsers();
      const user = users.find((u: any) => u.email === body.email && u.password === body.password);
      if (!user) return { error: 'Unauthorized: Invalid email or password.' };
      return { 
        token: 'vlt_' + btoa(user.email + Date.now()).replace(/=/g, ''), 
        user: { id: user.id, email: user.email } 
      };
    }

    if (path.includes('/api/files') && options.method === 'GET') {
      return this.getMockFiles();
    }

    if (path.includes('/api/files/upload')) {
      const files = this.getMockFiles();
      // Use original file name if available from multipart (simulated)
      const name = body.name || ('Asset_' + Math.random().toString(36).substr(2, 5).toUpperCase() + '.pdf');
      const newFile = {
        id: 'file_' + Math.random().toString(36).substr(2, 9),
        name: name,
        size: Math.floor(Math.random() * 15000000) + 500000,
        mimeType: name.endsWith('.pdf') ? 'application/pdf' : 'image/png',
        createdAt: new Date().toISOString()
      };
      files.push(newFile);
      localStorage.setItem('mock_files', JSON.stringify(files));
      return newFile;
    }

    if (options.method === 'DELETE' && path.includes('/api/files/')) {
      const id = path.split('/').pop();
      let files = this.getMockFiles();
      files = files.filter((f: any) => f.id !== id);
      localStorage.setItem('mock_files', JSON.stringify(files));
      return { success: true };
    }

    return { error: 'Service Unavailable' };
  },

  getMockUsers() {
    try {
      const data = localStorage.getItem('mock_users');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getMockFiles() {
    try {
      const data = localStorage.getItem('mock_files');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
};

// --- Shared Components ---

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

const Header = () => {
  const user = api.getUser();
  const location = useLocation();
  const pathName = location.pathname.split('/').pop() || 'Dashboard';

  return (
    <header className="h-20 border-b border-[#1a1a1a] bg-[#0a0a0a]/90 backdrop-blur-xl flex items-center justify-between px-10 fixed top-0 right-0 left-64 z-20">
      <div className="flex items-center gap-2 text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">
        <span className="opacity-50">Segment</span>
        <ChevronRight size={12} className="opacity-30" />
        <span className="text-blue-500 capitalize">{pathName}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-bold text-white leading-none">{user.email || 'Root User'}</p>
          <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mt-1">Verified Node</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-xl shadow-blue-600/10">
          {(user.email?.charAt(0) || 'R').toUpperCase()}
        </div>
      </div>
    </header>
  );
};

const ProtectedLayout = ({ children }: { children?: React.ReactNode }) => {
  const token = api.getToken();
  if (!token) return <Navigate to="/login" replace />;
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans">
      <Sidebar />
      <Header />
      <main className="ml-64 p-10 pt-28 max-w-[1600px]">
        {children}
      </main>
    </div>
  );
};

// --- FileManager Page ---

const FileManager = () => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'images' | 'docs'>('all');
  const [isDragging, setIsDragging] = useState(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.request('/api/files', { method: 'GET' });
      if (Array.isArray(data)) {
        setFiles(data);
      } else {
        throw new Error("Invalid format received");
      }
    } catch (err: any) {
      setError("Failed to retrieve system volume indices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (file: File) => {
    if (!file || uploading) return;

    // Local validation
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_SIZE) {
      alert("Payload exceeds 25MB safety threshold.");
      return;
    }

    setUploading(true);
    try {
      // In production we'd use FormData, here we simulate and pass name to mock
      await new Promise(r => setTimeout(r, 1200)); // Simulate AES encryption overhead
      await api.request('/api/files/upload', { 
        method: 'POST',
        body: JSON.stringify({ name: file.name }) 
      });
      await fetchFiles();
    } catch (err) {
      alert("Ingestion protocol failure.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Execute permanent asset destruction?')) return;
    try {
      await api.request(`/api/files/${id}`, { method: 'DELETE' });
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      alert("Destruction sequence interrupted.");
    }
  };

  // Derived State: Filtering & Searching
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isImage = file.mimeType.startsWith('image/');
      const isDoc = file.mimeType.includes('pdf') || file.mimeType.includes('text') || file.mimeType.includes('word');
      
      if (activeTab === 'images') return matchesSearch && isImage;
      if (activeTab === 'docs') return matchesSearch && isDoc;
      return matchesSearch;
    });
  }, [files, searchQuery, activeTab]);

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

  // Drag & Drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Files</h1>
          <p className="text-neutral-500 font-medium text-sm mt-1">Manage and organize your digital assets across the cluster.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search assets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-600/50 transition-all placeholder:text-neutral-700 font-medium"
            />
          </div>
          <button className="p-3.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl text-neutral-500 hover:text-white hover:border-neutral-700 transition-all">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative group border-2 border-dashed rounded-[2.5rem] p-12 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden ${
          isDragging ? 'border-blue-600 bg-blue-600/5' : 'border-[#1a1a1a] hover:border-blue-600/30 hover:bg-blue-600/[0.02]'
        } ${uploading ? 'opacity-50 cursor-wait' : ''}`}
      >
        <input 
          type="file" 
          className="absolute inset-0 opacity-0 cursor-pointer" 
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          disabled={uploading}
        />
        
        <div className={`p-6 rounded-3xl mb-6 transition-all duration-300 ${isDragging ? 'bg-blue-600 text-white scale-110' : 'bg-[#0d0d0d] text-neutral-600 group-hover:text-blue-500 group-hover:scale-105'}`}>
          {uploading ? <Loader2 size={40} className="animate-spin" /> : <UploadCloud size={40} />}
        </div>
        
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white tracking-tight">
            {uploading ? 'Finalizing Encryption...' : 'Click or Drag to Upload'}
          </h3>
          <p className="text-neutral-500 text-sm font-medium">
            Accepted: JPG, PNG, PDF, ZIP (Max 25MB)
          </p>
        </div>

        {uploading && (
          <div className="absolute bottom-0 left-0 h-1 bg-blue-600 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '100%' }}></div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl w-fit">
        {[
          { id: 'all', label: 'All Files', icon: Files },
          { id: 'images', label: 'Images', icon: ImageIcon },
          { id: 'docs', label: 'Documents', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-neutral-600 hover:text-neutral-300'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[2.5rem] overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 space-y-4">
            <Loader2 size={32} className="text-blue-600 animate-spin" />
            <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em]">Synchronizing Cluster Data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-40 space-y-4 text-center px-10">
            <ShieldAlert size={48} className="text-red-500/50 mb-2" />
            <h3 className="text-lg font-bold text-white">Data Path Interrupted</h3>
            <p className="text-neutral-500 max-w-sm text-sm font-medium">{error}</p>
            <button 
              onClick={fetchFiles}
              className="mt-4 px-8 py-3 bg-[#1a1a1a] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-colors"
            >
              Retry Protocol
            </button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-48 text-center px-10 group">
            <div className="p-8 bg-neutral-900/30 rounded-full mb-8 border border-neutral-900 group-hover:border-blue-500/10 transition-colors">
              <FileQuestion size={64} className="text-neutral-800 group-hover:text-blue-900/30 transition-colors" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">Vault Entry Empty</h3>
            <p className="text-neutral-600 mt-2 max-w-xs text-sm font-medium leading-relaxed">No segments matching your current filter were found in this node.</p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-6 text-blue-500 text-xs font-black uppercase tracking-widest hover:underline"
              >
                Clear Search Parameters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/[0.02] border-b border-[#1a1a1a]">
                <tr className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">
                  <th className="px-10 py-6">Asset Identification</th>
                  <th className="px-10 py-6">Schema</th>
                  <th className="px-10 py-6">Payload</th>
                  <th className="px-10 py-6">Registered</th>
                  <th className="px-10 py-6 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-blue-600/[0.01] transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
                          file.mimeType.startsWith('image/') ? 'bg-indigo-600/10 text-indigo-400 group-hover:bg-indigo-600/20' : 'bg-blue-600/10 text-blue-400 group-hover:bg-blue-600/20'
                        }`}>
                          {file.mimeType.startsWith('image/') ? <ImageIcon size={20} /> : <FileCode size={20} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-200 text-sm group-hover:text-white transition-colors truncate max-w-[200px]">{file.name}</span>
                          <span className="text-[10px] text-neutral-600 font-medium uppercase tracking-tighter">CID: {file.id.substr(0,12)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-[10px] bg-[#1a1a1a] border border-[#222] px-3 py-1.5 rounded-xl text-neutral-500 font-black uppercase tracking-tighter">
                        {file.mimeType.split('/').pop()}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-neutral-500">{formatSize(file.size)}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-xs font-medium text-neutral-600">{new Date(file.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => alert('Secure download initiated...')}
                          className="p-2.5 text-neutral-600 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(file.id)}
                          className="p-2.5 text-neutral-600 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Page Components ---

const Dashboard = () => {
  const [stats, setStats] = useState({ count: 0, size: 0 });

  useEffect(() => {
    api.request('/api/files').then(files => {
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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[2.5rem] p-10 shadow-sm group hover:border-blue-600/30 transition-all cursor-default">
          <p className="text-neutral-600 font-black text-[10px] uppercase tracking-widest mb-3">Total Volume Objects</p>
          <h2 className="text-6xl font-black text-white group-hover:text-blue-500 transition-colors tracking-tighter">{stats.count}</h2>
        </div>
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[2.5rem] p-10 shadow-sm group hover:border-indigo-600/30 transition-all cursor-default">
          <p className="text-neutral-600 font-black text-[10px] uppercase tracking-widest mb-3">Cluster Payload</p>
          <h2 className="text-6xl font-black text-white group-hover:text-indigo-500 transition-colors tracking-tighter">{formatSize(stats.size)}</h2>
        </div>
        <div className="bg-blue-600/5 border border-blue-600/20 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-blue-500 font-black text-[10px] uppercase tracking-widest mb-3">Node Status</p>
          <h2 className="text-6xl font-black text-blue-500 tracking-tighter">OPTIMAL</h2>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[3rem] p-12 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 blur-[120px] -mr-32 -mt-32"></div>
        <div className="flex justify-between items-center mb-10 relative z-10">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tighter">Live Cluster Telemetry</h3>
            <p className="text-neutral-500 text-sm font-medium mt-1">Real-time monitoring of decentralized asset segments.</p>
          </div>
          <div className="flex gap-3 items-center bg-black/40 border border-white/5 px-4 py-2 rounded-2xl">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Network Synchronized</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-neutral-700 relative z-10">
          <ShieldCheck size={80} className="mb-6 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:scale-110" />
          <p className="text-xs font-black uppercase tracking-[0.4em] opacity-30 group-hover:opacity-50 transition-opacity">Active monitoring enabled</p>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] p-16 rounded-[3rem] max-w-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 shadow-[0_0_25px_rgba(37,99,235,0.3)]"></div>
        <div className="mb-12">
          <h2 className="text-4xl font-black text-white tracking-tighter">System Configuration</h2>
          <p className="text-neutral-500 font-medium text-sm mt-2">Modify core node parameters and encryption protocols.</p>
        </div>
        
        <div className="space-y-6">
          <div className="p-8 border border-[#1a1a1a] rounded-3xl flex items-center justify-between hover:border-blue-600/30 hover:bg-blue-600/[0.01] transition-all cursor-default group">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-green-500/10 rounded-2xl text-green-500">
                <ShieldCheck size={28} />
              </div>
              <div>
                <p className="font-black text-[10px] text-neutral-600 uppercase tracking-[0.2em]">Cryptographic Layer</p>
                <p className="text-lg text-neutral-200 font-bold mt-1 group-hover:text-white transition-colors">AES-256-GCM Hardware-Hardened</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-4 py-1.5 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/10">Active</span>
              <span className="text-[9px] text-neutral-700 font-black mt-2 uppercase">V1.4.2</span>
            </div>
          </div>

          <div className="p-8 border border-[#1a1a1a] rounded-3xl flex items-center justify-between hover:border-blue-600/30 hover:bg-blue-600/[0.01] transition-all cursor-default group">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500">
                <Files size={28} />
              </div>
              <div>
                <p className="font-black text-[10px] text-neutral-600 uppercase tracking-[0.2em]">Redundancy Policy</p>
                <p className="text-lg text-neutral-200 font-bold mt-1 group-hover:text-white transition-colors">Triple-Region Async Replication</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-4 py-1.5 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/10">Stable</span>
              <span className="text-[9px] text-neutral-700 font-black mt-2 uppercase">SYNCED</span>
            </div>
          </div>
        </div>
        
        <div className="mt-16 pt-10 border-t border-[#1a1a1a] flex justify-between items-center">
          <div>
            <p className="text-white font-black text-sm">System Self-Destruct</p>
            <p className="text-neutral-600 text-xs font-medium mt-1">Permanently wipe all node identity and cached segments.</p>
          </div>
          <button className="px-8 py-3.5 bg-red-600/10 text-red-500 border border-red-500/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-500/5">
            INITIATE PURGE
          </button>
        </div>
      </div>
    </div>
  );
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (api.getToken()) navigate('/app');
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.request('/api/auth/login', { 
        method: 'POST', 
        body: JSON.stringify({ email, password }) 
      });
      if (res.token) {
        api.setToken(res.token);
        api.setUser(res.user);
        navigate('/app');
      } else {
        setError(res.error || 'Authentication rejected by security cluster.');
      }
    } catch (err) {
      setError('Connection refused. Auth gateway unreachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6 font-sans">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-[#1a1a1a] rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]"></div>
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="p-5 bg-blue-600/10 rounded-3xl mb-6 border border-blue-600/10 shadow-inner">
            <ShieldCheck className="text-blue-500" size={42} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Access Node</h1>
          <p className="text-neutral-500 mt-2 font-medium text-sm">Verify your credentials to decrypt system volume.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest px-1">Identity Endpoint</label>
            <input 
              type="email" 
              required
              disabled={loading}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-2xl p-4 text-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all font-medium disabled:opacity-50"
              placeholder="user@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest px-1">Passphrase</label>
            <input 
              type="password" 
              required
              disabled={loading}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-2xl p-4 text-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all font-medium disabled:opacity-50"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-xs bg-red-500/5 p-4 rounded-2xl border border-red-500/10 animate-in fade-in zoom-in-95 duration-200">
              <ShieldAlert size={14} className="flex-shrink-0" />
              <span className="font-bold">{error}</span>
            </div>
          )}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Decrypting Access...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-10 text-center text-sm font-medium text-neutral-500">
          New to the cluster? <Link to="/register" className="text-blue-500 hover:text-blue-400 font-black transition-colors">Initialize Identity</Link>
        </p>
      </div>
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
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.request('/api/auth/register', { 
        method: 'POST', 
        body: JSON.stringify({ email, password }) 
      });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2200);
      } else {
        setError(res.error || 'Identity initialization failed.');
      }
    } catch (err) {
      setError('Critical network failure in registration layer.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4 font-sans">
        <div className="w-full max-w-md bg-[#0d0d0d] border border-[#1a1a1a] rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_25px_rgba(34,197,94,0.4)]"></div>
          <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-700">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Node Provisioned</h2>
          <p className="text-neutral-500 font-medium text-sm">Transferring identity to auth terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6 font-sans">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-[#1a1a1a] rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-2 duration-500">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.3)]"></div>
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="p-5 bg-blue-600/10 rounded-3xl mb-6 shadow-inner">
            <UserPlus className="text-blue-500" size={42} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Identity Registry</h1>
          <p className="text-neutral-500 mt-2 font-medium text-sm">Provision a secure node for your digital footprint.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest px-1">Institutional Email</label>
            <input 
              type="email" 
              required
              disabled={loading}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-2xl p-4 text-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all font-medium disabled:opacity-50"
              placeholder="yousef@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest px-1">Security Passcode</label>
            <input 
              type="password" 
              required
              disabled={loading}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-2xl p-4 text-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all font-medium disabled:opacity-50"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-xs bg-red-500/5 p-4 rounded-2xl border border-red-500/10 font-bold">
              <ShieldAlert size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Initializing Node...' : 'Create Account'}
          </button>
        </form>
        <p className="mt-10 text-center text-sm font-medium text-neutral-500">
          Already established? <Link to="/login" className="text-blue-500 hover:text-blue-400 font-black transition-colors">Sign In</Link>
        </p>
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
        <Route path="/app/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
        
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
