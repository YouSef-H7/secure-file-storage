
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs-extra';
import db from './db';
import { config } from './config';
import { authenticate, AuthRequest } from './middleware/auth';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Directories
const UPLOADS_DIR = path.join(config.DATA_DIR, 'uploads');
fs.ensureDirSync(UPLOADS_DIR);

// --- HEALTH ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// --- AUTH ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const hashed = await bcrypt.hash(password, 12);
    const stmt = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
    stmt.run(email, hashed);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, config.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email } });
});

app.get('/api/auth/me', authenticate, (req: AuthRequest, res) => {
  res.json(req.user);
});

// --- FILES ---
const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    const userDir = path.join(UPLOADS_DIR, req.user.userId.toString());
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
    if (config.ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Invalid file type: ${file.mimetype}`));
  }
});

// Fix: Use any for req to ensure multer file and express params are safely accessible
app.post('/api/files/upload', authenticate, upload.single('file'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const fileId = path.basename(req.file.filename, path.extname(req.file.filename));
  const stmt = db.prepare(`
    INSERT INTO files (id, user_id, name, size, mime_type, storage_path)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    fileId,
    req.user!.userId,
    req.file.originalname,
    req.file.size,
    req.file.mimetype,
    req.file.path
  );

  res.status(201).json({ id: fileId, name: req.file.originalname });
});

app.get('/api/files', authenticate, (req: AuthRequest, res) => {
  const files = db.prepare('SELECT id, name, size, mime_type as mimeType, created_at as createdAt FROM files WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user!.userId);
  res.json(files);
});

// Fix: Use any for req to ensure req.params.id is correctly typed during runtime
app.get('/api/files/:id', authenticate, (req: any, res) => {
  const file = db.prepare('SELECT id, name, size, mime_type as mimeType, created_at as createdAt FROM files WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user!.userId);
  if (!file) return res.status(404).json({ error: 'File not found' });
  res.json(file);
});

// Fix: Use any for req to ensure req.params.id is correctly typed during runtime
app.get('/api/files/:id/download', authenticate, (req: any, res) => {
  const file: any = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.userId);
  if (!file) return res.status(404).json({ error: 'File not found' });
  
  res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
  res.sendFile(file.storage_path);
});

// Fix: Use any for req to ensure req.params.id is correctly typed during runtime
app.delete('/api/files/:id', authenticate, async (req: any, res) => {
  const file: any = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.userId);
  if (!file) return res.status(404).json({ error: 'File not found' });

  try {
    if (await fs.pathExists(file.storage_path)) await fs.remove(file.storage_path);
    db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Deletion failed' });
  }
});

app.listen(config.PORT, () => {
  console.log(`[BACKEND] Running on port ${config.PORT}`);
  console.log(`[BACKEND] Data storage: ${config.DATA_DIR}`);
});
