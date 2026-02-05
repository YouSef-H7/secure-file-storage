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
  const [fileTypes, setFileTypes] = useState<Array<{ ext: string; count: number }>>([]);

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

        if (matrixRes.status === 'fulfilled' && matrixRes.value) {
          setTopUsers(matrixRes.value.topUsers || []);
          
          // Extract and map byType array - preserve backend field names
          const byTypeData = matrixRes.value.byType || [];
          const chartData = byTypeData.map((item: any) => ({
            ext: (item.ext || item.extension || 'OTHER').toUpperCase(), // Keep 'ext' field name
            count: Number(item.count ?? 0) // Keep 'count' field name - backend returns 'count'
          }));
          setFileTypes(chartData);
          
          // Debug: Log matrix data structure
          console.log("Chart Data (Matrix):", {
            raw: matrixRes.value,
            byType: matrixRes.value?.byType,
            chartData: chartData
          });
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

  // Calculate daily growth as percentage change
  const dailyGrowthPercent = (() => {
    if (activity.length >= 2) {
      // Compare last day to previous day
      const today = activity[activity.length - 1];
      const yesterday = activity[activity.length - 2];
      const todaySize = Number(today?.size ?? 0);
      const yesterdaySize = Number(yesterday?.size ?? 0);
      
      if (yesterdaySize > 0) {
        const percent = ((todaySize - yesterdaySize) / yesterdaySize) * 100;
        // Sanitize: ensure finite, reasonable percentage
        if (isFinite(percent) && !isNaN(percent) && Math.abs(percent) <= 1000) {
          return percent;
        }
      }
    }
    return 0;
  })();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Storage & Usage</h1>
        <p className="text-text-secondary text-sm">Monitor storage capacity and usage patterns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-brand/5 rounded-lg">
              <HardDrive className="text-brand" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">{formatSize(summary.totalStorage)}</div>
              <div className="text-xs text-text-secondary uppercase font-semibold tracking-wide">Total Storage Used</div>
            </div>
          </div>
          <div className="text-xs text-text-secondary">Across {summary.totalFiles.toLocaleString()} files</div>
        </div>

        <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-brand/5 rounded-lg">
              <TrendingUp className="text-brand" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">
                {dailyGrowthPercent === 0 && activity.length < 2 
                  ? 'Initial' 
                  : `${dailyGrowthPercent >= 0 ? '+' : ''}${dailyGrowthPercent.toFixed(1)}%`}
              </div>
              <div className="text-xs text-text-secondary uppercase font-semibold tracking-wide">Daily Growth</div>
            </div>
          </div>
          <div className="text-xs text-text-secondary">Change from previous day</div>
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-text-primary mb-1">File Types</h3>
          <p className="text-sm text-text-secondary">Storage by file extension</p>
        </div>
        {(() => {
          // Debug: Log file types before rendering
          console.log("File Types Chart Data:", fileTypes);
          return fileTypes.length > 0 ? (
          <div className="h-64 flex items-end gap-2 mt-4">
            {fileTypes.map((type, idx) => {
              const maxCount = Math.max(...fileTypes.map(t => t.count), 1); // Use 'count' directly
              const calculatedHeight = (type.count / maxCount) * 100;
              const height = Math.max(calculatedHeight, 5); // 5% minimum
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group">
                  <div className="relative w-full flex items-end justify-center">
                    <div
                      style={{ height: `${height}%`, minHeight: '8px' }} // Force 8px minimum
                      className="w-full max-w-[50px] bg-brand rounded-t-sm group-hover:bg-brand-light transition-all duration-300 relative"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-brand-dark text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                        {type.ext}: {type.count} files
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs font-medium text-text-secondary truncate w-full text-center">
                    {type.ext}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center border-t border-dotted border-border mt-4">
            <div className="text-center text-text-secondary text-sm">
              <HardDrive size={48} className="mx-auto mb-2 opacity-20" />
              <p>No file type data available</p>
            </div>
          </div>
          );
        })()}
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
