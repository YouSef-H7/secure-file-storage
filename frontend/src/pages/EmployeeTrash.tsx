import React, { useState, useEffect, useRef } from 'react';
import PageTransition from '../components/PageTransition';
import { Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { api, notifyFilesChanged } from '../lib/api';

interface TrashFile {
  id: string;
  name: string;
  size?: number;
  createdAt?: string;
  created_at?: string;
  mimeType?: string;
}

const EmployeeTrash = () => {
  const [items, setItems] = useState<TrashFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTrash = () => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setItems([]); // Clear stale state
    setLoading(true);
    // api.request uses credentials: 'include' (session cookie) for BFF auth
    // If ever using userId in path/query, use encodeURIComponent(userId) so # and @ do not break the URL
    api.request('/api/files/trash', { signal: abortController.signal })
      .then((data: TrashFile[] | unknown) => {
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }
        const arr = Array.isArray(data) ? data : [];
        console.log('[TRASH RAW RESPONSE]', arr.length, data);
        setItems(arr);
      })
      .catch((err: any) => {
        // Ignore abort errors
        if (err.name === 'AbortError') {
          return;
        }
        setItems([]);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    fetchTrash();
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleRestore = async (id: string) => {
    if (restoringId) return;
    setRestoringId(id);
    try {
      await api.request(`/api/files/${id}/restore`, { method: 'POST' });
      setItems(prev => prev.filter(f => f.id !== id));
      notifyFilesChanged();
    } catch {
      alert('Restore failed.');
    } finally {
      setRestoringId(null);
    }
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="text-slate-400 animate-spin mb-4" />
        <p className="text-sm text-slate-600">Loading trash...</p>
      </div>
    );
  }

  return (
    <PageTransition><div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight font-heading">Trash</h1>
        <p className="text-slate-500 text-sm">Deleted files (30-day retention)</p>
      </div>

      {!loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-xl border border-slate-200 border-dashed">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Trash2 size={32} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Trash is empty</h2>
          <p className="text-slate-500 text-center max-w-sm">
            Items moved to trash will be permanently deleted after 30 days.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider">Name</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider">Size</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider">Deleted</th>
                  <th className="text-right py-4 px-6 text-xs font-semibold text-brand uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((file) => (
                  <tr key={file.id} className="even:bg-slate-50/40 hover:bg-[#f0f9f4] transition-colors duration-150">
                    <td className="py-4 px-6 text-sm text-slate-900 font-medium">{file.name ?? file.id}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 font-mono">{formatSize(file.size ?? 0)}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">
                      {new Date(file.createdAt ?? file.created_at ?? 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleRestore(file.id)}
                        disabled={restoringId === file.id}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-70 transition-colors"
                      >
                        {restoringId === file.id ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div></PageTransition>
  );
};

export default EmployeeTrash;
