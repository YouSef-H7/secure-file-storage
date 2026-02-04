import React, { useState, useEffect } from 'react';
import { HardDrive, TrendingUp, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let val = bytes;
  let unitIdx = 0;
  while (val >= 1024 && unitIdx < units.length - 1) {
    val /= 1024;
    unitIdx++;
  }
  return `${val.toFixed(1)} ${units[unitIdx]}`;
};

const StoragePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({ totalStorage: 0, totalFiles: 0 });
  const [topUsers, setTopUsers] = useState<Array<{ email: string; usageBytes: number; fileCount: number }>>([]);
  const [activity, setActivity] = useState<Array<{ date: string; size: number }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [summaryRes, matrixRes, activityRes] = await Promise.allSettled([
          api.request('/api/stats/admin/summary'),
          api.request('/api/stats/admin/matrix'),
          api.request('/api/stats/admin/activity'),
        ]);

        if (summaryRes.status === 'fulfilled') {
          setSummary(summaryRes.value);
        }

        if (matrixRes.status === 'fulfilled' && matrixRes.value?.topUsers) {
          setTopUsers(matrixRes.value.topUsers || []);
        }

        if (activityRes.status === 'fulfilled' && Array.isArray(activityRes.value)) {
          setActivity(activityRes.value);
        }
      } catch (err) {
        setError('Failed to load storage data');
        console.error('Storage data fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate storage percentage (assuming 10.8 TB total capacity)
  const totalCapacity = 10.8 * 1024 * 1024 * 1024 * 1024; // 10.8 TB in bytes
  const usagePercent = totalCapacity > 0 ? Math.min((summary.totalStorage / totalCapacity) * 100, 100) : 0;
  const availableSpace = Math.max(0, totalCapacity - summary.totalStorage);

  // Calculate daily growth from activity data (last 7 days average)
  const dailyGrowth = activity.length > 0 
    ? activity.reduce((sum, day) => sum + (day.size || 0), 0) / activity.length 
    : 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Storage & Usage</h1>
          <p className="text-text-secondary text-sm">Monitor storage capacity and usage patterns</p>
        </div>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="text-text-secondary animate-spin" size={32} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Storage & Usage</h1>
          <p className="text-text-secondary text-sm">Monitor storage capacity and usage patterns</p>
        </div>
        <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
          <h3 className="font-semibold mb-2">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

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
              <div className="text-2xl font-bold text-text-primary">{formatSize(summary.totalStorage)}</div>
              <div className="text-xs text-text-secondary uppercase font-semibold tracking-wide">of {formatSize(totalCapacity)} Used</div>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-brand h-2 rounded-full" style={{ width: `${usagePercent}%` }}></div>
          </div>
          <div className="text-xs text-brand font-medium mt-2">{usagePercent.toFixed(1)}% Usage</div>
        </div>

        <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-brand/5 rounded-lg">
              <TrendingUp className="text-brand" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">{formatSize(dailyGrowth)}</div>
              <div className="text-xs text-text-secondary uppercase font-semibold tracking-wide">Daily Growth</div>
            </div>
          </div>
          <div className="text-xs text-text-secondary">Average over last 7 days</div>
        </div>

        <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-brand/5 rounded-lg">
              <HardDrive className="text-brand" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">{formatSize(availableSpace)}</div>
              <div className="text-xs text-text-secondary uppercase font-semibold tracking-wide">Available Space</div>
            </div>
          </div>
          <div className="text-xs text-text-secondary">
            {availableSpace > 0 ? `${Math.round((availableSpace / dailyGrowth) / (24 * 60 * 60))} days runway` : 'No space available'}
          </div>
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
              {topUsers.length > 0 ? topUsers.map((user, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-text-secondary">#{index + 1}</td>
                  <td className="py-3 px-4 text-sm text-text-primary font-medium">{user.email || 'Unknown'}</td>
                  <td className="py-3 px-4 text-sm text-text-primary font-mono">{formatSize(user.usageBytes || 0)}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary">{user.fileCount || 0}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center text-text-secondary text-sm">
                    No user data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StoragePage;
