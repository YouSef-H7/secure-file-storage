import React, { useState, useEffect } from 'react';
import { Search, Filter, Upload, Download, LogIn, Trash2, Loader2, Activity } from 'lucide-react';
import { api } from '../lib/api';

const getLogIcon = (type: string) => {
  switch (type) {
    case 'upload': return Upload;
    case 'delete': return Trash2;
    case 'login': return LogIn;
    default: return Activity;
  }
};

const getLogColor = (type: string) => {
  switch (type) {
    case 'upload': return 'bg-green-100 text-green-700';
    case 'delete': return 'bg-red-100 text-red-700';
    case 'login': return 'bg-slate-100 text-slate-700';
    default: return 'bg-blue-100 text-blue-700';
  }
};

const formatTimeAgo = (time: string) => {
  const date = new Date(time);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

const LogsPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.request('/api/stats/admin/logs');
        if (Array.isArray(data)) {
          setLogs(data);
        }
      } catch (err) {
        setError('Failed to load logs');
        console.error('Logs fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (log.action || '').toLowerCase().includes(query) ||
      (log.user || '').toLowerCase().includes(query) ||
      (log.details || '').toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Activity Logs</h1>
          <p className="text-text-secondary text-sm">System activity and security audit trail</p>
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
          <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Activity Logs</h1>
          <p className="text-text-secondary text-sm">System activity and security audit trail</p>
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
        <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Activity Logs</h1>
        <p className="text-text-secondary text-sm">System activity and security audit trail</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
          />
        </div>
        <button className="px-4 py-2.5 bg-surface border border-border rounded-lg text-text-secondary hover:bg-slate-50 hover:text-text-primary transition-colors flex items-center gap-2 font-medium text-sm shadow-sm">
          <Filter size={18} />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 border-b border-border">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Event</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">User</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.length > 0 ? filteredLogs.map((log, index) => {
                const IconComponent = getLogIcon(log.type || 'other');
                const logColor = getLogColor(log.type || 'other');
                return (
                  <tr key={log.id || index} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${logColor} bg-opacity-10`}>
                          <IconComponent size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{log.action || 'Unknown Event'}</p>
                          {log.details && (
                            <p className="text-xs text-text-secondary">{log.details}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-text-primary font-medium">{log.user || 'System'}</td>
                    <td className="py-4 px-6 text-sm text-text-secondary">{formatTimeAgo(log.time || log.created_at || new Date().toISOString())}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={3} className="py-8 px-6 text-center text-text-secondary text-sm">
                    {searchQuery ? 'No logs match your search' : 'No logs available'}
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

export default LogsPage;
