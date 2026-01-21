import React, { useEffect, useState } from 'react';
import { ShieldCheck, Files } from 'lucide-react';
import { api } from '../lib/api';

const Dashboard = () => {
  const [stats, setStats] = useState({ count: 0, size: 0 });

  useEffect(() => {
    api.request('/api/files').then(files => {
      if (Array.isArray(files)) {
        setStats({
          count: files.length,
          size: files.reduce((acc, f) => acc + f.size, 0)
        });
      }
    });
  }, []);

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let val = bytes;
    let unitIdx = 0;
    while (val > 1024 && unitIdx < units.length - 1) {
      val /= 1024;
      unitIdx++;
    }
    return `${val.toFixed(1)} ${units[unitIdx]}`;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[2.5rem] p-10 shadow-sm group hover:border-blue-600/30 transition-all cursor-default">
          <p className="text-neutral-600 font-black text-[10px] uppercase tracking-widest mb-3">Total Volume Objects</p>
          <h2 className="text-6xl font-black text-white group-hover:text-blue-500 transition-colors tracking-tighter">{stats.count}</h2>
        </div>
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[2.5rem] p-10 shadow-sm group hover:border-indigo-600/30 transition-all cursor-default">
          <p className="text-neutral-600 font-black text-[10px] uppercase tracking-widest mb-3">Cluster Payload</p>
          <h2 className="text-6xl font-black text-white group-hover:text-indigo-500 transition-colors tracking-tighter">{formatSize(stats.size)}</h2>
        </div>
        <div className="bg-blue-600/5 border border-blue-600/20 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-blue-500 font-black text-[10px] uppercase tracking-widest mb-3">Node Status</p>
          <h2 className="text-6xl font-black text-blue-500 tracking-tighter">OPTIMAL</h2>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[3rem] p-12 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 blur-[120px] -mr-32 -mt-32"></div>
        <div className="flex justify-between items-center mb-10 relative z-10">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tighter">Live Cluster Telemetry</h3>
            <p className="text-neutral-500 text-sm font-medium mt-1">Real-time monitoring of decentralized asset segments.</p>
          </div>
          <div className="flex gap-3 items-center bg-black/40 border border-white/5 px-4 py-2 rounded-2xl">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Network Synchronized</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-neutral-700 relative z-10">
          <ShieldCheck size={80} className="mb-6 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:scale-110" />
          <p className="text-xs font-black uppercase tracking-[0.4em] opacity-30 group-hover:opacity-50 transition-opacity">Active monitoring enabled</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
