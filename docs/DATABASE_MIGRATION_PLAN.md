# Database Migration Plan

## Overview

This document outlines the plan for migrating SecureStore from filesystem-based storage to database-backed storage in Oracle Cloud Infrastructure (OCI).

## Current Architecture

### Storage Backend: Filesystem (Default)

- **Location**: `data/metadata/` directory
- **Format**: JSON files (`files.json`, `shares.json`, `users.json`, etc.)
- **Physical Files**: Stored in `data/uploads/{tenantId}/{userId}/`
- **Configuration**: `STORAGE_BACKEND=fs` (default)

### Future Architecture: Database (OCI)

- **Database**: Oracle Cloud Database (MySQL/PostgreSQL compatible)
- **Storage Backend**: `STORAGE_BACKEND=db`
- **Physical Files**: OCI Object Storage (future enhancement)

## Repository Pattern

The codebase uses a repository abstraction layer to enable seamless switching between storage backends:

```
src/repositories/
├── FileRepository.ts          # Interface
├── FolderRepository.ts         # Interface
├── ShareRepository.ts          # Interface
├── UserRepository.ts           # Interface
├── index.ts                    # Factory (switches based on STORAGE_BACKEND)
├── fs/                         # Filesystem implementations
│   ├── FileRepositoryFS.ts
│   └── UserRepositoryFS.ts
└── db/                         # Database implementations (stubs)
    ├── FileRepositoryDB.ts
    ├── FolderRepositoryDB.ts
    ├── ShareRepositoryDB.ts
    └── UserRepositoryDB.ts
```

## Migration Steps (OCI Phase)

### Step 1: Database Setup

1. Provision Oracle Cloud Database instance
2. Create database schema (tables: `files`, `folders`, `folder_shares`, `shared_files`, `users`, `logs`)
3. Configure connection string in environment variables:
   ```
   DB_HOST=your-db-host
   DB_PORT=3306
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_NAME=securestore
   ```

### Step 2: Implement Database Repositories

1. **FileRepositoryDB.ts**
   - Implement all methods using existing `db.execute()` calls
   - Map current SQL queries to repository methods
   - Maintain exact same behavior as filesystem implementation

2. **FolderRepositoryDB.ts**
   - Implement folder CRUD operations
   - Use existing folder SQL queries from `routes/folders.ts`

3. **ShareRepositoryDB.ts**
   - Implement file and folder sharing
   - Use existing share SQL queries from `routes/sharing.ts`

4. **UserRepositoryDB.ts**
   - Implement user lookup
   - Use existing user SQL queries

### Step 3: Update Repository Factory

In `src/repositories/index.ts`:

```typescript
if (STORAGE_BACKEND === 'db') {
  export const fileRepository: FileRepository = new FileRepositoryDB();
  export const folderRepository: FolderRepository = new FolderRepositoryDB();
  export const shareRepository: ShareRepository = new ShareRepositoryDB();
  export const userRepository: UserRepository = new UserRepositoryDB();
}
```

### Step 4: Environment Configuration

Set in OCI environment:
```
STORAGE_BACKEND=db
```

### Step 5: Data Migration (If Needed)

If migrating existing filesystem data to database:

1. Create migration script: `scripts/migrate-fs-to-db.ts`
2. Read JSON files from `data/metadata/`
3. Insert into database tables
4. Verify data integrity

## Current Status

### ✅ Completed (Filesystem Mode)

- Repository interfaces created
- Filesystem implementations for:
  - `FileRepositoryFS` - File metadata operations
  - `UserRepositoryFS` - User lookup operations
- Main file routes in `server.ts` refactored to use repositories
- Configuration flag `STORAGE_BACKEND=fs` (default)

### ⚠️ Partial (Still Using Database)

The following routes still use `db.execute()` directly:
- `routes/folders.ts` - Folder operations
- `routes/sharing.ts` - File/folder sharing
- `routes/stats.ts` - Statistics
- `server.ts` - Register/Login endpoints (auth flow)

These will be migrated to repositories in a future update or during OCI migration.

## Files to Modify (OCI Phase)

### Core Implementation Files

1. `src/repositories/db/FileRepositoryDB.ts` - Implement all methods (stub exists)
2. `src/repositories/db/FolderRepositoryDB.ts` - Implement all methods (stub exists)
3. `src/repositories/db/ShareRepositoryDB.ts` - Implement all methods (stub exists)
4. `src/repositories/db/UserRepositoryDB.ts` - Implement all methods (stub exists)
5. `src/repositories/index.ts` - Enable DB repositories when `STORAGE_BACKEND=db`
6. `src/routes/folders.ts` - Refactor to use `folderRepository`
7. `src/routes/sharing.ts` - Refactor to use `shareRepository`
8. `src/routes/stats.ts` - Refactor to use repositories

### No Changes Required

- ✅ Frontend code (zero changes)
- ✅ Authentication/OIDC flow (zero changes)
- ✅ Middleware (zero changes)
- ✅ API contracts (zero changes)
- ✅ File routes in `server.ts` (already use repositories)

## Testing Checklist

Before deploying to OCI:

- [ ] All repository methods implemented
- [ ] Unit tests pass for DB repositories
- [ ] Integration tests verify behavior matches filesystem implementation
- [ ] Database connection pool configured correctly
- [ ] Environment variables set in OCI
- [ ] `STORAGE_BACKEND=db` tested in staging
- [ ] File upload/download works
- [ ] Folder operations work
- [ ] Sharing works (files and folders)
- [ ] Access control verified (tenant isolation, permissions)

## Rollback Plan

If issues occur in production:

1. Set `STORAGE_BACKEND=fs` in environment
2. Restart application
3. System reverts to filesystem storage
4. No data loss (database remains intact)

## Notes

- **Zero Frontend Changes**: The repository pattern is completely transparent to the frontend
- **Zero Auth Changes**: Authentication and authorization logic remains unchanged
- **Backward Compatible**: Filesystem mode remains available for local development
- **Isolated Change**: Database migration affects only repository implementations

## Timeline

- **Current**: Filesystem mode (local development)
- **OCI Phase**: Database mode (production deployment)
- **Future**: OCI Object Storage for physical files (separate enhancement)
