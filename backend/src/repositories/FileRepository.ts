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
}

export interface FileRepository {
  /**
   * List all files owned by a user within a tenant
   */
  listUserFiles(input: {
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
   * Delete file metadata and return storage path for physical deletion
   */
  deleteFileMeta(input: {
    fileId: string;
    tenantId: string;
    userId: string;
  }): Promise<{ storage_path: string } | null>;

  /**
   * List files shared with a user (direct shares only)
   */
  listSharedFiles(input: {
    tenantId: string;
    userId: string;
  }): Promise<Array<FileMeta & { shared_at: string | Date; owner_email: string }>>;
}
