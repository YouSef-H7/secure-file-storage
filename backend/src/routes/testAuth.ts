// TEMPORARY QA ROUTE — REMOVE BEFORE PRODUCTION
// This route provides a backdoor registration for internal QA testing only.
// It is gated by TEST_MODE environment variable and an access code.

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

const testAuthRouter = Router();

testAuthRouter.post('/test-register', async (req: Request, res: Response) => {
  // TEMPORARY QA ROUTE — REMOVE BEFORE PRODUCTION

  // ── Environment gate ──
  if (process.env.NODE_ENV === 'production' && process.env.TEST_MODE !== 'true') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { email, displayName, role, accessCode } = req.body;

  // ── Validate required fields ──
  if (!email || !displayName || !role || !accessCode) {
    return res.status(400).json({ error: 'All fields are required (email, displayName, role, accessCode).' });
  }

  // ── Validate role ──
  if (role !== 'admin' && role !== 'employee') {
    return res.status(400).json({ error: 'Role must be "admin" or "employee".' });
  }

  // ── Validate access code ──
  if (accessCode !== 'SPB2026') {
    return res.status(401).json({ error: 'Invalid access code.' });
  }

  try {
    const userId = uuidv4();
    const normalizedEmail = email.toLowerCase().trim();

    // ── Upsert user into MySQL ──
    // Include password column with placeholder to avoid MySQL strict-mode NOT NULL rejection
    await db.execute<ResultSetHeader>(
      'INSERT INTO users (id, tenant_id, email, password, role) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
      [userId, 'default-tenant', normalizedEmail, '__qa_no_password__', role]
    );

    // ── Fetch the actual user ID (may differ if user already existed) ──
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT id, role FROM users WHERE email = ?',
      [normalizedEmail]
    );
    const dbUser = rows[0];
    const finalUserId = dbUser?.id || userId;
    const finalRole = dbUser?.role || role;

    // ── Establish session (same shape as OIDC callback) ──
    (req.session as any).user = {
      id: finalUserId,
      sub: normalizedEmail,
      email: normalizedEmail,
      name: displayName,
      role: finalRole,
    };

    // ── Persist session to MySQL store ──
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log(`[QA] Test user registered and logged in: ${normalizedEmail} (role: ${finalRole})`);

    return res.json({
      success: true,
      user: {
        email: normalizedEmail,
        name: displayName,
        role: finalRole,
      },
    });
  } catch (err: any) {
    console.error('[QA] Test registration failed:', err);
    console.error('Test register error:', err?.message, err?.code, err?.sqlMessage);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

export default testAuthRouter;
