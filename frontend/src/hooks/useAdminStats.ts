import { useState, useEffect } from 'react';
import { api } from '../lib/api';

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

const toLogType = (s: string | undefined): 'upload' | 'delete' | 'login' | 'other' => {
    const t = (s || 'other').toLowerCase();
    if (t === 'upload' || t === 'delete' || t === 'login') return t;
    return 'other';
};

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

                // Fetch from admin endpoints
                const [summaryRes, activityRes, logsRes] = await Promise.allSettled([
                    api.request('/api/stats/admin/summary'),
                    api.request('/api/stats/admin/activity'),
                    api.request('/api/stats/admin/logs'),
                ]);

                // Process summary
                let summary = { totalFiles: 0, totalStorage: 0, totalUsers: 0, activeUsers24h: 0 };
                if (summaryRes.status === 'fulfilled') {
                    summary = summaryRes.value;
                }

                // Process activity (ensure all 7 days are present)
                let activity: { date: string; count: number; size: number }[] = [];
                if (activityRes.status === 'fulfilled' && Array.isArray(activityRes.value)) {
                    const activityMap = new Map<string, { count: number; size: number }>();
                    
                    // Initialize last 7 days
                    for (let i = 0; i < 7; i++) {
                        const d = new Date();
                        d.setDate(d.getDate() - i);
                        const dateStr = d.toISOString().split('T')[0];
                        activityMap.set(dateStr, { count: 0, size: 0 });
                    }
                    
                    // Fill in actual data
                    activityRes.value.forEach((day: any) => {
                        const dateStr = day.date ? day.date.split('T')[0] : day.date;
                        if (dateStr) {
                            activityMap.set(dateStr, {
                                count: Number(day.count || 0),
                                size: Number(day.size || 0)
                            });
                        }
                    });
                    
                    activity = Array.from(activityMap.entries())
                        .map(([date, data]) => ({ date, ...data }))
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                }

                // Process logs
                let recentLogs: any[] = [];
                if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) {
                    recentLogs = logsRes.value.slice(0, 5).map((log: any) => ({
                        id: log.id || Math.random().toString(),
                        action: log.action || 'Unknown Event',
                        user: log.user || 'System',
                        time: log.time || log.created_at || new Date().toISOString(),
                        type: toLogType(log.type)
                    }));
                }

                setStats({
                    summary,
                    activity,
                    recentLogs,
                    loading: false,
                    error: null,
                });

            } catch (err) {
                console.error("Dashboard stats fetch failed", err);
                setStats(prev => ({ 
                    ...prev, 
                    loading: false, 
                    error: "Failed to load live metrics" 
                }));
            }
        };

        fetchStats();
    }, []);

    return stats;
};
