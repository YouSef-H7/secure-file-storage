import React, { useEffect, useState, useRef } from 'react';
import { Upload, FileText, TrendingUp, HardDrive, Loader2 } from 'lucide-react';
import { api, notifyFilesChanged } from '../lib/api';

const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

interface StatsMe {
  totalFiles: number;
  totalStorage: number;
  filesThisWeek: number;
  recentActivity: Array<{ id: string; name: string; created_at: string; action: string }>;
}

const EmployeeDashboard = () => {
  const [stats, setStats] = useState<StatsMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStats = () => {
    api.request('/api/stats/me').then((data: StatsMe) => {
      if (data && typeof data.totalFiles === 'number') {
        setStats({
          totalFiles: data.totalFiles ?? 0,
          totalStorage: data.totalStorage ?? 0,
          filesThisWeek: data.filesThisWeek ?? 0,
          recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : []
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const onFilesChanged = () => fetchStats();
    window.addEventListener('securestore:files-changed', onFilesChanged);
    return () => window.removeEventListener('securestore:files-changed', onFilesChanged);
  }, []);

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

      await api.request('/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {}
      });

      fetchStats();
      notifyFilesChanged();
      alert("File uploaded successfully!");
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

  const storageUsed = stats?.totalStorage ?? 0;
  const storageTotal = STORAGE_QUOTA_BYTES;
  const storagePercent = storageTotal > 0 ? Math.min((storageUsed / storageTotal) * 100, 100) : 0;
  const storageUsedGB = (storageUsed / (1024 * 1024 * 1024)).toFixed(1);
  const storageTotalGB = (storageTotal / (1024 * 1024 * 1024)).toFixed(1);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="text-slate-400 animate-spin mb-4" />
        <p className="text-sm text-slate-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">My Dashboard</h1>
        <p className="text-slate-600 text-sm">Quick access to your files and storage</p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        className="hidden"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer ${uploading ? 'opacity-70 pointer-events-none' : ''}`}
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-slate-900 rounded-lg mb-4">
              {uploading ? <Loader2 className="text-white animate-spin" size={24} /> : <Upload className="text-white" size={24} />}
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{uploading ? 'Uploading...' : 'Upload File'}</h3>
            <p className="text-sm text-slate-600">Add new files to your storage</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="text-blue-600" size={24} />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{stats?.totalFiles ?? 0}</div>
          <div className="text-sm text-slate-600">Total Files</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{stats?.filesThisWeek ?? 0}</div>
          <div className="text-sm text-slate-600">Files This Week</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Storage Usage</h3>
          <p className="text-sm text-slate-600">Your personal storage allocation</p>
        </div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{storageUsedGB} GB</div>
            <div className="text-sm text-slate-600">of {storageTotalGB} GB used</div>
          </div>
          <div className="text-right">
            <div className="p-3 bg-slate-100 rounded-lg mb-2">
              <HardDrive className="text-slate-600" size={24} />
            </div>
            <div className="text-sm font-medium text-slate-900">{Math.round(storagePercent)}% Full</div>
          </div>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div className="bg-slate-900 h-3 rounded-full" style={{ width: `${storagePercent}%` }}></div>
        </div>
        <div className="text-sm text-slate-600 mt-2">{(parseFloat(storageTotalGB) - parseFloat(storageUsedGB)).toFixed(1)} GB remaining</div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
