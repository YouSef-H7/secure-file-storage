import React from 'react';
import { ShieldCheck, Files } from 'lucide-react';

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Security Nodes</h1>
        <p className="text-slate-600 text-sm">System configuration and security settings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between p-6 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <ShieldCheck className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Cryptographic Layer</p>
                <p className="text-base font-semibold text-slate-900">AES-256-GCM Hardware-Hardened</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">Active</span>
              <span className="text-xs text-slate-500 mt-1">V1.4.2</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Files className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Redundancy Policy</p>
                <p className="text-base font-semibold text-slate-900">Triple-Region Async Replication</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">Stable</span>
              <span className="text-xs text-slate-500 mt-1">SYNCED</span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-slate-200 flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-1">System Self-Destruct</p>
            <p className="text-xs text-slate-600">Permanently wipe all node identity and cached segments.</p>
          </div>
          <button className="px-6 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold uppercase tracking-wide hover:bg-red-100 transition-colors">
            INITIATE PURGE
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
