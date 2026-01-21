# Frontend Integration Guide - OIDC BFF

## Overview

The backend now provides OIDC authentication via the BFF pattern. The frontend integration is **simpler than before** because:

- ✅ Frontend does NOT manage tokens
- ✅ Frontend does NOT call token endpoint
- ✅ Frontend only redirects to `/auth/login` and calls protected `/api` routes
- ✅ Credentials (httpOnly cookie) sent automatically

---

## Integration Steps

### Step 1: Update API Base URL

Ensure your API client points to backend:

**src/lib/api.ts:**
```typescript
import axios from 'axios';

const API_BASE = 'http://localhost:3000'; // Backend URL

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // IMPORTANT: Include httpOnly cookies
});

// All API calls now include session automatically
export const api = {
  // Files API (protected by session)
  async getFiles() {
    const res = await apiClient.get('/api/files');
    return res.data;
  },
  
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/api/files/upload', formData);
    return res.data;
  },
  
  async deleteFile(fileId: string) {
    await apiClient.delete(`/api/files/${fileId}`);
  },

  // Auth API (NEW)
  async getCurrentUser() {
    try {
      const res = await apiClient.get('/auth/me');
      return res.data.user;
    } catch (err: any) {
      if (err.response?.status === 401) {
        return null; // Not authenticated
      }
      throw err;
    }
  },

  async logout() {
    await apiClient.post('/auth/logout');
  },
};
```

### Step 2: Update Login Component

**src/pages/Login.tsx:**
```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();

  const handleOIDCLogin = () => {
    // Redirect to backend OIDC endpoint
    // Backend handles all OIDC logic:
    // 1. Generates state, nonce, PKCE verifier
    // 2. Redirects to OCI authorization endpoint
    // 3. User logs in at OCI
    // 4. Redirects back to /auth/callback
    // 5. Backend validates tokens, creates session
    // 6. Backend redirects here with httpOnly cookie
    window.location.href = 'http://localhost:3000/auth/login';
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Secure File Storage</h1>
        
        <button
          onClick={handleOIDCLogin}
          className="flex items-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <LogIn size={20} />
          Sign In with OCI
        </button>

        <p className="text-sm text-gray-600 mt-4">
          Securely authenticate using your OCI Identity Domain
        </p>
      </div>
    </div>
  );
}
```

### Step 3: Update Protected Layout

**src/layouts/ProtectedLayout.tsx:**
```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface User {
  sub: string;
  email?: string;
  name?: string;
}

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await api.getCurrentUser();
        
        if (!currentUser) {
          // Not authenticated - redirect to login
          navigate('/login');
          return;
        }
        
        setUser(currentUser);
      } catch (err) {
        console.error('Auth check failed:', err);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      {/* Show current user info */}
      <div className="mb-4 p-4 bg-blue-50 rounded">
        <p>Logged in as: <strong>{user.name || user.email || user.sub}</strong></p>
      </div>

      {/* Protected content */}
      {children}
    </div>
  );
}
```

### Step 4: Update Logout

**src/components/Header.tsx (or similar):**
```typescript
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.logout(); // Backend clears session
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <header>
      {/* ... other header content ... */}
      <button onClick={handleLogout}>
        Logout
      </button>
    </header>
  );
}
```

### Step 5: Handle Callback (Optional)

If you had a `/callback` route before, it can now be simplified:

**src/pages/Callback.tsx:**
```typescript
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Backend handles OAuth callback at /auth/callback
    // Frontend is only redirected here AFTER authentication succeeds
    const authSuccess = searchParams.get('auth') === 'success';
    
    if (authSuccess) {
      // Redirect to app
      navigate('/app', { replace: true });
    } else {
      // Failed auth
      navigate('/login', { replace: true });
    }
  }, [navigate, searchParams]);

  return <div>Processing login...</div>;
}
```

---

## API Client Pattern

### Using Fetch (instead of axios)

```typescript
// src/lib/api.ts
const API_BASE = 'http://localhost:3000';

async function apiCall(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // CRITICAL: Send httpOnly cookie
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  async getCurrentUser() {
    try {
      return await apiCall('/auth/me').then(res => res.user);
    } catch (err) {
      return null; // Not authenticated
    }
  },

  async logout() {
    return apiCall('/auth/logout', { method: 'POST' });
  },

  async getFiles() {
    return apiCall('/api/files');
  },

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    return fetch(`${API_BASE}/api/files/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      // Note: Don't set Content-Type header; browser sets it with boundary
    }).then(res => res.json());
  },

  async deleteFile(fileId: string) {
    return apiCall(`/api/files/${fileId}`, { method: 'DELETE' });
  },
};
```

---

## Authentication Flow (Frontend Perspective)

```
1. User on /login page
                ↓
2. Clicks "Sign In with OCI"
                ↓
3. Redirected to http://localhost:3000/auth/login
                ↓
4. Backend generates state, nonce, PKCE
                ↓
5. Backend redirects to OCI authorize endpoint
   (user sees OCI login page)
                ↓
6. User enters credentials
                ↓
7. OCI redirects to http://localhost:3000/auth/callback?code=...
                ↓
8. Backend:
   - Validates state (CSRF check)
   - Exchanges code for tokens
   - Validates ID token
   - Creates session
   - Sets httpOnly cookie
                ↓
9. Backend redirects to http://localhost:5173/app?auth=success
                ↓
10. Frontend's Callback component detects auth=success
                ↓
11. Redirected to /app with user authenticated
    (session cookie auto-sent with all subsequent requests)
                ↓
12. Protected routes work with GET /auth/me
                ↓
13. API calls include httpOnly cookie automatically
```

---

## Key Implementation Details

### 1. **`credentials: 'include'` is CRITICAL**

Every API call must include cookies:

```typescript
// ✅ CORRECT
fetch('http://localhost:3000/api/files', {
  credentials: 'include'
})

// ❌ WRONG
fetch('http://localhost:3000/api/files')
```

### 2. **Session Cookie is Invisible**

You cannot access it from JavaScript (by design):

```typescript
// ❌ This will return null (security feature!)
console.log(document.cookie);

// ✅ But it IS sent with requests automatically
fetch(..., { credentials: 'include' })
```

### 3. **CORS Must Allow Credentials**

Backend is configured to allow credentials:

```typescript
// backend/src/server.ts
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true, // ✅ Allows cookies
}));
```

### 4. **URL Scheme Matters (http vs https)**

- Development: `http://localhost:3000` ✅
- Production: `https://yourdomain.com` (MUST be HTTPS)
- Mixed schemes won't work (browser security)

---

## Frontend .env Configuration

If you want configurable API URL in frontend:

**frontend/.env:**
```env
VITE_API_BASE=http://localhost:3000
```

**src/lib/api.ts:**
```typescript
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
```

---

## Error Handling

### 401 Unauthorized

Session expired or not authenticated:

```typescript
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Session expired - redirect to login
      window.location.href = '/login';
    }
    throw error;
  }
);
```

### 403 Forbidden

User doesn't have permission for resource:

```typescript
if (error.response?.status === 403) {
  console.error('Access denied');
  // Show error message to user
}
```

---

## Testing Authentication

### Test in Browser Console

```javascript
// Check if you're authenticated
fetch('http://localhost:3000/auth/me', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log);

// Try protected API
fetch('http://localhost:3000/api/files', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log);

// Logout
fetch('http://localhost:3000/auth/logout', {
  method: 'POST',
  credentials: 'include'
})
.then(() => console.log('Logged out'));
```

### Check httpOnly Cookie

DevTools → Application → Cookies → localhost:3000
- Name: `connect.sid`
- Flags: `Secure` (production), `HttpOnly` ✅, `SameSite=Lax`

---

## Migration from Old OIDC Client

If you had `oidc-client-ts` before:

```typescript
// ❌ OLD (no longer needed)
import { getOidcManager } from '../auth/oidc';
const manager = getOidcManager();
await manager.signinRedirect();

// ✅ NEW (much simpler)
window.location.href = 'http://localhost:3000/auth/login';
```

**Remove from package.json:**
```bash
npm uninstall oidc-client-ts
```

**Remove files:**
- `src/auth/oidc.ts` (no longer needed)
- `src/auth/Callback.tsx` (logic moved to backend)

---

## Troubleshooting

### "Failed to fetch" error

**Cause:** CORS issue or credentials not sent

**Solution:**
```typescript
fetch(..., {
  credentials: 'include' // ← Add this
})
```

### "401 Unauthorized" on all API calls

**Cause:** Session not set properly

**Solution:**
1. Check browser cookie: DevTools → Cookies
2. Ensure `connect.sid` cookie exists
3. Check CORS credentials: Backend has `credentials: true`

### "Net::ERR_FAILED" in DevTools

**Cause:** Likely CORS or connection issue

**Solution:**
- Verify backend is running on port 3000
- Check FRONTEND_BASE_URL in backend `.env`
- Try direct curl: `curl http://localhost:3000/api/health`

### Session not persisting across page refresh

**Cause:** Browser doesn't accept cookies

**Solution:**
- Check SameSite setting in production
- Ensure HTTPS in production
- Check "Block third-party cookies" browser setting
- Try incognito mode

---

## Production Considerations

1. **Update API Base URL:**
   ```env
   VITE_API_BASE=https://api.yourdomain.com
   ```

2. **Update CORS Origin:**
   ```env
   FRONTEND_BASE_URL=https://yourdomain.com
   ```

3. **Enable Secure Cookies:**
   ```env
   SESSION_COOKIE_SECURE=true
   ```

4. **Use Same Domain (Recommended):**
   - Backend: `https://yourdomain.com/api`
   - Frontend: `https://yourdomain.com/app`
   - No CORS needed, cookies work automatically

---

## Reference: Complete API Integration

See `src/lib/api.ts` for complete implementation example.
