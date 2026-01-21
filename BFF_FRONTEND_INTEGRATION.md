# BFF OIDC Integration - Frontend Implementation Complete

## Summary

Frontend has been successfully updated to implement session-based authentication using the Backend-For-Frontend (BFF) pattern with OCI Identity Domains OIDC.

**Key Change:** Frontend now trusts backend session (httpOnly cookies) instead of storing tokens in localStorage.

---

## Changed Files

### 1. **Auth Context (NEW)**
**File:** `frontend/src/auth/AuthContext.tsx`

Lightweight React Context for managing authentication state:
- `useAuth()` hook provides access to auth state
- Calls `GET /auth/me` on app load with `credentials: 'include'`
- Returns `{ user, isLoading, isAuthenticated, checkAuth(), logout() }`
- No token storage - relies on httpOnly session cookie

**Key Methods:**
```typescript
checkAuth() → fetches /auth/me to verify session
logout() → calls POST /auth/logout to destroy session
```

---

### 2. **App.tsx (UPDATED)**
**File:** `frontend/src/app/App.tsx`

Wrapped with `AuthProvider`:
```tsx
<AuthProvider>
  <AppRoutes />
</AuthProvider>
```

**Effect:** All routes now have access to auth context via `useAuth()` hook.

---

### 3. **ProtectedLayout.tsx (UPDATED)**
**File:** `frontend/src/layouts/ProtectedLayout.tsx`

Changed from localStorage token check to Auth Context:
```tsx
const { isAuthenticated, isLoading } = useAuth();

// Show loading state while checking auth
if (isLoading) return <LoadingUI />;

// Redirect to login if not authenticated
if (!isAuthenticated) return <Navigate to="/login" replace />;
```

**Effect:** Protected routes wait for auth check before rendering; prevents route flashing.

---

### 4. **Callback.tsx (UPDATED)**
**File:** `frontend/src/pages/Callback.tsx`

Changed to use backend OIDC flow:
```tsx
const { checkAuth } = useAuth();

// After backend redirects here with session set:
await checkAuth(); // Re-checks /auth/me
navigate("/app"); // Redirect to dashboard
```

**Flow:**
1. User clicks login
2. Redirected to `http://localhost:3000/auth/login`
3. Backend redirects to OCI Identity Domain
4. User authenticates at OCI
5. OCI redirects back to backend `/auth/callback`
6. Backend creates session
7. Backend redirects to frontend `http://localhost:5173/callback`
8. Frontend calls `checkAuth()` to verify session
9. Frontend redirects to `/app` (dashboard)

---

### 5. **Login.tsx (UPDATED)**
**File:** `frontend/src/pages/Login.tsx`

Changed login button to redirect to backend:
```tsx
const handleLogin = async (e: React.FormEvent) => {
  window.location.href = 'http://localhost:3000/auth/login';
};
```

**Flow:** Frontend → backend (backend handles everything else)

---

### 6. **Header.tsx (UPDATED)**
**File:** `frontend/src/components/Header.tsx`

Added logout button:
```tsx
const { user, logout } = useAuth();

const handleLogout = async () => {
  await logout(); // Calls POST /auth/logout
};
```

**Button:** Red logout icon in header. On click:
1. Calls `POST /auth/logout`
2. Backend destroys session
3. Frontend redirects to `/login`

---

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    [App loads]
                            │
                            ▼
                [AuthProvider calls checkAuth()]
                            │
                            ▼
            [checkAuth() calls GET /auth/me]
                    (credentials: 'include')
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼ (401)                                ▼ (200)
    setUser(null)                      setUser(user data)
    Redirect to /login                 Allow app access
                            │
                            ▼
                    [User clicks Login]
                            │
                            ▼
        [window.location = http://localhost:3000/auth/login]
                            │
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
            [GET /auth/login]
            [generateAuthorizationUrl()]
                            │
                            ▼
    [Redirect to OCI Identity Domain]
                            │
┌─────────────────────────────────────────────────────────────┐
│              OCI IDENTITY DOMAIN                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
            [User authenticates]
                            │
                            ▼
    [Redirect to http://localhost:3000/auth/callback
              with code + state]
                            │
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        [GET /auth/callback?code=...&state=...]
                            │
                            ▼
        [exchangeCodeForTokens()]
        [validateIdToken()]
        [req.session.user = user]
                            │
                            ▼
    [Set httpOnly session cookie]
    [Redirect to http://localhost:5173/callback]
                            │
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
            [Callback page loads]
            [checkAuth() calls GET /auth/me]
                    (credentials: 'include')
                    (session cookie sent)
                            │
                            ▼
                    [Backend returns user]
                            │
                            ▼
        [setUser(user), navigate to /app]
                            │
                            ▼
        [Dashboard loads, user is authenticated]
```

---

## Security Properties Maintained

✅ **PKCE S256** - Authorization code integrity (backend)
✅ **State** - CSRF prevention (backend)
✅ **Nonce** - Replay attack prevention (backend)
✅ **httpOnly Cookies** - XSS protection (tokens never in JS)
✅ **Secure Flag** - HTTPS only in production (backend)
✅ **SameSite=Lax** - CSRF protection on cookies (backend)
✅ **Session Timeout** - 7 days (backend)

**No tokens exposed to frontend.**

---

## Testing Checklist

- [ ] Frontend loads → calls `GET /auth/me` (should return 401, redirect to /login)
- [ ] Click login button → redirects to backend `/auth/login`
- [ ] Redirected to OCI → authenticate
- [ ] Redirected back to frontend `/callback` → verifies session
- [ ] Dashboard loads → user is logged in
- [ ] Refresh page → user remains logged in (session persists)
- [ ] Click logout button → session destroyed, redirected to /login
- [ ] Manually access `/app` routes when logged out → redirected to /login

---

## Environment Setup

**Backend (.env already configured):**
```env
OIDC_DISCOVERY_URL=https://idcs-XXX.identity.oraclecloud.com/.well-known/openid-configuration
OIDC_ISSUER=https://identity.oraclecloud.com/
OIDC_CLIENT_ID=YOUR_CLIENT_ID
OIDC_CLIENT_SECRET=YOUR_CLIENT_SECRET
OIDC_REDIRECT_URI=http://localhost:3000/auth/callback
SESSION_SECRET=YOUR_SESSION_SECRET
FRONTEND_BASE_URL=http://localhost:5173
```

**Frontend (.env):**
No changes needed - frontend no longer uses OIDC_CLIENT_ID/ISSUER directly.

---

## Known Limitations / Future Enhancements

- Frontend currently refreshes after logout (can add SPA redirect instead)
- No token refresh endpoint (can be added if tokens expire during session)
- No per-app logout (logout affects all tabs in same session)

---

## API Contracts Used

### GET /auth/me
```
Request:
  GET http://localhost:3000/auth/me
  Credentials: include

Response (200):
  { "user": { "sub": "user123", "email": "user@example.com", "name": "User Name" } }

Response (401):
  { "error": "Not authenticated" }
```

### POST /auth/logout
```
Request:
  POST http://localhost:3000/auth/logout
  Credentials: include

Response (200):
  { "message": "Logged out successfully" }

Response (500):
  { "error": "Logout failed" }
```

### GET /auth/login (backend redirects)
```
Request:
  GET http://localhost:3000/auth/login

Response:
  HTTP 302 → OCI Identity Domain authorization endpoint
```

### GET /auth/callback (backend redirects)
```
Request:
  GET http://localhost:3000/auth/callback?code=...&state=...

Response:
  HTTP 302 → http://localhost:5173/callback
  Sets: connect.sid (httpOnly session cookie)
```

---

## Files Summary

| File | Changes | Purpose |
|------|---------|---------|
| `auth/AuthContext.tsx` | NEW | Session-based auth state management |
| `app/App.tsx` | Wrapped with AuthProvider | Enable auth context for all routes |
| `layouts/ProtectedLayout.tsx` | Using Auth Context | Check session before rendering protected routes |
| `pages/Callback.tsx` | Redirect to backend flow | Handle backend OIDC callback |
| `pages/Login.tsx` | Redirect to backend login | Initiate backend OIDC flow |
| `components/Header.tsx` | Added logout button | Session cleanup via backend |

**No other files modified.**
**No new dependencies added.**
**Full backward compatibility with existing routes.**

