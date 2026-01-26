/**
 * Folder Repository Interface
 * 
 * Abstraction layer for folder operations.
 * Implementations can use filesystem, database, or other storage backends.
 */

export interface FolderMeta {
  id: string;
  name: string;
  tenant_id: string;
  owner_user_id: string;
  parent_folder_id?: string | null;
  is_deleted: boolean;
  created_at: string | Date;
}

export interface FolderWithCount extends FolderMeta {
  file_count: number;
}

export interface SharedFolderMeta extends FolderMeta {
  shared_at: string | Date;
  owner_email: string;
}

export interface FolderRepository {
  /**
   * List all folders owned by a user
   */
  listUserFolders(input: {
    tenantId: string;
    ownerId: string;
  }): Promise<FolderWithCount[]>;

  /**
   * Get folder by ID with access check (owner or shared)
   */
  getFolderById(input: {
    folderId: string;
    tenantId: string;
    userId: string;
  }): Promise<FolderMeta | null>;

  /**
   * Create a new folder
   */
  createFolder(input: {
    id: string;
    name: string;
    tenantId: string;
    ownerId: string;
    parentFolderId?: string | null;
  }): Promise<void>;

  /**
   * Update folder name
   */
  updateFolderName(input: {
    folderId: string;
    name: string;
    tenantId: string;
    ownerId: string;
  }): Promise<void>;

  /**
   * Delete folder (logical delete)
   */
  deleteFolder(input: {
    folderId: string;
    tenantId: string;
    ownerId: string;
  }): Promise<void>;

  /**
   * List folder contents (subfolders and files)
   */
  listFolderContents(input: {
    folderId: string | null; // null for root
    tenantId: string;
    userId: string;
  }): Promise<{
    folders: Array<{ id: string; name: string; created_at: string | Date; owner_user_id: string }>;
    files: Array<{ id: string; name: string; size: number; created_at: string | Date; mime_type: string }>;
  }>;

  /**
   * List folders shared with a user
   */
  listSharedFolders(input: {
    tenantId: string;
    userId: string;
  }): Promise<SharedFolderMeta[]>;
}
