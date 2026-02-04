import { Router, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import db from '../db';
import { fileRepository } from '../repositories';
import { AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/stats/me
 * Returns current user's file stats (totalFiles, totalStorage, filesThisWeek, recentActivity)
 * Uses fileRepository (non-deleted files only)
 */
router.get('/me', async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            return res.status(401).json({ error: 'Missing user context' });
        }
        const list = await fileRepository.listUserFiles({ tenantId, userId });
        const totalFiles = list.length;
        const totalStorage = list.reduce((acc, f) => acc + (f.size ?? 0), 0);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const filesThisWeek = list.filter(f => {
            const created = typeof f.created_at === 'string' ? new Date(f.created_at) : f.created_at;
            return created >= sevenDaysAgo;
        }).length;
        const sorted = [...list].sort((a, b) => {
            const ta = typeof a.created_at === 'string' ? new Date(a.created_at).getTime() : a.created_at.getTime();
            const tb = typeof b.created_at === 'string' ? new Date(b.created_at).getTime() : b.created_at.getTime();
            return tb - ta;
        });
        const recentActivity = sorted.slice(0, 5).map(f => ({
            id: f.id,
            name: f.filename,
            created_at: typeof f.created_at === 'string' ? f.created_at : f.created_at.toISOString(),
            action: 'upload' as const
        }));
        res.json({ totalFiles, totalStorage, filesThisWeek, recentActivity });
    } catch (error) {
        console.error('[STATS] /me failed:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Helper to check for admin role
const requireAdmin = (req: AuthRequest, res: Response, next: any) => {
    const user = req.session?.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied: Admin role required' });
    }
    next();
};

// Helper to map action to log type
const mapActionToType = (action: string): 'upload' | 'delete' | 'login' | 'other' => {
    const a = (action || '').toLowerCase();
    if (a.includes('upload') || a.includes('file_upload')) return 'upload';
    if (a.includes('delete') || a.includes('file_delete')) return 'delete';
    if (a.includes('login')) return 'login';
    return 'other';
};

/**
 * GET /api/stats/admin/summary
 * Returns global stats for the admin dashboard
 */
router.get('/admin/summary', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default-tenant';

        // 1. Total Files & Storage (exclude soft-deleted)
        const [filesResult] = await db.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as count, SUM(size) as totalSize FROM files WHERE tenant_id = ? AND (is_deleted = FALSE OR is_deleted IS NULL)',
            [tenantId]
        );

        // 2. Total Users
        const [usersResult] = await db.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM users WHERE tenant_id = ?',
            [tenantId]
        );

        // 3. Active Users (uploaded/modified files in last 24h, exclude soft-deleted)
        const [activeUsersResult] = await db.execute<RowDataPacket[]>(
            `SELECT COUNT(DISTINCT user_id) as count 
       FROM files 
       WHERE tenant_id = ? 
       AND (is_deleted = FALSE OR is_deleted IS NULL)
       AND created_at >= NOW() - INTERVAL 24 HOUR`,
            [tenantId]
        );

        const filesStats = filesResult[0];
        const usersStats = usersResult[0];
        const activeStats = activeUsersResult[0];

        res.json({
            totalFiles: filesStats.count || 0,
            totalStorage: Number(filesStats.totalSize || 0),
            totalUsers: usersStats.count || 0,
            activeUsers24h: activeStats.count || 0,
        });
    } catch (error) {
        console.error('[STATS] Admin summary failed:', error);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

/**
 * GET /api/stats/admin/activity
 * Returns aggregate activity data (files uploaded per date)
 */
router.get('/admin/activity', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default-tenant';

        // Last 7 days activity (exclude soft-deleted)
        const [rows] = await db.execute<RowDataPacket[]>(
            `SELECT DATE(created_at) as date, COUNT(*) as count, SUM(size) as size
       FROM files
       WHERE tenant_id = ?
       AND (is_deleted = FALSE OR is_deleted IS NULL)
       AND created_at >= NOW() - INTERVAL 7 DAY
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
            [tenantId]
        );

        res.json(rows);
    } catch (error) {
        console.error('[STATS] Activity stats failed:', error);
        res.status(500).json({ error: 'Failed to fetch activity stats' });
    }
});

/**
 * GET /api/stats/admin/matrix
 * Returns files by type breakdown
 */
router.get('/admin/matrix', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default-tenant';

        // Files by extension/type (derived from filename for simplicity as mimetype might vary)
        // Using simple SUBSTRING_INDEX for extension
        // Note: This is an approximation. Ideally store mime_type in DB.
        const [typeRows] = await db.execute<RowDataPacket[]>(
            `SELECT 
            SUBSTRING_INDEX(filename, '.', -1) as ext, 
            COUNT(*) as count 
         FROM files 
         WHERE tenant_id = ? AND (is_deleted = FALSE OR is_deleted IS NULL)
         GROUP BY ext 
         ORDER BY count DESC 
         LIMIT 6`,
            [tenantId]
        );

        // Top storage consumers
        // Need to join with users table if we want names, but users table might not be fully sync'd if using OIDC JIT
        // We'll return user_ids or email if available in files table (schema check needed)
        // Wait, files table has user_id. Users table has id, email.
        const [userRows] = await db.execute<RowDataPacket[]>(
            `SELECT u.email, SUM(f.size) as usageBytes, COUNT(f.id) as fileCount
         FROM files f
         JOIN users u ON f.user_id = u.id
         WHERE f.tenant_id = ? AND (f.is_deleted = FALSE OR f.is_deleted IS NULL)
         GROUP BY u.email
         ORDER BY usageBytes DESC
         LIMIT 5`,
            [tenantId]
        );

        res.json({
            byType: typeRows,
            topUsers: userRows
        });

    } catch (error) {
        console.error('[STATS] Matrix stats failed:', error);
        res.status(500).json({ error: 'Failed to fetch matrix stats' });
    }
});

/**
 * GET /api/stats/admin/logs
 * Returns recent activity logs for admin dashboard
 */
router.get('/admin/logs', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default-tenant';
        
        // Fetch recent logs from logs table
        const [rows] = await db.execute<RowDataPacket[]>(
            `SELECT l.id, l.action, l.details, l.created_at, l.user_id,
                    u.email as user_email
             FROM logs l
             LEFT JOIN users u ON l.user_id = u.id
             WHERE l.tenant_id = ?
             ORDER BY l.created_at DESC
             LIMIT 20`,
            [tenantId]
        );
        
        // Transform to match frontend format
        const logs = rows.map((row: any) => ({
            id: row.id,
            action: row.action || 'Unknown Event',
            user: row.user_email || row.user_id || 'System',
            time: row.created_at,
            type: mapActionToType(row.action)
        }));
        
        res.json(logs);
    } catch (error) {
        console.error('[STATS] Admin logs failed:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

export default router;
