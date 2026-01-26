import React from 'react';
import { HardDrive, TrendingUp } from 'lucide-react';

const StoragePage = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Storage & Usage</h1>
        <p className="text-text-secondary text-sm">Monitor storage capacity and usage patterns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-brand/5 rounded-lg">
              <HardDrive className="text-brand" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">8.4 TB</div>
              <div className="text-xs text-text-secondary uppercase font-semibold tracking-wide">of 10.8 TB Used</div>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-brand h-2 rounded-full" style={{ width: '78%' }}></div>
          </div>
          <div className="text-xs text-brand font-medium mt-2">78% Usage</div>
        </div>

        <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-brand/5 rounded-lg">
              <TrendingUp className="text-brand" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">2.4 GB</div>
              <div className="text-xs text-text-secondary uppercase font-semibold tracking-wide">Daily Growth</div>
            </div>
          </div>
          <div className="text-xs text-brand-accent font-medium">+12% vs last week</div>
        </div>

        <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-brand/5 rounded-lg">
              <HardDrive className="text-brand" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">2.4 TB</div>
              <div className="text-xs text-text-secondary uppercase font-semibold tracking-wide">Available Space</div>
            </div>
          </div>
          <div className="text-xs text-text-secondary">4-6 months runway</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Storage by Type</h3>
            <p className="text-sm text-text-secondary">File category distribution</p>
          </div>
          <div className="h-64 flex items-center justify-center border-t border-dotted border-border mt-4">
            <div className="text-center text-text-secondary text-sm">
              <HardDrive size={48} className="mx-auto mb-2 opacity-20" />
              <p>Visualization Placeholder</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Department Usage</h3>
            <p className="text-sm text-text-secondary">Storage allocation</p>
          </div>
          <div className="space-y-5">
            {[
              { name: 'Engineering', used: 2.8, total: 5, percent: 56 },
              { name: 'Marketing', used: 1.2, total: 2, percent: 60 },
              { name: 'Sales', used: 0.98, total: 1.5, percent: 65 },
              { name: 'HR', used: 0.42, total: 1, percent: 42 },
              { name: 'Finance', used: 1.6, total: 2, percent: 80 },
            ].map((dept, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-text-primary">{dept.name}</span>
                  <span className="text-xs text-text-secondary">{dept.used} / {dept.total} TB</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-brand h-2 rounded-full opacity-90" style={{ width: `${dept.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-text-primary mb-1">Top Users by Storage</h3>
          <p className="text-sm text-text-secondary">Users consuming the most storage</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-slate-50/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Rank</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">User</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Usage</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Files</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { rank: 1, name: 'Emily Davis', usage: '12.1 GB', files: 203 },
                { rank: 2, name: 'Lisa Anderson', usage: '9.7 GB', files: 178 },
                { rank: 3, name: 'Sarah Johnson', usage: '8.4 GB', files: 142 },
                { rank: 4, name: 'Jennifer Lee', usage: '7.9 GB', files: 156 },
                { rank: 5, name: 'David Martinez', usage: '5.3 GB', files: 92 },
              ].map((user) => (
                <tr key={user.rank} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-text-secondary">#{user.rank}</td>
                  <td className="py-3 px-4 text-sm text-text-primary font-medium">{user.name}</td>
                  <td className="py-3 px-4 text-sm text-text-primary font-mono">{user.usage}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary">{user.files}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StoragePage;
