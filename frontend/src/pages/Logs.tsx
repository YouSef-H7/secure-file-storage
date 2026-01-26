import React from 'react';
import { Search, Filter, Upload, Download, LogIn, Trash2 } from 'lucide-react';

const LogsPage = () => {
  const logs = [
    { type: 'upload', action: 'File Upload', description: 'Uploaded Q4_Report.pdf', user: 'Sarah Johnson', ip: '192.168.1.45', time: '2 minutes ago', icon: Upload, color: 'bg-green-100 text-green-700' },
    { type: 'download', action: 'File Download', description: 'Downloaded Proposal.docx', user: 'Mike Chen', ip: '192.168.1.78', time: '15 minutes ago', icon: Download, color: 'bg-blue-100 text-blue-700' },
    { type: 'login', action: 'User Login', description: 'Successful login', user: 'Emily Davis', ip: '192.168.1.92', time: '32 minutes ago', icon: LogIn, color: 'bg-slate-100 text-slate-700' },
    { type: 'delete', action: 'File Delete', description: 'Deleted Old_Data.xlsx', user: 'James Wilson', ip: '192.168.1.23', time: '1 hour ago', icon: Trash2, color: 'bg-red-100 text-red-700' },
  ];

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
                <th className="text-left py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">IP Address</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log, index) => {
                const IconComponent = log.icon;
                return (
                  <tr key={index} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${log.color} bg-opacity-10`}>
                          <IconComponent size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{log.action}</p>
                          <p className="text-xs text-text-secondary">{log.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-text-primary font-medium">{log.user}</td>
                    <td className="py-4 px-6 text-sm text-text-secondary font-mono text-xs">{log.ip}</td>
                    <td className="py-4 px-6 text-sm text-text-secondary">{log.time}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LogsPage;
