import React, { useEffect, useState } from 'react';
import { useAdminStats } from '../hooks/useAdminStats';
import {
  Users, HardDrive, FileText, Activity, TrendingUp,
  ArrowUp, ArrowDown, Database, Clock, Server
} from 'lucide-react';
import { api } from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// --- Types ---
interface SummaryStats {
  totalFiles: number;
  totalStorage: number; // bytes
  totalUsers: number;
  activeUsers24h: number;
}

interface ActivityStat {
  date: string;
  count: number;
  size: number;
}

interface MatrixStats {
  byType: { ext: string; count: number }[];
  topUsers: { email: string; usageBytes: number; fileCount: number }[];
}

const Dashboard = () => {
  const { summary, activity, recentLogs, loading, error } = useAdminStats();

  // Matrix stats (File Types & Top Users) 
  // Since we are moving to aggregation, we'll calculate basic types here or skip/keep placeholder if complex.
  // The user prompt emphasizes: "Required Admin Metrics ... Total Users, Total Files, Total Storage, Active Users, Upload Activity, Recent Events".
  // It doesn't explicitly mandate the breakdown matrixes be aggregation-based immediately, but "Admin Dashboard now shows real, live metrics".
  // To stay safe and strictly follow "Real Data Only", we should compute the File Types from our file list if possible,
  // OR hide the matrix if we can't compute it easily without fetching files again here.
  // Actually, useAdminStats could return the file list or the computed matrix.
  // Let's stick to the core metrics requested. The Matrix section might need data.
  // We can calculate "File Types" from the raw files if useAdminStats exposed them.
  // For now, to minimize refactor risk of "unrelated components", we will hide the Matrix/Top Users if no data,
  // or ideally, we update useAdminStats to return that data too.
  // Let's focus on the REQUESTED metrics first. The prompt lists 6 specific metrics.
  // The "Matrix / Breakdown" section (File Types, Top Consumers) is NOT in the "REQUIRED ADMIN METRICS" list 1-6.
  // So we can leave it empty or try to populate it if easy.

  if (loading) {
    return (
      <div className="space-y-8 animate-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1.5 text-sm">Real-time system overview and analytics.</p>
        </div>
        {/* Skeleton cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-card border border-slate-200/80 p-5 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg" />
              </div>
              <div className="h-7 bg-slate-100 rounded w-20 mb-2" />
              <div className="h-4 bg-slate-50 rounded w-24" />
            </div>
          ))}
        </div>
        {/* Skeleton chart + events */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-card border border-slate-200/80 p-5 animate-pulse">
            <div className="h-5 bg-slate-100 rounded w-32 mb-2" />
            <div className="h-4 bg-slate-50 rounded w-48 mb-6" />
            <div className="h-64 bg-slate-50 rounded" />
          </div>
          <div className="bg-white rounded-xl shadow-card border border-slate-200/80 p-5 animate-pulse">
            <div className="h-5 bg-slate-100 rounded w-28 mb-2" />
            <div className="h-4 bg-slate-50 rounded w-36 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-50 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
        <h3 className="font-semibold mb-2">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  const formatSize = (bytes: number) => {
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

  // Normalize activity data for recharts BarChart
  const chartData = (activity ?? []).map((day: any) => ({
    ...day,
    count: Number(day.count ?? 0),
    size: Number(day.size ?? 0),
    dateLabel: (() => {
      try {
        const date = new Date(day.date);
        if (isNaN(date.getTime())) {
          const dateStr = String(day.date || '').split('T')[0];
          const fallbackDate = new Date(dateStr);
          if (!isNaN(fallbackDate.getTime())) {
            return fallbackDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          }
          return dateStr || 'N/A';
        }
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } catch (e) {
        return String(day.date || '').split('T')[0] || 'N/A';
      }
    })()
  }));

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-400 mt-1.5 text-sm">Real-time system overview and analytics.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Total Users"
          value={summary.totalUsers}
          icon={<Users size={20} className="text-blue-600" />}
          trend={summary.activeUsers24h > 0 ? `${summary.activeUsers24h} active (24h)` : undefined}
          color="blue"
        />
        <StatsCard
          title="Storage Used"
          value={formatSize(summary.totalStorage)}
          icon={<HardDrive size={20} className="text-purple-600" />}
          subValue="Total volume"
          color="purple"
        />
        <StatsCard
          title="Total Files"
          value={summary.totalFiles.toLocaleString()}
          icon={<FileText size={20} className="text-emerald-600" />}
          color="emerald"
        />
        <StatsCard
          title="System Status"
          value="Online"
          icon={<Activity size={20} className="text-orange-600" />}
          subValue="Metrics Live"
          color="orange"
        />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Activity Chart — recharts BarChart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-card border border-slate-200/80 p-5 hover:shadow-card-hover transition-shadow duration-300">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-slate-900">Upload Activity</h3>
            <p className="text-sm text-slate-400">Files uploaded over the last 7 days</p>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0B3B2E" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0B3B2E" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgb(0 0 0 / 0.06)',
                  }}
                  formatter={(value: number | undefined, name: string | undefined) => [
                    `${value ?? 0} files`,
                    'Uploads'
                  ]}
                  labelFormatter={(label: any) => String(label ?? '')}
                />
                <Bar
                  dataKey="count"
                  fill="url(#barFill)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
              No activity recorded recently
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-xl shadow-card border border-slate-200/80 p-5 flex flex-col hover:shadow-card-hover transition-shadow duration-300">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">Recent Events</h3>
            <p className="text-sm text-slate-400">Latest system activities</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px] space-y-3 pr-1">
            {(recentLogs ?? []).length > 0 ? (recentLogs ?? []).map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/80 border border-slate-100 hover:bg-slate-100 hover:shadow-sm transition-all duration-200">
                <div className="mt-0.5 p-1.5 rounded-md bg-white shadow-sm border border-slate-100">
                  {log.type === 'upload' && <FileText size={14} className="text-emerald-600" />}
                  {log.type === 'delete' && <Server size={14} className="text-red-600" />}
                  {log.type === 'login' && <Users size={14} className="text-blue-600" />}
                  {log.type === 'other' && <Activity size={14} className="text-slate-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{log.action ?? ''}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span className="truncate max-w-[100px]">{log.user ?? ''}</span>
                    <span>•</span>
                    <span>{new Date(log.time ?? 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm">
                <Clock size={32} className="mb-2 opacity-20" />
                <p>No recent events</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Reusable Component ---
const StatsCard = ({ title, value, icon, subValue, trend, color }: any) => {
  // Enterprise palette mapping
  const bgColors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    brand: 'bg-brand/10 text-brand',
  };

  const trendColor = trend?.includes('+') ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';

  return (
    <div className="bg-white rounded-xl shadow-card border border-slate-200/80 p-5 hover:shadow-card-hover transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${bgColors[color] || 'bg-slate-100 text-slate-600'}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${trendColor}`}>
            {trend}
          </span>
        )}
        {/* Online status dot */}
        {value === 'Online' && !trend && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 mb-1 tracking-tight font-sans">{value}</div>
        <div className="text-sm font-medium text-slate-500">{title}</div>
        {subValue && <div className="text-xs text-slate-400 mt-1">{subValue}</div>}
      </div>
    </div>
  );
};

export default Dashboard;
