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
  Folder,
  FolderPlus,
  ChevronLeft
} from 'lucide-react';
import { ShareModal } from '../components/ShareModal';
import { FileMetadata } from '../types/file';
import { api } from '../lib/api';

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

  useEffect(() => {
    if (currentFolderId) {
      setSearchParams({ folderId: currentFolderId });
    } else {
      setSearchParams({});
    }
  }, [currentFolderId, setSearchParams]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = currentFolderId ? `/api/folders/${currentFolderId}/items` : `/api/files`;
      const data = await api.request(endpoint);

      if (data && typeof data === 'object' && 'files' in data) {
        setFiles(Array.isArray(data.files) ? data.files : []);
        setFolders(Array.isArray(data.folders) ? data.folders : []);
      } else if (Array.isArray(data)) {
        setFiles(data);
        setFolders([]);
      } else {
        setFiles([]);
        setFolders([]);
      }
    } catch (err: any) {
      setError("Failed to retrieve content.");
      setFiles([]);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

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

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolderId) {
        formData.append('folderId', currentFolderId);
      }

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
    if (!confirm('Delete this file permanently?')) return;
    try {
      await api.request(`/api/files/${id}`, { method: 'DELETE' });
      setFiles(prev => prev.filter(f => f.id !== id));
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

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'bg-red-100 text-red-700';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'bg-blue-100 text-blue-700';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'bg-green-100 text-green-700';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'bg-orange-100 text-orange-700';
    if (mimeType.startsWith('image/')) return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-700';
  };

  const getFileTypeLabel = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'DOCX';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'XLSX';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PPTX';
    if (mimeType.startsWith('image/')) return mimeType.split('/')[1].toUpperCase();
    return 'FILE';
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(file => {
      return file.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [files, searchQuery]);

  const filteredFolders = useMemo(() => {
    if (!searchQuery) return folders;
    return folders.filter(folder => {
      return folder.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [folders, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {currentFolderId && (
          <button 
            onClick={() => setCurrentFolderId(null)} 
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">
            {currentFolderId ? 'Folder View' : 'My Files'}
          </h1>
          <p className="text-slate-600 text-sm">Manage your personal secure documents</p>
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
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all shadow-sm"
          />
        </div>

        <button 
          onClick={handleCreateFolder} 
          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
        >
          <FolderPlus size={18} className="text-slate-600" />
          <span>New Folder</span>
        </button>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-xl transition-all duration-200 ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Grid3x3 size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-xl transition-all duration-200 ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <List size={18} />
          </button>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2 ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
          <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="text-slate-400 animate-spin mb-4" />
          <p className="text-sm text-slate-600">Loading secure files...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-10 bg-red-50 rounded-2xl border border-red-100 shadow-sm">
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
      ) : filteredFiles.length === 0 && filteredFolders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-10 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
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
            <div 
              key={folder.id}
              onClick={() => setCurrentFolderId(folder.id)}
              className="bg-white rounded-2xl shadow-md shadow-slate-200/50 border border-slate-200 p-4 hover:shadow-lg hover:shadow-slate-300/50 transition-all duration-300 hover:-translate-y-0.5 group cursor-pointer flex items-center gap-3"
            >
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shadow-sm">
                <Folder size={24} fill="currentColor" className="text-blue-200" stroke="currentColor" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{folder.name}</h3>
                <p className="text-xs text-slate-600">Folder</p>
              </div>
            </div>
          ))}

          {filteredFiles.map((file) => (
            <div key={file.id} className="bg-white rounded-2xl shadow-md shadow-slate-200/50 border border-slate-200 p-4 hover:shadow-lg hover:shadow-slate-300/50 transition-all duration-300 hover:-translate-y-0.5 group cursor-default">
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
                <h3 className="text-sm font-semibold text-slate-900 truncate flex-1" title={file.name}>{file.name}</h3>
                <button 
                  onClick={() => openShare(file)} 
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors opacity-0 group-hover:opacity-100" 
                  title="Share"
                >
                  <UserPlus size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 mt-4 pt-4 border-t border-slate-200">
                <span className="font-mono">{formatSize(file.size)}</span>
                <span>{new Date(file.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Size</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Modified</th>
                  <th className="text-right py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFolders.map((folder) => (
                  <tr 
                    key={folder.id} 
                    onClick={() => setCurrentFolderId(folder.id)} 
                    className="hover:bg-slate-50/80 transition-colors duration-150 group cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded flex items-center justify-center bg-blue-100 text-blue-600">
                          <Folder size={18} fill="currentColor" className="text-blue-200" stroke="currentColor" />
                        </div>
                        <span className="text-sm text-slate-900 font-medium">{folder.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">-</td>
                    <td className="py-4 px-6 text-sm text-slate-600">-</td>
                    <td className="py-4 px-6 text-right"></td>
                  </tr>
                ))}

                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold ${getFileTypeColor(file.mimeType)}`}>
                          {getFileTypeLabel(file.mimeType)}
                        </div>
                        <span className="text-sm text-slate-900 font-medium">{file.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 font-mono">{formatSize(file.size)}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">
                      {new Date(file.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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
    </div>
  );
};

export default EmployeeFiles;
