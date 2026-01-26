/**
 * Database Implementation of FolderRepository
 * 
 * This is a STUB file for future OCI database implementation.
 * DO NOT import or use this file until database migration is complete.
 */

import { FolderRepository } from '../FolderRepository';

export class FolderRepositoryDB implements FolderRepository {
  async listUserFolders(input: { tenantId: string; ownerId: string }): Promise<import('../FolderRepository').FolderWithCount[]> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async getFolderById(input: { folderId: string; tenantId: string; userId: string }): Promise<import('../FolderRepository').FolderMeta | null> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async createFolder(input: { id: string; name: string; tenantId: string; ownerId: string; parentFolderId?: string | null }): Promise<void> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async updateFolderName(input: { folderId: string; name: string; tenantId: string; ownerId: string }): Promise<void> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async deleteFolder(input: { folderId: string; tenantId: string; ownerId: string }): Promise<void> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async listFolderContents(input: { folderId: string | null; tenantId: string; userId: string }): Promise<{ folders: Array<{ id: string; name: string; created_at: string | Date; owner_user_id: string }>; files: Array<{ id: string; name: string; size: number; created_at: string | Date; mime_type: string }> }> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async listSharedFolders(input: { tenantId: string; userId: string }): Promise<import('../FolderRepository').SharedFolderMeta[]> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }
}

export default FolderRepositoryDB;
