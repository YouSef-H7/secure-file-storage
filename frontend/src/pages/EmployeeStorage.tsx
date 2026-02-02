import React, { useState, useEffect } from 'react';
import { HardDrive, FileText, Loader2 } from 'lucide-react';
import { api, notifyFilesChanged } from '../lib/api';

const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

const EmployeeStorage = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ used: 0, total: STORAGE_QUOTA_BYTES, count: 0 });

    const fetchStats = () => {
        api.request('/api/stats/me').then((data: { totalFiles?: number; totalStorage?: number }) => {
            if (data && typeof data.totalStorage === 'number') {
                setStats({
                    used: data.totalStorage ?? 0,
                    total: STORAGE_QUOTA_BYTES,
                    count: data.totalFiles ?? 0
                });
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        const onFilesChanged = () => fetchStats();
        window.addEventListener('securestore:files-changed', onFilesChanged);
        return () => window.removeEventListener('securestore:files-changed', onFilesChanged);
    }, []);

    const formatSize = (bytes: number) => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let val = bytes;
        let unitIdx = 0;
        while (val >= 1024 && unitIdx < units.length - 1) {
            val /= 1024;
            unitIdx++;
        }
        return `${val.toFixed(2)} ${units[unitIdx]}`;
    };

    const percent = Math.min((stats.used / stats.total) * 100, 100);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Storage Usage</h1>
                <p className="text-text-secondary text-sm">Manage your personal quota</p>
            </div>

            <div className="bg-surface rounded-xl shadow-sm border border-border p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-4 bg-brand/10 rounded-xl">
                        <HardDrive className="text-brand" size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary">{formatSize(stats.used)}</h2>
                        <p className="text-text-secondary text-sm">of {formatSize(stats.total)} Used</p>
                    </div>
                </div>

                <div className="space-y-2 mb-8">
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brand transition-all duration-1000 ease-out"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-text-secondary font-medium">
                        <span>0 GB</span>
                        <span>{percent.toFixed(1)}%</span>
                        <span>5 GB</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                            <FileText className="text-slate-400" size={20} />
                            <div>
                                <div className="text-lg font-semibold text-text-primary">{stats.count}</div>
                                <div className="text-xs text-text-secondary">Total Files</div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                            <HardDrive className="text-slate-400" size={20} />
                            <div>
                                <div className="text-lg font-semibold text-text-primary">{formatSize(stats.total - stats.used)}</div>
                                <div className="text-xs text-text-secondary">Available</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeStorage;
