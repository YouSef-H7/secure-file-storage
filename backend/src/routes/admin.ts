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
 * GET /api/admin/users
 * Returns all users for admin management
 * Protected by requireAdmin middleware
 * Supports pagination and search via query parameters
 */
router.get('/users', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;
        const search = (req.query.search as string) || '';

        let query = `
            SELECT u.id, u.email, u.role, u.created_at,
                   (SELECT MAX(l.created_at) FROM logs l WHERE l.user_id = u.email AND l.action LIKE '%login%') as last_login
            FROM users u
            WHERE 1=1
        `;
        const params: any[] = [];

        if (search) {
            query += ` AND LOWER(u.email) LIKE LOWER(?)`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await db.execute<RowDataPacket[]>(query, params);

        // Get total count for pagination (NO tenant_id - users table doesn't have it)
        let countQuery = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
        const countParams: any[] = [];
        if (search) {
            countQuery += ` AND LOWER(email) LIKE LOWER(?)`;
            countParams.push(`%${search}%`);
        }
        const [countResult] = await db.execute<RowDataPacket[]>(countQuery, countParams);
        const total = countResult[0]?.total || 0;

        res.json({
            users: rows.map((row: any) => ({
                id: row.id,
                email: row.email,
                role: row.role || 'employee',
                createdAt: row.created_at,
                lastLogin: row.last_login || null
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('[ADMIN] Users endpoint failed:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

export default router;
