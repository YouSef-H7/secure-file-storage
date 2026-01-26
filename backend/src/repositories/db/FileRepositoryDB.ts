/**
 * Database Implementation of FileRepository
 * 
 * This is a STUB file for future OCI database implementation.
 * DO NOT import or use this file until database migration is complete.
 * 
 * When ready for OCI deployment:
 * 1. Implement this class using the existing database connection
 * 2. Update repositories/index.ts to export this implementation
 * 3. Set STORAGE_BACKEND=db in environment
 */

import { FileRepository, FileMeta } from '../FileRepository';

export class FileRepositoryDB implements FileRepository {
  async listUserFiles(input: { tenantId: string; userId: string }): Promise<FileMeta[]> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async getFileById(input: { fileId: string; tenantId: string; userId: string }): Promise<FileMeta | null> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async getFileForDownload(input: { fileId: string; tenantId: string; userId: string }): Promise<{ filename: string; storage_path: string } | null> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async saveFileMeta(meta: FileMeta): Promise<void> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async deleteFileMeta(input: { fileId: string; tenantId: string; userId: string }): Promise<{ storage_path: string } | null> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async listSharedFiles(input: { tenantId: string; userId: string }): Promise<Array<FileMeta & { shared_at: string | Date; owner_email: string }>> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }
}

export default FileRepositoryDB;
