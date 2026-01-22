# Secure File Storage - Local Sync Agent

A lightweight Node.js CLI agent that watches a local folder and automatically syncs files to the Secure File Storage backend.

## Features

- **One-way sync**: Local folder → Backend
- **Automatic**: Watches for new and modified files
- **Session-based auth**: Uses BFF session cookies (no token management)
- **Debounced**: Avoids duplicate uploads on rapid changes
- **Clean logging**: Track uploads and errors in real-time
- **PoC quality**: Simple, extensible, no external dependencies

## Installation

```bash
cd agent
npm install
```

## Configuration

1. **Create .env file** (copy from .env.example):
   ```bash
   cp .env.example .env
   ```

2. **Get your session cookie**:
   - Sign in to the web UI at http://localhost:5173/login
   - Open browser DevTools → Application → Cookies
   - Find `connect.sid` cookie
   - Copy the value

3. **Edit .env**:
   ```env
   WATCH_DIR=./sync-folder
   API_BASE_URL=http://localhost:3000
   SESSION_COOKIE=connect.sid=your_session_id_here
   LOG_LEVEL=info
   ```

4. **Create watch folder**:
   ```bash
   mkdir sync-folder
   ```

## Usage

### Development (with ts-node):
```bash
npm run dev
```

### Build:
```bash
npm run build
```

### Production:
```bash
npm start
```

## How It Works

1. Agent starts and connects to backend
2. Watches `WATCH_DIR` recursively for file changes
3. When a file is added or modified:
   - Waits for file to stabilize (2 seconds)
   - Debounces rapid changes (500ms default)
   - Uploads via multipart form-data to `/api/files/upload`
   - Sends session cookie for authentication
4. Logs each upload with file size and status

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| WATCH_DIR | Yes | - | Local folder to watch |
| API_BASE_URL | Yes | - | Backend API URL |
| SESSION_COOKIE | Yes | - | Session cookie from browser |
| POLL_INTERVAL | No | 0 | Polling interval (0 = native FS events) |
| DEBOUNCE_DELAY | No | 500 | Debounce delay in ms |
| LOG_LEVEL | No | info | Log level (debug, info, warn, error) |

## Example Workflow

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Authenticate
# Open http://localhost:5173/login
# Sign in with OCI credentials
# Copy session cookie from DevTools

# Terminal 3: Configure agent
cd agent
cp .env.example .env
# Edit .env with your session cookie

# Terminal 3: Start sync agent
npm run dev

# Terminal 4: Add files
mkdir sync-folder
echo "Hello World" > sync-folder/test.txt
# Agent automatically uploads to backend
```

## Logging

Log messages show:
- Timestamp
- Log level (DEBUG, INFO, WARN, ERROR)
- Message

Example output:
```
[2024-01-21T10:30:45.123Z] [INFO] Starting file watcher on: /path/to/sync-folder
[2024-01-21T10:30:45.456Z] [DEBUG] File added: /path/to/sync-folder/document.pdf
[2024-01-21T10:30:47.789Z] [INFO] ✓ Uploaded: document.pdf (2.34 MB)
```

## Error Handling

Agent continues running if:
- Backend is temporarily unreachable
- File upload fails
- Session expires (retry on next file change)

Check `.env` and backend logs if uploads consistently fail.

## Architecture

```
agent/
├── src/
│   ├── index.ts       # Main entry point and orchestration
│   ├── config.ts      # Configuration and validation
│   ├── watcher.ts     # File system watching (chokidar)
│   └── uploader.ts    # HTTP file upload (axios)
├── package.json
├── tsconfig.json
└── README.md
```

## Notes

- This is a PoC implementation - production use requires additional features:
  - Persistent upload queue (disk-based or database)
  - Conflict resolution for file overwrites
  - Selective syncing (patterns, filters)
  - Resume on agent restart
  - Progress tracking
  - Bandwidth throttling

- Session cookie must be manually refreshed if it expires
- No UI - everything is CLI-based
- Files are not deleted from local folder after upload

## Troubleshooting

**"SESSION_COOKIE environment variable is required"**
- Sign in via web UI first
- Copy session cookie from browser DevTools

**"Cannot connect to backend"**
- Ensure backend is running on `API_BASE_URL`
- Check network connectivity

**"Unexpected response status"**
- Backend may have rejected the file
- Check backend logs for upload errors

**No files uploading**
- Verify `WATCH_DIR` exists and is correct
- Try adding a new file (not modifying existing)
- Check log level is not `error`
