# STATE MISMATCH DEBUGGING - STEP-BY-STEP VERIFICATION

## INSTRUMENTATION COMPLETE ✅

All logging is in place. Backend will now show detailed evidence of:
- Session ID at login vs callback
- State values and their lengths
- Cookie headers (presence, flags)
- Session store contents

## STEP 1: PRE-TEST CHECK

Run these debug endpoints to establish baseline (do this BEFORE login):

```bash
# Terminal 1: Watch backend logs
cd backend && npx ts-node src/server.ts

# Terminal 2: Check current session state (should be empty)
curl http://localhost:3000/auth/_debug/cookies
```

Expected output for _debug/cookies (no prior login):
```json
{
  "currentSessionID": "someRandomId",
  "sessionStoreHasData": false,
  "cookieCount": 0,
  "connectSidPresent": false,
  "sessionData": {
    "hasOidcState": false,
    "oidcStateLength": null,
    ...
  }
}
```

---

## STEP 2: PERFORM LOGIN TEST

In browser:
1. Go to http://localhost:5173/login
2. Click "Sign In with OCI"
3. Complete OCI authentication

---

## STEP 3: EXAMINE LOGIN LOGS

**Watch Terminal 1 (backend) for this output:**

```
[OIDC/LOGIN] 2026-01-21T...
[OIDC/LOGIN] 📍 Session ID: abc123def456xyz_________
[OIDC/LOGIN] 📍 State: 8f9c2a1b... (len:43)
[OIDC/LOGIN] ✅ Session persisted successfully
[OIDC/LOGIN] 📍 Set-Cookie count: 1
  [Cookie 0] connect.sid, Secure=false, SameSite=Lax
[OIDC/LOGIN] 📍 Redirecting to OCI...
```

**Critical values to note:**
- **Session ID at login:** `abc123def456xyz_________` ← SAVE THIS
- **State value:** `8f9c2a1b` (first 8 chars) ← SAVE THIS
- **Set-Cookie present:** YES ✅
- **SameSite value:** `Lax` (NOT `none`!) ✅

---

## STEP 4: CHECK BROWSER COOKIES (While at OCI)

Press F12 → Application → Cookies → localhost:3000

Look for:
- Cookie name: `connect.sid`
- HttpOnly: ✅ (yes)
- Secure: ☐ (no, because dev/HTTP)
- SameSite: `Lax`
- Value: `s%3A...` (base64-looking)

If `connect.sid` is NOT here → **ROOT CAUSE: B** (browser rejected cookie)

---

## STEP 5: EXAMINE CALLBACK LOGS

After OCI redirects back, **watch Terminal 1 for:**

```
[OIDC/CALLBACK] 2026-01-21T...
[OIDC/CALLBACK] 📍 Session ID: abc123def456xyz_________
[OIDC/CALLBACK] 📍 Cookie header: 87 bytes
[OIDC/CALLBACK] 📍 connect.sid in cookie: YES
[OIDC/CALLBACK] 📍 State from URL: 8f9c2a1b... (len:43)
[OIDC/CALLBACK] 📍 State in session: 8f9c2a1b... (len:43)
[OIDC/CALLBACK] ✅ State validation passed
```

**Critical matching values:**
- **Session ID at callback:** `abc123def456xyz_________` ← MUST MATCH login! ✅
- **Cookie header present:** YES ✅
- **connect.sid in cookie:** YES ✅
- **State from URL:** `8f9c2a1b` (first 8 chars) ← MUST MATCH login! ✅
- **State in session:** `8f9c2a1b` (first 8 chars) ← MUST MATCH URL! ✅

---

## ROOT CAUSE DETERMINATION

### Scenario A: State Mismatch Error (❌ Failed)

If you see:
```
[OIDC/CALLBACK] ❌ STATE MISMATCH DETECTED
[OIDC/CALLBACK] ❌ Expected: 8f9c2a1b...
[OIDC/CALLBACK] ❌ Got: 9e3c8b4d...
```

**Then check each evidence point:**

| Evidence | Check | Root Cause |
|----------|-------|-----------|
| Set-Cookie count at login = 0 | Line: `Set-Cookie count: 0` | **A: Cookie not created** |
| Set-Cookie exists but SameSite=none + Secure=false | `SameSite=none` AND `Secure=false` | **B: Browser rejected (Chrome trap!)** |
| Set-Cookie exists, but cookie missing from callback request | `connect.sid in cookie: NO` at callback | **C: Cookie not transmitted (domain/path issue)** |
| Cookie present but Session ID differs | `Session ID: abc...` at login vs `Session ID: xyz...` at callback | **E: Two session IDs (middleware duplication?)** |
| Cookie present, Session ID matches, but state MISSING | `State in session: MISSING` | **D: session.save() failed or store not persisting** |
| State values don't match despite same session | `Expected: abc...` vs `Got: def...` | **F: Dev server restart (MemoryStore reset)** |

---

### Scenario B: Success (✅ Passed)

If you see:
```
[OIDC/CALLBACK] ✅ State validation passed
[OIDC/CALLBACK] ✅ Session saved with authenticated user
Redirecting to: http://localhost:5173/callback?auth=success
```

Then:
1. Browser redirects to frontend callback
2. Frontend should redirect to `/app`
3. Dashboard should render
4. User should be logged in ✅

---

## DEBUG ENDPOINTS (Use Anytime)

### Check session state at any time:
```bash
curl http://localhost:3000/auth/_debug/session
```

### Check cookie transmission:
```bash
curl http://localhost:3000/auth/_debug/cookies
```

---

## CHECKLIST FOR SUCCESS

Before you proceed with login test, verify:

- [ ] Backend is running (`[BACKEND] Running on port 3000`)
- [ ] Frontend is running (`Local: http://localhost:5173/`)
- [ ] `saveUninitialized: true` is set in session config
- [ ] `req.session.save()` is called before redirect in both login and callback
- [ ] `SESSION_COOKIE_SAMESITE: 'lax'` in config (NOT `'none'`)
- [ ] `cookie.secure = false` for localhost dev
- [ ] Session middleware is mounted FIRST (before CORS)
- [ ] No duplicate session middlewares
- [ ] `FRONTEND_BASE_URL` is exactly `http://localhost:5173`

---

## IF TEST FAILS

Collect this evidence in order:

1. **Full terminal output** from the entire login flow (login → OCI → callback)
2. **Browser DevTools** Application tab → Cookies screenshot
3. **curl output** from `/auth/_debug/cookies` endpoint
4. **Browser console** for any errors

Then match the evidence against the ROOT CAUSE table above.
