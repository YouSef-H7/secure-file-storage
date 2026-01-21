# OIDC BFF Architecture Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│ User's Browser                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐              ┌─────────────────────────────┐  │
│  │ React App            │              │ Browser Storage             │  │
│  │ (localhost:5173)     │              │                             │  │
│  │                      │              │ JavaScript Memory: ❌ NO    │  │
│  │  /login              │              │ localStorage: ❌ NO         │  │
│  │  /app                │              │ sessionStorage: ❌ NO       │  │
│  │  /callback           │              │ Cookie (httpOnly): ✅ YES   │  │
│  │                      │◄─────────────│  • connect.sid              │  │
│  │  fetch(..., {        │              │  • HttpOnly: ✅             │  │
│  │    credentials:      │              │  • Secure: ✅ (prod)        │  │
│  │    'include'         │              │  • SameSite: Lax            │  │
│  │  })                  │              │                             │  │
│  └──────────────────────┘              └─────────────────────────────┘  │
│           │                                                              │
└───────────┼──────────────────────────────────────────────────────────────┘
            │
            │ HTTP Requests + Cookies (automatic)
            │
            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Express Backend (localhost:3000)                                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ express-session Middleware                                      │    │
│  │ - Verifies httpOnly cookie                                      │    │
│  │ - Retrieves session data from store                             │    │
│  │ - Populates req.session                                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                     │                                                    │
│                     ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ OIDC Routes (/auth/*)                                            │    │
│  │ ┌───────────────────────────────────────────────────────────┐   │    │
│  │ │ GET /auth/login                                            │   │    │
│  │ │ - Generate state, nonce, PKCE verifier                    │   │    │
│  │ │ - Store in req.session (encrypted)                        │   │    │
│  │ │ - Redirect to OCI authorize endpoint                      │   │    │
│  │ └───────────────────────────────────────────────────────────┘   │    │
│  │ ┌───────────────────────────────────────────────────────────┐   │    │
│  │ │ GET /auth/callback                                        │   │    │
│  │ │ - Receive code and state from OCI                         │   │    │
│  │ │ - Validate state (CSRF protection)                        │   │    │
│  │ │ - Exchange code for tokens (PKCE verifier required)       │   │    │
│  │ │ - Validate ID token (sig, issuer, nonce, exp)             │   │    │
│  │ │ - Extract user from ID token                              │   │    │
│  │ │ - Create server-side session                              │   │    │
│  │ │ - Set httpOnly cookie                                      │   │    │
│  │ │ - Redirect to frontend (NO tokens sent)                    │   │    │
│  │ └───────────────────────────────────────────────────────────┘   │    │
│  │ ┌───────────────────────────────────────────────────────────┐   │    │
│  │ │ GET /auth/me                                              │   │    │
│  │ │ - Check req.session.user from session                     │   │    │
│  │ │ - Return user info (NEVER tokens)                         │   │    │
│  │ └───────────────────────────────────────────────────────────┘   │    │
│  │ ┌───────────────────────────────────────────────────────────┐   │    │
│  │ │ POST /auth/logout                                         │   │    │
│  │ │ - Destroy session                                         │   │    │
│  │ │ - Clear httpOnly cookie                                   │   │    │
│  │ └───────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                     │                                                    │
│                     ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Protected Routes (/api/files/*)                                 │    │
│  │ ┌───────────────────────────────────────────────────────────┐   │    │
│  │ │ authenticate middleware                                   │   │    │
│  │ │ 1. Check req.session.user (session cookie) ← Priority 1   │   │    │
│  │ │ 2. Check Authorization: Bearer token ← Priority 2        │   │    │
│  │ │ 3. Return 401 if neither                                 │   │    │
│  │ └───────────────────────────────────────────────────────────┘   │    │
│  │                                                                  │    │
│  │ All file operations work with either auth method               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Session Store                                                   │    │
│  │ - Development: Memory (req.session data)                        │    │
│  │ - Production: Redis (req.session data)                          │    │
│  │                                                                  │    │
│  │ Session Contains:                                               │    │
│  │ {                                                               │    │
│  │   user: { sub, email, name },                                 │    │
│  │   tokens: { accessToken, idToken, expiresAt },                │    │
│  │   ...express-session internals                                 │    │
│  │ }                                                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
            │
            │ HTTP calls to fetch OIDC config & validate tokens
            │
            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ OCI Identity Domain (OIDC Provider)                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Discovery Endpoint                                               │   │
│  │ /.well-known/openid-configuration                               │   │
│  │ Returns: token_endpoint, authorization_endpoint, etc.          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Authorization Endpoint                                           │   │
│  │ /oauth/authorize                                                │   │
│  │ User logs in here; returns code                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Token Endpoint                                                   │   │
│  │ /oauth/token                                                    │   │
│  │ Exchange code + PKCE verifier for ID token & access token      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ JWKS Endpoint                                                    │   │
│  │ /.well-known/jwks.json                                          │   │
│  │ Public keys for validating token signatures                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Login Flow Sequence Diagram

```
User                Frontend              Backend              OCI IDCS
 │                     │                    │                    │
 │ Click "Sign In"     │                    │                    │
 ├────────────────────→│                    │                    │
 │                     │ GET /auth/login    │                    │
 │                     ├───────────────────→│                    │
 │                     │                    │ Generate:          │
 │                     │                    │ - state            │
 │                     │                    │ - nonce            │
 │                     │                    │ - PKCE verifier    │
 │                     │                    │ Store in session   │
 │                     │                    │                    │
 │                     │     302 Redirect   │                    │
 │                     │ to OCI authorize   │                    │
 │                     │←───────────────────┤                    │
 │                     │                    │                    │
 │ Redirected to OCI   │                    │                    │
 ├────────────────────────────────────────────────────────────→│
 │                     │                    │                    │
 │ Enter Credentials   │                    │                    │
 │ (at OCI)            │                    │                    │
 │                     │                    │                    │
 │ OCI validates       │                    │                    │
 │ Redirects back      │                    │                    │
 │←────────────────────────────────────────────────────────────┤
 │ to /auth/callback   │                    │                    │
 │                     │                    │                    │
 │                     │ GET /auth/callback │                    │
 │                     │ ?code=...          │                    │
 │                     │ &state=...         │                    │
 │                     ├───────────────────→│                    │
 │                     │                    │ Verify state       │
 │                     │                    │ (CSRF check) ✅    │
 │                     │                    │                    │
 │                     │                    │ POST /oauth/token  │
 │                     │                    │ code + PKCE        │
 │                     │                    │ verifier           │
 │                     │                    ├───────────────────→│
 │                     │                    │                    │
 │                     │                    │ ← ID token + AT    │
 │                     │                    │ (signed by OCI)    │
 │                     │                    │←───────────────────┤
 │                     │                    │                    │
 │                     │                    │ Validate ID token: │
 │                     │                    │ - Sig (JWKS) ✅    │
 │                     │                    │ - Issuer ✅        │
 │                     │                    │ - Nonce ✅         │
 │                     │                    │ - Exp ✅           │
 │                     │                    │                    │
 │                     │                    │ Extract user info  │
 │                     │                    │ Create session     │
 │                     │                    │ Set httpOnly cookie│
 │                     │                    │                    │
 │                     │ 302 Redirect to    │                    │
 │                     │ /app + httpOnly    │                    │
 │                     │ session cookie     │                    │
 │                     │←───────────────────┤                    │
 │                     │                    │                    │
 │ Redirected to /app  │                    │                    │
 │←────────────────────┤                    │                    │
 │ (browser stores     │                    │                    │
 │  httpOnly cookie)   │                    │                    │
 │                     │                    │                    │
 ✓ Logged In          ✓                    ✓                    ✓
```

---

## API Call Flow (After Login)

```
User                Frontend              Backend              Session
 │                     │                    │                   │
 │ Want to get files   │                    │                   │
 ├────────────────────→│                    │                   │
 │                     │ GET /api/files     │                   │
 │                     │ + httpOnly cookie  │                   │
 │                     │ (automatic)        │                   │
 │                     ├───────────────────→│                   │
 │                     │                    │ Cookie received   │
 │                     │                    ├──────────────────→│
 │                     │                    │ ← session data    │
 │                     │                    │←──────────────────┤
 │                     │                    │                   │
 │                     │                    │ authenticate mw   │
 │                     │                    │ Check session ✅  │
 │                     │                    │ req.user = {...}  │
 │                     │                    │                   │
 │                     │                    │ Query files       │
 │                     │                    │ for user_id       │
 │                     │                    │                   │
 │                     │ 200 OK             │                   │
 │                     │ [files...]         │                   │
 │                     │←───────────────────┤                   │
 │                     │                    │                   │
 │ Display files       │                    │                   │
 │←────────────────────┤                    │                   │
 │                     │                    │                   │
 ✓ Success           ✓                    ✓                   ✓
```

---

## Security Layers (Defense in Depth)

```
┌───────────────────────────────────────────────────────────────────────┐
│ Layer 1: HTTPS/TLS                                                    │
│ - Encrypts all traffic                                                │
│ - Prevents eavesdropping                                             │
│ - Man-in-the-middle attack prevention                                │
└───────────────────────────────────────────────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│ Layer 2: HTTP-Only Cookie                                            │
│ - JavaScript cannot read (XSS protection)                            │
│ - Browser sends automatically with CORS requests                     │
│ - No localStorage/sessionStorage alternative                         │
└───────────────────────────────────────────────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│ Layer 3: Session Encryption & SameSite                               │
│ - Session data encrypted by express-session                          │
│ - Cookie encrypted with SESSION_SECRET                               │
│ - SameSite=Lax prevents cross-site cookie sending                    │
│ - CSRF attack mitigation                                             │
└───────────────────────────────────────────────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│ Layer 4: OIDC Protocol Security                                      │
│ - PKCE: Prevents authorization code interception                     │
│ - State: CSRF attack prevention                                      │
│ - Nonce: Replay attack prevention                                    │
│ - ID Token Signature: Validates token not tampered                   │
└───────────────────────────────────────────────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│ Layer 5: Token Validation                                            │
│ - Issuer verification                                                │
│ - Audience verification                                              │
│ - Expiry check                                                        │
│ - Signature verification using JWKS                                  │
└───────────────────────────────────────────────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│ Layer 6: Authorization                                               │
│ - Extracted user claims (sub, email, etc.)                           │
│ - Tenant isolation (tenantId in request scope)                       │
│ - Per-user file access control                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Threat Mitigation Matrix

```
┌─────────────────────────────┬──────────────────┬──────────────────────┐
│ Attack                      │ Vulnerability    │ Mitigation           │
├─────────────────────────────┼──────────────────┼──────────────────────┤
│ Authorization Code          │ Code captured    │ PKCE: verifier not   │
│ Interception                │ in redirect URI  │ broadcast, only used │
│                             │                  │ in token endpoint    │
├─────────────────────────────┼──────────────────┼──────────────────────┤
│ CSRF (Cross-Site Request    │ Attacker tricks  │ State parameter +    │
│ Forgery)                    │ user's browser   │ SameSite cookie +    │
│ into using code             │ into requesting  │ token validation     │
│                             │ with stolen code │                      │
├─────────────────────────────┼──────────────────┼──────────────────────┤
│ Replay Attack               │ Attacker re-uses │ Nonce: random value  │
│ (use code multiple times)   │ captured code    │ embedded in ID token │
│                             │                  │ verified on backend  │
├─────────────────────────────┼──────────────────┼──────────────────────┤
│ Token Tampering             │ Attacker         │ Signature validation │
│ (modify token claims)       │ modifies token   │ using OCI JWKS       │
│                             │ to escalate      │ public keys          │
├─────────────────────────────┼──────────────────┼──────────────────────┤
│ XSS (Cross-Site Scripting)  │ Malicious script │ httpOnly cookies +   │
│ steals tokens from memory   │ in page reads    │ no tokens in JS      │
│                             │ localStorage     │ memory               │
├─────────────────────────────┼──────────────────┼──────────────────────┤
│ Session Fixation            │ Attacker forces  │ New session created  │
│ (attacker sets user's       │ old session ID   │ at login, old ID     │
│ session to known value)     │ on victim        │ discarded            │
├─────────────────────────────┼──────────────────┼──────────────────────┤
│ Token Theft from            │ Attacker steals  │ Tokens server-side   │
│ localStorage                │ tokens from      │ only, never in       │
│                             │ browser storage  │ localStorage         │
├─────────────────────────────┼──────────────────┼──────────────────────┤
│ Man-in-the-Middle (MITM)    │ Attacker         │ HTTPS/TLS encryption │
│ (eavesdropping)             │ intercepts       │ Secure cookie flag   │
│                             │ unencrypted data │ (production)         │
└─────────────────────────────┴──────────────────┴──────────────────────┘
```

---

## File Upload Flow (with Session Auth)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Frontend                                                             │
├─────────────────────────────────────────────────────────────────────┤
│ 1. User selects file                                               │
│ 2. Creates FormData                                                 │
│ 3. fetch('/api/files/upload', {                                    │
│      method: 'POST',                                               │
│      body: formData,                                               │
│      credentials: 'include' // ← httpOnly cookie sent            │
│    })                                                              │
└─────────────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Backend: express-session middleware                                │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Receives httpOnly cookie                                        │
│ 2. Decrypts session ID                                             │
│ 3. Looks up session in store (memory/Redis)                        │
│ 4. Populates req.session with user data                            │
└─────────────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Backend: authenticate middleware                                   │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Check req.session.user (from session cookie)                    │
│ 2. Set req.user = { userId, email, tenantId }                     │
│ 3. Continue to route handler                                       │
└─────────────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Backend: POST /api/files/upload route                              │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Receive file in req.file                                        │
│ 2. Get userId, tenantId from req.user                              │
│ 3. Create directory: uploads/{tenantId}/{userId}                   │
│ 4. Save file with unique name                                      │
│ 5. Record in database:                                             │
│    INSERT INTO files (id, tenant_id, user_id, filename, ...)      │
└─────────────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Response to Frontend                                               │
├─────────────────────────────────────────────────────────────────────┤
│ 200 OK                                                              │
│ {                                                                   │
│   "id": "unique-file-id",                                          │
│   "name": "document.pdf"                                           │
│ }                                                                   │
│ (httpOnly cookie still valid, session continues)                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Comparison: BFF vs Frontend-Only OIDC

```
┌────────────────────┬────────────────────────┬────────────────────────┐
│ Aspect             │ BFF Pattern (This)     │ Frontend-Only          │
├────────────────────┼────────────────────────┼────────────────────────┤
│ Token Storage      │ Server-side (session)  │ Browser (localStorage) │
│ XSS Risk           │ ✅ SAFE (httpOnly)     │ ❌ HIGH (JS accesses)  │
│ Token in Memory    │ ✅ NO                  │ ❌ YES                 │
│ PKCE              │ ✅ Always (backend)    │ ⚠️ Optional (frontend) │
│ Token Refresh     │ ✅ Transparent         │ ❌ Complex UX           │
│ Session Sharing   │ ✅ YES (Redis)         │ ❌ NO (per-browser)    │
│ Mobile Support    │ ✅ SAME cookies        │ ✅ Token in storage    │
│ Client Secret     │ ✅ SAFE (server)       │ ❌ EXPOSED (browser)   │
│ Complexity        │ ⚠️ Medium              │ ⚠️ Medium              │
│ Industry Standard │ ✅ YES                 │ ❌ NO                  │
│ OWASP Rec.        │ ✅ RECOMMENDED         │ ❌ NOT RECOMMENDED     │
└────────────────────┴────────────────────────┴────────────────────────┘
```

---

## Error Flow (Session Expired)

```
User                Frontend              Backend              Session
 │                     │                    │                   │
 │ Want to get files   │                    │                   │
 │ (1 hour later)      │                    │                   │
 ├────────────────────→│                    │                   │
 │                     │ GET /api/files     │                   │
 │                     │ + old cookie       │                   │
 │                     ├───────────────────→│                   │
 │                     │                    │ Try to find       │
 │                     │                    │ session           │
 │                     │                    ├──────────────────→│
 │                     │                    │ ← not found       │
 │                     │                    │ (expired)         │
 │                     │                    │←──────────────────┤
 │                     │                    │                   │
 │                     │ 401 Unauthorized   │                   │
 │                     │ { error: "Not      │                   │
 │                     │  authenticated" }  │                   │
 │                     │←───────────────────┤                   │
 │                     │                    │                   │
 │ Frontend sees 401   │                    │                   │
 │ Redirects to /login │                    │                   │
 │←────────────────────┤                    │                   │
 │                     │                    │                   │
 │ Click "Sign In" again to re-authenticate
```

---

**These diagrams illustrate the complete BFF OIDC architecture and security measures.**
