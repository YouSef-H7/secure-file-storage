import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import {
  getOIDCConfig,
  generateAuthorizationUrl,
  exchangeCodeForTokens,
  resolveUserRole,
} from '../services/oidc';
import { AuthRequest } from '../middleware/auth';
import type { Session } from 'express-session';

const oidcRouter = Router();

// Frontend base URL for post-authentication redirect.
// Environment-driven, defaulting to the production VM URL.
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://145.241.155.110';

/**
 * Session type extension for OIDC data
 */
declare module 'express-session' {
  interface SessionData {
    oidcState?: string;
    oidcNonce?: string;
    oidcCodeVerifier?: string;
    user?: {
      sub: string;
      email?: string;
      name?: string;
      role?: 'admin' | 'employee';
    };
    tokens?: {
      accessToken: string;
      idToken: string;
      refreshToken?: string;
      expiresAt: number;
    };
  }
}

/**
 * 🔍 DEBUG ENDPOINT - No secrets, safe for production debugging
 * GET /auth/_debug/session
 */
oidcRouter.get('/_debug/session', (req: Request, res: Response) => {
  res.json({
    timestamp: new Date().toISOString(),
    sessionID: req.sessionID,
    sessionExists: !!req.session,
    oidcStateExists: !!req.session?.oidcState,
    oidcStateLength: req.session?.oidcState?.length || 0,
    oidcStatePrefix: req.session?.oidcState?.substring(0, 6) || 'N/A',
    userExists: !!req.session?.user,
    cookieHeader: req.headers.cookie ? `${(req.headers.cookie || '').length} bytes` : 'absent',
    connectSidInCookie: req.headers.cookie?.includes('connect.sid') ? 'yes' : 'no',
  });
});

/**
 * 🔍 DEBUG ENDPOINT - Cookie inspection (evidence gathering)
 * GET /auth/_debug/cookies
 */
oidcRouter.get('/_debug/cookies', (req: Request, res: Response) => {
  const cookies = (req.headers.cookie || '').split(';').map(c => c.trim()).filter(Boolean);
  const sessionCookie = cookies.find(c => c.startsWith('connect.sid='));

  res.json({
    timestamp: new Date().toISOString(),
    currentSessionID: req.sessionID,
    sessionStoreHasData: !!req.session?.oidcState || !!req.session?.user,

    // Cookie evidence
    cookieHeaderLength: req.headers.cookie?.length || 0,
    cookieCount: cookies.length,
    cookieNames: cookies.map(c => c.split('=')[0]),
    connectSidPresent: !!sessionCookie,

    // Session evidence
    sessionIDExists: !!req.sessionID,
    sessionData: {
      hasOidcState: !!req.session?.oidcState,
      oidcStatePrefix: req.session?.oidcState?.substring(0, 8) || null,
      oidcStateLength: req.session?.oidcState?.length || null,
      hasOidcNonce: !!req.session?.oidcNonce,
      hasOidcCodeVerifier: !!req.session?.oidcCodeVerifier,
      hasUser: !!req.session?.user,
    },
  });
});

/**
 * GET /auth/login
 * Redirects user to OCI Identity Domain authorization endpoint
 * Initializes authorization flow with state, nonce, PKCE
 */
oidcRouter.get('/login', async (req: Request, res: Response) => {
  try {
    const timestamp = new Date().toISOString();

    // Initialize OIDC config (fetches discovery document)
    await getOIDCConfig();

    // Generate auth URL with PKCE
    const { url, state, nonce, codeVerifier } = generateAuthorizationUrl();

    // Store state, nonce, code_verifier in session (not sent to client)
    req.session.oidcState = state;
    req.session.oidcNonce = nonce;
    req.session.oidcCodeVerifier = codeVerifier;

    // 📍 INSTRUMENTATION: Log login details BEFORE save
    console.log('[OIDC/LOGIN]', timestamp);
    console.log('[OIDC/LOGIN] 📍 Session ID:', req.sessionID);
    console.log('[OIDC/LOGIN] 📍 State:', state.substring(0, 8) + '... (len:' + state.length + ')');
    console.log('[OIDC/LOGIN] 📍 Incoming cookie header:', req.headers.cookie ? `${req.headers.cookie.length} bytes` : 'ABSENT');
    console.log('[OIDC/LOGIN] 📍 saveUninitialized enabled:', true);

    // 🔐 CRITICAL: Save session before redirecting
    // This ensures state/nonce/codeVerifier persist to the session store
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[OIDC/LOGIN] ❌ Session save ERROR:', saveErr);
        return res.status(500).json({ error: 'Failed to save session' });
      }

      console.log('[OIDC/LOGIN] ✅ Session persisted successfully');

      // 📍 INSTRUMENTATION: Log response headers AFTER save (before redirect)
      const setCookieHeaders = res.getHeaders()['set-cookie'] || [];
      console.log('[OIDC/LOGIN] 📍 Set-Cookie count:', Array.isArray(setCookieHeaders) ? setCookieHeaders.length : (setCookieHeaders ? 1 : 0));
      if (setCookieHeaders) {
        const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
        cookies.forEach((cookie, idx) => {
          const match = cookie.match(/^([^=]+)=/);
          const name = match ? match[1] : 'unknown';
          const hasSecure = cookie.includes('Secure');
          const hasSameSite = cookie.match(/SameSite=(\w+)/)?.[1] || 'none';
          console.log(`  [Cookie ${idx}] ${name}, Secure=${hasSecure}, SameSite=${hasSameSite}`);
        });
      }

      console.log('[OIDC/LOGIN] 📍 Redirecting to OCI...');
      res.redirect(url);
    });
  } catch (error) {
    console.error('[OIDC/LOGIN] ❌ Auth login error (DETAILED):', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
      error: error
    });
    res.status(500).json({ error: 'Failed to initiate login' });
  }
});

/**
 * GET /auth/callback
 * Handles redirect from OCI after user login
 * Exchanges authorization code for tokens
 * Creates server-side session (NO tokens sent to client)
 */
oidcRouter.get('/callback', async (req: Request, res: Response) => {
  try {
    const timestamp = new Date().toISOString();
    const { code, state } = req.query;

    // 📍 INSTRUMENTATION: Log callback details IMMEDIATELY
    console.log('\n[OIDC/CALLBACK]', timestamp);
    console.log('[OIDC/CALLBACK] 📍 Session ID:', req.sessionID);
    console.log('[OIDC/CALLBACK] 📍 Cookie header:', req.headers.cookie ? `${req.headers.cookie.length} bytes` : 'ABSENT');
    console.log('[OIDC/CALLBACK] 📍 connect.sid in cookie:', req.headers.cookie?.includes('connect.sid') ? 'YES' : 'NO');
    console.log('[OIDC/CALLBACK] 📍 State from URL:', state?.toString().substring(0, 8) + '... (len:' + (state?.toString().length || 0) + ')');
    console.log('[OIDC/CALLBACK] 📍 State in session:', req.session.oidcState ? req.session.oidcState.substring(0, 8) + '... (len:' + req.session.oidcState.length + ')' : 'MISSING');
    console.log('[OIDC/CALLBACK] 📍 Session store has oidcState:', !!req.session.oidcState);
    console.log('[OIDC/CALLBACK] 📍 Session store has oidcNonce:', !!req.session.oidcNonce);
    console.log('[OIDC/CALLBACK] 📍 Session store has oidcCodeVerifier:', !!req.session.oidcCodeVerifier);

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    if (!state || typeof state !== 'string') {
      return res.status(400).json({ error: 'Missing state parameter' });
    }

    // Verify state (prevents CSRF)
    if (state !== req.session.oidcState) {
      console.error('[OIDC/CALLBACK] ❌ STATE MISMATCH DETECTED');
      console.error('[OIDC/CALLBACK] ❌ Expected:', req.session.oidcState?.substring(0, 8) || 'UNDEFINED', '(len:' + (req.session.oidcState?.length || 0) + ')');
      console.error('[OIDC/CALLBACK] ❌ Got:', state.substring(0, 8), '(len:' + state.length + ')');
      console.error('[OIDC/CALLBACK] ❌ Diagnosis: Session cookie WAS sent (we can read the session), but state is MISSING from store');
      console.error('[OIDC/CALLBACK] ❌ Root cause: /auth/login either did not save state OR session store does not persist data');
      return res.status(400).json({ error: 'State mismatch - possible CSRF attack' });
    }

    const codeVerifier = req.session.oidcCodeVerifier;
    const nonce = req.session.oidcNonce;

    if (!codeVerifier || !nonce) {
      console.error('[OIDC/CALLBACK] ❌ Missing codeVerifier or nonce in session');
      return res.status(400).json({ error: 'Invalid session state' });
    }

    console.log('[OIDC/CALLBACK] ✅ State validation passed');

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier, nonce);

    // Extract basic user info from ID token
    const decoded = jwt.decode(tokens.idToken) as any;
    if (!decoded) {
      console.error('[OIDC/CALLBACK] ❌ Failed to decode ID token');
      return res.status(400).json({ error: 'Invalid ID token' });
    }

    const sub = decoded.sub;
    const name = decoded.name;

    // Identity Resolution: email -> preferred_username -> upn -> sub
    let rawIdentifier = decoded.email;
    let idSource = 'email';

    if (!rawIdentifier) {
      if (decoded.preferred_username) { rawIdentifier = decoded.preferred_username; idSource = 'preferred_username'; }
      else if (decoded.upn) { rawIdentifier = decoded.upn; idSource = 'upn'; }
      else { rawIdentifier = decoded.sub; idSource = 'sub'; }
    }

    // Normalize identifier
    const email = typeof rawIdentifier === 'string' ? rawIdentifier.trim().toLowerCase() : undefined;
    console.log(`[OIDC/CALLBACK] Identity resolved using source: ${idSource}`);

    // AUTHORIZATION: Resolve role from email allowlist (Backend-Controlled)
    const role = resolveUserRole(email);

    console.log('[OIDC/CALLBACK] User authenticated:', sub, 'Role:', role || 'DENIED');

    // STRICT ROLE CHECK
    if (!role) {
      console.error('[OIDC/CALLBACK] ❌ Access Denied: No valid role for user');
      // Clear session
      req.session.destroy((err) => {
        if (err) console.error('Error destroying session on denied access:', err);
      });
      return res.redirect(`${config.FRONTEND_BASE_URL}/login?error=access_denied`);
    }

    // Store user info in session (encrypted by express-session)
    // Tokens are NOT stored client-side; they stay on server
    req.session.user = {
      sub,
      email,
      name,
      role
    };

    // Clear OIDC state from session
    delete req.session.oidcState;
    delete req.session.oidcNonce;
    delete req.session.oidcCodeVerifier;

    // 🔐 CRITICAL: Store tokens in session (server-side only, NOT sent to client)
    // This enables future API calls to use access token for OCI resources
    (req.session as any).tokens = tokens;

    console.log('[OIDC/CALLBACK] Before session.save()');

    // 🔐 CRITICAL: Save session before redirecting
    // This ensures user and tokens are persisted to the session store
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    console.log('[OIDC/CALLBACK] ✅ Session saved with authenticated user');
    console.log('[OIDC/CALLBACK] Redirecting to:', FRONTEND_BASE_URL);

    // Redirect to frontend; it will detect authenticated session via /auth/me
    return res.redirect(FRONTEND_BASE_URL);
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * GET /auth/me
 * Returns current authenticated user from session
 * Frontend uses this to check if user is logged in
 * NO tokens exposed to client
 */
oidcRouter.get('/me', (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Return ONLY user info, never tokens
  res.json({
    user: req.session.user,
  });
});

/**
 * POST /auth/logout
 * Clears server-side session
 * Frontend's httpOnly cookie is automatically cleared by browser
 */
oidcRouter.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err: Error | null) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }

    // Clear session cookie
    res.clearCookie('connect.sid', {
      path: '/',
      secure: config.SESSION_COOKIE_SECURE,
      sameSite: config.SESSION_COOKIE_SAMESITE,
    });

    res.json({ message: 'Logged out successfully' });
  });
});

export default oidcRouter;
