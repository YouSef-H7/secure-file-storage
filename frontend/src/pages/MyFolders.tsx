import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Folder, FolderPlus, Share2, Trash2, Edit2, Loader2, FileQuestion, Search } from 'lucide-react';
import { api } from '../lib/api';
import { ShareModal } from '../components/ShareModal';

interface FolderItem {
  id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  file_count: number;
}

const MyFolders = () => {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.request('/api/folders');
      if (Array.isArray(data)) {
        setFolders(data);
      } else {
        throw new Error("Invalid format received");
      }
    } catch (err: any) {
      setError("Failed to retrieve folders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleCreateFolder = async () => {
    const name = prompt("Folder Name:");
    if (!name || !name.trim()) return;
    try {
      await api.request('/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() })
      });
      fetchFolders();
    } catch (e) {
      alert("Failed to create folder");
    }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!confirm(`Delete folder "${name}"? This will not delete files inside.`)) return;
    try {
      await api.request(`/api/folders/${id}`, { method: 'DELETE' });
      fetchFolders();
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const handleRenameFolder = async (id: string) => {
    if (!editName.trim()) {
      setEditingFolder(null);
      return;
    }
    try {
      await api.request(`/api/folders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim() })
      });
      setEditingFolder(null);
      fetchFolders();
    } catch (err) {
      alert("Rename failed.");
    }
  };

  const openShare = (folder: FolderItem) => {
    setSelectedFolder(folder);
    setShareModalOpen(true);
  };

  const q = searchQuery.toLowerCase();
  const filteredFolders = folders.filter(folder => (folder.name ?? '').toLowerCase().includes(q));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">My Folders</h1>
          <p className="text-slate-400 text-sm">Organize your files with folders</p>
        </div>
        <button
          onClick={handleCreateFolder}
          className="px-4 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
        >
          <FolderPlus size={18} />
          <span>New Folder</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/80 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-transparent transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="text-slate-400 animate-spin mb-4" />
          <p className="text-sm text-slate-600">Loading folders...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-10 bg-red-50/60 rounded-xl border border-red-100/80">
          <FileQuestion size={48} className="text-red-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Error</h3>
          <p className="text-sm text-slate-600 text-center mb-4">{error}</p>
          <button
            onClick={fetchFolders}
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredFolders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-10 border-2 border-dashed border-slate-200/80 rounded-xl bg-slate-50/50">
          <Folder size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No folders</h3>
          <p className="text-sm text-slate-600 text-center mb-6 max-w-sm">
            {searchQuery ? 'No folders match your search.' : 'Create your first folder to organize files.'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleCreateFolder}
              className="text-slate-900 hover:text-slate-700 font-medium text-sm"
            >
              Create folder
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              className="bg-white rounded-xl shadow-card border border-slate-200/80 p-5 hover:shadow-card-hover transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-brand/10 text-brand rounded-lg">
                  <Folder size={22} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingFolder(folder.id);
                      setEditName(folder.name);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                    title="Rename"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => openShare(folder)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                    title="Share"
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteFolder(folder.id, folder.name)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {editingFolder === folder.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRenameFolder(folder.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameFolder(folder.id);
                      if (e.key === 'Escape') setEditingFolder(null);
                    }}
                    className="w-full px-3 py-2 border border-slate-200/80 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/40"
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <h3 className="text-[15px] font-semibold text-slate-900 mb-1.5 truncate" title={folder.name}>
                    {folder.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{folder.file_count || 0} files</span>
                    <span>•</span>
                    <span>{new Date(folder.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <Link
                    to={`/app/employee/files?folderId=${folder.id}`}
                    className="block mt-4 w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition-colors text-center"
                  >
                    Open Folder
                  </Link>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setSelectedFolder(null);
        }}
        file={selectedFolder ? { id: selectedFolder.id, name: selectedFolder.name } : { id: '', name: '' }}
        isFolder={true}
      />
    </div>
  );
};

export default MyFolders;
