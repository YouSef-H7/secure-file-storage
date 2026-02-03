import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  UploadCloud,
  Loader2,
  Filter,
  FileQuestion,
  Search,
  MoreVertical
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
        const normalizeFile = (item: any) => ({
          ...item,
          id: item.id,
          name: item.name ?? item.filename ?? '',
          mimeType: item.mimeType ?? 'application/octet-stream',
          createdAt: item.createdAt ?? item.created_at,
          size: item.size ?? 0
        });
        setFiles(data.map(normalizeFile));
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

    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("File too large (Max 100MB).");
      return;
    }

    setUploading(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      const formData = new FormData();
      formData.append('is_deleted', 'false');
      formData.append('file', file);
      for (const [key, value] of formData.entries()) {
        console.log('[FORMDATA ASSERT]', key, value instanceof File ? 'File' : value);
      }
      console.log('[FORMDATA] Sending to:', '/api/files/upload');
      await api.request('/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {}
      });
      await fetchFiles();
    } catch (err) {
      alert("Ingestion protocol failure.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Move this file to Trash?')) return;
    try {
      await api.request(`/api/files/${id}`, { method: 'DELETE' });
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      alert("Failed to move file to trash.");
    }
  };

  const filteredFiles = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const m = (s: string | undefined) => s ?? '';
    return files.filter(file => {
      const name = m(file.name);
      const mime = m(file.mimeType);
      const matchesSearch = name.toLowerCase().includes(q);
      const isImage = mime.startsWith('image/');
      const isDoc = mime.includes('pdf') || mime.includes('text') || mime.includes('word');

      if (activeTab === 'images') return matchesSearch && isImage;
      if (activeTab === 'docs') return matchesSearch && isDoc;
      return matchesSearch;
    });
  }, [files, searchQuery, activeTab]);

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let val = bytes;
    let unitIdx = 0;
    while (val >= 1024 && unitIdx < units.length - 1) {
      val /= 1024;
      unitIdx++;
    }
    return `${val.toFixed(1)} ${units[unitIdx]}`;
  };

  const getFileTypeColor = (mimeType: string | undefined) => {
    const m = mimeType ?? '';
    if (m.includes('pdf')) return 'bg-red-100 text-red-700';
    if (m.includes('word') || m.includes('document')) return 'bg-blue-100 text-blue-700';
    if (m.includes('sheet') || m.includes('excel')) return 'bg-green-100 text-green-700';
    if (m.includes('presentation') || m.includes('powerpoint')) return 'bg-orange-100 text-orange-700';
    if (m.startsWith('image/')) return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-700';
  };

  const getFileTypeLabel = (mimeType: string | undefined) => {
    const m = mimeType ?? '';
    if (m.includes('pdf')) return 'PDF';
    if (m.includes('word') || m.includes('document')) return 'DOCX';
    if (m.includes('sheet') || m.includes('excel')) return 'XLSX';
    if (m.includes('presentation') || m.includes('powerpoint')) return 'PPTX';
    if (m.startsWith('image/')) return m.split('/')[1].toUpperCase();
    return 'FILE';
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Global File Repository</h1>
          <p className="text-text-secondary text-sm">Enterprise-wide visibility for organization administrators</p>
        </div>
        <div>
          <button className="flex items-center gap-2 bg-brand text-white px-4 py-2.5 rounded-xl hover:bg-brand-dark transition-all shadow-md hover:shadow-lg active:scale-95 text-sm font-medium">
            <Download size={18} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <input
            type="text"
            placeholder="Search repository..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all shadow-sm"
          />
        </div>
        <button
          className="px-4 py-2.5 bg-surface border border-border rounded-xl text-text-secondary hover:bg-slate-50 hover:text-text-primary transition-all flex items-center gap-2 font-medium text-sm shadow-sm hover:shadow-md active:scale-95"
        >
          <Filter size={18} />
          <span className="hidden sm:inline">Filters</span>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'all' ? 'bg-brand/10 text-brand' : 'text-text-secondary hover:text-text-primary'}`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'docs' ? 'bg-brand/10 text-brand' : 'text-text-secondary hover:text-text-primary'}`}
        >
          Documents
        </button>
      </div>

      <div className="bg-surface rounded-2xl shadow-md shadow-slate-200/50 border border-border overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="text-brand-light animate-spin mb-4" />
            <p className="text-sm text-text-secondary">Loading global repository...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-10 bg-error/5 rounded-xl border border-error/10">
            <FileQuestion size={48} className="text-error/30 mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Access Error</h3>
            <p className="text-sm text-text-secondary text-center mb-4">{error}</p>
            <button
              onClick={fetchFiles}
              className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-10">
            <Search size={48} className="text-slate-300 mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No matching files</h3>
            <p className="text-sm text-text-secondary text-center">
              Try adjusting your search criteria or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">File Name</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Owner</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Size</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Upload Date</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="text-right py-4 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold ${getFileTypeColor(file.mimeType)}`}>
                          {getFileTypeLabel(file.mimeType)}
                        </div>
                        <span className="text-sm text-text-primary font-medium">{file.name ?? file.filename ?? ''}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-text-primary">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center text-[10px] font-bold text-brand">
                          A
                        </div>
                        <span>Admin User</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-text-secondary font-mono">{formatSize(file.size ?? 0)}</td>
                    <td className="py-4 px-6 text-sm text-text-secondary">
                      {new Date(file.createdAt ?? file.created_at ?? 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Encrypted
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-200 text-text-secondary opacity-0 group-hover:opacity-100 group-hover:text-text-primary">
                        <MoreVertical size={18} />
                      </button>
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
