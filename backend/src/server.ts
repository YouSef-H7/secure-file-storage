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
// @ts-ignore - express-mysql-session doesn't have TypeScript types
import MySQLStore from 'express-mysql-session';
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
// 🔐 Express-session with MySQL-backed storage (persists across PM2 restarts)
// CRITICAL: Must be FIRST middleware, before CORS and routes
// Uses existing MySQL pool from db.ts - no new connections, no privileged operations

let sessionStore: any = undefined;

try {
  // Create MySQL session store using existing pool
  // @ts-ignore - express-mysql-session doesn't have TypeScript types
  const MySQLSessionStore = MySQLStore(session);
  
  // Initialize store with restricted privileges:
  // - createDatabaseTable: false (table already exists)
  // - clearExpired: false (no cleanup permissions)
  // - Pass existing pool as second argument
  sessionStore = new MySQLSessionStore(
    {
      createDatabaseTable: false,  // Table already exists - do not attempt creation
      clearExpired: false,          // No cleanup permissions - do not attempt cleanup
      tableName: 'sessions'         // Use existing sessions table
    },
    db  // Use existing pool from db.ts
  );
  
  // Handle connection errors explicitly
  sessionStore.on('error', (error: Error) => {
    console.error('[SESSION STORE ERROR] MySQL session store failed:', error.message);
    console.error('[SESSION STORE ERROR] Stack:', error.stack);
    // DO NOT fall back to MemoryStore - fail explicitly
  });
  
  console.log('[SESSION] Using MySQL session store with existing pool');
  console.log('[SESSION] Table: sessions (existing, no creation attempted)');
} catch (err: any) {
  console.error('[SESSION ERROR] Failed to initialize MySQL session store:', err.message);
  console.error('[SESSION ERROR] Stack:', err.stack);
  // DO NOT fall back to MemoryStore - fail explicitly
  throw new Error(`Session store initialization failed: ${err.message}`);
}

app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET || config.SESSION_SECRET || 'secure-secret',
  resave: false,              // Changed: don't resave unchanged sessions
  saveUninitialized: false,   // Only save initialized sessions
  rolling: true,               // Refresh expiration on activity
  proxy: true,                 // Required behind nginx / reverse proxy
  store: sessionStore,         // MySQL session store (required, no fallback)
  cookie: {
    secure: false,             // HTTP only (no HTTPS)
    sameSite: 'lax',           // Required for OIDC redirects over HTTP
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 12, // 12 hours
  },
}));

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
    
    // Check if user is authenticated (optional - doesn't block if not)
    let user: { userId?: string; tenantId?: string } | undefined;
    if (req.session && (req.session as any).user) {
      const sessionUser = (req.session as any).user;
      user = {
        userId: sessionUser.sub || sessionUser.userId,
        tenantId: sessionUser.tenantId || 'default-tenant'
      };
    }

    // Look up share link (supports both file_id and folder_id)
    const [links] = await db.execute<RowDataPacket[]>(
      `SELECT sl.file_id, sl.folder_id, sl.created_by, sl.tenant_id, sl.expires_at,
              f.filename, f.size, f.created_at, f.mime_type, f.storage_path,
              fo.name as folder_name, fo.created_at as folder_created_at
       FROM shared_links sl
       LEFT JOIN files f ON sl.file_id = f.id AND (f.is_deleted = 0 OR f.is_deleted IS NULL)
       LEFT JOIN folders fo ON sl.folder_id = fo.id AND (fo.is_deleted = FALSE OR fo.is_deleted IS NULL)
       WHERE sl.share_token = ? AND (sl.file_id IS NOT NULL OR sl.folder_id IS NOT NULL)`,
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

    // Auto-internal share for authenticated users
    if (user?.userId && user?.tenantId) {
      try {
        if (link.file_id) {
          // Check if already shared
          const [existingFileShare] = await db.execute<RowDataPacket[]>(
            'SELECT id FROM shared_files WHERE file_id = ? AND shared_with_user_id = ?',
            [link.file_id, user.userId]
          );
          
          if (existingFileShare.length === 0) {
            await db.execute<ResultSetHeader>(
              `INSERT INTO shared_files (id, file_id, owner_user_id, shared_with_user_id, tenant_id, permission, created_at)
               VALUES (?, ?, ?, ?, ?, 'read', NOW())`,
              [uuidv4(), link.file_id, link.created_by, user.userId, link.tenant_id]
            );
          }
        } else if (link.folder_id) {
          // Check if already shared
          const [existingFolderShare] = await db.execute<RowDataPacket[]>(
            'SELECT id FROM folder_shares WHERE folder_id = ? AND shared_with_user_id = ?',
            [link.folder_id, user.userId]
          );
          
          if (existingFolderShare.length === 0) {
            await db.execute<ResultSetHeader>(
              `INSERT INTO folder_shares (id, folder_id, shared_with_user_id, tenant_id, permission, created_at)
               VALUES (?, ?, ?, ?, 'read', NOW())`,
              [uuidv4(), link.folder_id, user.userId, link.tenant_id]
            );
          }
        }
      } catch (shareErr: any) {
        // Log but don't fail the request
        console.error('[AUTO-SHARE] Error:', shareErr);
      }
    }

    // Return file or folder metadata
    if (link.file_id) {
      res.json({
        type: 'file',
        id: link.file_id,
        filename: link.filename,
        size: link.size,
        created_at: link.created_at,
        mime_type: link.mime_type
      });
    } else if (link.folder_id) {
      // Fetch folder contents
      const [contents] = await db.execute<RowDataPacket[]>(
        `SELECT 
          f.id, f.filename as name, f.size, f.created_at, f.mime_type, 'file' as type
         FROM files f
         WHERE f.folder_id = ? AND f.tenant_id = ? AND (f.is_deleted = 0 OR f.is_deleted IS NULL)
         UNION ALL
         SELECT 
          fo.id, fo.name, NULL as size, fo.created_at, NULL as mime_type, 'folder' as type
         FROM folders fo
         WHERE fo.parent_folder_id = ? AND fo.tenant_id = ? AND (fo.is_deleted = FALSE OR fo.is_deleted IS NULL)`,
        [link.folder_id, link.tenant_id, link.folder_id, link.tenant_id]
      );

      res.json({
        type: 'folder',
        id: link.folder_id,
        name: link.folder_name,
        created_at: link.folder_created_at,
        contents: contents || []
      });
    } else {
      return res.status(404).json({ error: 'Invalid share link' });
    }
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

// ---------- GENERATE FOLDER SHARE LINK ----------
app.post('/api/folders/:id/share-link', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.tenantId || !req.user?.userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }

    const folderId = req.params.id;
    
    // Verify folder ownership
    const [folders] = await db.execute<RowDataPacket[]>(
      'SELECT id, name FROM folders WHERE id = ? AND owner_user_id = ? AND tenant_id = ? AND (is_deleted = FALSE OR is_deleted IS NULL)',
      [folderId, req.user.userId, req.user.tenantId]
    );

    if (folders.length === 0) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }

    const folder = folders[0];

    // Generate secure token (UUID v4)
    const shareToken = uuidv4();
    const linkId = uuidv4();

    // Insert into existing shared_links table (with folder_id)
    await db.execute<ResultSetHeader>(
      `INSERT INTO shared_links (id, folder_id, share_token, created_by, tenant_id, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [linkId, folderId, shareToken, req.user.userId, req.user.tenantId]
    );

    // Construct public URL using frontend base URL
    const baseUrl = config.FRONTEND_BASE_URL.replace(/\/$/, '');
    const publicUrl = `${baseUrl}/public/share/${shareToken}`;

    res.json({
      shareToken,
      publicUrl,
      folderId: folder.id,
      folderName: folder.name
    });
  } catch (err: any) {
    console.error('[FOLDER SHARE LINK] Error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Share link already exists for this folder' });
    }
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

// ---------- LIST MY PUBLIC LINKS ----------
app.get('/api/share-links', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.tenantId || !req.user?.userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }

    const [links] = await db.execute<RowDataPacket[]>(
      `SELECT 
        sl.id, sl.share_token, sl.file_id, sl.folder_id, sl.created_at, sl.expires_at,
        f.filename as file_name, f.size as file_size,
        fo.name as folder_name
       FROM shared_links sl
       LEFT JOIN files f ON sl.file_id = f.id
       LEFT JOIN folders fo ON sl.folder_id = fo.id
       WHERE sl.created_by = ? AND sl.tenant_id = ?
       ORDER BY sl.created_at DESC`,
      [req.user.userId, req.user.tenantId]
    );

    const formattedLinks = (links || []).map(link => ({
      id: link.id,
      shareToken: link.share_token,
      type: link.file_id ? 'file' : 'folder',
      entityId: link.file_id || link.folder_id,
      name: link.file_name || link.folder_name,
      size: link.file_size || null,
      createdAt: link.created_at,
      expiresAt: link.expires_at,
      publicUrl: `${config.FRONTEND_BASE_URL.replace(/\/$/, '')}/public/share/${link.share_token}`
    }));

    res.json(formattedLinks);
  } catch (err) {
    console.error('[SHARE LINKS LIST] Error:', err);
    res.status(500).json({ error: 'Failed to fetch share links' });
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
