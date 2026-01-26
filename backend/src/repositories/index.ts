/**
 * Repository Factory
 * 
 * Provides repository instances based on STORAGE_BACKEND environment variable.
 * 
 * Default: 'fs' (filesystem) for local development
 * Future: 'db' (database) for OCI deployment
 * 
 * Usage:
 *   import { fileRepository } from './repositories';
 *   const files = await fileRepository.listUserFiles({ tenantId, userId });
 */

import { FileRepository } from './FileRepository';
import { FolderRepository } from './FolderRepository';
import { ShareRepository } from './ShareRepository';
import { UserRepository } from './UserRepository';

// Filesystem implementations
import FileRepositoryFS from './fs/FileRepositoryFS';
import UserRepositoryFS from './fs/UserRepositoryFS';

// Database implementations (stubs - not used until OCI)
// import FileRepositoryDB from './db/FileRepositoryDB';
// import FolderRepositoryDB from './db/FolderRepositoryDB';
// import ShareRepositoryDB from './db/ShareRepositoryDB';
// import UserRepositoryDB from './db/UserRepositoryDB';

// Use config value for consistency
import { config } from '../config';

const STORAGE_BACKEND = config.STORAGE_BACKEND;

// Initialize repositories based on storage backend
let fileRepositoryInstance: FileRepository;
let userRepositoryInstance: UserRepository;

if (STORAGE_BACKEND === 'fs') {
  // Filesystem backend (local development, no database required)
  fileRepositoryInstance = new FileRepositoryFS();
  userRepositoryInstance = new UserRepositoryFS();
  
  // Note: Folder and share repositories still use database via routes
  // These will be migrated to filesystem in a future update if needed
  // For now, folder/share routes continue to use db.execute() directly
  
} else if (STORAGE_BACKEND === 'db') {
  // Database backend (OCI deployment) - NOT IMPLEMENTED YET
  throw new Error('Database backend not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  // When ready for OCI:
  // fileRepositoryInstance = new FileRepositoryDB();
  // userRepositoryInstance = new UserRepositoryDB();
} else {
  throw new Error(`Invalid STORAGE_BACKEND: ${STORAGE_BACKEND}. Must be 'fs' or 'db'.`);
}

// Export repositories
export const fileRepository: FileRepository = fileRepositoryInstance;
export const userRepository: UserRepository = userRepositoryInstance;
