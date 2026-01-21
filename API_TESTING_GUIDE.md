# API Testing Guide - cURL Examples

## Prerequisites

- Backend running on `http://localhost:3000`
- You're authenticated (have valid session cookie)

## Authentication Endpoints

### 1. Start Login Flow

```bash
# This initiates OIDC flow
# Your browser will redirect to this automatically
curl -i http://localhost:3000/auth/login

# Expected Response:
# 302 Found
# Location: https://idcs-XXXX.identity.oraclecloud.com/oauth/authorize?...
# Set-Cookie: connect.sid=...; Path=/; HttpOnly; SameSite=Lax
```

### 2. Get Current User (After Login)

```bash
# Get the session ID from your browser first:
# DevTools → Application → Cookies → connect.sid → copy value
export COOKIE="connect.sid=abc123..."

# Now test authentication
curl -i -b "$COOKIE" http://localhost:3000/auth/me

# Expected Response (401 if not authenticated):
# 401 Unauthorized
# Content-Type: application/json
# {"error":"Not authenticated"}

# Expected Response (200 if authenticated):
# 200 OK
# Content-Type: application/json
# {
#   "user": {
#     "sub": "ocid1.idcsuser.oc1..xxxxx",
#     "email": "user@company.com",
#     "name": "John Doe"
#   }
# }
```

### 3. Logout

```bash
export COOKIE="connect.sid=abc123..."

curl -i -X POST -b "$COOKIE" http://localhost:3000/auth/logout

# Expected Response:
# 200 OK
# Content-Type: application/json
# Set-Cookie: connect.sid=; Path=/; MaxAge=0
# {"message":"Logged out successfully"}
```

---

## File API Endpoints

### 1. List Files

```bash
# Get all files for authenticated user
export COOKIE="connect.sid=abc123..."

curl -i -b "$COOKIE" http://localhost:3000/api/files

# Expected Response (200 if authenticated):
# 200 OK
# Content-Type: application/json
# [
#   {
#     "id": "550e8400-e29b-41d4-a716-446655440000",
#     "filename": "document.pdf",
#     "size": 1024000,
#     "created_at": "2024-01-15T10:30:00Z"
#   },
#   {
#     "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
#     "filename": "image.png",
#     "size": 2048576,
#     "created_at": "2024-01-14T15:20:00Z"
#   }
# ]

# If not authenticated:
# 401 Unauthorized
# {"error":"Missing authentication"}
```

### 2. Upload File

```bash
# Upload a file
export COOKIE="connect.sid=abc123..."

# Create a test file
echo "This is a test file" > /tmp/test.txt

# Upload it
curl -i -b "$COOKIE" \
  -F "file=@/tmp/test.txt" \
  http://localhost:3000/api/files/upload

# Expected Response:
# 201 Created
# Content-Type: application/json
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "name": "test.txt"
# }

# Or if file type not allowed:
# 400 Bad Request
# {"error":"Invalid file type: text/plain"}
```

### 3. Get File Metadata

```bash
export COOKIE="connect.sid=abc123..."
export FILE_ID="550e8400-e29b-41d4-a716-446655440000"

curl -i -b "$COOKIE" \
  http://localhost:3000/api/files/$FILE_ID

# Expected Response:
# 200 OK
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "filename": "document.pdf",
#   "size": 1024000,
#   "created_at": "2024-01-15T10:30:00Z"
# }

# If file not found:
# 404 Not Found
# {"error":"File not found"}
```

### 4. Download File

```bash
export COOKIE="connect.sid=abc123..."
export FILE_ID="550e8400-e29b-41d4-a716-446655440000"

curl -i -b "$COOKIE" -O \
  http://localhost:3000/api/files/$FILE_ID/download

# Expected Response:
# 200 OK
# Content-Type: application/pdf
# Content-Disposition: attachment; filename="document.pdf"
# [binary file content]

# File is saved to current directory with original name
```

### 5. Delete File

```bash
export COOKIE="connect.sid=abc123..."
export FILE_ID="550e8400-e29b-41d4-a716-446655440000"

curl -i -X DELETE -b "$COOKIE" \
  http://localhost:3000/api/files/$FILE_ID

# Expected Response:
# 200 OK
# {"message":"File deleted"}

# If file not found:
# 404 Not Found
# {"error":"File not found"}
```

---

## Health Check

### Check Backend Status

```bash
curl -i http://localhost:3000/api/health

# Expected Response:
# 200 OK
# {
#   "status": "ok",
#   "timestamp": "2024-01-15T10:30:00.000Z",
#   "version": "1.0.0"
# }
```

---

## Error Responses

### 401 Unauthorized

```bash
# No session cookie
curl -i http://localhost:3000/api/files

# Response:
# 401 Unauthorized
# {"error":"Missing authentication"}
```

### 403 Forbidden (Not Your File)

```bash
# Try to access another user's file
curl -i -b "$COOKIE" \
  http://localhost:3000/api/files/other-users-file-id

# Response:
# 404 Not Found
# {"error":"File not found"}
```

### 400 Bad Request

```bash
# Upload invalid file type
curl -i -b "$COOKIE" \
  -F "file=@/tmp/script.exe" \
  http://localhost:3000/api/files/upload

# Response:
# 400 Bad Request
# {"error":"Invalid file type: application/x-msdownload"}
```

### 413 Payload Too Large

```bash
# Upload file larger than MAX_FILE_MB
# Response:
# 413 Payload Too Large
# {"error":"File too large"}
```

### 500 Internal Server Error

```bash
# Server error (rare)
# Response:
# 500 Internal Server Error
# {"error":"Description of what went wrong"}
```

---

## Full Login Flow Test (Manual)

```bash
#!/bin/bash

# Step 1: Start backend
echo "Starting backend..."
# In separate terminal: cd backend && npm run dev

# Step 2: Wait for startup
sleep 2

# Step 3: Check health
echo "Checking health..."
curl -s http://localhost:3000/api/health | jq .

# Step 4: Try to access protected route (should fail)
echo "Trying protected route without auth (should fail)..."
curl -i http://localhost:3000/api/files

# Step 5: Manual browser test
echo "Open http://localhost:5173 in browser"
echo "Click 'Sign In with OCI'"
echo "Enter credentials"
echo "Wait for redirect..."
read -p "Press Enter after login..."

# Step 6: Get session cookie from browser
echo "Go to DevTools → Application → Cookies"
echo "Copy connect.sid value"
read -p "Paste connect.sid value: " COOKIE

# Step 7: Test authenticated requests
export COOKIE="connect.sid=$COOKIE"

echo ""
echo "Testing /auth/me endpoint..."
curl -b "$COOKIE" http://localhost:3000/auth/me | jq .

echo ""
echo "Testing /api/files endpoint..."
curl -b "$COOKIE" http://localhost:3000/api/files | jq .

echo ""
echo "✅ Authentication flow successful!"
```

---

## Batch Testing Script

```bash
#!/bin/bash

# Save as test-api.sh
# Usage: ./test-api.sh <cookie_value>

if [ -z "$1" ]; then
  echo "Usage: $0 <connect.sid value>"
  exit 1
fi

COOKIE="connect.sid=$1"
BASE_URL="http://localhost:3000"

echo "=== API Testing Suite ==="
echo ""

# Test 1: Current User
echo "Test 1: GET /auth/me"
curl -s -b "$COOKIE" "$BASE_URL/auth/me" | jq .
echo ""

# Test 2: List Files
echo "Test 2: GET /api/files"
curl -s -b "$COOKIE" "$BASE_URL/api/files" | jq .
echo ""

# Test 3: Upload File
echo "Test 3: POST /api/files/upload"
echo "Test content" > /tmp/test.pdf
curl -s -b "$COOKIE" \
  -F "file=@/tmp/test.pdf;type=application/pdf" \
  "$BASE_URL/api/files/upload" | jq .
echo ""

# Extract file ID from response (manual for now)
# FILE_ID="..."

# Test 4: Get File Metadata
# echo "Test 4: GET /api/files/$FILE_ID"
# curl -s -b "$COOKIE" "$BASE_URL/api/files/$FILE_ID" | jq .
# echo ""

# Test 5: Health Check
echo "Test 5: GET /api/health"
curl -s "$BASE_URL/api/health" | jq .
echo ""

echo "=== Tests Complete ==="
```

---

## Using Postman/Insomnia

### 1. Set Up Environment

Create environment with:
```json
{
  "BASE_URL": "http://localhost:3000",
  "COOKIE": "connect.sid=your-value-here"
}
```

### 2. Create Requests

**GET /auth/me**
```
GET {{BASE_URL}}/auth/me
Cookie: {{COOKIE}}
```

**GET /api/files**
```
GET {{BASE_URL}}/api/files
Cookie: {{COOKIE}}
```

**POST /api/files/upload**
```
POST {{BASE_URL}}/api/files/upload
Cookie: {{COOKIE}}

Body: form-data
file: [select your file]
```

**DELETE /api/files/:id**
```
DELETE {{BASE_URL}}/api/files/550e8400-e29b-41d4-a716-446655440000
Cookie: {{COOKIE}}
```

---

## Bearer Token Testing (Legacy Support)

If you have a valid JWT token:

```bash
export TOKEN="eyJhbGc..."

# Test with Bearer token
curl -i -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/files

# Should work same as session auth
# 200 OK with file list
```

---

## Common Issues & Solutions

### "State mismatch" Error

```bash
# This happens if cookies aren't being sent
# Solution: Use -b flag with curl

# ❌ WRONG
curl http://localhost:3000/api/files

# ✅ CORRECT
curl -b "connect.sid=value" http://localhost:3000/api/files
```

### "Missing authentication"

```bash
# Session expired or cookie not sent
# Solution: Login again and get fresh cookie

# Get new cookie from browser:
# DevTools → Application → Cookies → connect.sid
```

### "File not found"

```bash
# Wrong file ID or not your file
# Solution: List files first to get valid ID

curl -b "$COOKIE" http://localhost:3000/api/files | jq '.[0].id'
```

---

## Performance Testing

### Concurrent Uploads

```bash
#!/bin/bash

export COOKIE="connect.sid=abc123..."

for i in {1..10}; do
  echo "Uploading file $i..."
  curl -s -b "$COOKIE" \
    -F "file=@/tmp/test-$i.pdf" \
    http://localhost:3000/api/files/upload &
done

wait
echo "All uploads complete"
```

### Load Testing

```bash
# Using Apache Bench
ab -c 10 -n 100 -b "$COOKIE" http://localhost:3000/api/files

# Using wrk (if installed)
wrk -c 10 -t 4 -d 30s \
  -H "Cookie: $COOKIE" \
  http://localhost:3000/api/files
```

---

## Debugging Tips

### Enable Verbose Output

```bash
# See full request/response
curl -v -b "connect.sid=abc123" \
  http://localhost:3000/api/files

# Trace DNS, TCP, TLS handshake
curl -w "Time: %{time_total}s\n" \
  -b "connect.sid=abc123" \
  http://localhost:3000/api/files
```

### Pretty Print JSON

```bash
# Requires jq
curl -s -b "$COOKIE" http://localhost:3000/api/files | jq .

# Or using Python
curl -s -b "$COOKIE" http://localhost:3000/api/files | python -m json.tool
```

### Save Response to File

```bash
# Save full response including headers
curl -i -b "$COOKIE" \
  http://localhost:3000/api/files \
  > response.txt

# View it
cat response.txt
```

---

**Use these examples to test your OIDC BFF implementation!**
