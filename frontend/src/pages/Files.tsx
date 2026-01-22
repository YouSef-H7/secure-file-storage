import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  File,
  Image as ImageIcon,
  Download,
  Trash2,
  AlertCircle,
  UploadCloud,
  Loader2,
  Filter,
  FileQuestion,
  Files,
  FileCode,
  ShieldAlert,
  Search
} from 'lucide-react';
import { FileMetadata } from '../types/file';
import { api } from '../lib/api';

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

    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_SIZE) {
      alert("Payload exceeds 25MB safety threshold.");
      return;
    }

    setUploading(true);
    try {
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
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-50 tracking-tight">
            Files
          </h1>
          <p className="text-neutral-500 font-medium text-sm mt-2 max-w-xl">
            Manage and organize your digital assets across the cluster with secure, policy-enforced storage.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative group w-full md:min-w-[280px] md:max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-400 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search assets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050510] border border-neutral-900 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/60 transition-all placeholder:text-neutral-700 font-medium shadow-[0_0_0_1px_rgba(15,23,42,0.7)]"
            />
          </div>
          <button className="p-3.5 bg-[#050510] border border-neutral-900 rounded-2xl text-neutral-500 hover:text-slate-50 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all duration-150 shadow-[0_0_0_1px_rgba(15,23,42,0.85)]">
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
          isDragging ? 'border-blue-500/80 bg-blue-500/5 shadow-[0_0_40px_rgba(37,99,235,0.5)]' : 'border-neutral-900 hover:border-blue-500/50 hover:bg-blue-500/[0.02] shadow-[0_18px_45px_rgba(15,23,42,0.85)]'
        } ${uploading ? 'opacity-50 cursor-wait' : ''}`}
      >
        <input 
          type="file" 
          className="absolute inset-0 opacity-0 cursor-pointer" 
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          disabled={uploading}
        />
        
        <div className={`p-6 rounded-3xl mb-6 transition-all duration-300 ${isDragging ? 'bg-blue-500 text-white scale-110 shadow-[0_20px_50px_rgba(37,99,235,0.7)]' : 'bg-[#050510] text-neutral-500 group-hover:text-blue-400 group-hover:scale-105 shadow-[0_12px_35px_rgba(15,23,42,0.9)]'}`}>
          {uploading ? <Loader2 size={40} className="animate-spin" /> : <UploadCloud size={40} />}
        </div>
        
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-slate-50 tracking-tight">
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
      <div className="flex items-center gap-1 p-1 bg-[#050510] border border-neutral-900 rounded-2xl w-fit shadow-[0_10px_30px_rgba(15,23,42,0.9)]">
        {[
          { id: 'all', label: 'All Files', icon: Files },
          { id: 'images', label: 'Images', icon: ImageIcon },
          { id: 'docs', label: 'Documents', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.28em] transition-all ${
              activeTab === tab.id 
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-600/35' 
                : 'text-neutral-500 hover:text-neutral-200'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-[#050510] border border-neutral-900 rounded-[2.5rem] overflow-hidden shadow-[0_22px_80px_rgba(15,23,42,0.95)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 space-y-4">
            <Loader2 size={32} className="text-blue-500 animate-spin" />
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em]">
              Synchronizing Cluster Data...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-40 space-y-4 text-center px-10">
            <ShieldAlert size={48} className="text-red-500/60 mb-2" />
            <h3 className="text-lg font-semibold text-slate-50">Data Path Interrupted</h3>
            <p className="text-neutral-400 max-w-sm text-sm font-medium">
              {error}
            </p>
            <button 
              onClick={fetchFiles}
              className="mt-4 px-8 py-3 bg-[#0b0f1a] text-slate-50 rounded-xl text-[11px] font-black uppercase tracking-[0.28em] hover:bg-blue-600/80 hover:text-white transition-colors border border-neutral-800 hover:border-blue-500/60"
            >
              Retry Protocol
            </button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-48 text-center px-10 group">
            <div className="p-8 bg-neutral-900/40 rounded-full mb-8 border border-neutral-900 group-hover:border-blue-500/20 transition-colors shadow-[0_20px_60px_rgba(15,23,42,0.9)]">
              <FileQuestion size={64} className="text-neutral-800 group-hover:text-blue-500/30 transition-colors" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-50 tracking-tight">
              Vault Entry Empty
            </h3>
            <p className="text-neutral-500 mt-2 max-w-xs text-sm font-medium leading-relaxed">
              No segments matching your current filter were found in this node.
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-6 text-blue-400 text-[11px] font-black uppercase tracking-[0.28em] hover:text-blue-300 hover:underline underline-offset-4"
              >
                Clear Search Parameters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/[0.02] border-b border-neutral-900/90">
                <tr className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.22em]">
                  <th className="px-10 py-6">Asset Identification</th>
                  <th className="px-10 py-6">Schema</th>
                  <th className="px-10 py-6">Payload</th>
                  <th className="px-10 py-6">Registered</th>
                  <th className="px-10 py-6 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/90">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-blue-500/[0.04] transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
                          file.mimeType.startsWith('image/') ? 'bg-indigo-500/10 text-indigo-300 group-hover:bg-indigo-500/20' : 'bg-blue-500/10 text-blue-300 group-hover:bg-blue-500/20'
                        }`}>
                          {file.mimeType.startsWith('image/') ? <ImageIcon size={20} /> : <FileCode size={20} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-100 text-sm group-hover:text-white transition-colors truncate max-w-[220px]">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-tight">
                            CID: {file.id.substr(0,12)}...
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-[10px] bg-[#050814] border border-neutral-800 px-3 py-1.5 rounded-xl text-neutral-300 font-black uppercase tracking-tight">
                        {file.mimeType.split('/').pop()}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-neutral-300">
                          {formatSize(file.size)}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-xs font-medium text-neutral-400">
                        {new Date(file.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => alert('Secure download initiated...')}
                          className="p-2.5 text-neutral-500 hover:text-slate-50 hover:bg-white/5 rounded-xl transition-all duration-150"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(file.id)}
                          className="p-2.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-150"
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

export default FileManager;
