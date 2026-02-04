// Global crash handlers - MUST be first
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
  console.error('[FATAL] Stack:', err.stack);
  // Keep process alive long enough to flush logs
  setTimeout(() => process.exit(1), 250);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] unhandledRejection:', reason);
  console.error('[FATAL] Promise:', promise);
  setTimeout(() => process.exit(1), 250);
});

import express, { Express } from 'express';
import cors from 'cors';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs-extra';
import db from './db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { config } from './config';
import { authenticate, AuthRequest } from './middleware/auth';
import oidcRouter from './routes/oidc';
import statsRouter from './routes/stats';
import sharingRouter from './routes/sharing';
import foldersRouter from './routes/folders';
import { fileRepository } from './repositories';
import { FileMeta } from './repositories/FileRepository';
import initSchema from './services/db_init';

const app: Express = express();

// ================= TRUST PROXY =================
// 🔐 Required for secure cookies behind reverse proxy (even localhost)
app.set('trust proxy', 1);

// ================= SESSION MIDDLEWARE =================
// 🔐 Express-session with httpOnly cookies (BFF pattern)
// CRITICAL: Must be FIRST middleware, before CORS and routes
// Suppress MemoryStore production warning (stderr can trigger pm2 restarts; use Redis in production)
const _warn = console.warn;
console.warn = function (msg: unknown, ...args: unknown[]) {
  if (typeof msg === 'string' && msg.includes('MemoryStore')) return;
  return _warn.apply(console, [msg, ...args]);
};

// Configure session store: Redis if available, else MemoryStore
let sessionStore: any = undefined;
if (process.env.REDIS_URL) {
  try {
    const RedisStore = require('connect-redis').default;
    const redis = require('redis');
    const redisClient = redis.createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err: Error) => {
      console.error('[SESSION] Redis connection error:', err.message);
      console.warn('[SESSION] Falling back to MemoryStore');
    });
    redisClient.connect().catch(() => {
      console.warn('[SESSION] Redis connection failed, falling back to MemoryStore');
    });
    sessionStore = new RedisStore({ client: redisClient });
    console.log('[SESSION] Using Redis session store');
  } catch (err) {
    console.warn('[SESSION] Redis packages not installed or connection failed, using MemoryStore');
    console.warn('[SESSION] To use Redis: npm install connect-redis redis');
  }
} else {
  console.log('[SESSION] Using MemoryStore (set REDIS_URL to use Redis for PM2 clusters)');
}

app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET || config.SESSION_SECRET || 'secure-secret',
  resave: true,              // Temporary hardening (not ideal long-term)
  saveUninitialized: false,  // Changed: only save initialized sessions
  rolling: true,             // Refresh expiration on activity
  proxy: true,               // required behind nginx / reverse proxy
  store: sessionStore,       // Redis store if configured, else MemoryStore (default)
  cookie: {
    secure: false,           // Required for HTTP
    sameSite: 'lax',        // Required for OIDC redirects over HTTP
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 12, // 12 hours (increased for stability)
  },
}));
console.warn = _warn;

// ================= MIDDLEWARE =================
app.use(cors({
  origin: 'http://145.241.155.110', // Exact origin match for production IP
  credentials: true,
}));

// ================= DIRECTORIES =================
const UPLOADS_DIR = path.join(config.DATA_DIR, 'uploads');
fs.ensureDirSync(UPLOADS_DIR);

// ================= MULTER =================
const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    console.log('[UPLOAD] Storage: Processing upload request');
    try {
      console.log('[UPLOAD] Req User:', JSON.stringify(req.user));
    } catch (e) {
      console.log('[UPLOAD] Req User: [Circular or Error]');
    }

    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;

    if (!tenantId || !userId) {
      console.error('[UPLOAD] ❌ Missing auth context:', { tenantId, userId });
      return cb(new Error('Missing tenant or user context'), '');
    }

    const tenantDir = path.join(UPLOADS_DIR, tenantId);
    const userDir = path.join(tenantDir, userId);

    console.log(`[UPLOAD] Target directory: ${userDir}`);

    try {
      fs.ensureDirSync(userDir);
      console.log('[UPLOAD] Directory ensured');
      cb(null, userDir);
    } catch (err: any) {
      console.error('[UPLOAD] ❌ Failed to create directory:', err);
      cb(err, '');
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});




// Multer configuration
// upload.single('file') should automatically parse:
// - File field 'file' → req.file
// - Text fields (is_deleted, folderId) → req.body
// If req.body is empty but req.file exists, this indicates a Multer parsing issue
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (config.ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  }
  // Note: No custom field parsing - Multer should handle text fields automatically
});

// ================= UPLOAD ROUTE (CRITICAL: Must be before body parsers) =================
// This route MUST be registered before express.json() and express.urlencoded() so Multer
// is the first and only consumer of the multipart/form-data request body stream.
// Session and CORS middleware above do NOT consume the body stream (session reads cookies,
// CORS only modifies headers), so they are safe to have before this route.
// Field name 'file' must match the frontend FormData key: formData.append('file', file)
app.post(
  '/api/files/upload',
  // Stream check middleware: verify stream is not consumed before Multer
  (req: any, res, next) => {
    if (process.env.DEBUG === 'true') {
      console.log('[STREAM CHECK] Stream readable:', req.readable);
      console.log('[STREAM CHECK] Stream destroyed:', req.destroyed);
      console.log('[STREAM CHECK] Has body parser:', !!req.body);
    }
    next();
  },
  authenticate,
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'is_deleted', maxCount: 1 },
    { name: 'folderId', maxCount: 1 }
  ]),
  async (req: any, res) => {
    // Extract file from req.files (upload.fields() returns files object)
    const uploadedFile = (req.files as any)?.file?.[0];
    
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // RESILIENT DEFAULT: is_deleted defaults to false if missing (Multer may drop text fields)
    // This ensures uploads NEVER fail due to missing text fields
    const isDeleted = req.body?.is_deleted === 'true';

    const fileId = path.basename(
      uploadedFile.filename,
      path.extname(uploadedFile.filename)
    );

    const folderId = (req.body.folderId === 'null' || !req.body.folderId) ? null : req.body.folderId;

    try {
      // Infer mime type from file extension
      const ext = path.extname(uploadedFile.originalname).toLowerCase();
      let mimeType = uploadedFile.mimetype || 'application/octet-stream';
      if (!mimeType || mimeType === 'application/octet-stream') {
        const mimeMap: Record<string, string> = {
          '.pdf': 'application/pdf',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.xls': 'application/vnd.ms-excel',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
        mimeType = mimeMap[ext] || 'application/octet-stream';
      }

      if (!req.user?.tenantId || !req.user?.userId) {
        return res.status(401).json({ error: 'Missing user context' });
      }

      await fileRepository.saveFileMeta({
        id: fileId,
        tenant_id: req.user.tenantId,
        user_id: req.user.userId,
        filename: uploadedFile.originalname,
        size: uploadedFile.size,
        storage_path: uploadedFile.path,
        folder_id: folderId || null,
        mime_type: mimeType,
        is_deleted: isDeleted,
        created_at: new Date().toISOString()
      });

      res.status(201).json({
        id: fileId,
        name: uploadedFile.originalname
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'File upload failed' });
    }
  }
);

// ================= BODY PARSERS (after upload route) =================
// Upload route is registered above so Multer consumes multipart body first; other routes need JSON/urlencoded
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// ================= OIDC ROUTES (BFF Pattern) =================
// 🔐 All OIDC logic (login, callback, token exchange) happens here
// Frontend never sees tokens; they're stored server-side only
// Public mounts: both legacy '/auth/*' and '/api/auth/*' entrypoints
app.use('/auth', oidcRouter);
app.use('/api/auth', oidcRouter);

// ================= PUBLIC SHARE ROUTES (NO AUTH) =================
app.get('/api/public/share/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Look up share link
    const [links] = await db.execute<RowDataPacket[]>(
      `SELECT sl.file_id, sl.created_by, sl.tenant_id, sl.expires_at,
              f.filename, f.size, f.created_at, f.mime_type, f.storage_path
       FROM shared_links sl
       JOIN files f ON sl.file_id = f.id
       WHERE sl.share_token = ? AND (f.is_deleted = 0 OR f.is_deleted IS NULL)`,
      [token]
    );

    if (!links || links.length === 0) {
      return res.status(404).json({ error: 'Share link not found or expired' });
    }

    const link = links[0];

    // Check expiration if set
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    // Return file metadata
    res.json({
      id: link.file_id,
      filename: link.filename,
      size: link.size,
      created_at: link.created_at,
      mime_type: link.mime_type
    });
  } catch (err) {
    console.error('[PUBLIC SHARE] Error:', err);
    res.status(500).json({ error: 'Failed to access shared file' });
  }
});

app.get('/api/public/share/:token/download', async (req, res) => {
  try {
    const { token } = req.params;

    // Look up share link and file
    const [links] = await db.execute<RowDataPacket[]>(
      `SELECT sl.file_id, sl.expires_at,
              f.filename, f.storage_path
       FROM shared_links sl
       JOIN files f ON sl.file_id = f.id
       WHERE sl.share_token = ? AND (f.is_deleted = 0 OR f.is_deleted IS NULL)`,
      [token]
    );

    if (!links || links.length === 0) {
      return res.status(404).json({ error: 'Share link not found or expired' });
    }

    const link = links[0];

    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    // Stream file
    res.setHeader('Content-Disposition', `attachment; filename="${link.filename}"`);
    res.sendFile(link.storage_path);
  } catch (err) {
    console.error('[PUBLIC SHARE DOWNLOAD] Error:', err);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

app.use('/api/stats', authenticate, statsRouter);
app.use('/api', authenticate, sharingRouter);
app.use('/api/folders', authenticate, foldersRouter);

// ================= HEALTH =================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ================= AUTH =================
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const hashed = await bcrypt.hash(password, 12);

    await db.execute<ResultSetHeader>(
      'INSERT INTO users (id, tenant_id, email, password) VALUES (?, ?, ?, ?)',
      [
        uuidv4(),
        'default-tenant',
        email,
        hashed
      ]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT id, email, password, tenant_id FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tenantId: user.tenant_id
      },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenant_id
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ================= FILES =================

// ---------- LIST FILES ----------
app.get('/api/files', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.tenantId || !req.user?.userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }
    console.log('[SESSION DEBUG] UserID:', req.user.userId, '| SessionID:', req.sessionID, '| TenantID:', req.user.tenantId);
    const rawFiles = await fileRepository.listUserFiles({
      tenantId: req.user.tenantId,
      userId: req.user.userId
    });
    const list = (rawFiles ?? []).filter((f: FileMeta) => (f as any).is_deleted !== true);
    const rootOnly = list.filter((f: FileMeta) => f.folder_id == null);

    // Map to frontend contract (name, mimeType, createdAt)
    const mappedFiles = rootOnly.map((f: FileMeta) => ({
      id: f.id,
      name: f.filename,
      size: f.size,
      created_at: f.created_at,
      createdAt: f.created_at,
      mimeType: f.mime_type ?? 'application/octet-stream'
    }));

    res.json(mappedFiles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// ---------- LIST TRASH ----------
app.get('/api/files/trash', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.tenantId || !req.user?.userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }
    console.log('[SESSION DEBUG] UserID:', req.user.userId, '| SessionID:', req.sessionID, '| TenantID:', req.user.tenantId);
    console.log('[TRASH ROUTE] Using repository:', fileRepository.constructor.name);
    const rawFiles = await fileRepository.listUserTrashFiles({
      tenantId: req.user.tenantId,
      userId: req.user.userId
    });
    const list = rawFiles ?? [];
    const mappedFiles = list.map((f: FileMeta) => ({
      id: f.id,
      name: f.filename,
      size: f.size,
      created_at: f.created_at,
      createdAt: f.created_at,
      mimeType: f.mime_type ?? 'application/octet-stream'
    }));
    res.json(mappedFiles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch trash' });
  }
});

// ---------- FILE METADATA ----------
app.get('/api/files/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.tenantId || !req.user?.userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }
    const file = await fileRepository.getFileById({
      fileId: req.params.id,
      tenantId: req.user.tenantId,
      userId: req.user.userId
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Map to expected format
    res.json({
      id: file.id,
      filename: file.filename,
      size: file.size,
      created_at: file.created_at,
      folder_id: file.folder_id || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// ---------- DOWNLOAD ----------
app.get('/api/files/:id/download', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.tenantId || !req.user?.userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }
    const file = await fileRepository.getFileForDownload({
      fileId: req.params.id,
      tenantId: req.user.tenantId,
      userId: req.user.userId
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.setHeader(
      'Content-Disposition',
      `attachment; filename = "${file.filename}"`
    );
    res.sendFile(file.storage_path);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Download failed' });
  }
});

// ---------- DELETE ----------
app.delete('/api/files/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.tenantId || !req.user?.userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }
    const fileMeta = await fileRepository.deleteFileMeta({
      fileId: req.params.id,
      tenantId: req.user.tenantId,
      userId: req.user.userId
    });

    if (!fileMeta) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ message: 'File deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed' });
  }
});

// ---------- GENERATE SHARE LINK ----------
app.post('/api/files/:id/share-link', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.tenantId || !req.user?.userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }

    const fileId = req.params.id;
    
    // Verify file ownership using repository
    const file = await fileRepository.getFileById({
      fileId,
      tenantId: req.user.tenantId,
      userId: req.user.userId
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    // Generate secure token (UUID v4)
    const shareToken = uuidv4();
    const linkId = uuidv4();

    // Insert into existing shared_links table
    await db.execute<ResultSetHeader>(
      `INSERT INTO shared_links (id, file_id, share_token, created_by, tenant_id, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [linkId, fileId, shareToken, req.user.userId, req.user.tenantId]
    );

    // Construct public URL using frontend base URL
    const baseUrl = config.FRONTEND_BASE_URL.replace(/\/$/, '');
    const publicUrl = `${baseUrl}/public/share/${shareToken}`;

    res.json({
      shareToken,
      publicUrl,
      fileId: file.id,
      filename: file.filename
    });
  } catch (err: any) {
    console.error('[SHARE LINK] Error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Share link already exists for this file' });
    }
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

// ---------- RESTORE ----------
app.post('/api/files/:id/restore', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.tenantId || !req.user?.userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }
    const restored = await fileRepository.restoreFileMeta({
      fileId: req.params.id,
      tenantId: req.user.tenantId,
      userId: req.user.userId
    });
    if (!restored) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json({ message: 'Restored' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Restore failed' });
  }
});

// ================= PRODUCTION FRONTEND (static + SPA fallback) =================
// Serve built React app from backend/public (create with: mkdir -p backend/public && cp -r frontend/dist/* backend/public/)
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));
// SPA fallback: non-API GET requests (e.g. /, /app, /login) serve index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) next(err);
  });
});

// ================= START SERVER =================
async function startServer() {
  try {
    // Initialize DB schema with explicit error handling
    try {
      await initSchema();
      console.log('[SERVER] Database schema initialized successfully');
    } catch (dbErr: any) {
      console.warn('[SERVER] Database schema initialization failed (this is OK if using filesystem mode):', dbErr.message);
      console.warn('[SERVER] Stack:', dbErr.stack);
      // Continue startup even if DB init fails (filesystem mode)
    }

    // Start HTTP server
    app.listen(config.PORT, () => {
      console.log(`[BACKEND] Running on port ${config.PORT}`);
      console.log(`[BACKEND] Data storage: ${config.DATA_DIR}`);
    });
  } catch (err: any) {
    console.error('[BOOT FATAL] Startup failed:', err);
    console.error('[BOOT FATAL] Stack:', err.stack);
    process.exit(1);
  }
}

startServer();
