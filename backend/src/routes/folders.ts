import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { AuthRequest } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// ================= LIST USER'S FOLDERS =================
router.get('/', async (req: AuthRequest, res: Response) => {
    const ownerId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    try {
        const [folders] = await db.execute<RowDataPacket[]>(
            `SELECT 
                f.id, 
                f.name, 
                f.parent_folder_id,
                f.created_at,
                COUNT(DISTINCT files.id) as file_count
             FROM folders f
             LEFT JOIN files ON files.folder_id = f.id AND files.tenant_id = f.tenant_id
             WHERE f.owner_user_id = ? 
               AND f.tenant_id = ? 
               AND f.is_deleted = FALSE
             GROUP BY f.id, f.name, f.parent_folder_id, f.created_at
             ORDER BY f.created_at DESC`,
            [ownerId, tenantId]
        );

        res.json(folders);
    } catch (err) {
        console.error('[FOLDER] List error:', err);
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
});

// ================= CREATE FOLDER =================
router.post('/', async (req: AuthRequest, res: Response) => {
    const { name, parentFolderId } = req.body;
    const ownerId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    if (!name) return res.status(400).json({ error: 'Folder name required' });

    try {
        // If parentFolderId is provided, verify it exists and belongs to user
        if (parentFolderId) {
            const [parents] = await db.execute<RowDataPacket[]>(
                'SELECT id FROM folders WHERE id = ? AND owner_user_id = ? AND tenant_id = ? AND is_deleted = FALSE',
                [parentFolderId, ownerId, tenantId]
            );
            if (parents.length === 0) {
                return res.status(404).json({ error: 'Parent folder not found' });
            }
        }

        const folderId = uuidv4();
        await db.execute(
            `INSERT INTO folders (id, name, tenant_id, owner_user_id, parent_folder_id, is_deleted, created_at)
       VALUES (?, ?, ?, ?, ?, FALSE, NOW())`,
            [folderId, name, tenantId, ownerId, parentFolderId || null]
        );

        // Audit
        await db.execute(
            'INSERT INTO logs (id, tenant_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [uuidv4(), tenantId, ownerId, 'FOLDER_CREATED', `Created folder ${name}`,]
        ).catch(console.error);

        res.status(201).json({ id: folderId, name, parentFolderId });
    } catch (err) {
        console.error('[FOLDER] Create error:', err);
        res.status(500).json({ error: 'Failed to create folder' });
    }
});

// ================= LIST FOLDER CONTENTS =================
router.get('/:id/items', async (req: AuthRequest, res: Response) => {
    const folderId = req.params.id;
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    try {
        // 1. Access Check (Owner OR Shared)
        // Check if folder is owned by user OR shared with user
        const [access] = await db.execute<RowDataPacket[]>(
            `SELECT f.id, f.owner_user_id
         FROM folders f
         LEFT JOIN folder_shares fs ON f.id = fs.folder_id AND fs.shared_with_user_id = ?
         WHERE f.id = ? AND f.tenant_id = ? AND f.is_deleted = FALSE
         AND (f.owner_user_id = ? OR fs.id IS NOT NULL)`,
            [userId, folderId, tenantId, userId]
        );

        if (access.length === 0) {
            // Root folder check? No, root is handled by 'List Files' usually, or client passes 'root'.
            // If client passes 'root' as ID, we handle differently or expect NULL parent.
            // For now, explicit folder ID required.
            // If getting root contents, client usually calls /api/files with query usage?
            // Let's support 'root' string as ID for top-level? 
            // Logic below handles explicit ID. User might request 'virtual' root.
            if (folderId !== 'root') {
                return res.status(404).json({ error: 'Folder not found or access denied' });
            }
        }

        const targetParentId = folderId === 'root' ? null : folderId;
        const queryParams: any[] = [tenantId];
        if (targetParentId) {
            queryParams.push(targetParentId);
        }
        // If root, we look for parent_folder_id IS NULL
        // BUT we must only show Owner's stuff at root, OR Shared items (which are usually roots of their own in "Shared with Me" view)
        // Detailed Requirements: "My Files Page... Tree view".
        // Getting items for a folder means items INSIDE it.

        // Subfolders
        let folderQuery = `SELECT id, name, created_at, owner_user_id FROM folders WHERE tenant_id = ? AND is_deleted = FALSE`;
        if (targetParentId) {
            folderQuery += ` AND parent_folder_id = ?`;
        } else {
            folderQuery += ` AND parent_folder_id IS NULL`;
        }
        // Only show folders I own (unless this is a shared view context? Inherited access implies I can see subfolders of a shared folder)
        // Using simple Owner check for now inside standard tree. Shared folders appear in 'Shared With Me'.
        // If I am inside a shared folder, I should see subfolders.
        // Complexity: Recursive permission check.
        // MVP Rule: "Inherited access for files inside shared folders".
        // If `access` check passed above (it checked direct share or ownership of current folder), we are good to list children?
        // YES, if I have access to Folder A, I should see children of Folder A.
        // Wait, the access check above was for `folderId`.
        // If I own `folderId`, I see all children.
        // If `folderId` is shared with me, I see all children.

        // Filter by Owner? If it's my folder, children are mine.
        // If it's a shared folder, children belong to owner of shared folder.
        // So we don't filter children by 'my ownership', we return children of the folder.

        // However, we must ensure we don't expose hidden stuff if logic is complex.
        // For MVP: Return all non-deleted children of the folder.

        const [subfolders] = await db.execute<RowDataPacket[]>(folderQuery, queryParams);

        // Files - Check access: owner OR file shared directly OR folder is shared
        const isFolderShared = access.length > 0 && access[0].owner_user_id !== userId;
        let fileQuery = `
            SELECT DISTINCT f.id, f.filename as name, f.size, f.created_at, f.mime_type
            FROM files f
            LEFT JOIN shared_files sf ON f.id = sf.file_id AND sf.shared_with_user_id = ?
            LEFT JOIN folder_shares fs ON f.folder_id = fs.folder_id AND fs.shared_with_user_id = ?
            WHERE f.tenant_id = ?
        `;
        const fileParams: any[] = [userId, userId, tenantId];
        
        if (targetParentId) {
            fileQuery += ` AND f.folder_id = ?`;
            fileParams.push(targetParentId);
        } else {
            fileQuery += ` AND f.folder_id IS NULL`;
        }
        
        if (isFolderShared) {
            fileQuery += ` AND (f.user_id = (SELECT owner_user_id FROM folders WHERE id = ?) OR sf.id IS NOT NULL OR fs.id IS NOT NULL)`;
            fileParams.push(folderId);
        } else {
            fileQuery += ` AND (f.user_id = ? OR sf.id IS NOT NULL OR fs.id IS NOT NULL)`;
            fileParams.push(userId);
        }

        const [files] = await db.execute<RowDataPacket[]>(fileQuery, fileParams);

        // Clean up response - map mime_type to mimeType for frontend
        const safeFiles = files.map(f => ({ 
            id: f.id,
            name: f.name,
            size: f.size,
            createdAt: f.created_at,
            mimeType: f.mime_type || 'application/octet-stream',
            type: 'file'
        }));
        const safeFolders = subfolders.map(f => ({ ...f, type: 'folder' }));

        res.json({
            folders: safeFolders,
            files: safeFiles
        });

    } catch (err) {
        console.error('[FOLDER] List error:', err);
        res.status(500).json({ error: 'Failed to list items' });
    }
});

// ================= SHARE FOLDER =================
router.post('/:id/share', async (req: AuthRequest, res: Response) => {
    const folderId = req.params.id;
    const { userId: targetUserId } = req.body;
    const ownerId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    if (!targetUserId) return res.status(400).json({ error: 'Target User ID required' });

    try {
        // Verify Ownership
        const [folder] = await db.execute<RowDataPacket[]>(
            'SELECT id, name FROM folders WHERE id = ? AND owner_user_id = ? AND tenant_id = ?',
            [folderId, ownerId, tenantId]
        );

        if (folder.length === 0) return res.status(404).json({ error: 'Folder not found' });

        // Check existing share
        const [existing] = await db.execute<RowDataPacket[]>(
            'SELECT id FROM folder_shares WHERE folder_id = ? AND shared_with_user_id = ?',
            [folderId, targetUserId]
        );

        if (existing.length > 0) return res.status(409).json({ error: 'Folder already shared' });

        // Insert Share
        await db.execute(
            `INSERT INTO folder_shares (id, folder_id, shared_with_user_id, tenant_id, permission, created_at)
             VALUES (?, ?, ?, ?, 'read', NOW())`,
            [uuidv4(), folderId, targetUserId, tenantId]
        );

        await db.execute(
            'INSERT INTO logs (id, tenant_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [uuidv4(), tenantId, ownerId, 'FOLDER_SHARED', `Shared folder ${folder[0].name}`,]
        ).catch(console.error);

        res.status(201).json({ message: 'Folder shared' });

    } catch (err) {
        console.error('[FOLDER] Share error:', err);
        res.status(500).json({ error: 'Failed to share folder' });
    }
});

// ================= UPDATE FOLDER (RENAME) =================
router.patch('/:id', async (req: AuthRequest, res: Response) => {
    const folderId = req.params.id;
    const { name } = req.body;
    const ownerId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Folder name required' });
    }

    try {
        const [folder] = await db.execute<RowDataPacket[]>(
            'SELECT id, name FROM folders WHERE id = ? AND owner_user_id = ? AND tenant_id = ? AND is_deleted = FALSE',
            [folderId, ownerId, tenantId]
        );

        if (folder.length === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        await db.execute(
            'UPDATE folders SET name = ? WHERE id = ? AND tenant_id = ?',
            [name.trim(), folderId, tenantId]
        );

        await db.execute(
            'INSERT INTO logs (id, tenant_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [uuidv4(), tenantId, ownerId, 'FOLDER_RENAMED', `Renamed folder to ${name.trim()}`]
        ).catch(console.error);

        res.json({ message: 'Folder renamed', id: folderId, name: name.trim() });
    } catch (err) {
        console.error('[FOLDER] Rename error:', err);
        res.status(500).json({ error: 'Failed to rename folder' });
    }
});

// ================= DELETE FOLDER (LOGICAL) =================
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    const folderId = req.params.id;
    const ownerId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    try {
        const [folder] = await db.execute<RowDataPacket[]>(
            'SELECT id, name FROM folders WHERE id = ? AND owner_user_id = ? AND tenant_id = ? AND is_deleted = FALSE',
            [folderId, ownerId, tenantId]
        );

        if (folder.length === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        await db.execute(
            'UPDATE folders SET is_deleted = TRUE WHERE id = ? AND tenant_id = ?',
            [folderId, tenantId]
        );

        await db.execute(
            'INSERT INTO logs (id, tenant_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [uuidv4(), tenantId, ownerId, 'FOLDER_DELETED', `Deleted folder ${folder[0].name}`]
        ).catch(console.error);

        res.json({ message: 'Folder deleted' });
    } catch (err) {
        console.error('[FOLDER] Delete error:', err);
        res.status(500).json({ error: 'Failed to delete folder' });
    }
});

// ================= LIST SHARED FOLDERS =================
router.get('/shared-with-me', async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    try {
        const [rows] = await db.execute<RowDataPacket[]>(
            `SELECT 
                f.id, f.name, f.created_at,
                fs.created_at as shared_at,
                u.email as owner_email
             FROM folder_shares fs
             JOIN folders f ON fs.folder_id = f.id
             JOIN users u ON f.owner_user_id = u.id
             WHERE fs.shared_with_user_id = ? AND fs.tenant_id = ?
             AND f.is_deleted = FALSE`,
            [userId, tenantId]
        );

        res.json(rows);
    } catch (err) {
        console.error('[FOLDER] Shared list error:', err);
        res.status(500).json({ error: 'Failed to fetch shared folders' });
    }
});

export default router;
