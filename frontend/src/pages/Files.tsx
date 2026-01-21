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

export default FileManager;
