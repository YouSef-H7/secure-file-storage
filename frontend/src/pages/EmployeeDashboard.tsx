import React, { useEffect, useState, useRef } from 'react';
import { Upload, FileText, TrendingUp, HardDrive, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

const EmployeeDashboard = () => {
  const [stats, setStats] = useState({ count: 0, size: 0 });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStats = () => {
    api.request('/api/files').then(files => {
      if (Array.isArray(files)) {
        setStats({
          count: files.length,
          size: files.reduce((acc, f) => acc + f.size, 0)
        });
      }
    });
  };

  useEffect(() => {
    fetchStats();
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
      await new Promise(r => setTimeout(r, 1000));

      const formData = new FormData();
      formData.append('file', file);

      await api.request('/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {}
      });

      fetchStats();
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

  const storageUsed = 2.1;
  const storageTotal = 5;
  const storagePercent = (storageUsed / storageTotal) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">My Dashboard</h1>
        <p className="text-slate-600 text-sm">Quick access to your files and storage</p>
      </div>

      {/* Hidden File Input */}
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
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">+12</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">127</div>
          <div className="text-sm text-slate-600">Total Files</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">+8%</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">24</div>
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
            <div className="text-3xl font-bold text-slate-900 mb-1">{storageUsed} GB</div>
            <div className="text-sm text-slate-600">of {storageTotal} GB used</div>
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
        <div className="text-sm text-slate-600 mt-2">{storageTotal - storageUsed} GB remaining</div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
