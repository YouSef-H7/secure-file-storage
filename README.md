# Secure File Storage with OCI OIDC Authentication

A production-grade secure file management platform with **Backend-For-Frontend (BFF) OIDC authentication** using OCI Identity Domain.

## 🔐 Security Features

- **OIDC Authentication**: OAuth 2.0 Authorization Code flow with OCI Identity Domain
- **PKCE Support**: Proof Key for Code Exchange (prevents authorization code theft)
- **Server-Side Sessions**: All tokens stored on backend, httpOnly cookies only sent to browser
- **Zero Token Exposure**: Frontend never accesses authentication tokens (XSS protection)
- **State & Nonce Validation**: CSRF and replay attack prevention
- **ID Token Signature Verification**: JWT validation using OCI JWKS public keys

## Architecture
- **Backend (VM1)**: Node.js + Express + TypeScript + OIDC BFF
  - Handles all OAuth/OIDC logic
  - Server-side session management
  - File storage on OCI Block Volume
- **Frontend (VM2)**: React SPA (Vite)
  - Simple redirects to `/auth/login`
  - No token management
  - Session authentication via httpOnly cookies
- **OCI Identity Domain**: OIDC Provider
  - User authentication
  - Token issuance
- **Load Balancer**: Routes `/api/*` to backend, `/` to frontend

## ⚡ Quick Start (5 minutes)

### Prerequisites
- Node.js 20+
- OCI Identity Domain (Oracle Cloud account)

### 1. Create OCI Confidential Application

1. Oracle Cloud Console → Identity → Domains → Your Domain
2. Applications → + Add Application → Confidential Application
3. Name: "Secure File Storage"
4. Redirect URI: `http://localhost:3000/auth/callback`
5. Scopes: `openid`, `profile`, `email`
6. Copy **Client ID** and **Client Secret**
7. Settings → OpenID Connect → Copy **Primary Domain URL**

### 2. Setup Backend

```bash
cd backend

# Create environment file
cp .env.example .env

# Edit .env with OCI credentials
# OIDC_ISSUER=https://idcs-YOUR-DOMAIN-ID.identity.oraclecloud.com
# OIDC_CLIENT_ID=your-client-id
# OIDC_CLIENT_SECRET=your-client-secret
# SESSION_SECRET=<run: openssl rand -hex 32>

# Install & start
npm install
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Test Login

1. Open http://localhost:5173
2. Click "Sign In with OCI"
3. Enter OCI credentials
4. Redirected to app with secure session

## 📚 Documentation

Start with these in order:

1. **[OIDC_QUICK_START.md](./OIDC_QUICK_START.md)** - 5-minute setup guide
2. **[OIDC_BFF_GUIDE.md](./OIDC_BFF_GUIDE.md)** - Complete architecture & setup
3. **[FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)** - Frontend API integration
4. **[ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)** - Visual explanation of flows
5. **[API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)** - cURL examples & testing
6. **[CHECKLIST.md](./CHECKLIST.md)** - Deployment checklist

## 🔌 API Endpoints

### Authentication

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | GET | Start OIDC login flow |
| `/auth/callback` | GET | OAuth callback (automatic) |
| `/auth/me` | GET | Get current user info |
| `/auth/logout` | POST | Clear session |

### Files (Protected)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/files` | GET | List user files | Session ✅ |
| `/api/files/upload` | POST | Upload file | Session ✅ |
| `/api/files/:id` | GET | Get file metadata | Session ✅ |
| `/api/files/:id/download` | GET | Download file | Session ✅ |
| `/api/files/:id` | DELETE | Delete file | Session ✅ |

**All endpoints use server-side session authentication (httpOnly cookies) - BFF pattern**

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev       # Start dev server with hot-reload
npm run build     # Compile TypeScript
npm test          # Run tests (if configured)
```

### Frontend Development
```bash
cd frontend
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
```

### Docker Development
```bash
docker-compose -f docker-compose.local.yml up
```

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] Create OCI Confidential Application
- [ ] Update backend `.env` with production OCI credentials
- [ ] Set `NODE_ENV=production`
- [ ] Set `SESSION_COOKIE_SECURE=true`
- [ ] Generate strong `SESSION_SECRET`
- [ ] Update redirect URIs to production domain
- [ ] Set up Redis for session store
- [ ] Enable HTTPS on both backend and frontend
- [ ] Configure OCI Load Balancer
- [ ] Test end-to-end flow

### Deployment Scripts

```bash
# Backend deployment
bash deploy/deploy-backend.sh

# Frontend deployment
bash deploy/deploy-frontend.sh
```

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=3000
OIDC_ISSUER=https://idcs-DOMAIN-ID.identity.oraclecloud.com
OIDC_CLIENT_ID=your-prod-client-id
OIDC_CLIENT_SECRET=your-prod-client-secret
OIDC_REDIRECT_URI=https://yourdomain.com/auth/callback
SESSION_SECRET=your-random-strong-secret-here
SESSION_COOKIE_SECURE=true
FRONTEND_BASE_URL=https://yourdomain.com
FRONTEND_SUCCESS_URL=https://yourdomain.com/app
```

See `backend/.env.example` for all configuration options.

## 🔐 Security Best Practices

1. **Never commit `.env`** - Use `.env.example` template only
2. **Use strong SESSION_SECRET** - Generate with `openssl rand -hex 32`
3. **Enable HTTPS in production** - Required for secure cookies
4. **Use Redis for sessions** - Better than memory store for scaling
5. **Rotate secrets regularly** - Especially CLIENT_SECRET
6. **Monitor auth failures** - Set up logging and alerts
7. **Review user permissions** - Implement role-based access if needed

## 📖 Architecture Overview

```
User Browser
    ↓
    ├─→ Click "Sign In" → Redirected to /auth/login
    ↓
Backend
    ├─→ Generate state, nonce, PKCE
    ├─→ Redirect to OCI authorization endpoint
    ↓
OCI Identity Domain
    ├─→ User logs in
    ├─→ Redirects to /auth/callback
    ↓
Backend
    ├─→ Verify state (CSRF protection)
    ├─→ Exchange code for tokens (PKCE)
    ├─→ Validate ID token signature
    ├─→ Create server-side session
    ├─→ Set httpOnly cookie
    ├─→ Redirect to app with auth=success
    ↓
Frontend
    ├─→ All API calls include httpOnly cookie
    ├─→ No JavaScript access to tokens (XSS safe)
    ✓ Logged in & secure
```

## 🧪 Testing

### Manual Testing

See [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md) for cURL examples.

### Login Flow Test
```bash
# 1. Start backend
cd backend && npm run dev

# 2. Start frontend (new terminal)
cd frontend && npm run dev

# 3. Open http://localhost:5173
# 4. Click "Sign In with OCI"
# 5. Enter credentials
# 6. Check for session cookie in DevTools
```

## 🐛 Troubleshooting

### "State mismatch" error
- Ensure `credentials: 'include'` in fetch calls
- Check CORS is configured with `credentials: true`
- Try browser incognito mode

### "Invalid token" error
- Verify OIDC_CLIENT_SECRET is correct
- Check OIDC_ISSUER URL is exact
- Ensure OCI domain is accessible

### Session not persisting
- Check httpOnly cookie exists in DevTools
- Verify backend is running
- Check browser cookie settings

See [OIDC_BFF_GUIDE.md](./OIDC_BFF_GUIDE.md#troubleshooting) for more troubleshooting tips.

## 📊 File Structure

```
secure-file-storage/
├── backend/
│   ├── src/
│   │   ├── services/oidc.ts        # OIDC service
│   │   ├── routes/oidc.ts          # OIDC endpoints
│   │   ├── middleware/auth.ts      # Auth middleware
│   │   ├── server.ts               # Express app
│   │   ├── config.ts               # Configuration
│   │   └── db.ts                   # Database
│   ├── .env.example                # Config template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/Login.tsx         # Login page
│   │   ├── lib/api.ts              # API client
│   │   └── ...
│   └── package.json
├── OIDC_BFF_GUIDE.md               # Complete guide
├── OIDC_QUICK_START.md             # Quick start
├── FRONTEND_INTEGRATION.md         # Frontend setup
├── ARCHITECTURE_DIAGRAMS.md        # Visual diagrams
├── API_TESTING_GUIDE.md            # API examples
├── CHECKLIST.md                    # Deployment checklist
└── README.md                       # This file
```

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Make changes following code style
3. Test with OIDC flow
4. Submit pull request

## 📝 License

[Your License Here]

## 📞 Support

- **Documentation**: See `*.md` files
- **Troubleshooting**: [OIDC_BFF_GUIDE.md](./OIDC_BFF_GUIDE.md#troubleshooting)
- **API Examples**: [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)

---

**Start with [OIDC_QUICK_START.md](./OIDC_QUICK_START.md) for immediate setup (5 minutes).**

