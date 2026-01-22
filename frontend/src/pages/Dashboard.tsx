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
        <div className="bg-[#050510] border border-neutral-900 rounded-[2.2rem] p-8 md:p-10 shadow-[0_18px_45px_rgba(15,23,42,0.55)] group hover:border-blue-500/45 hover:shadow-[0_22px_60px_rgba(37,99,235,0.55)] transition-all duration-300 cursor-default relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-blue-500/5 blur-3xl" />
          <p className="text-neutral-500 font-black text-[10px] uppercase tracking-[0.28em] mb-3">
            Total Volume Objects
          </p>
          <h2 className="text-5xl md:text-6xl font-black text-slate-50 group-hover:text-blue-400 transition-colors tracking-tight">
            {stats.count}
          </h2>
        </div>
        <div className="bg-[#050510] border border-neutral-900 rounded-[2.2rem] p-8 md:p-10 shadow-[0_18px_45px_rgba(15,23,42,0.55)] group hover:border-indigo-500/45 hover:shadow-[0_22px_60px_rgba(79,70,229,0.55)] transition-all duration-300 cursor-default relative overflow-hidden">
          <div className="pointer-events-none absolute -left-16 -bottom-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />
          <p className="text-neutral-500 font-black text-[10px] uppercase tracking-[0.28em] mb-3">
            Cluster Payload
          </p>
          <h2 className="text-5xl md:text-6xl font-black text-slate-50 group-hover:text-indigo-400 transition-colors tracking-tight">
            {formatSize(stats.size)}
          </h2>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 via-blue-600/10 to-sky-500/10 border border-blue-500/35 rounded-[2.2rem] p-8 md:p-10 shadow-[0_20px_50px_rgba(37,99,235,0.6)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/15 via-transparent to-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.28em] mb-3 relative z-10">
            Node Status
          </p>
          <h2 className="text-5xl md:text-6xl font-black text-blue-400 tracking-tight relative z-10">
            OPTIMAL
          </h2>
        </div>
      </div>

      <div className="bg-[#050510] border border-neutral-900 rounded-[3rem] p-10 md:p-12 overflow-hidden relative group shadow-[0_22px_80px_rgba(15,23,42,0.85)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 blur-[120px] -mr-32 -mt-32" />
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10 relative z-10">
          <div>
            <h3 className="text-2xl md:text-3xl font-semibold text-slate-50 tracking-tight">
              Live Cluster Telemetry
            </h3>
            <p className="text-neutral-500 text-sm font-medium mt-2 max-w-xl">
              Real-time monitoring of decentralized asset segments across your secure storage nodes.
            </p>
          </div>
          <div className="flex gap-3 items-center bg-black/60 border border-white/5 px-4 py-2 rounded-2xl shadow-[0_0_30px_rgba(15,23,42,0.8)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_14px_rgba(52,211,153,0.95)]" />
            <span className="text-[10px] font-black text-neutral-300 uppercase tracking-[0.3em]">
              Network Synchronized
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 md:py-24 text-neutral-700 relative z-10">
          <ShieldCheck
            size={80}
            className="mb-6 opacity-10 group-hover:opacity-20 transition-all duration-500 group-hover:scale-110 text-blue-500"
          />
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-neutral-500 group-hover:text-neutral-300 transition-colors">
            Active monitoring enabled
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
