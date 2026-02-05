import { Router, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import db from '../db';
import { fileRepository } from '../repositories';
import { AuthRequest } from '../middleware/auth';

/**
 * SCHEMA VERIFICATION - Required Database Elements
 * 
 * Admin stats endpoints require the following database schema:
 * 
 * Required Tables:
 * - users (columns: id, email, role, created_at)
 * - files (columns: id, user_id, fileName, size, is_deleted, tenant_id, created_at)
 * - logs (columns: id, user_id, action, details, created_at, tenant_id)
 * 
 * Required Columns:
 * - users.email: Used as identity key for AD authentication (contains email, not numeric ID)
 * - files.user_id: Contains email (not numeric ID) - must match users.email for joins
 * - files.fileName: camelCase field name (capital N) - used for extension extraction
 * - logs.user_id: Contains email (not numeric ID) - must match users.email for joins
 * - logs.tenant_id: May be NULL for some entries (null-safe queries required)
 * 
 * Join Logic:
 * - All joins use email-based matching: files.user_id = users.email, logs.user_id = users.email
 * - Never join on users.id (numeric ID) - AD uses email as identity
 * 
 * If any of these elements are missing, queries will fail with clear error messages.
 */

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
        // 1. Total Files & Storage (global, exclude soft-deleted)
        const [filesResult] = await db.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as count, SUM(size) as totalSize FROM files WHERE (is_deleted = FALSE OR is_deleted IS NULL)',
            []
        );

        // 2. Total Users - Global Active Identity Count (from files/logs UNION)
        // Reflects real AD identities that have actually used the system
        const [usersResult] = await db.execute<RowDataPacket[]>(
            `SELECT COUNT(DISTINCT user_id) as count 
             FROM (
                SELECT user_id FROM files 
                UNION 
                SELECT user_id FROM logs
             ) as active_identities`,
            []
        );

        // 3. Active Users (global, uploaded/modified files in last 24h, exclude soft-deleted)
        const [activeUsersResult] = await db.execute<RowDataPacket[]>(
            `SELECT COUNT(DISTINCT user_id) as count 
       FROM files 
       WHERE (is_deleted = FALSE OR is_deleted IS NULL)
       AND created_at >= NOW() - INTERVAL 24 HOUR`,
            []
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
    } catch (error: any) {
        console.error('[ADMIN QUERY ERROR]', {
            endpoint: '/api/stats/admin/summary',
            error: error.message,
            stack: error.stack,
            query: 'SELECT admin summary stats'
        });
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

/**
 * GET /api/stats/admin/activity
 * Returns aggregate activity data (files uploaded per date)
 */
router.get('/admin/activity', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        // Last 7 days activity (global, exclude soft-deleted)
        // COALESCE ensures size is always a number (never NULL) for stable growth calculations
        const [rows] = await db.execute<RowDataPacket[]>(
            `SELECT 
                DATE(created_at) as date, 
                COUNT(*) as count, 
                COALESCE(SUM(size), 0) as size
             FROM files
             WHERE (is_deleted = FALSE OR is_deleted IS NULL)
             AND created_at >= NOW() - INTERVAL 7 DAY
             GROUP BY DATE(created_at)
             ORDER BY date ASC`,
            []
        );

        res.json(rows);
    } catch (error: any) {
        console.error('[ADMIN QUERY ERROR]', {
            endpoint: '/api/stats/admin/activity',
            error: error.message,
            stack: error.stack,
            query: 'SELECT activity stats'
        });
        res.status(500).json({ error: 'Failed to fetch activity stats' });
    }
});

/**
 * GET /api/stats/admin/matrix
 * Returns files by type breakdown
 */
router.get('/admin/matrix', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        // Files by extension/type (global) - use fileName (camelCase, capital N)
        // Use LOWER() for case-insensitive extension grouping
        const [typeRows] = await db.execute<RowDataPacket[]>(
            `SELECT 
                LOWER(SUBSTRING_INDEX(fileName, '.', -1)) as ext, 
                COUNT(*) as count 
             FROM files 
             WHERE (is_deleted = FALSE OR is_deleted IS NULL)
             GROUP BY ext 
             ORDER BY count DESC 
             LIMIT 6`,
            []
        );

        // Top storage consumers (global) - join on email, not id (files.user_id contains email)
        const [userRows] = await db.execute<RowDataPacket[]>(
            `SELECT u.email, SUM(f.size) as usageBytes, COUNT(f.id) as fileCount
             FROM files f
             JOIN users u ON f.user_id = u.email
             WHERE (f.is_deleted = FALSE OR f.is_deleted IS NULL)
             GROUP BY u.email
             ORDER BY usageBytes DESC
             LIMIT 5`,
            []
        );

        res.json({
            byType: typeRows,
            topUsers: userRows
        });

    } catch (error: any) {
        console.error('[ADMIN QUERY ERROR]', {
            endpoint: '/api/stats/admin/matrix',
            error: error.message,
            stack: error.stack,
            query: 'SELECT storage matrix stats'
        });
        res.status(500).json({ error: 'Failed to fetch matrix stats' });
    }
});

/**
 * GET /api/stats/admin/logs
 * Returns recent activity logs for admin dashboard
 * Supports pagination via query parameters: limit, offset
 */
router.get('/admin/logs', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        // Force strict numeric values with Math.max to ensure minimums
        const safeLimit = Math.max(1, parseInt(req.query.limit as string) || 20);
        const safeOffset = Math.max(0, parseInt(req.query.offset as string) || 0);
        
        // Safety check: ensure all parameters are valid
        if (isNaN(safeLimit) || isNaN(safeOffset) || safeLimit < 0 || safeOffset < 0) {
            return res.status(400).json({ error: 'Invalid pagination parameters' });
        }
        
        // Fetch recent logs from logs table (global, no tenant filter)
        // Uses db.query (direct SQL) instead of db.execute (prepared statements)
        // LIMIT/OFFSET injected directly as safe numeric values (no placeholders)
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT 
                id, 
                user_id, 
                action as event, 
                details, 
                created_at as time
             FROM logs
             ORDER BY created_at DESC
             LIMIT ${safeLimit} OFFSET ${safeOffset}`,
            [] // empty params array - no placeholders needed
        );
        
        // Get total count for pagination (global)
        const [countResult] = await db.execute<RowDataPacket[]>(
            `SELECT COUNT(*) as total FROM logs`,
            []
        );
        
        // Transform to match frontend format
        // Uses aliased columns: event (from action), time (from created_at)
        const logs = rows.map((row: any) => ({
            id: row.id,
            action: row.event || 'Unknown Event',  // Use aliased 'event' column
            user: row.user_id || 'System',  // Use user_id directly (no JOIN)
            time: row.time,  // Use aliased 'time' column
            type: mapActionToType(row.event),  // Use aliased 'event' for type mapping
            details: row.details || null
        }));
        
        res.json({
            logs,
            total: countResult[0]?.total || 0,
            limit: safeLimit,
            offset: safeOffset
        });
    } catch (error: any) {
        console.error('[ADMIN QUERY ERROR]', {
            endpoint: '/api/stats/admin/logs',
            error: error.message,
            stack: error.stack,
            query: 'SELECT logs (global, ordered DESC)'
        });
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

export default router;
