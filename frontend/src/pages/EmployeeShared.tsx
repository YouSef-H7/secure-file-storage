import React, { useState, useEffect, useCallback } from 'react';
import { Users, FileText, Folder, Loader2, FileQuestion, Search, Download, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { FileMetadata } from '../types/file';

interface SharedFolderItem {
  id: string;
  name: string;
  created_at: string;
  shared_at: string;
  owner_email: string;
}

const EmployeeShared = () => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [folders, setFolders] = useState<SharedFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchShared = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [filesData, foldersData] = await Promise.all([
        api.request('/api/files/shared-with-me').catch(() => []),
        api.request('/api/folders/shared-with-me').catch(() => [])
      ]);

      setFiles(Array.isArray(filesData) ? filesData : []);
      setFolders(Array.isArray(foldersData) ? foldersData : []);
    } catch (err: any) {
      setError("Failed to retrieve shared content.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShared();
  }, [fetchShared]);

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

  const q = searchQuery.toLowerCase();
  const filteredFiles = files.filter(file => (file.name ?? '').toLowerCase().includes(q));
  const filteredFolders = folders.filter(folder =>
    (folder.name ?? '').toLowerCase().includes(q) ||
    (folder.owner_email ?? '').toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight font-heading">Shared with Me</h1>
        <p className="text-slate-400 text-sm">Files and folders shared by other users</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/80 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="text-slate-400 animate-spin mb-4" />
          <p className="text-sm text-slate-600">Loading shared content...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-10 bg-red-50 rounded-xl border border-red-100">
          <FileQuestion size={48} className="text-red-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Error</h3>
          <p className="text-sm text-slate-600 text-center mb-4">{error}</p>
          <button
            onClick={fetchShared}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredFiles.length === 0 && filteredFolders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Users size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No shared content</h3>
          <p className="text-sm text-slate-600 text-center mb-6 max-w-sm">
            {searchQuery ? 'No items match your search.' : 'When colleagues share files or folders with you, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredFolders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Folder size={20} className="text-purple-600" />
                Shared Folders
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-4 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <Folder size={20} fill="currentColor" className="text-purple-200" stroke="currentColor" />
                      </div>
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded">Shared</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2 truncate" title={folder.name}>
                      {folder.name}
                    </h3>
                    <p className="text-xs text-slate-600 mb-3">Owner: {folder.owner_email}</p>
                    <Link
                      to={`/app/employee/files?folderId=${folder.id}`}
                      className="block w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-xs font-medium transition-colors text-center"
                    >
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredFiles.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Shared Files
              </h2>
              <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider">File Name</th>
                        <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider">Owner</th>
                        <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider">Size</th>
                        <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider">Shared</th>
                        <th className="text-right py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFiles.map((file: any) => (
                        <tr key={file.id} className="even:bg-slate-50/40 hover:bg-[#f0f9f4] transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold ${getFileTypeColor(file.mimeType || '')}`}>
                                {getFileTypeLabel(file.mimeType || '')}
                              </div>
                              <span className="text-sm text-slate-900 font-medium">{file.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-600">
                            {file.owner?.email || 'Unknown'}
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-600 font-mono">{formatSize(file.size || 0)}</td>
                          <td className="py-4 px-6 text-sm text-slate-600">
                            {file.sharedAt ? new Date(file.sharedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600" title="Download">
                                <Download size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeShared;
