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
    secure: config.SESSION_COOKIE_SECURE,      // false in dev (HTTP), true in prod (HTTPS only)
    httpOnly: true,                             // Prevents JS access (no XSS risk)
    sameSite: config.SESSION_COOKIE_SAMESITE, // 'lax' - prevents CSRF for same-site redirects
    maxAge: config.SESSION_MAX_AGE,            // 7 days
    path: '/',
    // domain: undefined - let browser handle it for localhost
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
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;

    if (!tenantId || !userId) {
      return cb(new Error('Missing tenant or user context'), '');
    }

    const tenantDir = path.join(UPLOADS_DIR, tenantId);
    const userDir = path.join(tenantDir, userId);

    fs.ensureDirSync(userDir);
    cb(null, userDir);
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
app.use('/auth', oidcRouter);

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

    try {
     await db.execute<ResultSetHeader>(
  `
  INSERT INTO files (
    id,
    tenant_id,
    user_id,
    filename,
    size,
    storage_path
  )
  VALUES (?, ?, ?, ?, ?, ?)
  `,
  [
    fileId,
    req.user!.tenantId,
    req.user!.userId,
    req.file.originalname,
    req.file.size,
    req.file.path
  ]
);

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
    const [files] = await db.execute<RowDataPacket[]>(
  `
  SELECT id, filename, size, created_at
  FROM files
  WHERE user_id = ?
    AND tenant_id = ?
  ORDER BY created_at DESC
  `,
  [req.user!.userId, req.user!.tenantId]
);


    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// ---------- FILE METADATA ----------
app.get('/api/files/:id', authenticate, async (req: any, res) => {
  try {
    const [rows] = await db.execute<RowDataPacket[]>(
      `
      SELECT id, filename, size, created_at
      FROM files
      WHERE id = ?
        AND user_id = ?
        AND tenant_id = ?
      `,
      [req.params.id, req.user!.userId, req.user!.tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// ---------- DOWNLOAD ----------
app.get('/api/files/:id/download', authenticate, async (req: any, res) => {
  try {
    const [rows] = await db.execute<RowDataPacket[]>(
      `
      SELECT filename, storage_path
      FROM files
      WHERE id = ?
        AND user_id = ?
        AND tenant_id = ?
      `,
      [req.params.id, req.user!.userId, req.user!.tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = rows[0];
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`
    );
    res.sendFile(file.storage_path);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Download failed' });
  }
});

// ---------- DELETE ----------
app.delete('/api/files/:id', authenticate, async (req: any, res) => {
  try {
    const [rows] = await db.execute<RowDataPacket[]>(
      `
      SELECT storage_path
      FROM files
      WHERE id = ?
        AND user_id = ?
        AND tenant_id = ?
      `,
      [req.params.id, req.user!.userId, req.user!.tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = rows[0];

    if (await fs.pathExists(file.storage_path)) {
      await fs.remove(file.storage_path);
    }

    await db.execute<ResultSetHeader>(
      `
      DELETE FROM files
      WHERE id = ?
        AND tenant_id = ?
      `,
      [req.params.id, req.user!.tenantId]
    );

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
