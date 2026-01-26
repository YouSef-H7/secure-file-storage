import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { FileMetadata } from '../types/file';

export interface AdminStats {
    summary: {
        totalFiles: number;
        totalStorage: number;
        totalUsers: number;
        activeUsers24h: number;
    };
    activity: {
        date: string;
        count: number;
        size: number;
    }[];
    recentLogs: {
        id: string;
        action: string;
        user: string;
        time: string;
        type: 'upload' | 'delete' | 'login' | 'other';
    }[];
    loading: boolean;
    error: string | null;
}

export const useAdminStats = () => {
    const [stats, setStats] = useState<AdminStats>({
        summary: { totalFiles: 0, totalStorage: 0, totalUsers: 0, activeUsers24h: 0 },
        activity: [],
        recentLogs: [],
        loading: true,
        error: null,
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setStats(prev => ({ ...prev, loading: true, error: null }));

                // Parallel fetch for raw data
                const [filesRes, usersRes, logsRes] = await Promise.allSettled([
                    api.request('/api/files'),
                    api.request('/api/users'),
                    api.request('/api/logs'),
                ]);

                // Process Files
                let files: FileMetadata[] = [];
                if (filesRes.status === 'fulfilled' && Array.isArray(filesRes.value)) {
                    files = filesRes.value;
                }

                const totalFiles = files.length;
                const totalStorage = files.reduce((acc, file) => acc + (file.size || 0), 0);

                // Activity (Last 7 Days)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const activityMap = new Map<string, { count: number, size: number }>();

                // Initialize last 7 days
                for (let i = 0; i < 7; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dateStr = d.toISOString().split('T')[0];
                    activityMap.set(dateStr, { count: 0, size: 0 });
                }

                files.forEach(file => {
                    if (!file.createdAt) return;
                    const fileDate = new Date(file.createdAt);
                    if (fileDate >= sevenDaysAgo) {
                        const dateStr = fileDate.toISOString().split('T')[0];
                        if (activityMap.has(dateStr)) {
                            const current = activityMap.get(dateStr)!;
                            activityMap.set(dateStr, {
                                count: current.count + 1,
                                size: current.size + (file.size || 0)
                            });
                        }
                    }
                });

                const activity = Array.from(activityMap.entries())
                    .map(([date, data]) => ({ date, ...data }))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                // Process Users
                // If /api/users fails (e.g. 403 or 404), default to 0
                let totalUsers = 0;
                if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
                    totalUsers = usersRes.value.length;
                } else if (files.length > 0) {
                    // Fallback: estimate users from file owners if supported, else 0
                    // But client-side aggregation strictly from /api/users as per prompt.
                    // If source /api/users fails, display 0 or partial.
                    totalUsers = 0;
                }

                // Active Users 24h
                // Prompt says: Source /api/files (uploads) or /api/logs
                // We need user ID from files. If missing, we can try logs.
                const oneDayAgo = new Date();
                oneDayAgo.setHours(oneDayAgo.getHours() - 24);

                const activeUserSet = new Set<string>();

                // Check files for active users (if owner/userId exists)
                files.forEach((file: any) => {
                    if (new Date(file.createdAt) >= oneDayAgo && (file.userId || file.owner)) {
                        activeUserSet.add(file.userId || file.owner);
                    }
                });

                // Check logs for active users
                let logs: any[] = [];
                if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) {
                    logs = logsRes.value;
                    logs.forEach((log: any) => {
                        if (new Date(log.timestamp || log.time) >= oneDayAgo && log.userId) {
                            activeUserSet.add(log.userId);
                        }
                    });
                }

                const activeUsers24h = activeUserSet.size;

                // Recent Logs aggregation
                const recentLogs = logs.slice(0, 5).map((log: any) => ({
                    id: log.id || Math.random().toString(),
                    action: log.action || 'Unknown Event',
                    user: log.userName || log.user || 'System',
                    time: log.timestamp || log.time || new Date().toISOString(),
                    type: (log.type || 'other').toLowerCase()
                }));

                setStats({
                    summary: { totalFiles, totalStorage, totalUsers, activeUsers24h },
                    activity,
                    recentLogs,
                    loading: false,
                    error: null,
                });

            } catch (err) {
                console.error("Dashboard stats aggregation failed", err);
                setStats(prev => ({ ...prev, loading: false, error: "Failed to load live metrics" }));
            }
        };

        fetchStats();
    }, []);

    return stats;
};
