import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Download,
  Trash2,
  UploadCloud,
  Loader2,
  FileQuestion,
  Search,
  Grid3x3,
  List,
  UserPlus,
  FolderPlus,
  ChevronLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ShareModal } from '../components/ShareModal';
import AnimatedFolder from '../components/AnimatedFolder';
import PageTransition from '../components/PageTransition';
import { FileMetadata } from '../types/file';
import { api, notifyFilesChanged } from '../lib/api';

const EmployeeFiles = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [folders, setFolders] = useState<{ id: string, name: string }[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(searchParams.get('folderId') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFileForShare, setSelectedFileForShare] = useState<FileMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const currentFolderIdRef = useRef<string | null>(searchParams.get('folderId') || null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMountRef = useRef<boolean>(true);

  // Sync currentFolderId from URL searchParams (single source of truth)
  useEffect(() => {
    const folderId = searchParams.get('folderId') || null;
    if (folderId !== currentFolderId) {
      // Clear state when folder changes
      setFiles([]);
      setFolders([]);
      setCurrentFolderId(folderId);
      currentFolderIdRef.current = folderId;
    }
  }, [searchParams]); // Only depend on searchParams, not currentFolderId

  const fetchContent = useCallback(async () => {
    // Guard: Prevent concurrent requests
    if (isFetchingRef.current) {
      return;
    }
    
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Mark as fetching
    isFetchingRef.current = true;
    
    // Read currentFolderId from ref (stable reference)
    const folderId = currentFolderIdRef.current;
    
    // Clear stale state FIRST
    setFiles([]);
    setFolders([]);
    setError(null);
    setLoading(true);
    
    try {
      const endpoint = folderId ? `/api/folders/${folderId}/items` : `/api/files`;
      const data = await api.request(endpoint, {
        signal: abortController.signal
      });
      
      // Check if request was aborted BEFORE any state updates
      if (abortController.signal.aborted) {
        return;
      }

      const normalizeFile = (item: any) => ({
        ...item,
        id: item.id,
        name: item.name ?? item.filename ?? '',
        mimeType: item.mimeType ?? 'application/octet-stream',
        createdAt: item.createdAt ?? item.created_at,
        size: item.size ?? 0
      });
      if (data && typeof data === 'object' && 'files' in data) {
        const rawFiles = Array.isArray(data.files) ? data.files : [];
        const rawFolders = Array.isArray(data.folders) ? data.folders : [];
        setFiles(rawFiles.map(normalizeFile));
        setFolders(rawFolders);
      } else if (Array.isArray(data)) {
        setFiles(data.map(normalizeFile));
        setFolders([]);
      } else {
        setFiles([]);
        setFolders([]);
      }
    } catch (err: any) {
      // Check if aborted BEFORE any state updates
      if (abortController.signal.aborted || err.name === 'AbortError') {
        return; // Early return - no state updates
      }
      // Only update state if NOT aborted
      setError("Failed to retrieve content.");
      setFiles([]);
      setFolders([]);
    } finally {
      // Only update loading state if NOT aborted
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, []); // No dependencies - reads from ref

  // Debounced fetch effect - triggers fetch when currentFolderId changes
  useEffect(() => {
    // Update ref immediately
    currentFolderIdRef.current = currentFolderId;
    
    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // On initial mount, fetch immediately (no debounce)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      fetchContent();
      return;
    }
    
    // For subsequent changes, debounce the fetch
    debounceTimeoutRef.current = setTimeout(() => {
      fetchContent();
    }, 150);
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [currentFolderId, fetchContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleCreateFolder = async () => {
    const name = prompt("Folder Name:");
    if (!name || !name.trim()) return;
    try {
      await api.request('/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), parentFolderId: currentFolderId })
      });
      fetchContent();
    } catch (e) {
      alert("Failed to create folder");
    }
  };

  const handleUpload = async (file: File) => {
    if (!file || uploading) return;

    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("File too large (Max 100MB).");
      return;
    }

    const effectiveFolderId = searchParams.get('folderId') || currentFolderId || null;
    console.log('[UPLOAD] currentFolderId:', currentFolderId);
    console.log('[UPLOAD] effectiveFolderId:', effectiveFolderId);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('is_deleted', 'false');
      if (effectiveFolderId) formData.append('folderId', effectiveFolderId);
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

      fetchContent();
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Move this file to trash?')) return;
    try {
      await api.request(`/api/files/${id}`, { method: 'DELETE' });
      setFiles(prev => prev.filter(f => f.id !== id));
      notifyFilesChanged();
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const openShare = (file: FileMetadata) => {
    setSelectedFileForShare(file);
    setShareModalOpen(true);
  };

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

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(file => (file.name ?? file.filename ?? '').toLowerCase().includes(q));
  }, [files, searchQuery]);

  const filteredFolders = useMemo(() => {
    if (!searchQuery) return folders;
    const q = searchQuery.toLowerCase();
    return folders.filter(folder => (folder.name ?? '').toLowerCase().includes(q));
  }, [folders, searchQuery]);

  return (
    <PageTransition><div className="space-y-6">
      <div className="flex items-center gap-4">
        {currentFolderId && (
          <button 
            onClick={() => setSearchParams({})} 
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight font-heading">
            {currentFolderId ? 'Folder View' : 'My Files'}
          </h1>
          <p className="text-slate-400 text-sm">Manage your personal secure documents</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          className="hidden"
        />

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/80 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-transparent transition-all shadow-sm"
          />
        </div>

        <motion.button 
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleCreateFolder} 
          className="px-4 py-2.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-900 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <FolderPlus size={18} className="text-slate-600" />
          <span>New Folder</span>
        </motion.button>

        <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'grid' ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Grid3x3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'list' ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <List size={18} />
          </button>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`px-4 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2 ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
          <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
        </motion.button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="text-slate-400 animate-spin mb-4" />
          <p className="text-sm text-slate-600">Loading secure files...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-10 bg-red-50 rounded-xl border border-red-100 shadow-sm">
          <FileQuestion size={48} className="text-red-300 mb-4 opacity-60" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Unavailable</h3>
          <p className="text-sm text-slate-600 text-center mb-4">{error}</p>
          <button
            onClick={fetchContent}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      ) : !loading && filteredFiles.length === 0 && filteredFolders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <UploadCloud size={48} className="text-slate-400 mb-4 opacity-60" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Empty Folder</h3>
          <p className="text-sm text-slate-600 text-center mb-6 max-w-sm">
            Upload files or create subfolders to get started.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95 font-medium text-sm"
          >
            Click to upload
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFolders.map((folder) => (
            <motion.div 
              key={folder.id}
              whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(13,77,46,0.12)' }}
              onClick={() => setSearchParams({ folderId: folder.id })}
              className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-4 hover:shadow-md transition-all duration-200 group cursor-pointer flex items-center gap-3"
            >
              <AnimatedFolder />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{folder.name}</h3>
                <p className="text-xs text-slate-600">Folder</p>
              </div>
            </motion.div>
          ))}

          {filteredFiles.map((file) => (
            <motion.div key={file.id} whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(13,77,46,0.12)' }} className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-4 hover:shadow-md transition-all duration-200 group cursor-default">
              <div className="flex justify-between items-start mb-3">
                <div className={`${getFileTypeColor(file.mimeType)} px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide`}>
                  {getFileTypeLabel(file.mimeType)}
                </div>
                <button 
                  onClick={() => handleDelete(file.id)} 
                  className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" 
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-900 truncate flex-1" title={file.name ?? file.filename}>{file.name ?? file.filename}</h3>
                <button 
                  onClick={() => openShare(file)} 
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors opacity-0 group-hover:opacity-100" 
                  title="Share"
                >
                  <UserPlus size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 mt-4 pt-4 border-t border-slate-200">
                <span className="font-mono">{formatSize(file.size ?? 0)}</span>
                <span>{new Date(file.createdAt ?? file.created_at ?? 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider">Name</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider">Size</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider">Modified</th>
                  <th className="text-right py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFolders.map((folder) => (
                  <tr 
                    key={folder.id} 
                    onClick={() => setSearchParams({ folderId: folder.id })} 
                    className="even:bg-slate-50/40 hover:bg-[#f0f9f4] transition-colors duration-150 group cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <AnimatedFolder className="w-8 h-8" />
                        <span className="text-sm text-slate-900 font-medium">{folder.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">-</td>
                    <td className="py-4 px-6 text-sm text-slate-600">-</td>
                    <td className="py-4 px-6 text-right"></td>
                  </tr>
                ))}

                {filteredFiles.map((file) => (
                  <tr key={file.id} className="even:bg-slate-50/40 hover:bg-[#f0f9f4] transition-colors duration-150 group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold ${getFileTypeColor(file.mimeType)}`}>
                          {getFileTypeLabel(file.mimeType)}
                        </div>
                        <span className="text-sm text-slate-900 font-medium">{file.name ?? file.filename}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 font-mono">{formatSize(file.size ?? 0)}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">
                      {new Date(file.createdAt ?? file.created_at ?? 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-200 text-slate-600 hover:shadow-sm" title="Download">
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openShare(file); }} 
                          className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all duration-200 hover:shadow-sm" 
                          title="Share"
                        >
                          <UserPlus size={18} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                          className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all duration-200 hover:shadow-sm"
                          title="Delete"
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
        </div>
      )}

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setSelectedFileForShare(null);
        }}
        file={selectedFileForShare || { id: '', name: '' }}
      />
    </div></PageTransition>
  );
};

export default EmployeeFiles;
