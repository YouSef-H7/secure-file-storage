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
 * GET /api/admin/files
 * Returns all files globally for admin view
 * No tenant or user filtering
 */
router.get('/admin/files', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        // Global file list - no tenant or owner filtering
        const [rows] = await db.execute<RowDataPacket[]>(
            `SELECT 
                id,
                filename as name,
                size,
                created_at,
                mime_type as mimeType
             FROM files
             WHERE (is_deleted = FALSE OR is_deleted IS NULL)
             ORDER BY created_at DESC`,
            []
        );

        // Map to frontend contract
        const mappedFiles = rows.map((f: any) => ({
            id: f.id,
            name: f.name || f.filename || '',
            size: f.size || 0,
            created_at: f.created_at,
            createdAt: f.created_at,
            mimeType: f.mime_type || 'application/octet-stream'
        }));

        res.json(mappedFiles);
    } catch (error: any) {
        console.error('[ADMIN FILES ERROR]', {
            endpoint: '/api/admin/files',
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

export default router;
