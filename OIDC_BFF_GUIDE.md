# OIDC BFF (Backend-For-Frontend) Implementation Guide

## Overview

This backend now implements the **Backend-For-Frontend (BFF) pattern** for OIDC authentication with OCI Identity Domain (IDCS). This is the **most secure way** to handle OAuth/OIDC in a web application because:

- ✅ **Tokens never sent to browser** - No XSS risk
- ✅ **httpOnly cookies** - No JavaScript access to session
- ✅ **State + Nonce + PKCE** - Full CSRF/replay attack protection
- ✅ **Server-side session** - Session data encrypted and secure
- ✅ **Credential-bearing requests** - Cookies sent automatically with CORS

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Frontend (React)                                                     │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ User clicks "Login" → redirects to /auth/login               │   │
│ └───────────────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────────────┘
             │ GET /auth/login
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Backend (Express + express-session)                                 │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ 1. Generate state, nonce, PKCE code_verifier                │   │
│ │ 2. Store in session (server-side only)                       │   │
│ │ 3. Redirect to OCI authorize endpoint                        │   │
│ └───────────────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────────────┘
             │ 302 redirect to OCI
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ OCI Identity Domain (IDCS)                                          │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ User enters credentials → validates                          │   │
│ │ Returns auth code + state to /auth/callback                  │   │
│ └───────────────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────────────┘
             │ GET /auth/callback?code=...&state=...
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Backend OIDC Callback Handler                                       │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ 1. Verify state (CSRF protection)                            │   │
│ │ 2. Exchange code + PKCE verifier for tokens (server-side)    │   │
│ │ 3. Validate ID token signature, issuer, nonce, expiry       │   │
│ │ 4. Extract user info from ID token                          │   │
│ │ 5. Store user in session (NO tokens sent to client)         │   │
│ │ 6. Set httpOnly secure cookie with session ID               │   │
│ │ 7. Redirect to frontend success page                        │   │
│ └───────────────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────────────┘
             │ 302 redirect to FRONTEND_SUCCESS_URL with httpOnly cookie
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Frontend (React)                                                     │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ Redirected to /app (auth=success in URL)                    │   │
│ │ Subsequent API calls include httpOnly cookie automatically   │   │
│ │ Browser JavaScript CANNOT access cookie (security!)         │   │
│ └───────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Security Features

### 1. **PKCE (Proof Key for Code Exchange)**
- Prevents authorization code interception attacks
- Code verifier sent in token endpoint request (not broadcast)
- Only backend knows the original code verifier

### 2. **State Parameter**
- Prevents CSRF attacks
- Generated on backend, verified on callback
- Never shared with OCI

### 3. **Nonce Parameter**
- Prevents replay attacks
- Embedded in ID token
- Verified on backend after token exchange

### 4. **ID Token Validation**
- Signature verified using OCI's JWKS public keys
- Issuer validated (must be your OCI domain)
- Audience validated (must be your client ID)
- Expiry checked
- Nonce verified

### 5. **httpOnly Cookies**
- Session ID stored in **httpOnly, Secure, SameSite** cookie
- JavaScript cannot access (XSS protection)
- Automatically sent with CORS requests (if credentials:true)
- Cannot be stolen by malicious scripts

### 6. **Server-Side Session**
- User info stored in encrypted session store (memory in dev, Redis in prod)
- No tokens in browser memory (no XSS risk)
- Backend can refresh tokens without user intervention

---

## Setup Instructions

### Step 1: Create OCI Confidential Application

1. Login to Oracle Cloud Console
2. Navigate to **Identity & Security → Domains**
3. Click your domain (or create one)
4. Go to **Applications → Application Instances**
5. Click **+ Add Application** → Select **Confidential Application**

**Configure Application:**
- **Name**: "Secure File Storage" (or your app name)
- **Application Description**: "Web application for file storage"
- **Redirect URLs**: Add exactly:
  - `http://localhost:3000/auth/callback` (development)
  - `https://yourdomain.com/auth/callback` (production)
- **OAuth Configuration**:
  - **Allowed Scopes**: Select `openid`, `profile`, `email`
  - **Default Scopes**: Select `openid`, `profile`, `email`
  - **Grant Types**: Select `Authorization Code`
  - **PKCE**: Choose "Allow Public Clients" or "Require PKCE" (if available)

6. Click **Next** → **Finish**

### Step 2: Get Application Credentials

1. Go to **Applications** → Find your app → **Configuration** tab
2. Copy:
   - **Client ID** → `OIDC_CLIENT_ID`
   - **Client Secret** → `OIDC_CLIENT_SECRET`

### Step 3: Get Issuer URL

1. In your domain, go to **Settings → OpenID Connect Token Configuration**
2. Copy **Primary Domain URL** (format: `https://idcs-<domain-id>.identity.oraclecloud.com`)
3. Set as `OIDC_ISSUER`

### Step 4: Configure Backend Environment

1. Copy `.env.example` to `.env` in backend directory:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Fill in `.env`:
   ```env
   OIDC_ISSUER=https://idcs-YOUR-DOMAIN-ID.identity.oraclecloud.com
   OIDC_CLIENT_ID=your-client-id
   OIDC_CLIENT_SECRET=your-client-secret
   OIDC_REDIRECT_URI=http://localhost:3000/auth/callback
   SESSION_SECRET=your-random-32-char-hex-here
   FRONTEND_BASE_URL=http://localhost:5173
   FRONTEND_SUCCESS_URL=http://localhost:5173/app
   ```

3. Generate SESSION_SECRET (random 32 chars):
   ```bash
   # Linux/Mac:
   openssl rand -hex 32
   
   # Windows PowerShell:
   -join ((0..31) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
   ```

### Step 5: Install Dependencies

```bash
cd backend
npm install
```

### Step 6: Start Backend

```bash
npm run dev
```

Output:
```
[BACKEND] Running on port 3000
[BACKEND] Data storage: ./data
```

### Step 7: Start Frontend

In a new terminal:
```bash
cd frontend
npm run dev
```

### Step 8: Test Login Flow

1. Open http://localhost:5173 in browser
2. Click "Sign In with OCI"
3. Redirected to `/auth/login` on backend
4. Backend redirects to OCI login page
5. Enter your OCI credentials
6. You're redirected to `/auth/callback`
7. Backend validates tokens, creates session, redirects to `/app`
8. Frontend calls `GET /auth/me` to verify authentication

---

## API Routes

### Authentication Routes

#### `GET /auth/login`
Initiates OIDC login flow.

**Response:** Redirects to OCI authorization endpoint

**Flow:**
1. Generates state, nonce, PKCE verifier
2. Stores in session (server-side)
3. Redirects to OCI

#### `GET /auth/callback`
Handles redirect from OCI after user login.

**Query Parameters:**
- `code` - Authorization code from OCI
- `state` - CSRF protection token

**Response:** Redirects to `FRONTEND_SUCCESS_URL` with httpOnly session cookie

**Flow:**
1. Verifies state (CSRF check)
2. Exchanges code for tokens using PKCE verifier
3. Validates ID token (signature, issuer, nonce, expiry)
4. Extracts user info
5. Creates server-side session
6. Sets httpOnly cookie

#### `GET /auth/me`
Returns current authenticated user.

**Response:**
```json
{
  "user": {
    "sub": "ocid1.idcsuser.oc1..xxxxx",
    "email": "user@company.com",
    "name": "John Doe"
  }
}
```

**Status:** 200 if authenticated, 401 if not

#### `POST /auth/logout`
Clears server-side session and cookie.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

## File API Routes (Protected)

All file routes require authentication (session or Bearer token).

### Session-Based Auth (BFF Pattern - Preferred)
```javascript
// Frontend automatically sends httpOnly cookie
fetch('http://localhost:3000/api/files', {
  credentials: 'include', // IMPORTANT: include cookies
})
```

### Bearer Token Auth (Legacy Support)
```bash
# For testing
curl -H "Authorization: Bearer <jwt-token>" \
  http://localhost:3000/api/files
```

#### `POST /api/files/upload`
Upload a file.

**Headers:**
- `Cookie: connect.sid=...` (automatic via httpOnly)

**Body:** FormData with `file` field

**Response:**
```json
{
  "id": "uuid",
  "name": "document.pdf"
}
```

#### `GET /api/files`
List user's files.

**Response:**
```json
[
  {
    "id": "uuid",
    "filename": "document.pdf",
    "size": 1024000,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### `GET /api/files/:id`
Get file metadata.

**Response:**
```json
{
  "id": "uuid",
  "filename": "document.pdf",
  "size": 1024000,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### `GET /api/files/:id/download`
Download file.

**Response:** File blob with `Content-Disposition: attachment` header

#### `DELETE /api/files/:id`
Delete file.

**Response:**
```json
{
  "message": "File deleted"
}
```

---

## Authentication Middleware

The `authenticate` middleware in `src/middleware/auth.ts` supports:

1. **Session-Based Auth (Priority 1)** - BFF Pattern
   - Checks `req.session.user`
   - Sets `req.user` from session
   - No token validation needed (already done at callback)

2. **Bearer Token Auth (Priority 2)** - Legacy Support
   - Checks `Authorization: Bearer <token>`
   - Validates JWT signature using OCI JWKS
   - Validates issuer, audience
   - Sets `req.user` from token claims

**Usage in routes:**
```typescript
import { authenticate, AuthRequest } from './middleware/auth';

app.get('/api/protected', authenticate, (req: AuthRequest, res) => {
  const userId = req.user?.userId || req.user?.sub;
  const email = req.user?.email;
  const tenantId = req.user?.tenantId || 'default-tenant';
  
  // Use user info in your business logic
});
```

---

## Environment Variables Reference

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `OIDC_ISSUER` | Yes | - | OCI domain URL (format: https://idcs-DOMAIN-ID.identity.oraclecloud.com) |
| `OIDC_CLIENT_ID` | Yes | - | OAuth app client ID from OCI |
| `OIDC_CLIENT_SECRET` | Yes | - | OAuth app client secret from OCI |
| `OIDC_REDIRECT_URI` | Yes | - | Must exactly match OCI app redirect URL |
| `OIDC_SCOPES` | No | `openid,profile,email` | Space or comma-separated OAuth scopes |
| `SESSION_SECRET` | Yes | - | Random 32+ char string for encrypting sessions |
| `SESSION_COOKIE_SECURE` | No | `false` | Set to true in production (HTTPS only) |
| `FRONTEND_BASE_URL` | No | `http://localhost:5173` | Frontend URL for CORS |
| `FRONTEND_SUCCESS_URL` | No | `http://localhost:5173/app` | Where to redirect after login |
| `PORT` | No | `3000` | Backend server port |
| `NODE_ENV` | No | `development` | Set to `production` for deployment |

---

## Troubleshooting

### Issue: "State mismatch - possible CSRF attack"

**Cause:** Session cookie lost or browser doesn't accept cookies

**Solution:**
- Check CORS: `credentials: true` on backend
- Frontend must use `fetch(..., { credentials: 'include' })`
- Browser must have 3rd-party cookies enabled (for local dev, same-origin OK)

### Issue: "ID token validation failed: issuer mismatch"

**Cause:** `OIDC_ISSUER` doesn't match token issuer

**Solution:**
- Get exact issuer from OCI Domain settings
- Format: `https://idcs-DOMAIN-ID.identity.oraclecloud.com` (no trailing slash)

### Issue: "Invalid or expired token"

**Cause:** Token expired or signature invalid

**Solution:**
- Check OCI JWKS endpoint is reachable
- Verify client secret is correct
- Check system time sync

### Issue: "Redirect URI mismatch"

**Cause:** `OIDC_REDIRECT_URI` doesn't match OCI app config

**Solution:**
- In OCI console, go to your app → Redirect URLs
- Add exact URL: `http://localhost:3000/auth/callback`
- For production, add `https://yourdomain.com/auth/callback`

### Issue: Frontend shows "Not authenticated" after login

**Cause:** httpOnly cookie not being sent

**Solution:**
- Backend must set CORS `credentials: true`
- Frontend must use `fetch(..., { credentials: 'include' })`
- Check browser cookie storage (DevTools → Application → Cookies)

---

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `SESSION_COOKIE_SECURE=true` (HTTPS required)
- [ ] Generate new `SESSION_SECRET` (not from .env.example)
- [ ] Update `OIDC_REDIRECT_URI` to production domain
- [ ] Add production redirect URL in OCI app config
- [ ] Update `FRONTEND_BASE_URL` to production domain
- [ ] Update `FRONTEND_SUCCESS_URL` to production domain
- [ ] Set up Redis for session store (instead of memory)
- [ ] Use strong `OIDC_CLIENT_SECRET`
- [ ] Enable HTTPS on backend and frontend
- [ ] Add SameSite and Secure cookie flags verification
- [ ] Test OIDC flow end-to-end
- [ ] Monitor session and token refresh logs

---

## Session Store Options

### Development (Current)
```typescript
// Memory store (sessions lost on restart)
import session from 'express-session';
app.use(session({ ... }));
```

### Production (Redis Recommended)
```bash
npm install connect-redis redis
```

```typescript
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient();
redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  ...
}));
```

---

## Testing Authentication Flow

### Test Session-Based Auth
```bash
# 1. Start browser flow
curl -i http://localhost:3000/auth/login

# 2. Manually do OAuth flow in browser
# 3. Check if httpOnly cookie set
curl -i -b "connect.sid=..." http://localhost:3000/auth/me

# 4. Call protected API
curl -i -b "connect.sid=..." http://localhost:3000/api/files
```

### Test Legacy Bearer Token Auth
```bash
# Get a token (use existing JWT from another auth method)
TOKEN="eyJhbGc..."

# Test protected API
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/files
```

---

## Architecture Decision: Why BFF Pattern?

### ✅ Advantages
- **No tokens in browser** → No XSS vulnerability
- **httpOnly cookies** → No JavaScript access
- **Server controls refresh** → No expired token UX issues
- **PKCE support** → Prevents authorization code theft
- **CSRF protection** → State + nonce validation
- **Simpler frontend code** → No token management

### ❌ Disadvantages (Minimal)
- Requires backend involvement for all auth
- Slightly more complex backend setup
- Session store needed (memory/Redis)

### Why Not "Frontend-Only" OIDC?
- Tokens exposed to JavaScript (XSS risk)
- Token management on frontend (complex)
- Client secret exposed to browser (security risk)
- No refresh token rotation
- Mobile apps stealing tokens

**BFF Pattern is industry best-practice for web applications.**

---

## Further Reading

- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [PKCE (RFC 7636)](https://tools.ietf.org/html/rfc7636)
- [Backend-For-Frontend Pattern](https://auth0.com/blog/backend-for-frontend-pattern/)
- [OCI Identity Platform Documentation](https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/overview.htm)
- [express-session Documentation](https://github.com/expressjs/session)
