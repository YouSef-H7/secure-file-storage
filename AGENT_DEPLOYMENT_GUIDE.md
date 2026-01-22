# Local Sync Agent - Deployment & Operations Guide

**Version:** 1.0  
**Status:** ✅ Production Ready  
**Last Updated:** January 22, 2026

---

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Backend API running on configured `API_BASE_URL` (default: http://localhost:3000)
- Valid BFF session cookie

### Installation & Deployment

```bash
# Navigate to agent directory
cd agent

# Install dependencies (if not already done)
npm install

# Build TypeScript to JavaScript
npm run build

# Copy test config to production config
cp .env.test .env

# Edit .env with your actual configuration
nano .env                          # Linux/macOS
# or
notepad .env                       # Windows

# Start the agent
npm start
```

### Expected Output
```
╔════════════════════════════════════════════════════════════════╗
║  LOCAL SYNC AGENT STARTING                                   ║
╚════════════════════════════════════════════════════════════════╝

[INFO] ✓ Configuration loaded successfully
[INFO] Watch directory: /path/to/watch/folder
[INFO] ✓ Backend is reachable (http://localhost:3000)
[INFO] ✓ Sync agent is now running
[DEBUG] Watching for file changes...
```

---

## Configuration

### Environment Variables

Create or edit `.env` file in the agent directory:

```env
# REQUIRED - Directory to watch for files
WATCH_DIR=./sync-folder

# REQUIRED - Backend API base URL
API_BASE_URL=http://localhost:3000

# REQUIRED - BFF session cookie (format: "connect.sid=<value>")
SESSION_COOKIE=connect.sid=abc123xyz789

# OPTIONAL - Logging level (debug|info|warn|error)
LOG_LEVEL=info

# OPTIONAL - Debounce delay in milliseconds (default: 500)
DEBOUNCE_DELAY=500

# OPTIONAL - File polling interval in milliseconds (default: 0 = no polling)
POLL_INTERVAL=0
```

### Configuration Details

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WATCH_DIR` | ✅ Yes | N/A | Local directory to monitor for file changes. Can be relative or absolute path. |
| `API_BASE_URL` | ✅ Yes | N/A | Backend API endpoint (e.g., `http://localhost:3000` or `https://api.example.com`) |
| `SESSION_COOKIE` | ✅ Yes | N/A | BFF session cookie for authentication. Format: `connect.sid=<session_id>` |
| `LOG_LEVEL` | ❌ No | `info` | Verbosity of output. Options: `debug`, `info`, `warn`, `error` |
| `DEBOUNCE_DELAY` | ❌ No | `500` | Milliseconds to wait before uploading after last file change (prevents duplicate uploads) |
| `POLL_INTERVAL` | ❌ No | `0` | File system polling interval. 0 = native file system events only |

### Example Configurations

**Development (High Verbosity)**
```env
WATCH_DIR=./sync-folder
API_BASE_URL=http://localhost:3000
SESSION_COOKIE=connect.sid=dev-session-123
LOG_LEVEL=debug
DEBOUNCE_DELAY=1000
```

**Production (Minimal Output)**
```env
WATCH_DIR=/var/data/sync
API_BASE_URL=https://api.production.com
SESSION_COOKIE=connect.sid=prod-session-secret
LOG_LEVEL=warn
DEBOUNCE_DELAY=500
```

---

## Running the Agent

### Production Mode (Compiled)
```bash
npm start
# Runs: node dist/index.js
# Uses pre-compiled JavaScript files
# Fastest execution
```

### Development Mode (TypeScript)
```bash
npm run dev
# Runs: ts-node src/index.ts
# Transpiles TypeScript on the fly
# Good for debugging
```

### Watch Mode (Auto-rebuild)
```bash
npm run watch
# Runs: tsc --watch
# Automatically recompiles TypeScript when files change
# Run in one terminal while running agent in another
```

### Build Only
```bash
npm run build
# Runs: tsc
# Compiles TypeScript to JavaScript
# Output goes to dist/ directory
```

---

## Architecture & Components

### Component Overview

```
┌─────────────────────────────────────────────────────┐
│         Local Sync Agent (Node.js CLI)              │
└─────────────────────────────────────────────────────┘
         ↓              ↓             ↓
    ┌────────────┐ ┌──────────┐ ┌──────────────┐
    │  Config    │ │ Watcher  │ │  Uploader    │
    │  Manager   │ │ (Chokidar)│ │  (Axios)    │
    └────────────┘ └──────────┘ └──────────────┘
         ↓              ↓             ↓
    ┌─────────────────────────┐  ┌──────────────┐
    │  Local File System      │  │  Backend API │
    │  (WATCH_DIR)            │  │  /api/files/ │
    └─────────────────────────┘  │  upload      │
                                  │ (BFF Auth)  │
                                  └──────────────┘
```

### Module Responsibilities

**config.ts** (Configuration Management)
- Loads environment variables from `.env`
- Validates required configuration
- Provides logging utilities
- Expands relative paths to absolute paths

**watcher.ts** (File System Monitoring)
- Watches `WATCH_DIR` recursively using Chokidar
- Detects file `add` and `change` events
- Waits for file write completion (2s stability threshold)
- Implements debounce to prevent duplicate uploads
- Ignores node_modules and hidden files

**uploader.ts** (HTTP File Upload)
- Creates Axios HTTP client with session cookie header
- Tests backend connectivity on startup
- Uploads files as multipart/form-data
- Validates HTTP response (200/201)
- Implements comprehensive error handling

**index.ts** (Main Orchestration)
- Loads configuration
- Instantiates FileWatcher and FileUploader
- Coordinates file detection → upload workflow
- Handles process lifecycle (SIGINT/SIGTERM)
- Tracks upload statistics

---

## Operation & Monitoring

### Monitoring Agent Health

```bash
# Check if agent is running
ps aux | grep "node.*dist/index.js"
# or
ps aux | grep "ts-node"

# Monitor logs in real-time
tail -f agent.log

# Check backend connectivity
curl http://localhost:3000/auth/me -H "Cookie: connect.sid=<your_session>"
```

### Typical Log Output

**Startup**
```
[INFO] ✓ Configuration loaded successfully
[INFO] Watch directory: /home/user/sync-folder
[DEBUG] Ensuring watch directory exists...
[INFO] ✓ Backend is reachable
[INFO] ✓ Sync agent is now running
```

**File Upload**
```
[DEBUG] File detected: hello.txt (added)
[DEBUG] Waiting for write completion...
[INFO] ✓ Uploaded: hello.txt (1.2 KB)
```

**Errors**
```
[ERROR] Failed to upload file.txt: Network timeout
[ERROR] Reason: ECONNREFUSED - Backend not responding
[WARN] Retrying upload in 30 seconds...
```

---

## File Upload Flow

### Step-by-Step Process

```
1. File Created/Modified
   └─→ Detected by Chokidar watcher
       └─→ Waits 2 seconds for write completion
           └─→ Debounces (500ms default)
               └─→ Calls uploader.uploadFile()
                   └─→ Creates FormData with file
                       └─→ POST to /api/files/upload with session cookie
                           └─→ Backend receives multipart/form-data
                               └─→ Stores file at /data/uploads/{tenantId}/{userId}/
                                   └─→ Returns HTTP 200/201
                                       └─→ Agent logs success
```

### Upload Details

**HTTP Request**
```
POST /api/files/upload HTTP/1.1
Host: localhost:3000
Content-Type: multipart/form-data; boundary=----boundary
Cookie: connect.sid=<session>

------boundary
Content-Disposition: form-data; name="file"; filename="hello.txt"
Content-Type: text/plain

Hello from Local Sync Agent
------boundary--
```

**Successful Response**
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "file": {
    "id": "file-123",
    "name": "hello.txt",
    "size": 1024,
    "uploadedAt": "2026-01-22T10:30:00Z"
  }
}
```

---

## Error Handling & Recovery

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `SESSION_COOKIE env var required` | Missing session cookie | Set `SESSION_COOKIE` in .env |
| `Backend not responding` | API unreachable | Start backend, check API_BASE_URL |
| `ENOENT: no such file` | Watch directory doesn't exist | Create directory or fix WATCH_DIR path |
| `Upload failed: 401 Unauthorized` | Invalid session cookie | Get fresh session from backend |
| `Network timeout` | Slow/no network connection | Check network, increase timeout if needed |

### Error Recovery Strategy

1. **Connection Errors**: Agent logs error but continues watching
2. **Invalid Session**: Agent logs "Unauthorized", waits for retry
3. **Backend Down**: Agent periodically tests connectivity, resumes when backend comes back
4. **File Permissions**: Agent logs error, continues watching for other files

### Enable Debug Logging

For troubleshooting, set `LOG_LEVEL=debug`:

```bash
# Edit .env
LOG_LEVEL=debug

# Restart agent
npm start
```

This will show:
- All file watch events
- Debounce timings
- HTTP request/response details
- Configuration loading steps

---

## Testing & Validation

### Create Test File

```bash
# Create a test file in watch directory
echo "Test content from agent" > sync-folder/test.txt

# Wait 2-3 seconds for agent to detect and upload
# Check agent logs for: "[INFO] ✓ Uploaded: test.txt"
```

### Test Debounce

```bash
# Rapidly create multiple files
echo "File 1" > sync-folder/file1.txt
echo "File 2" > sync-folder/file2.txt
echo "File 3" > sync-folder/file3.txt
echo "File 4" > sync-folder/file4.txt
echo "File 5" > sync-folder/file5.txt

# Without debounce: 5 uploads
# With debounce (500ms): 1 upload (last 4 batched together)
# Check logs to verify correct behavior
```

### Verify Backend Receipt

```bash
# Check backend logs or database
# Files should appear at: /data/uploads/{tenantId}/{userId}/

# Or query backend API if available
curl http://localhost:3000/api/files -H "Cookie: connect.sid=<session>"
```

---

## Deployment Scenarios

### Scenario 1: Local Development

**Setup**
```bash
cd agent
npm install
npm run build
cp .env.test .env
```

**Configuration (.env)**
```env
WATCH_DIR=./my-files
API_BASE_URL=http://localhost:3000
SESSION_COOKIE=connect.sid=dev-session
LOG_LEVEL=debug
```

**Run**
```bash
npm run dev
```

### Scenario 2: Containerized Deployment

**Dockerfile**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
COPY .env ./
CMD ["node", "dist/index.js"]
```

**Docker Compose**
```yaml
version: '3'
services:
  sync-agent:
    build: ./agent
    environment:
      WATCH_DIR: /mnt/sync-folder
      API_BASE_URL: http://backend:3000
      SESSION_COOKIE: connect.sid=docker-session
    volumes:
      - ./sync-folder:/mnt/sync-folder
    depends_on:
      - backend
```

**Run**
```bash
docker-compose up
```

### Scenario 3: Production (Always-On)

**Setup as System Service (Linux)**

Create `/etc/systemd/system/sync-agent.service`:
```ini
[Unit]
Description=Local Sync Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=sync-agent
WorkingDirectory=/opt/sync-agent
ExecStart=/usr/bin/node /opt/sync-agent/dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Start Service**
```bash
sudo systemctl enable sync-agent
sudo systemctl start sync-agent
sudo systemctl status sync-agent
```

**Monitor**
```bash
sudo journalctl -u sync-agent -f
```

---

## Troubleshooting

### Agent Won't Start

**Symptom:** No output when running `npm start`

**Debug Steps:**
1. Check Node.js installed: `node --version`
2. Check dependencies: `npm ls`
3. Check build: `npm run build` (look for errors)
4. Check .env exists: `ls -la .env`
5. Test config loading: `npm run dev`

### Files Not Uploading

**Symptom:** Files in watch folder but agent doesn't upload

**Debug Steps:**
1. Enable debug logging: `LOG_LEVEL=debug` in .env
2. Restart: `npm start`
3. Check if backend is running: `curl http://localhost:3000/auth/me`
4. Check session cookie is valid: `echo $SESSION_COOKIE`
5. Look for debounce logs: `[DEBUG] Debounce scheduled`

### Backend Connectivity Issues

**Symptom:** "Backend not responding" error

**Debug Steps:**
1. Verify backend is running: `ps aux | grep node`
2. Check port is correct: `netstat -tlnp | grep 3000`
3. Test connection: `curl http://localhost:3000`
4. Check firewall: `ufw status`
5. Verify session cookie: `curl http://localhost:3000/auth/me -H "Cookie: connect.sid=<value>"`

### High CPU/Memory Usage

**Symptom:** Agent consuming excess resources

**Debug Steps:**
1. Check file system activity: `watch 'ls -la sync-folder | wc -l'`
2. Reduce polling: `POLL_INTERVAL=0` in .env
3. Increase debounce: `DEBOUNCE_DELAY=2000` in .env
4. Check for infinite loops in logs
5. Restart agent: `npm start`

---

## Performance Tuning

### Optimize for Large Files

```env
# Increase stability threshold
DEBOUNCE_DELAY=2000

# Reduce polling frequency
POLL_INTERVAL=1000
```

### Optimize for High Frequency Changes

```env
# Quick debounce for rapid changes
DEBOUNCE_DELAY=300

# Fast polling for real-time detection
POLL_INTERVAL=100
```

### Optimize for Network Latency

```env
# Longer timeout for slow connections (in uploader.ts, modify timeout)
# Default is 30000ms (30 seconds)

# Increase debounce to batch uploads
DEBOUNCE_DELAY=1000
```

---

## Maintenance

### Backup Configuration

```bash
# Backup current .env
cp .env .env.backup.$(date +%Y%m%d)

# Backup watch folder
tar -czf sync-folder-backup.tar.gz sync-folder/
```

### Update Agent

```bash
# Save current config
cp .env .env.backup

# Update code from repository
git pull

# Rebuild
npm install
npm run build

# Restart
npm start
```

### Clean Up

```bash
# Remove node_modules
rm -rf node_modules

# Remove compiled files
rm -rf dist

# Reinstall everything
npm install
npm run build
```

---

## Support & Documentation

### Useful Resources

- **Agent README**: See `agent/README.md`
- **Setup Guide**: See `AGENT_SETUP_GUIDE.md`
- **Implementation Details**: See `AGENT_IMPLEMENTATION_CHECKLIST.md`
- **Test Results**: See `AGENT_E2E_TEST_RESULTS.md`

### Getting Help

1. Check logs with debug enabled: `LOG_LEVEL=debug`
2. Verify configuration: `cat .env`
3. Test backend: `curl http://localhost:3000/auth/me`
4. Review this guide's troubleshooting section
5. Check backend logs for upload endpoint errors

---

## Checklist Before Production

- [ ] Node.js 18+ installed
- [ ] Agent built: `npm run build`
- [ ] Dependencies installed: `npm install`
- [ ] .env configured with valid values
- [ ] Backend API running and reachable
- [ ] Session cookie obtained and working
- [ ] Watch directory created and writable
- [ ] Test file uploaded successfully
- [ ] Logs show successful upload
- [ ] Error handling working (simulate backend down)
- [ ] Debounce behavior verified
- [ ] Debug logging disabled for production
- [ ] Monitoring/logging strategy in place

---

## Production Readiness Summary

✅ **Configuration Management**: .env-based, validated  
✅ **File System Watching**: Recursive with debounce  
✅ **HTTP Uploading**: Multipart/form-data with session auth  
✅ **Error Handling**: Comprehensive with recovery  
✅ **Logging**: Debug through error levels  
✅ **Performance**: Optimizable for use case  
✅ **Deployment**: Multiple scenarios supported  

**Status: Ready for Production Deployment**

---

**Document Version:** 1.0  
**Last Updated:** January 22, 2026  
**Maintained By:** Engineering Team
