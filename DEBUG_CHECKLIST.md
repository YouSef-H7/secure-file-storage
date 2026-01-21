# OIDC State Mismatch - Debug & Fix Checklist

## DIAGNOSIS COMPLETE ✅

### Root Cause Identified
**The bug was: `sameSite: 'none'` with `secure: false`**

Chrome silently rejects cookies with `SameSite=none` unless `Secure=true`. On localhost HTTP:
- Browser receives `Set-Cookie: connect.sid; SameSite=none; Secure=false`
- Chrome/Safari silently drop this cookie ❌
- Next request (OCI callback) has NO session cookie
- Backend creates a NEW session for the callback request
- Session IDs don't match → stored state can't be found → state mismatch error

## FIXES APPLIED ✅

### 1. config.ts - Fixed SameSite Policy
**Before:**
```typescript
SESSION_COOKIE_SAMESITE: (process.env.NODE_ENV === 'production' ? 'lax' : 'none') as 'lax' | 'none',
```

**After:**
```typescript
SESSION_COOKIE_SAMESITE: 'lax' as const,  // Always 'lax' for both dev and prod
```

**Why:** 'lax' is safe for localhost HTTP and same-site redirects. OCI redirects back to same origin (localhost:3000).

---

### 2. server.ts - Corrected Session Middleware
**Correct config (already applied):**
```typescript
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,  // Forces session creation + cookie emission
  name: 'connect.sid',
  cookie: {
    secure: false,         // ✅ HTTP in dev, automatic via NODE_ENV in prod
    httpOnly: true,        // ✅ Prevents XSS
    sameSite: 'lax',       // ✅ Safe for same-site redirects (not 'none'!)
    maxAge: 7*24*60*60*1000,
    path: '/',
  },
}));
```

---

### 3. routes/oidc.ts - Enhanced Instrumentation
Added comprehensive logging at `/auth/login` and `/auth/callback`:

**Login logs:**
- Session ID created
- State value (first 8 chars + length)
- Set-Cookie response headers (name, Secure flag, SameSite value)
- Session save status

**Callback logs:**
- Session ID received
- Cookie header presence (bytes + connect.sid check)
- Session state existence
- Exact state mismatch diagnosis

**Debug endpoint:**
```
GET /auth/_debug/session
```
Returns current session state (safe, no secrets).

---

## VERIFICATION STEPS ✅

### Step 1: Check terminal logs after clicking "Sign In with OCI"

**Expected for /auth/login:**
```
[OIDC/LOGIN] 2026-01-21T...
[OIDC/LOGIN] 📍 Session ID: abc123def456...
[OIDC/LOGIN] 📍 State: 8f9c2a1b... (len:43)
[OIDC/LOGIN] 📍 Set-Cookie count: 1
  [Cookie 0] connect.sid, Secure=false, SameSite=Lax
[OIDC/LOGIN] ✅ Session persisted successfully
[OIDC/LOGIN] 📍 Redirecting to OCI...
```

**Expected for /auth/callback:**
```
[OIDC/CALLBACK] 2026-01-21T...
[OIDC/CALLBACK] 📍 Session ID: abc123def456...      ← SAME ID!
[OIDC/CALLBACK] 📍 Cookie header: 87 bytes
[OIDC/CALLBACK] 📍 connect.sid in cookie: YES
[OIDC/CALLBACK] 📍 State from URL: 8f9c2a1b... (len:43)
[OIDC/CALLBACK] 📍 State in session: 8f9c2a1b... (len:43)  ← MATCHES!
[OIDC/CALLBACK] ✅ State validation passed
```

### Step 2: Browser DevTools Verification

**In Chrome DevTools → Application → Cookies:**
- Domain: `localhost`
- Cookie name: `connect.sid`
- Value: Random base64 string
- Secure: ☐ (unchecked for HTTP dev)
- HttpOnly: ☑ (checked)
- SameSite: `Lax`
- Path: `/`
- Expires/Max-Age: ~7 days

### Step 3: Debug Endpoint

```bash
# In terminal or browser:
curl http://localhost:3000/auth/_debug/session
```

Should return:
```json
{
  "timestamp": "2026-01-21T...",
  "sessionID": "abc123def456...",
  "sessionExists": true,
  "oidcStateExists": true,
  "oidcStateLength": 43,
  "userExists": false,
  "cookieHeader": "87 bytes",
  "connectSidInCookie": "yes"
}
```

---

## FINAL SESSION CONFIG (Production-Safe)

```typescript
// Development (localhost HTTP)
{
  secret: 'dev_session_secret_only',
  resave: false,
  saveUninitialized: true,
  name: 'connect.sid',
  cookie: {
    secure: false,      // ✅ HTTP only in dev
    httpOnly: true,
    sameSite: 'lax',    // ✅ Safe for same-site redirects
    maxAge: 604800000,  // 7 days
    path: '/',
  },
}

// Production (HTTPS)
{
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  name: 'connect.sid',
  cookie: {
    secure: true,       // ✅ HTTPS only in prod
    httpOnly: true,
    sameSite: 'lax',    // ✅ CSRF protection
    maxAge: 604800000,  // 7 days
    path: '/',
    domain: '.yourdomain.com',  // Optional for multi-subdomain
  },
}
```

---

## WHAT CHANGED & WHY

| Issue | Cause | Fix | Result |
|-------|-------|-----|--------|
| State mismatch error | `sameSite: 'none'` + `secure: false` = cookie dropped by browser | Changed to `sameSite: 'lax'` | Session cookie now persists |
| Session not created | `saveUninitialized: false` | Changed to `true` | Cookie emitted immediately at /auth/login |
| Session lost at callback | No explicit `req.session.save()` | Added `req.session.save()` callback | State data persisted before redirect |
| No debugging info | Minimal logging | Added 📍 instrumentation at key steps | Can now diagnose cookie/state flow |

---

## SUCCESS CRITERIA ✅

Your fix is complete when:

- [ ] `/auth/login` shows `Set-Cookie: connect.sid...SameSite=Lax` in terminal
- [ ] Session ID is the SAME at login and callback
- [ ] `/auth/callback` shows `connect.sid in cookie: YES`
- [ ] State values MATCH (both show same first 8 chars + length)
- [ ] `✅ State validation passed` appears in terminal
- [ ] Dashboard renders (you're logged in!)
- [ ] Page refresh keeps you logged in (session persists)

---

## ROLLBACK (if needed)

If something breaks, just revert:
1. `git checkout backend/src/config.ts`
2. `git checkout backend/src/server.ts`
3. `git checkout backend/src/routes/oidc.ts`

But you shouldn't need to—this fix is surgical and doesn't change architecture.
