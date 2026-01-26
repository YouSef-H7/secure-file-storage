/**
 * Share Repository Interface
 * 
 * Abstraction layer for file and folder sharing operations.
 */

export interface ShareRepository {
  /**
   * Share a file with a user
   */
  shareFile(input: {
    fileId: string;
    ownerId: string;
    targetUserId: string;
    tenantId: string;
  }): Promise<void>;

  /**
   * Share a folder with a user
   */
  shareFolder(input: {
    folderId: string;
    ownerId: string;
    targetUserId: string;
    tenantId: string;
  }): Promise<void>;

  /**
   * Check if a file is shared with a user
   */
  isFileShared(input: {
    fileId: string;
    userId: string;
    tenantId: string;
  }): Promise<boolean>;

  /**
   * Check if a folder is shared with a user
   */
  isFolderShared(input: {
    folderId: string;
    userId: string;
    tenantId: string;
  }): Promise<boolean>;
}
