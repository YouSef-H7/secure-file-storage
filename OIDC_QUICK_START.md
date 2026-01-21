# OIDC Integration - Quick Start (5 minutes)

## Step 1: OCI Setup (2 minutes)

1. **Create Confidential Application in OCI:**
   - Oracle Cloud Console → Identity → Domains → Your Domain
   - Applications → + Add Application → Confidential Application
   - Name: "Secure File Storage"
   - Redirect URL: `http://localhost:3000/auth/callback`
   - Scopes: `openid`, `profile`, `email`
   - Copy **Client ID** and **Client Secret**

2. **Get Issuer URL:**
   - Settings → OpenID Connect Token Configuration
   - Copy **Primary Domain URL** (e.g., `https://idcs-XXXXXX.identity.oraclecloud.com`)

## Step 2: Backend Setup (3 minutes)

```bash
cd backend

# Copy env template
cp .env.example .env

# Edit .env with your OCI credentials:
# - OIDC_ISSUER=<from step 1>
# - OIDC_CLIENT_ID=<from step 1>
# - OIDC_CLIENT_SECRET=<from step 1>
# - SESSION_SECRET=<run: openssl rand -hex 32>

# Install & start
npm install
npm run dev
```

**Expected output:**
```
[BACKEND] Running on port 3000
```

## Step 3: Test Login Flow

```bash
# In new terminal, start frontend
cd frontend
npm run dev

# Open http://localhost:5173
# Click "Sign In with OCI"
# Enter credentials
# Redirected to /app after login
```

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /auth/login` | Start OIDC flow |
| `GET /auth/callback` | OAuth callback (handled by backend) |
| `GET /auth/me` | Get current user |
| `POST /auth/logout` | Clear session |
| `GET /api/files` | List files (protected) |

## Key Points

✅ **Tokens are NEVER sent to browser**
- Stored securely on backend only
- Frontend session via httpOnly cookie

✅ **PKCE + State + Nonce**
- Full CSRF/replay attack protection
- All managed by backend

✅ **Works with existing /api routes**
- Both session-based and Bearer token auth supported
- Backward compatible

## Next Steps

- Full setup guide: See `OIDC_BFF_GUIDE.md`
- Production deployment: Update HTTPS URLs
- Redis session store: For horizontal scaling

## Troubleshooting

**"State mismatch" error:**
- Ensure `credentials: 'include'` in fetch calls
- Check CORS is configured correctly

**"Invalid token" error:**
- Verify OIDC_CLIENT_SECRET is correct
- Check OIDC_ISSUER matches OCI domain

**"Redirect URI mismatch":**
- Ensure exact match in OCI app config
- Protocol (http/https) and port must match
