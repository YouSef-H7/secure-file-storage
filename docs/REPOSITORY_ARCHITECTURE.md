# Repository Architecture

## Overview

SecureStore uses a **Repository Pattern** to abstract storage operations, enabling seamless switching between filesystem (local development) and database (OCI production) backends.

## Architecture

```
┌─────────────────────────────────────────┐
│         Route Handlers                  │
│  (server.ts, routes/*.ts)              │
└──────────────┬──────────────────────────┘
               │
               │ Uses
               ▼
┌─────────────────────────────────────────┐
│      Repository Interfaces              │
│  (FileRepository, FolderRepository)    │
└──────────────┬──────────────────────────┘
               │
               │ Implemented by
               ▼
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌──────────┐        ┌──────────┐
│    FS    │        │    DB    │
│ (Active) │        │ (Stub)   │
└──────────┘        └──────────┘
```

## Current Implementation Status

### ✅ Filesystem Backend (Active)

**Location**: `src/repositories/fs/`

- **FileRepositoryFS**: Complete implementation
  - Stores metadata in `data/metadata/files.json`
  - Handles file CRUD operations
  - Supports sharing via `data/metadata/shares.json`
  
- **UserRepositoryFS**: Complete implementation
  - Stores user data in `data/metadata/users.json`
  - Used for user lookup in sharing operations

**Status**: ✅ Fully functional, used by file routes in `server.ts`

### ⚠️ Database Backend (Stub Only)

**Location**: `src/repositories/db/`

- All repository stubs exist but throw errors
- Will be implemented during OCI migration
- See `DATABASE_MIGRATION_PLAN.md` for implementation steps

## Configuration

### Environment Variable

```bash
STORAGE_BACKEND=fs  # Default: filesystem mode
STORAGE_BACKEND=db  # Future: database mode (OCI)
```

### Repository Factory

**File**: `src/repositories/index.ts`

Automatically selects implementation based on `STORAGE_BACKEND`:

```typescript
if (STORAGE_BACKEND === 'fs') {
  export const fileRepository = new FileRepositoryFS();
  export const userRepository = new UserRepositoryFS();
} else if (STORAGE_BACKEND === 'db') {
  // Will be enabled in OCI phase
  throw new Error('Database backend not enabled yet');
}
```

## Usage in Routes

### Before (Direct DB Access)

```typescript
const [files] = await db.execute(
  'SELECT * FROM files WHERE user_id = ?',
  [userId]
);
```

### After (Repository Pattern)

```typescript
import { fileRepository } from './repositories';

const files = await fileRepository.listUserFiles({
  tenantId: req.user!.tenantId,
  userId: req.user!.userId
});
```

## Migration Status

### ✅ Migrated to Repositories

- `server.ts` - File upload, list, get, download, delete routes
- All file operations now use `fileRepository`

### ⚠️ Still Using Direct DB Access

These routes still use `db.execute()` directly:
- `routes/folders.ts` - Folder operations
- `routes/sharing.ts` - Sharing operations  
- `routes/stats.ts` - Statistics
- `server.ts` - Register/Login (auth flow)

**Note**: These will be migrated to repositories during OCI phase or in a future update.

## Benefits

1. **No Database Required**: Filesystem mode works without any database connection
2. **Easy Migration**: Switch to database by changing one environment variable
3. **Testable**: Repository interfaces enable easy mocking in tests
4. **Isolated Changes**: Database migration affects only repository implementations
5. **Zero Frontend Impact**: Complete transparency to frontend code

## Data Storage (Filesystem Mode)

### Metadata Files

- `data/metadata/files.json` - File metadata
- `data/metadata/shares.json` - File/folder shares
- `data/metadata/users.json` - User data (for sharing lookup)
- `data/metadata/folders.json` - Folder metadata (future)

### Physical Files

- `data/uploads/{tenantId}/{userId}/` - Actual file storage

## Future: Database Mode

When `STORAGE_BACKEND=db` is enabled:

1. Database repositories will be implemented
2. Metadata stored in database tables
3. Physical files can remain in filesystem or move to OCI Object Storage
4. Zero code changes in routes (already use repositories)
5. Zero frontend changes

See `DATABASE_MIGRATION_PLAN.md` for detailed migration steps.
