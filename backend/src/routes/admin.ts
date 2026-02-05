import { Router, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import db from '../db';
import { AuthRequest } from '../middleware/auth';

/**
 * SCHEMA VERIFICATION - Required Database Elements
 * 
 * This endpoint requires the following database schema:
 * 
 * Required Tables:
 * - users (columns: id, email, role, created_at)
 * - logs (columns: id, user_id, action, created_at, tenant_id)
 * - files (columns: id, user_id, fileName, size, is_deleted, tenant_id, created_at)
 * 
 * Required Columns:
 * - users.email: Used as identity key for AD authentication (contains email, not numeric ID)
 * - logs.user_id: Contains email (not numeric ID) - must match users.email
 * - files.user_id: Contains email (not numeric ID) - must match users.email
 * - logs.action: Contains action strings like '%login%' or '%callback%' for AD authentication
 * - logs.tenant_id: May be NULL for some entries (null-safe queries required)
 * 
 * Join Logic:
 * - All joins use email-based matching: identities.email = users.email, identities.email = logs.user_id
 * - Never join on users.id - email is the only identity key
 * - UNION query collects identities from users, logs, and files to ensure all AD users are included
 * 
 * If any of these elements are missing, queries will fail with clear error messages.
 */

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
 * GET /api/admin/users
 * Returns all users for admin management
 * Protected by requireAdmin middleware
 * Supports pagination and search via query parameters
 */
router.get('/users', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Number(parseInt(req.query.limit as string) || 50);
        const offset = Number((page - 1) * limit);
        const search = (req.query.search as string) || '';

        // Safety check: ensure pagination values are valid
        if (isNaN(page) || isNaN(limit) || isNaN(offset) || page < 1 || limit < 1 || offset < 0) {
            return res.status(400).json({ error: 'Invalid pagination parameters' });
        }

        // Validate and sanitize pagination values (for direct SQL injection)
        const safeLimit = Math.max(0, Number(limit) || 0);
        const safeOffset = Math.max(0, Number(offset) || 0);

        // Global Users List query - collects identities from users, logs, and files tables
        // Uses UNION to ensure all AD identities are included, even if missing from users table
        const params: any[] = [];
        if (search) {
            params.push(`%${search}%`);
        }

        const query = `
            SELECT 
                COALESCE(u.id, identities.email) as id,
                identities.email,
                COALESCE(u.role, 'user') as role,
                COALESCE(u.created_at, MIN(l.created_at)) as created_at,
                MAX(l.created_at) as last_login
            FROM (
                SELECT email FROM users
                UNION
                SELECT DISTINCT user_id as email FROM logs
                UNION
                SELECT DISTINCT user_id as email FROM files
            ) AS identities
            LEFT JOIN users u ON identities.email = u.email
            LEFT JOIN logs l ON identities.email = l.user_id
            WHERE 1=1 ${search ? 'AND LOWER(identities.email) LIKE LOWER(?)' : ''}
            GROUP BY identities.email, u.id, u.role, u.created_at
            ORDER BY last_login DESC
            LIMIT ${safeLimit} OFFSET ${safeOffset}
        `;

        // Debug check: ensure no undefined/null/NaN values in params array
        if (params.some(p => p === undefined || p === null || (typeof p === 'number' && isNaN(p)))) {
            console.error('[SQL PARAM ERROR] Invalid parameters:', { query, params });
            return res.status(500).json({ error: 'Invalid query parameters' });
        }

        // Debug logging before DB execution
        console.log('[SQL DEBUG] /api/admin/users - Parameters:', params, `LIMIT ${safeLimit} OFFSET ${safeOffset}`);

        const [rows] = await db.execute<RowDataPacket[]>(query, params);

        // Get total count for pagination - counts distinct identities from all sources
        const countParams: any[] = [];
        if (search) {
            countParams.push(`%${search}%`);
        }

        const countQuery = `
            SELECT COUNT(DISTINCT email) as total 
            FROM (
                SELECT email FROM users
                UNION
                SELECT user_id as email FROM logs
                UNION
                SELECT user_id as email FROM files
            ) as all_emails
            WHERE 1=1 ${search ? 'AND LOWER(email) LIKE LOWER(?)' : ''}
        `;

        // Debug check for count query
        if (countParams.some(p => p === undefined || p === null)) {
            console.error('[SQL PARAM ERROR] Invalid count parameters:', countParams);
            return res.status(500).json({ error: 'Invalid query parameters' });
        }

        console.log('[SQL DEBUG] /api/admin/users (count) - Parameters:', countParams);

        const [countResult] = await db.execute<RowDataPacket[]>(countQuery, countParams);
        const total = countResult[0]?.total || 0;

        res.json({
            users: rows.map((row: any) => ({
                id: row.id,
                email: row.email,
                role: row.role || 'user',
                createdAt: row.created_at,
                lastLogin: row.last_login || null
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error: any) {
        console.error('[ADMIN QUERY ERROR]', {
            endpoint: '/api/admin/users',
            error: error.message,
            stack: error.stack,
            query: 'SELECT users with last_login'
        });
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

export default router;
