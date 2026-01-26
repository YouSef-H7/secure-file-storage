import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { AuthRequest } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// ================= SHARE FILE =================
router.post('/files/:fileId/share', async (req: AuthRequest, res: Response) => {
    const { fileId } = req.params;
    const { userId: targetUserId } = req.body;
    const ownerId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    if (!targetUserId) {
        return res.status(400).json({ error: 'Target userId is required' });
    }

    if (targetUserId === ownerId) {
        return res.status(400).json({ error: 'Cannot share file with yourself' });
    }

    try {
        // 1. Verify file ownership and existence
        const [files] = await db.execute<RowDataPacket[]>(
            'SELECT id, filename FROM files WHERE id = ? AND user_id = ? AND tenant_id = ?',
            [fileId, ownerId, tenantId]
        );

        if (files.length === 0) {
            return res.status(404).json({ error: 'File not found or access denied' });
        }
        const file = files[0];

        // 2. Verify target user exists in same tenant
        // (Note: In production, we might want to check if user accepts shares, etc)
        // NOTE: This assumes we have a 'users' table or similar info from OIDC synced.
        // The current server.ts shows users are inserted on login/register.
        // We should check if the target user exists in our local users table to be safe/consistent.
        const [users] = await db.execute<RowDataPacket[]>(
            'SELECT id, email FROM users WHERE id = ? AND tenant_id = ?',
            [targetUserId, tenantId]
        );

        // If user not found locally (e.g. hasn't logged in yet but exists in OIDC),
        // we might strictly fail or allow if we trust the ID. 
        // "Target user MUST exist" per requirements. We'll enforce local existence.
        if (users.length === 0) {
            return res.status(404).json({ error: 'Target user not found in tenant' });
        }

        // 3. Check if already shared
        const [existing] = await db.execute<RowDataPacket[]>(
            'SELECT id FROM shared_files WHERE file_id = ? AND shared_with_user_id = ?',
            [fileId, targetUserId]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'File already shared with this user' });
        }

        // 4. Insert Share Record
        const shareId = uuidv4();
        await db.execute<ResultSetHeader>(
            `INSERT INTO shared_files (
        id, file_id, owner_user_id, shared_with_user_id, tenant_id, permission, created_at
      ) VALUES (?, ?, ?, ?, ?, 'read', NOW())`,
            [shareId, fileId, ownerId, targetUserId, tenantId]
        );

        // 5. Audit Log (Constructing log entry manually if logs table doesn't have an API)
        // Assuming 'logs' table exists as per prompts.
        // If no direct API for logs, we insert directly or just log to console if table schema unknown.
        // Prompt says: "Audit log events to add: FILE_SHARED". 
        // server.ts doesn't show logs insert. We'll assume a table 'audit_logs' or similar exists OR just log to console for MVP if DB schema is hidden.
        // Re-reading: "DB already exists for: files, users, logs".
        // I'll try to insert into 'audit_logs' or 'logs'.
        // Let's assume 'logs' based on 'DB already exists for... logs'.
        // Columns usually: id, tenant_id, user_id, action, details, created_at.
        try {
            await db.execute(
                'INSERT INTO logs (id, tenant_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [uuidv4(), tenantId, ownerId, 'FILE_SHARED', `Shared ${file.filename} with ${users[0].email}`,]
            );
        } catch (e) {
            console.error('[AUDIT] Failed to write log:', e);
            // Non-blocking
        }

        res.status(201).json({ message: 'File shared successfully', shareId });

    } catch (err) {
        console.error('[SHARE] Error:', err);
        res.status(500).json({ error: 'Failed to share file' });
    }
});

// ================= LIST SHARED FILES =================
router.get('/files/shared-with-me', async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    try {
        const [rows] = await db.execute<RowDataPacket[]>(
            `SELECT 
        f.id, f.filename, f.size, f.created_at,
        s.created_at as shared_at,
        u.email as owner_email,
        u.id as owner_id
       FROM shared_files s
       JOIN files f ON s.file_id = f.id
       JOIN users u ON s.owner_user_id = u.id
       WHERE s.shared_with_user_id = ? 
         AND s.tenant_id = ?
         AND f.tenant_id = ? -- Extra safety check
       ORDER BY s.created_at DESC`,
            [userId, tenantId, tenantId]
        );

        // Map to frontend FileMetadata format (adding owner info)
        const files = rows.map(row => ({
            id: row.id,
            name: row.filename,
            size: row.size,
            mimeType: row.filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg', // Simple inference or fetch real mime if stored
            createdAt: row.created_at,
            sharedAt: row.shared_at,
            owner: {
                id: row.owner_id,
                email: row.owner_email
            }
        }));

        res.json(files);
    } catch (err) {
        console.error('[SHARE] List error:', err);
        res.status(500).json({ error: 'Failed to fetch shared files' });
    }
});

// ================= USER LOOKUP =================
router.post('/users/lookup', async (req: AuthRequest, res: Response) => {
    const { email } = req.body;
    const tenantId = req.user!.tenantId;

    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
        const [rows] = await db.execute<RowDataPacket[]>(
            'SELECT id, email, created_at FROM users WHERE email = ? AND tenant_id = ?',
            [email, tenantId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found in this organization' });
        }

        res.json({ id: rows[0].id, email: rows[0].email });
    } catch (err) {
        console.error('[LOOKUP] Error:', err);
        res.status(500).json({ error: 'Lookup failed' });
    }
});

export default router;
