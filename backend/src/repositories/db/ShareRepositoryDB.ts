/**
 * Database Implementation of ShareRepository
 * 
 * This is a STUB file for future OCI database implementation.
 * DO NOT import or use this file until database migration is complete.
 */

import { ShareRepository } from '../ShareRepository';

export class ShareRepositoryDB implements ShareRepository {
  async shareFile(input: { fileId: string; ownerId: string; targetUserId: string; tenantId: string }): Promise<void> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async shareFolder(input: { folderId: string; ownerId: string; targetUserId: string; tenantId: string }): Promise<void> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async isFileShared(input: { fileId: string; userId: string; tenantId: string }): Promise<boolean> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async isFolderShared(input: { folderId: string; userId: string; tenantId: string }): Promise<boolean> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }
}

export default ShareRepositoryDB;
