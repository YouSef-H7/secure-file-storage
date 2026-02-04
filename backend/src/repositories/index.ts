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
let fileRepositoryInstance: FileRepository | undefined;
let userRepositoryInstance: UserRepository | undefined;
let repositoriesInitialized = false;

// Singleton initialization guard
function initRepositoriesOnce() {
  if (repositoriesInitialized) {
    return; // Already initialized - do not re-init
  }
  
  repositoriesInitialized = true;
  
  if (STORAGE_BACKEND === 'fs') {
    // Filesystem backend (local development, no database required)
    fileRepositoryInstance = new FileRepositoryFS();
    userRepositoryInstance = new UserRepositoryFS();
    
    // Note: Folder and share repositories still use database via routes
    // These will be migrated to filesystem in a future update if needed
    // For now, folder/share routes continue to use db.execute() directly
    
  } else if (STORAGE_BACKEND === 'db') {
    // Database backend (OCI deployment)
    const FileRepositoryDB = require('./db/FileRepositoryDB').FileRepositoryDB;
    const UserRepositoryDB = require('./db/UserRepositoryDB').UserRepositoryDB;
    fileRepositoryInstance = new FileRepositoryDB();
    userRepositoryInstance = new UserRepositoryDB();
    console.log(`[BACKEND] Database Repository Initialized Successfully (DB Mode)`);
  } else {
    throw new Error(`Invalid STORAGE_BACKEND: ${STORAGE_BACKEND}. Must be 'fs' or 'db'.`);
  }
}

// Initialize once at module load
initRepositoriesOnce();

// Ensure instances are initialized (TypeScript guard)
if (!fileRepositoryInstance || !userRepositoryInstance) {
  throw new Error('Repository initialization failed');
}

// Export repositories (TypeScript assertion - we've verified they're initialized above)
export const fileRepository: FileRepository = fileRepositoryInstance as FileRepository;
export const userRepository: UserRepository = userRepositoryInstance as UserRepository;
