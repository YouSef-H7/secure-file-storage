# Local Sync Agent - End-to-End Functional Test

## 🎯 TEST OBJECTIVES

1. ✓ Agent starts without errors
2. ✓ Watch directory is monitored correctly
3. ✓ File creation triggers an upload
4. ✓ Upload reaches backend successfully (HTTP 200/201)
5. ✓ File appears in system (storage/database)
6. ✓ Logs clearly show detection → upload → success
7. ✓ Debounce works (rapid changes = single upload)

---

## 📋 TEST PREREQUISITES

### Required Services
- [ ] Backend running on http://localhost:3000
- [ ] Frontend running on http://localhost:5173 (for session cookie)
- [ ] Database accessible

### Required Files
- [ ] agent/src/config.ts (loads .env)
- [ ] agent/src/watcher.ts (watches files)
- [ ] agent/src/uploader.ts (uploads files)
- [ ] agent/src/index.ts (orchestrates)
- [ ] agent/.env or agent/.env.test (configuration)

### Agent Dependencies
- [ ] npm install completed
- [ ] node_modules present
- [ ] TypeScript compiled

---

## 🧪 TEST EXECUTION PLAN

### Phase 1: Configuration & Startup

**Step 1.1: Validate Configuration**
- Check .env file exists with valid values
- Verify API_BASE_URL = http://localhost:3000
- Verify WATCH_DIR is set
- Verify LOG_LEVEL = debug (for detailed output)

**Expected Output:**
```
[INFO] Starting file watcher on: /path/to/test-sync-folder
[INFO] Testing backend connectivity...
```

**Step 1.2: Test Backend Connectivity**
- Agent should attempt connection to /auth/me
- Should report: "Backend is reachable" OR "Cannot reach backend"

**Expected Output:**
```
[INFO] ✓ Backend is reachable
```

**Step 1.3: Start File Watcher**
- Agent should initialize file watcher on WATCH_DIR
- Should report: "Sync agent is now running"

**Expected Output:**
```
[INFO] ✓ Sync agent is now running
[INFO] Waiting for file changes...
```

---

### Phase 2: File Detection & Upload

**Step 2.1: Create Test File**
- Create file in WATCH_DIR: test-document.txt
- Content: "Test upload from Local Sync Agent"
- Size: ~35 bytes

**Expected Agent Logs:**
```
[DEBUG] File added: /path/to/test-sync-folder/test-document.txt
[DEBUG] Preparing upload: test-document.txt (35 B)
[DEBUG] [Uploader] POST /api/files/upload
[INFO] ✓ Uploaded: test-document.txt (35 B)
```

**Expected HTTP Request:**
```
POST http://localhost:3000/api/files/upload
Headers:
  Cookie: connect.sid=test-session
  Content-Type: multipart/form-data
Body:
  file: (binary) test-document.txt
```

**Step 2.2: Verify Backend Response**
- Should receive HTTP 200 or 201
- Should have success message in response

**Expected Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "name": "test-document.txt",
    "size": 35,
    "id": "..."
  }
}
```

---

### Phase 3: File Persistence

**Step 3.1: Check File in Storage**
- Verify file exists on backend at: /data/uploads/{tenantId}/{userId}/test-document.txt
- Verify file content matches original

**Expected State:**
```
/data/uploads/default-tenant/test-user/test-document.txt exists
Content: "Test upload from Local Sync Agent"
```

**Step 3.2: Verify Database Entry** (if applicable)
- File metadata stored in database
- File record linked to user/tenant
- Timestamp recorded

---

### Phase 4: Debounce & Modification

**Step 4.1: Modify File (Rapid Changes)**
- Append to test-document.txt 5 times in quick succession
- Wait 1 second between each change
- Total time: ~5 seconds

**Expected Behavior:**
- Agent receives 5 'change' events
- Debounce should group them (500ms delay)
- **Only 1 upload** should occur

**Expected Agent Logs:**
```
[DEBUG] File changed: /path/to/test-sync-folder/test-document.txt
[DEBUG] File changed: /path/to/test-sync-folder/test-document.txt
[DEBUG] File changed: /path/to/test-sync-folder/test-document.txt
[DEBUG] File changed: /path/to/test-sync-folder/test-document.txt
[DEBUG] File changed: /path/to/test-sync-folder/test-document.txt
[DEBUG] Preparing upload: test-document.txt (X B)
[INFO] ✓ Uploaded: test-document.txt (X B)
```

**Expected HTTP Traffic:**
- 1 POST /api/files/upload (not 5)

---

### Phase 5: Error Handling

**Step 5.1: Create Large File**
- Create file > 1MB (if backend supports)
- Verify upload succeeds or fails gracefully

**Expected Behavior:**
- If supported: Upload succeeds
- If not supported: Error logged, agent continues

**Step 5.2: Subdirectory Support**
- Create nested directory: test-sync-folder/subdir/
- Add file: test-sync-folder/subdir/nested.txt
- Verify upload succeeds

**Expected Behavior:**
- File detected and uploaded
- Path preserved correctly

---

## ✅ VALIDATION CHECKLIST

### Logging
- [ ] Agent startup message displayed
- [ ] Backend connectivity test shown
- [ ] File detection logged with timestamp
- [ ] Upload started/completed logged
- [ ] Success/failure clearly indicated

### HTTP Traffic
- [ ] POST request to /api/files/upload
- [ ] Session cookie included
- [ ] Multipart form-data correct
- [ ] Response status 200 or 201

### File Operations
- [ ] File detected within 2 seconds of creation
- [ ] File uploaded successfully
- [ ] Original content preserved
- [ ] Multiple changes debounced correctly

### Agent Behavior
- [ ] Agent continues running after upload
- [ ] Graceful shutdown on Ctrl+C
- [ ] Error messages are actionable
- [ ] No crashes or hangs

---

## 🔴 FAILURE CONDITIONS

The test FAILS if ANY of these occur:

- Agent fails to start (exits with error)
- Backend connectivity test fails
- File is not detected within 3 seconds
- Upload fails (HTTP error)
- Multiple uploads occur for single file change
- File content is corrupted
- Agent crashes during test
- Logs don't clearly show what happened

---

## 📊 TEST RESULTS TEMPLATE

```
═══════════════════════════════════════════════════════════════════
LOCAL SYNC AGENT - END-TO-END TEST RESULTS
═══════════════════════════════════════════════════════════════════

ENVIRONMENT:
  Backend: http://localhost:3000 [✓ / ✗]
  Watch Dir: ./test-sync-folder [Created / Exists]
  Config: .env.test [✓]

PHASE 1: STARTUP
  [✓/✗] Agent starts without errors
  [✓/✗] Backend connectivity verified
  [✓/✗] File watcher ready

PHASE 2: UPLOAD
  [✓/✗] Test file created
  [✓/✗] File detected by agent
  [✓/✗] Upload initiated
  [✓/✗] HTTP 200/201 received
  [✓/✗] File persisted on backend

PHASE 3: PERSISTENCE
  [✓/✗] File exists in storage
  [✓/✗] Content matches original
  [✓/✗] Metadata stored

PHASE 4: DEBOUNCE
  [✓/✗] Rapid changes trigger one upload
  [✓/✗] Correct file size after modification

OBSERVED LOGS:
[paste relevant log lines]

OBSERVED HTTP TRAFFIC:
[paste requests/responses]

FINAL VERDICT: [PASS / FAIL]

REASON:
[if PASS: all tests successful]
[if FAIL: specific step that failed and why]
═══════════════════════════════════════════════════════════════════
```

---

## 🚀 HOW TO RUN THIS TEST

### 1. Prepare Environment
```bash
cd agent
cp .env.example .env.test
# Edit .env.test with test values
mkdir -p test-sync-folder
```

### 2. Ensure Backend is Running
```bash
# Terminal 1
cd backend
npm run dev
```

### 3. Start Agent
```bash
# Terminal 2
cd agent
npm run dev  # or: npm start (if compiled)
```

### 4. Run Test
```bash
# Terminal 3
cd agent
# Create test file:
echo "Test upload from Local Sync Agent" > test-sync-folder/test-document.txt

# Observe logs in Terminal 2
# Wait 2-3 seconds for upload
# Check backend logs
```

### 5. Verify Results
```bash
# Check file was persisted
ls -la /data/uploads/*/
cat /data/uploads/*/*/test-document.txt
```

---

## 📝 NOTES FOR MANUAL EXECUTION

- This test requires actual file system operations and network calls
- Backend must have `/api/files/upload` endpoint working
- Session cookie must be valid for backend to accept upload
- Timing assumptions: 2-3 seconds for file detection and upload
- Debounce testing requires rapid file modifications

---

**Test Created:** January 22, 2026  
**Status:** Ready for Execution
