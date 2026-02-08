import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Folder, Loader2, FileQuestion, Search, Download, Eye } from 'lucide-react';
import AnimatedFolder from '../components/AnimatedFolder';
import PageTransition from '../components/PageTransition';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface SharedFolderItem {
  id: string;
  name: string;
  created_at: string;
  shared_at: string;
  owner_email: string;
}

const SharedFolders = () => {
  const [folders, setFolders] = useState<SharedFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.request('/api/folders/shared-with-me');
      if (Array.isArray(data)) {
        setFolders(data);
      } else {
        throw new Error("Invalid format received");
      }
    } catch (err: any) {
      setError("Failed to retrieve shared folders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const q = searchQuery.toLowerCase();
  const filteredFolders = folders.filter(folder =>
    (folder.name ?? '').toLowerCase().includes(q) ||
    (folder.owner_email ?? '').toLowerCase().includes(q)
  );

  return (
    <PageTransition><div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight font-heading">Shared Folders</h1>
        <p className="text-slate-400 text-sm">Folders shared with you by colleagues</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search folders or owners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/80 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-transparent transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="text-slate-400 animate-spin mb-4" />
          <p className="text-sm text-slate-600">Loading shared folders...</p>
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
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No shared folders</h3>
          <p className="text-sm text-slate-600 text-center mb-6 max-w-sm">
            {searchQuery ? 'No folders match your search.' : 'No folders have been shared with you yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFolders.map((folder) => (
            <motion.div
              key={folder.id}
              whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(13,77,46,0.12)' }}
              className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5 hover:border-brand transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <AnimatedFolder />
                <span className="px-2.5 py-1 bg-purple-50 text-purple-600 text-[11px] font-medium rounded-md">Shared</span>
              </div>

              <h3 className="text-[15px] font-semibold text-slate-900 mb-1.5 truncate" title={folder.name}>
                {folder.name}
              </h3>
              <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Owner:</span>
                  <span className="truncate">{folder.owner_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Shared:</span>
                  <span>{new Date(folder.shared_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
              <Link
                to={`/app/employee/files?folderId=${folder.id}`}
                className="block w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition-colors text-center"
              >
                Browse Folder
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div></PageTransition>
  );
};

export default SharedFolders;
