import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Loader2, AlertCircle, Folder, FileText } from 'lucide-react';
import { api } from '../lib/api';

const PublicShare = () => {
  const { token } = useParams<{ token: string }>();
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    api.request(`/api/public/share/${token}`)
      .then((data) => {
        setFile(data); // Will contain type: 'file' | 'folder'
        setError(null);
      })
      .catch((err: any) => {
        setError(err.message || 'Share link not found or expired');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownload = () => {
    if (token) {
      window.location.href = `/api/public/share/${token}/download`;
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={32} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Link Not Available</h2>
          <p className="text-slate-600">{error || 'This share link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        {file.type === 'file' ? (
          <>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Shared File</h2>
            <div className="mb-6">
              <p className="text-lg text-slate-700 font-medium mb-1">{file.filename}</p>
              <p className="text-sm text-slate-500">
                {formatSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={handleDownload}
              className="w-full bg-brand text-white py-3 px-4 rounded-lg font-medium hover:bg-brand-dark transition-colors flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Download File
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Shared Folder</h2>
            <div className="mb-6">
              <p className="text-lg text-slate-700 font-medium mb-1">{file.name}</p>
              <p className="text-sm text-slate-500">
                {file.contents?.length || 0} items • {new Date(file.created_at).toLocaleDateString()}
              </p>
            </div>
            {file.contents && file.contents.length > 0 && (
              <div className="mb-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {file.contents.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                      {item.type === 'folder' ? (
                        <Folder size={16} className="text-slate-500" />
                      ) : (
                        <FileText size={16} className="text-slate-500" />
                      )}
                      <span className="text-sm text-slate-700">{item.name}</span>
                      {item.size && (
                        <span className="text-xs text-slate-500 ml-auto">
                          {formatSize(item.size)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-slate-500 text-center">
              Sign in to access folder contents
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PublicShare;
