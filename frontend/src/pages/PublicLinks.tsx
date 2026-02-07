import React, { useState, useEffect, useRef } from 'react';
import { Link as LinkIcon, Copy, Check, FileText, Folder, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface PublicLink {
  id: string;
  shareToken: string;
  type: 'file' | 'folder';
  entityId: string;
  name: string;
  size: number | null;
  createdAt: string;
  expiresAt: string | null;
  publicUrl: string;
}

const PublicLinks = () => {
  const [links, setLinks] = useState<PublicLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLinks = async () => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setLinks([]); // Clear stale state
    setLoading(true);
    setError(null);
    try {
      const data = await api.request('/api/share-links', {
        signal: abortController.signal
      });
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }
      
      setLinks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError') {
        return;
      }
      setError(err.message || 'Failed to fetch share links');
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchLinks();
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-';
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
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9]">
        <Loader2 size={32} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9]">
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8 max-w-md text-center">
          <AlertCircle size={44} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-heading">Public Links</h1>
      </div>

      {!loading && links.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8 text-center">
          <LinkIcon size={44} className="text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No Public Links</h2>
          <p className="text-slate-500 text-sm">Generate share links from files or folders to see them here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-brand uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-brand uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-brand uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-brand uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-brand uppercase tracking-wider">Link</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-brand uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {links.map((link) => (
                  <tr key={link.id} className="even:bg-slate-50/40 hover:bg-[#f0f9f4]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {link.type === 'file' ? (
                        <FileText size={20} className="text-slate-500" />
                      ) : (
                        <Folder size={20} className="text-slate-500" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900">{link.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatSize(link.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(link.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-[11px] bg-slate-50 px-2 py-1 rounded-md text-slate-600 border border-slate-100">
                        {link.publicUrl}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleCopy(link.publicUrl, link.id)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm"
                      >
                        {copiedId === link.id ? (
                          <>
                            <Check size={14} />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            Copy
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicLinks;
