import React from 'react';
import { ShieldCheck, Files } from 'lucide-react';

const SettingsPage = () => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#050510] border border-neutral-900 p-12 md:p-16 rounded-[3rem] max-w-3xl shadow-[0_28px_90px_rgba(15,23,42,0.9)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_25px_rgba(37,99,235,0.35)]"></div>
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-slate-50 tracking-tight">System Configuration</h2>
          <p className="text-neutral-500 font-medium text-sm mt-2">Modify core node parameters and encryption protocols.</p>
        </div>
        
        <div className="space-y-6">
          <div className="p-8 border border-neutral-900 rounded-3xl flex items-center justify-between hover:border-blue-500/45 hover:bg-blue-500/[0.02] transition-all cursor-default group shadow-[0_16px_45px_rgba(15,23,42,0.65)]">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400 shadow-[0_12px_30px_rgba(16,185,129,0.18)]">
                <ShieldCheck size={28} />
              </div>
              <div>
                <p className="font-black text-[10px] text-neutral-500 uppercase tracking-[0.28em]">Cryptographic Layer</p>
                <p className="text-lg text-neutral-200 font-semibold mt-1 group-hover:text-white transition-colors">AES-256-GCM Hardware-Hardened</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-[0.28em] border border-emerald-500/20">Active</span>
              <span className="text-[9px] text-neutral-600 font-black mt-2 uppercase">V1.4.2</span>
            </div>
          </div>

          <div className="p-8 border border-neutral-900 rounded-3xl flex items-center justify-between hover:border-blue-500/45 hover:bg-blue-500/[0.02] transition-all cursor-default group shadow-[0_16px_45px_rgba(15,23,42,0.65)]">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400 shadow-[0_12px_30px_rgba(59,130,246,0.2)]">
                <Files size={28} />
              </div>
              <div>
                <p className="font-black text-[10px] text-neutral-500 uppercase tracking-[0.28em]">Redundancy Policy</p>
                <p className="text-lg text-neutral-200 font-semibold mt-1 group-hover:text-white transition-colors">Triple-Region Async Replication</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.28em] border border-blue-500/20">Stable</span>
              <span className="text-[9px] text-neutral-600 font-black mt-2 uppercase">SYNCED</span>
            </div>
          </div>
        </div>
        
        <div className="mt-16 pt-10 border-t border-neutral-900 flex justify-between items-center">
          <div>
            <p className="text-slate-50 font-semibold text-sm">System Self-Destruct</p>
            <p className="text-neutral-600 text-xs font-medium mt-1">Permanently wipe all node identity and cached segments.</p>
          </div>
          <button className="px-8 py-3.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.28em] hover:bg-red-500 hover:text-white transition-all shadow-[0_18px_40px_rgba(248,113,113,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050510]">
            INITIATE PURGE
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
