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

// Init DB Schema (required for register/login and folder/share routes)
// Run asynchronously - don't block server startup if DB is unavailable
initSchema().catch(err => {
  console.warn('[SERVER] Database schema initialization failed (this is OK if using filesystem mode):', err.message);
});

const app: Express = express();

// ================= TRUST PROXY =================
// 🔐 Required for secure cookies behind reverse proxy (even localhost)
app.set('trust proxy', 1);

// ================= SESSION MIDDLEWARE =================
// 🔐 Express-session with httpOnly cookies (BFF pattern)
// CRITICAL: Must be FIRST middleware, before CORS and routes
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,  // 🔥 CRITICAL: Set to true so uninitialized sessions are stored
  name: 'connect.sid',      // Explicit cookie name
  cookie: {
    httpOnly: true,          // Prevents JS access (no XSS risk)
    secure: false,           // Allow cookie over HTTP so OIDC state survives login → callback
    sameSite: 'lax',         // Allows IdP redirect while keeping CSRF protection
    maxAge: config.SESSION_MAX_AGE, // 7 days
    path: '/',
    // domain: undefined - let browser handle it for current host
  },
}));

// ================= MIDDLEWARE =================
app.use(cors({
  origin: config.FRONTEND_BASE_URL,
  credentials: true,  // Allow cookies with CORS
}));
app.use(express.json());

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




const upload = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (config.ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  }
});

// ================= OIDC ROUTES (BFF Pattern) =================
// 🔐 All OIDC logic (login, callback, token exchange) happens here
// Frontend never sees tokens; they're stored server-side only
// Public mounts: both legacy '/auth/*' and '/api/auth/*' entrypoints
app.use('/auth', oidcRouter);
app.use('/api/auth', oidcRouter);
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

// ---------- UPLOAD ----------
app.post(
  '/api/files/upload',
  authenticate,
  upload.single('file'),
  async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileId = path.basename(
      req.file.filename,
      path.extname(req.file.filename)
    );

    const folderId = req.body.folderId || null;

    try {
      // Infer mime type from file extension
      const ext = path.extname(req.file.originalname).toLowerCase();
      let mimeType = req.file.mimetype || 'application/octet-stream';
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
        filename: req.file.originalname,
        size: req.file.size,
        storage_path: req.file.path,
        folder_id: folderId || null,
        mime_type: mimeType,
        created_at: new Date().toISOString()
      });

      res.status(201).json({
        id: fileId,
        name: req.file.originalname
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'File upload failed' });
    }
  }
);

// ---------- LIST FILES ----------
app.get('/api/files', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.tenantId || !req.user?.userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }
    const files = await fileRepository.listUserFiles({
      tenantId: req.user.tenantId,
      userId: req.user.userId
    });

    // Map to expected format
    const mappedFiles = files.map((f: FileMeta) => ({
      id: f.id,
      filename: f.filename,
      size: f.size,
      created_at: f.created_at
    }));

    res.json(mappedFiles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch files' });
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

    // Delete physical file
    if (await fs.pathExists(fileMeta.storage_path)) {
      await fs.remove(fileMeta.storage_path);
    }

    res.json({ message: 'File deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed' });
  }
});

// ================= START SERVER =================
app.listen(config.PORT, () => {
  console.log(`[BACKEND] Running on port ${config.PORT}`);
  console.log(`[BACKEND] Data storage: ${config.DATA_DIR}`);
});
