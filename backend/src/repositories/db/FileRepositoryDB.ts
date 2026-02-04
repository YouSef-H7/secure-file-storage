/**
 * Database Implementation of FileRepository
 * 
 * Stores file metadata in MySQL database.
 */

import db from '../../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { FileRepository, FileMeta } from '../FileRepository';
import { normalizeUserId } from '../../utils/userId';

/** Canonical user ID normalization (case-insensitive + #ext# normalization) */
const normUser = (v: unknown): string => {
  if (!v) return '';
  const str = String(v).trim();
  return str.replace(/#ext#/gi, '#EXT#').toLowerCase();
};

export class FileRepositoryDB implements FileRepository {
  async listUserFiles(input: { tenantId: string; userId: string }): Promise<FileMeta[]> {
    try {
      // Filter user_id in SQL using case-insensitive comparison
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT id, filename, size, created_at, storage_path, folder_id, tenant_id, user_id, mime_type, is_deleted
         FROM files
         WHERE tenant_id = ? 
           AND LOWER(TRIM(user_id)) = LOWER(TRIM(?))
           AND is_deleted = 0
         ORDER BY created_at DESC`,
        [input.tenantId, input.userId]
      );

      // Map results - no Node.js filtering needed, SQL already filtered
      return (rows || []).map(row => ({
        id: row.id,
        filename: row.filename,
        size: row.size ?? 0,
        created_at: row.created_at,
        storage_path: row.storage_path,
        folder_id: row.folder_id || null,
        tenant_id: row.tenant_id,
        user_id: row.user_id,
        mime_type: row.mime_type ?? undefined,
        is_deleted: row.is_deleted === true || row.is_deleted === 1
      }));
    } catch (err) {
      console.error('[FileRepositoryDB] listUserFiles error:', err);
      return [];
    }
  }

  async listUserTrashFiles(input: { tenantId: string; userId: string }): Promise<FileMeta[]> {
    try {
      // Filter user_id in SQL using case-insensitive comparison
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT id, filename, size, created_at, storage_path, folder_id, tenant_id, user_id, mime_type, is_deleted
         FROM files
         WHERE tenant_id = ? 
           AND LOWER(TRIM(user_id)) = LOWER(TRIM(?))
           AND is_deleted = 1
         ORDER BY created_at DESC`,
        [input.tenantId, input.userId]
      );

      // Map results - no Node.js filtering needed, SQL already filtered
      return (rows || []).map(row => ({
        id: row.id,
        filename: row.filename,
        size: row.size ?? 0,
        created_at: row.created_at,
        storage_path: row.storage_path,
        folder_id: row.folder_id || null,
        tenant_id: row.tenant_id,
        user_id: row.user_id,
        mime_type: row.mime_type ?? undefined,
        is_deleted: true
      }));
    } catch (err) {
      console.error('[FileRepositoryDB] listUserTrashFiles error:', err);
      return [];
    }
  }

  async getFileById(input: { fileId: string; tenantId: string; userId: string }): Promise<FileMeta | null> {
    try {
      const uid = normUser(input.userId);
      
      // Get file by ID and tenant
      const [fileRows] = await db.execute<RowDataPacket[]>(
        `SELECT id, filename, size, created_at, storage_path, folder_id, tenant_id, user_id, mime_type, is_deleted
         FROM files
         WHERE id = ? AND tenant_id = ? AND (is_deleted = FALSE OR is_deleted IS NULL)`,
        [input.fileId, input.tenantId]
      );

      if (!fileRows || fileRows.length === 0) {
        return null;
      }

      const file = fileRows[0];
      
      // Check ownership (case-insensitive)
      const isOwner = file.user_id.toLowerCase().trim() === input.userId.toLowerCase().trim();

      if (isOwner) {
        return {
          id: file.id,
          filename: file.filename,
          size: file.size ?? 0,
          created_at: file.created_at,
          storage_path: file.storage_path,
          folder_id: file.folder_id || null,
          tenant_id: file.tenant_id,
          user_id: file.user_id,
          mime_type: file.mime_type ?? undefined
        };
      }

      // Check direct share (case-insensitive user matching)
      const [shareRows] = await db.execute<RowDataPacket[]>(
        `SELECT id, shared_with_user_id FROM shared_files
         WHERE file_id = ? AND tenant_id = ?`,
        [input.fileId, input.tenantId]
      );

      if (shareRows && shareRows.length > 0) {
        // Check if any share matches this user (case-insensitive)
        const hasShare = shareRows.some(share => {
          const shareUid = normUser(share.shared_with_user_id);
          return shareUid === uid;
        });

        if (hasShare) {
          return {
            id: file.id,
            filename: file.filename,
            size: file.size ?? 0,
            created_at: file.created_at,
            storage_path: file.storage_path,
            folder_id: file.folder_id || null,
            tenant_id: file.tenant_id,
            user_id: file.user_id,
            mime_type: file.mime_type ?? undefined
          };
        }
      }

      // Check folder share access if file has folder_id (case-insensitive user matching)
      if (file.folder_id) {
        const [folderShareRows] = await db.execute<RowDataPacket[]>(
          `SELECT id, shared_with_user_id FROM folder_shares
           WHERE folder_id = ? AND tenant_id = ?`,
          [file.folder_id, input.tenantId]
        );

        if (folderShareRows && folderShareRows.length > 0) {
          // Check if any folder share matches this user (case-insensitive)
          const hasFolderShare = folderShareRows.some(share => {
            const shareUid = normUser(share.shared_with_user_id);
            return shareUid === uid;
          });

          if (hasFolderShare) {
            return {
              id: file.id,
              filename: file.filename,
              size: file.size ?? 0,
              created_at: file.created_at,
              storage_path: file.storage_path,
              folder_id: file.folder_id || null,
              tenant_id: file.tenant_id,
              user_id: file.user_id,
              mime_type: file.mime_type ?? undefined
            };
          }
        }
      }

      return null;
    } catch (err) {
      console.error('[FileRepositoryDB] getFileById error:', err);
      return null;
    }
  }

  async getFileForDownload(input: { fileId: string; tenantId: string; userId: string }): Promise<{ filename: string; storage_path: string } | null> {
    const file = await this.getFileById(input);
    if (!file) return null;
    return { filename: file.filename, storage_path: file.storage_path };
  }

  async saveFileMeta(meta: FileMeta): Promise<void> {
    try {
      const isDeleted = meta.is_deleted === true ? true : false;
      const createdAt = meta.created_at instanceof Date 
        ? meta.created_at 
        : (typeof meta.created_at === 'string' ? new Date(meta.created_at) : new Date());

      await db.execute<ResultSetHeader>(
        `INSERT INTO files (id, filename, size, created_at, storage_path, folder_id, tenant_id, user_id, mime_type, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          meta.id,
          meta.filename,
          meta.size ?? 0,
          createdAt,
          meta.storage_path,
          meta.folder_id || null,
          meta.tenant_id,
          meta.user_id,
          meta.mime_type || null,
          isDeleted
        ]
      );
    } catch (err) {
      console.error('[FileRepositoryDB] saveFileMeta error:', err);
      throw err;
    }
  }

  async deleteFileMeta(input: { fileId: string; tenantId: string; userId: string }): Promise<{ storage_path: string } | null> {
    try {
      const uid = normUser(input.userId);
      
      // First get the file to verify ownership and get storage_path
      const [fileRows] = await db.execute<RowDataPacket[]>(
        `SELECT id, storage_path, user_id FROM files
         WHERE id = ? AND tenant_id = ?`,
        [input.fileId, input.tenantId]
      );

      if (!fileRows || fileRows.length === 0) {
        return null;
      }

      const file = fileRows[0];
      const fileUid = normUser(file.user_id);
      
      // Verify ownership (case-insensitive)
      if (fileUid !== uid) {
        return null;
      }

      // Soft delete: set is_deleted = 1
      await db.execute<ResultSetHeader>(
        `UPDATE files SET is_deleted = 1
         WHERE id = ? AND tenant_id = ?`,
        [input.fileId, input.tenantId]
      );

      return { storage_path: file.storage_path };
    } catch (err) {
      console.error('[FileRepositoryDB] deleteFileMeta error:', err);
      return null;
    }
  }

  async restoreFileMeta(input: { fileId: string; tenantId: string; userId: string }): Promise<boolean> {
    try {
      const uid = normUser(input.userId);
      
      // First verify ownership
      const [fileRows] = await db.execute<RowDataPacket[]>(
        `SELECT id, user_id FROM files
         WHERE id = ? AND tenant_id = ?`,
        [input.fileId, input.tenantId]
      );

      if (!fileRows || fileRows.length === 0) {
        return false;
      }

      const file = fileRows[0];
      const fileUid = normUser(file.user_id);
      
      // Verify ownership (case-insensitive)
      if (fileUid !== uid) {
        return false;
      }

      // Restore: set is_deleted = FALSE
      const [result] = await db.execute<ResultSetHeader>(
        `UPDATE files SET is_deleted = FALSE
         WHERE id = ? AND tenant_id = ?`,
        [input.fileId, input.tenantId]
      );

      return result.affectedRows > 0;
    } catch (err) {
      console.error('[FileRepositoryDB] restoreFileMeta error:', err);
      return false;
    }
  }

  async listSharedFiles(input: { tenantId: string; userId: string }): Promise<Array<FileMeta & { shared_at: string | Date; owner_email: string }>> {
    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT 
           f.id, f.filename, f.size, f.created_at, f.storage_path, f.folder_id, 
           f.tenant_id, f.user_id, f.mime_type, f.is_deleted,
           s.created_at as shared_at,
           u.email as owner_email,
           s.shared_with_user_id
         FROM shared_files s
         JOIN files f ON s.file_id = f.id AND (f.is_deleted = FALSE OR f.is_deleted IS NULL)
         JOIN users u ON s.owner_user_id = u.id
         WHERE s.tenant_id = ? AND f.tenant_id = ?
         ORDER BY s.created_at DESC`,
        [input.tenantId, input.tenantId]
      );

      // Filter by case-insensitive shared_with_user_id match
      const uid = normUser(input.userId);
      const sharedFiles = (rows || []).filter(row => {
        const shareUid = normUser(row.shared_with_user_id);
        return shareUid === uid;
      });

      return sharedFiles.map(row => ({
        id: row.id,
        filename: row.filename,
        size: row.size ?? 0,
        created_at: row.created_at,
        storage_path: row.storage_path,
        folder_id: row.folder_id || null,
        tenant_id: row.tenant_id,
        user_id: row.user_id,
        mime_type: row.mime_type ?? undefined,
        shared_at: row.shared_at,
        owner_email: row.owner_email || 'Unknown'
      }));
    } catch (err) {
      console.error('[FileRepositoryDB] listSharedFiles error:', err);
      return [];
    }
  }
}

export default FileRepositoryDB;
