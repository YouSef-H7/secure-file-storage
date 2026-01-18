# Secure File Storage (OCI Optimized)

A production-grade secure file management platform designed for OCI (Oracle Cloud Infrastructure).

## Architecture
- **VM1 (Backend)**: Node.js + TypeScript API + SQLite. OCI Block Storage mounted at `/data`.
- **VM2 (Frontend)**: React SPA built with Vite and served by Nginx.
- **OCI Load Balancer**: Routes `/api/*` to VM1:3000 and `/` to VM2:80.

## Local Development

### 1. Prerequisites
- Node.js 20+
- SQLite3

### 2. Setup
```bash
# Clone the repository
git clone <repo-url>
cd secure-file-storage

# Backend Setup
cd backend
npm install
cp ../.env.example .env
npm run dev

# Frontend Setup (in a new terminal)
cd frontend
npm install
npm run dev
```

## Production Deployment

### VM1: Backend Setup
1. Mount your OCI Block Volume to `/data` (See `deploy/BLOCK_STORAGE.md`).
2. Run the setup script:
```bash
bash deploy/setup-backend.sh
```

### VM2: Frontend Setup
1. Run the setup script:
```bash
bash deploy/setup-frontend.sh
```

## API Testing (Curl)

### 1. Register
```bash
curl -X POST http://<LB_IP>/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com", "password":"SecurePassword123"}'
```

### 2. Login
```bash
curl -X POST http://<LB_IP>/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com", "password":"SecurePassword123"}'
```

### 3. Upload File
```bash
curl -X POST http://<LB_IP>/api/files/upload \
     -H "Authorization: Bearer <TOKEN>" \
     -F "file=@/path/to/your/document.pdf"
```
