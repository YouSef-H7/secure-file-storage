import React from 'react';
import { ShieldCheck, Files } from 'lucide-react';

const SettingsPage = () => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] p-16 rounded-[3rem] max-w-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 shadow-[0_0_25px_rgba(37,99,235,0.3)]"></div>
        <div className="mb-12">
          <h2 className="text-4xl font-black text-white tracking-tighter">System Configuration</h2>
          <p className="text-neutral-500 font-medium text-sm mt-2">Modify core node parameters and encryption protocols.</p>
        </div>
        
        <div className="space-y-6">
          <div className="p-8 border border-[#1a1a1a] rounded-3xl flex items-center justify-between hover:border-blue-600/30 hover:bg-blue-600/[0.01] transition-all cursor-default group">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-green-500/10 rounded-2xl text-green-500">
                <ShieldCheck size={28} />
              </div>
              <div>
                <p className="font-black text-[10px] text-neutral-600 uppercase tracking-[0.2em]">Cryptographic Layer</p>
                <p className="text-lg text-neutral-200 font-bold mt-1 group-hover:text-white transition-colors">AES-256-GCM Hardware-Hardened</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-4 py-1.5 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/10">Active</span>
              <span className="text-[9px] text-neutral-700 font-black mt-2 uppercase">V1.4.2</span>
            </div>
          </div>

          <div className="p-8 border border-[#1a1a1a] rounded-3xl flex items-center justify-between hover:border-blue-600/30 hover:bg-blue-600/[0.01] transition-all cursor-default group">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500">
                <Files size={28} />
              </div>
              <div>
                <p className="font-black text-[10px] text-neutral-600 uppercase tracking-[0.2em]">Redundancy Policy</p>
                <p className="text-lg text-neutral-200 font-bold mt-1 group-hover:text-white transition-colors">Triple-Region Async Replication</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-4 py-1.5 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/10">Stable</span>
              <span className="text-[9px] text-neutral-700 font-black mt-2 uppercase">SYNCED</span>
            </div>
          </div>
        </div>
        
        <div className="mt-16 pt-10 border-t border-[#1a1a1a] flex justify-between items-center">
          <div>
            <p className="text-white font-black text-sm">System Self-Destruct</p>
            <p className="text-neutral-600 text-xs font-medium mt-1">Permanently wipe all node identity and cached segments.</p>
          </div>
          <button className="px-8 py-3.5 bg-red-600/10 text-red-500 border border-red-500/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-500/5">
            INITIATE PURGE
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
