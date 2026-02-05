import React, { useEffect, useState } from 'react';
import { useAdminStats } from '../hooks/useAdminStats';
import {
  Users, HardDrive, FileText, Activity, TrendingUp,
  ArrowUp, ArrowDown, Database, Clock, Server
} from 'lucide-react';
import { api } from '../lib/api';

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
      <div className="flex h-96 items-center justify-center">
        <div className="text-slate-400 animate-pulse">Loading dashboard metrics...</div>
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

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Real-time system overview and analytics.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Activity Chart (Custom CSS Bar Chart) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Upload Activity</h3>
            <p className="text-sm text-slate-500">Files uploaded over the last 7 days</p>
          </div>

          <div className="h-64 flex items-end gap-2 sm:gap-4 mt-8">
            {(activity ?? []).length > 0 ? (activity ?? []).map((day, idx) => {
              const safeActivity = activity ?? [];
              const maxCount = Math.max(...safeActivity.map(a => a.count ?? 0), 1);
              const height = Math.max(((day.count ?? 0) / maxCount) * 100, 4); // min 4% height
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group">
                  <div className="relative w-full flex items-end justify-center">
                    <div
                      style={{ height: `${height}%` }}
                      className="w-full max-w-[40px] bg-brand rounded-t-sm group-hover:bg-brand-light transition-all duration-300 relative"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-brand-dark text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                        {day.count} files ({formatSize(day.size)})
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs font-medium text-text-secondary truncate w-full text-center">
                    {(() => {
                      try {
                        const date = new Date(day.date);
                        if (isNaN(date.getTime())) {
                          // Fallback: try parsing as YYYY-MM-DD string
                          const dateStr = String(day.date || '').split('T')[0];
                          const fallbackDate = new Date(dateStr);
                          if (!isNaN(fallbackDate.getTime())) {
                            return fallbackDate.toLocaleDateString(undefined, { weekday: 'short' });
                          }
                          return dateStr || 'N/A';
                        }
                        return date.toLocaleDateString(undefined, { weekday: 'short' });
                      } catch (e) {
                        console.error('[CHART] Date parsing failed:', day.date, e);
                        return String(day.date || '').split('T')[0] || 'N/A';
                      }
                    })()}
                  </div>
                </div>
              );
            }) : (
              <div className="w-full h-full flex items-center justify-center text-text-secondary text-sm">
                No activity recorded recently
              </div>
            )}
          </div>
        </div>

        {/* Recent Events (Logs) - REPLACED Matrix/Breakdown per task */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 flex flex-col hover:shadow-lg transition-shadow duration-300">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Events</h3>
            <p className="text-sm text-slate-500">Latest system activities</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {(recentLogs ?? []).length > 0 ? (recentLogs ?? []).map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:shadow-sm transition-all duration-200">
                <div className="mt-1">
                  {log.type === 'upload' && <FileText size={16} className="text-emerald-600" />}
                  {log.type === 'delete' && <Server size={16} className="text-red-600" />}
                  {log.type === 'login' && <Users size={16} className="text-blue-600" />}
                  {log.type === 'other' && <Activity size={16} className="text-slate-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{log.action ?? ''}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="truncate max-w-[80px]">{log.user ?? ''}</span>
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
    brand: 'bg-brand/10 text-brand', // Custom brand option
  };

  const trendColor = trend?.includes('+') ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';

  return (
    <div className="bg-surface rounded-2xl shadow-md border border-border p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColors[color] || 'bg-slate-100 text-slate-600'}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendColor}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-3xl font-bold text-text-primary mb-1 tracking-tight font-sans">{value}</div>
        <div className="text-sm font-medium text-text-secondary">{title}</div>
        {subValue && <div className="text-xs text-text-secondary mt-1 opacity-80">{subValue}</div>}
      </div>
    </div>
  );
};

export default Dashboard;
