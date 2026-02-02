/**
 * File Repository Interface
 * 
 * Abstraction layer for file metadata operations.
 * Implementations can use filesystem, database, or other storage backends.
 * 
 * This interface ensures consistent behavior across storage implementations
 * and enables easy migration from filesystem to database in OCI deployment.
 */

export interface FileMeta {
  id: string;
  filename: string;
  size: number;
  created_at: string | Date;
  storage_path: string;
  folder_id?: string | null;
  tenant_id: string;
  user_id: string;
  mime_type?: string; // Optional, used for folder contents listing
  is_deleted?: boolean; // Soft delete; default false in semantics
}

export interface FileRepository {
  /**
   * List all files owned by a user within a tenant (only is_deleted !== true)
   */
  listUserFiles(input: {
    tenantId: string;
    userId: string;
  }): Promise<FileMeta[]>;

  /**
   * List only soft-deleted files (is_deleted === true) for the user
   */
  listUserTrashFiles(input: {
    tenantId: string;
    userId: string;
  }): Promise<FileMeta[]>;

  /**
   * Get file metadata by ID with access control
   * Returns file if user owns it, has direct share, or has folder share access
   */
  getFileById(input: {
    fileId: string;
    tenantId: string;
    userId: string;
  }): Promise<FileMeta | null>;

  /**
   * Get file metadata for download (includes storage path)
   * Returns file if user owns it, has direct share, or has folder share access
   */
  getFileForDownload(input: {
    fileId: string;
    tenantId: string;
    userId: string;
  }): Promise<{ filename: string; storage_path: string } | null>;

  /**
   * Save file metadata (create new file record)
   */
  saveFileMeta(meta: FileMeta): Promise<void>;

  /**
   * Soft delete: set is_deleted = true; do not remove record or physical file.
   * Returns storage_path for compatibility (caller must not use it to delete disk).
   */
  deleteFileMeta(input: {
    fileId: string;
    tenantId: string;
    userId: string;
  }): Promise<{ storage_path: string } | null>;

  /**
   * Restore a soft-deleted file: set is_deleted = false
   */
  restoreFileMeta(input: {
    fileId: string;
    tenantId: string;
    userId: string;
  }): Promise<boolean>;

  /**
   * List files shared with a user (direct shares only)
   */
  listSharedFiles(input: {
    tenantId: string;
    userId: string;
  }): Promise<Array<FileMeta & { shared_at: string | Date; owner_email: string }>>;
}
