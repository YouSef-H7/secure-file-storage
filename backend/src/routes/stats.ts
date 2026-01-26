import { Router, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import db from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to check for admin role
const requireAdmin = (req: AuthRequest, res: Response, next: any) => {
    const user = req.session?.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied: Admin role required' });
    }
    next();
};

/**
 * GET /api/stats/admin/summary
 * Returns global stats for the admin dashboard
 */
router.get('/admin/summary', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'default-tenant';

        // 1. Total Files & Storage
        const [filesResult] = await db.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as count, SUM(size) as totalSize FROM files WHERE tenant_id = ?',
            [tenantId]
        );

        // 2. Total Users
        const [usersResult] = await db.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM users WHERE tenant_id = ?',
            [tenantId]
        );

        // 3. Active Users (uploaded/modified files in last 24h)
        const [activeUsersResult] = await db.execute<RowDataPacket[]>(
            `SELECT COUNT(DISTINCT user_id) as count 
       FROM files 
       WHERE tenant_id = ? 
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

        // Last 7 days activity
        const [rows] = await db.execute<RowDataPacket[]>(
            `SELECT DATE(created_at) as date, COUNT(*) as count, SUM(size) as size
       FROM files
       WHERE tenant_id = ?
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
         WHERE tenant_id = ? 
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
         WHERE f.tenant_id = ?
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

export default router;
