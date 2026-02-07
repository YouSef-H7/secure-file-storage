import React, { useState, useEffect } from 'react';
import { HardDrive, TrendingUp, Loader2, Users, FileText } from 'lucide-react';
import { api } from '../lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// Display-only constants (UI rendering only, no logic impact)
const ORG_STORAGE_LIMIT = 50 * 1024 * 1024 * 1024; // 50 GB
const DEFAULT_USER_QUOTA = 5 * 1024 * 1024 * 1024;  // 5 GB

// Donut chart color palette (brand-aligned)
const PIE_COLORS = ['#0d4d2e', '#10854a', '#3b82f6', '#94a3b8', '#f59e0b', '#8b5cf6'];

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
  const [summary, setSummary] = useState({ totalStorage: 0, totalFiles: 0, totalUsers: 0, activeUsers24h: 0 });
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
          <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight font-heading">Storage Overview</h1>
          <p className="text-slate-400 text-sm">Monitor and manage organization storage allocation</p>
        </div>
        {/* Skeleton cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg" />
              </div>
              <div className="h-7 bg-slate-100 rounded w-20 mb-2" />
              <div className="h-4 bg-slate-50 rounded w-24" />
            </div>
          ))}
        </div>
        {/* Skeleton charts */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5 animate-pulse">
            <div className="h-5 bg-slate-100 rounded w-32 mb-6" />
            <div className="h-[260px] bg-slate-50 rounded" />
          </div>
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5 animate-pulse">
            <div className="h-5 bg-slate-100 rounded w-36 mb-6" />
            <div className="h-[200px] bg-slate-50 rounded-full w-[170px] mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight font-heading">Storage Overview</h1>
          <p className="text-slate-400 text-sm">Monitor and manage organization storage allocation</p>
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

  // Compute cumulative storage trend data for AreaChart
  const trendData = (() => {
    let cumulative = 0;
    return activity.map((day) => {
      cumulative += Number(day.size ?? 0);
      const dateLabel = (() => {
        try {
          const date = new Date(day.date);
          if (isNaN(date.getTime())) {
            const dateStr = String(day.date || '').split('T')[0];
            const fallback = new Date(dateStr);
            if (!isNaN(fallback.getTime())) {
              return fallback.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }
            return dateStr || 'N/A';
          }
          return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch {
          return String(day.date || '').split('T')[0] || 'N/A';
        }
      })();
      return { date: dateLabel, size: cumulative };
    });
  })();

  // Compute file type percentages for donut legend
  const totalFileCount = fileTypes.reduce((sum, t) => sum + t.count, 0);
  const pieData = fileTypes.map((t) => ({
    name: t.ext.charAt(0) + t.ext.slice(1).toLowerCase(),
    value: t.count,
    percent: totalFileCount > 0 ? Math.round((t.count / totalFileCount) * 100) : 0,
  }));

  // Used storage as percentage of org limit
  const usedPercent = ORG_STORAGE_LIMIT > 0
    ? ((summary.totalStorage / ORG_STORAGE_LIMIT) * 100).toFixed(1)
    : '0.0';

  // Extract display name from email
  const getDisplayName = (email: string) => {
    const local = (email || 'unknown').split('@')[0];
    return local.charAt(0).toUpperCase() + local.slice(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight font-heading">Storage Overview</h1>
        <p className="text-slate-400 text-sm">Monitor and manage organization storage allocation</p>
      </div>

      {/* ── 4 Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Storage */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5 hover:shadow-[0_12px_24px_rgba(13,77,46,0.15)] hover:border-brand hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-teal-50 text-teal-600">
              <HardDrive size={20} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-brand mb-1 tracking-tight font-heading">{formatSize(ORG_STORAGE_LIMIT)}</div>
          <div className="text-sm font-medium text-slate-500">Total Storage</div>
          <div className="text-xs text-slate-400 mt-1">Organization limit</div>
        </div>

        {/* Used Storage */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5 hover:shadow-[0_12px_24px_rgba(13,77,46,0.15)] hover:border-brand hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-brand/10 text-brand">
              <HardDrive size={20} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-brand mb-1 tracking-tight font-heading">{formatSize(summary.totalStorage)}</div>
          <div className="text-sm font-medium text-slate-500">Used Storage</div>
          <div className="text-xs text-slate-400 mt-1">{usedPercent}% of total</div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5 hover:shadow-[0_12px_24px_rgba(13,77,46,0.15)] hover:border-brand hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <Users size={20} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-brand mb-1 tracking-tight font-heading">{summary.totalUsers}</div>
          <div className="text-sm font-medium text-slate-500">Active Users</div>
          <div className="text-xs text-slate-400 mt-1">Using storage</div>
        </div>

        {/* Total Files */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5 hover:shadow-[0_12px_24px_rgba(13,77,46,0.15)] hover:border-brand hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <FileText size={20} />
            </div>
            {dailyGrowthPercent !== 0 && (
              <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                dailyGrowthPercent > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
              }`}>
                {dailyGrowthPercent >= 0 ? '+' : ''}{dailyGrowthPercent.toFixed(0)}%
              </span>
            )}
          </div>
          <div className="text-2xl font-extrabold text-brand mb-1 tracking-tight font-heading">{summary.totalFiles.toLocaleString()}</div>
          <div className="text-sm font-medium text-slate-500">Total Files</div>
        </div>
      </div>

      {/* ── Charts Row: Storage Trend + File Types Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Storage Trend — AreaChart */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5 hover:shadow-[0_12px_24px_rgba(13,77,46,0.15)] hover:border-brand hover:-translate-y-1 transition-shadow duration-300">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-slate-500" />
            <h3 className="text-base font-semibold text-slate-900">Storage Trend</h3>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="storageFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d4d2e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0d4d2e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatSize(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgb(0 0 0 / 0.06)',
                  }}
                  formatter={(value: number | undefined) => [formatSize(value ?? 0), 'Cumulative']}
                />
                <Area
                  type="monotone"
                  dataKey="size"
                  stroke="#0d4d2e"
                  strokeWidth={2}
                  fill="url(#storageFill)"
                  dot={trendData.length <= 2 ? { r: 4, fill: '#0d4d2e', strokeWidth: 0 } : false}
                  activeDot={{ r: 5, fill: '#0d4d2e', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
              <div className="text-center">
                <TrendingUp size={40} className="mx-auto mb-2 opacity-20" />
                <p>No trend data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Storage by File Type — Donut */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5 hover:shadow-[0_12px_24px_rgba(13,77,46,0.15)] hover:border-brand hover:-translate-y-1 transition-shadow duration-300">
          <h3 className="text-base font-semibold text-slate-900 mb-5">Storage by File Type</h3>
          {pieData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={pieData.length > 1 ? 3 : 0}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgb(0 0 0 / 0.06)',
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0} files`, name ?? '']}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Custom legend */}
              <div className="w-full mt-2 space-y-2">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-slate-700">{entry.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{entry.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
              <div className="text-center">
                <HardDrive size={40} className="mx-auto mb-2 opacity-20" />
                <p>No file type data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── User Storage Allocation ── */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5">
        <h3 className="text-base font-semibold text-brand mb-5 font-heading">User Storage Allocation</h3>
        {topUsers.length > 0 ? (
          <div className="space-y-4">
            {topUsers.map((user, index) => {
              const quota = DEFAULT_USER_QUOTA;
              const usageRatio = quota > 0 ? Math.min((user.usageBytes / quota) * 100, 100) : 0;
              return (
                <div key={index} className="border border-slate-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-900">{getDisplayName(user.email)}</span>
                    <span className="text-sm text-slate-500">
                      {formatSize(user.usageBytes || 0)} / {formatSize(quota)}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${usageRatio}%`, background: 'linear-gradient(90deg, #0d4d2e, #10854a)' }}
                    />
                  </div>
                  <div className="text-right mt-1.5">
                    <span className="text-xs text-slate-400">{usageRatio.toFixed(0)}% used</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-sm">
            <Users size={40} className="mx-auto mb-2 opacity-20" />
            <p>No user data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoragePage;
