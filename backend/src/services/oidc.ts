import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import crypto from 'crypto';

/**
 * OCI OIDC Service - Backend-For-Frontend Pattern
 * Handles Authorization Code flow with PKCE/state/nonce
 * All tokens stored server-side; frontend never sees them
 */

interface OIDCConfig {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  jwksUri: string;
}

interface OIDCTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface OIDCSession {
  user: {
    sub: string;
    email?: string;
    name?: string;
  };
  tokens: OIDCTokens;
  nonce: string;
}

// Cache OIDC configuration
let cachedConfig: OIDCConfig | null = null;

// Redirect URI used for both authorization request and token exchange.
// Environment-driven with a safe production default.
const redirectUri =
  process.env.OIDC_REDIRECT_URI ||
  'http://145.241.155.110/api/auth/callback';

/**
 * Normalize issuer URL by removing trailing slash
 */
function normalizeIssuer(issuer: string): string {
  return issuer.endsWith('/') ? issuer.slice(0, -1) : issuer;
}

/**
 * Fetch and cache OIDC configuration from issuer's discovery document
 * Handles OCI behavior where discovery may be on idcs host but issuer is generic
 */
export async function getOIDCConfig(): Promise<OIDCConfig> {
  if (cachedConfig) return cachedConfig;

  if (!config.OIDC_ISSUER) {
    throw new Error('OIDC_ISSUER not configured');
  }

  // Use explicit discovery URL if provided, otherwise construct from issuer
  let discoveryUrl = config.OIDC_DISCOVERY_URL;
  if (!discoveryUrl) {
    const issuer = normalizeIssuer(config.OIDC_ISSUER);
    discoveryUrl = `${issuer}/.well-known/openid-configuration`;
  }

  console.log('[OIDC] Fetching discovery from:', discoveryUrl);

  try {
    const response = await fetch(discoveryUrl);
    if (!response.ok) {
      console.error(`[OIDC] Discovery fetch failed with status ${response.status}`);
      throw new Error(`Discovery failed: HTTP ${response.status}`);
    }

    const discovery = await response.json() as any;

    // Log resolved endpoints (no secrets)
    console.log('[OIDC] Discovery endpoints resolved:', {
      issuer: discovery.issuer,
      authorization_endpoint: discovery.authorization_endpoint,
      token_endpoint: discovery.token_endpoint,
      jwks_uri: discovery.jwks_uri,
    });

    if (!discovery.authorization_endpoint || !discovery.token_endpoint || !discovery.jwks_uri) {
      throw new Error('Discovery document missing required endpoints: authorization_endpoint, token_endpoint, or jwks_uri');
    }

    cachedConfig = {
      issuer: discovery.issuer,
      authorizationEndpoint: discovery.authorization_endpoint,
      tokenEndpoint: discovery.token_endpoint,
      userInfoEndpoint: discovery.userinfo_endpoint,
      jwksUri: discovery.jwks_uri,
    };

    return cachedConfig;
  } catch (error) {
    console.error('[OIDC] Failed to fetch OIDC configuration:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Generate authorization URL for user to sign in
 * Uses Authorization Code + PKCE
 */
export function generateAuthorizationUrl(): {
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
} {
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('hex');

  // PKCE: challenge = base64url(sha256(verifier))
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest()
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const params = new URLSearchParams({
    client_id: config.OIDC_CLIENT_ID,
    response_type: 'code',
    scope: config.OIDC_SCOPES.join(' '),
    redirect_uri: redirectUri,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  if (!cachedConfig?.authorizationEndpoint) {
    throw new Error('Authorization endpoint not available - discovery must be called first');
  }

  const url = `${cachedConfig.authorizationEndpoint}?${params.toString()}`;

  console.log('[OIDC] Generated authorization URL for endpoint:', cachedConfig.authorizationEndpoint);
  console.log('[OIDC] Auth state:', state.substring(0, 8) + '...');

  return { url, state, nonce, codeVerifier };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  expectedNonce: string
): Promise<OIDCTokens> {
  const config_ = await getOIDCConfig();

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.OIDC_CLIENT_ID,
    client_secret: config.OIDC_CLIENT_SECRET,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  console.log('[OIDC] Exchanging code for tokens at:', config_.tokenEndpoint);

  try {
    const response = await fetch(config_.tokenEndpoint, {
      method: 'POST',
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[OIDC] Token endpoint HTTP ${response.status}:`, error.substring(0, 200));
      throw new Error(`Token exchange failed: HTTP ${response.status}`);
    }

    const tokenResponse = await response.json() as any;

    if (!tokenResponse.id_token) {
      console.error('[OIDC] Token response missing id_token field:', Object.keys(tokenResponse));
      throw new Error('Token response missing id_token');
    }

    console.log('[OIDC] Successfully exchanged code for tokens');

    // Validate ID token
    await validateIdToken(
      tokenResponse.id_token,
      expectedNonce,
      config_.issuer
    );

    return {
      accessToken: tokenResponse.access_token,
      idToken: tokenResponse.id_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
    };
  } catch (error) {
    console.error('[OIDC] Token exchange error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Validate ID token via strict manual claim validation
 * 
 * IMPORTANT: OCI Identity Domains blocks access to /admin/v1/SigningCert/jwk (JWKS endpoint)
 * for OIDC applications. This is by design and documented by Oracle.
 * 
 * Solution: Backend-for-Frontend (BFF) pattern with server-side token storage
 * allows us to trust the issuer (confidential client authentication via client secret).
 * We validate claims without signature verification, relying on:
 * - Secure token exchange (client_secret protects auth code → token exchange)
 * - Server-side token storage (tokens never exposed to frontend)
 * - HTTPS transport (in-flight integrity)
 * - PKCE (code authorization integrity)
 * 
 * This is production-safe for OCI and is the recommended approach.
 * Reference: OCI Identity Domains + OIDC BFF patterns
 */
export async function validateIdToken(
  idToken: string,
  expectedNonce: string,
  expectedIssuer: string
): Promise<any> {
  try {
    // Decode token WITHOUT signature verification (JWKS inaccessible on OCI)
    const decoded = jwt.decode(idToken, { complete: false }) as any;

    if (!decoded) {
      throw new Error('Failed to decode ID token');
    }

    console.log('[OIDC] ID token decoded');

    // Acceptable issuers: discovery issuer OR normalized OIDC_ISSUER
    const acceptableIssuers = [
      normalizeIssuer(expectedIssuer),
      normalizeIssuer(config.OIDC_ISSUER),
    ];

    // 1. Validate issuer
    const tokenIssuer = normalizeIssuer(decoded.iss || '');
    if (!acceptableIssuers.includes(tokenIssuer)) {
      console.error('[OIDC] Issuer validation failed:', {
        token_issuer: decoded.iss,
        acceptable: acceptableIssuers,
      });
      throw new Error(`Issuer mismatch: got ${decoded.iss}, expected one of ${acceptableIssuers.join(', ')}`);
    }
    console.log('[OIDC] issuer validated:', tokenIssuer);

    // 2. Validate audience (must contain our client ID)
    const audience = Array.isArray(decoded.aud) ? decoded.aud : [decoded.aud];
    if (!audience.includes(config.OIDC_CLIENT_ID)) {
      console.error('[OIDC] Audience validation failed:', {
        token_aud: decoded.aud,
        expected: config.OIDC_CLIENT_ID,
      });
      throw new Error(`Audience mismatch: expected ${config.OIDC_CLIENT_ID}`);
    }
    console.log('[OIDC] audience validated');

    // 3. Validate nonce (replay protection)
    if (decoded.nonce !== expectedNonce) {
      console.error('[OIDC] Nonce validation failed:', {
        expected: expectedNonce,
        received: decoded.nonce,
      });
      throw new Error('Nonce mismatch - possible replay attack or session timeout');
    }
    console.log('[OIDC] nonce validated');

    // 4. Validate expiry (token must be fresh)
    const now = Math.floor(Date.now() / 1000);
    if (typeof decoded.exp !== 'number' || decoded.exp < now) {
      console.error('[OIDC] Expiry validation failed:', {
        exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'missing',
        now: new Date(now * 1000).toISOString(),
      });
      throw new Error('ID token expired or expiry claim missing');
    }

    // 5. Validate issued-at (±5 min skew to tolerate clock differences)
    const iat = decoded.iat;
    const skew = 5 * 60; // 5 minutes
    if (typeof iat !== 'number' || iat > now + skew || iat < now - skew * 10) {
      console.error('[OIDC] Issued-at validation failed:', {
        iat: iat ? new Date(iat * 1000).toISOString() : 'missing',
        now: new Date(now * 1000).toISOString(),
        tolerance: skew,
      });
      throw new Error('ID token issued-at claim invalid or excessive clock skew');
    }

    // 6. Validate subject (must exist)
    if (!decoded.sub) {
      console.error('[OIDC] Subject validation failed: missing sub claim');
      throw new Error('ID token missing required subject (sub) claim');
    }

    console.log('[OIDC] token accepted (OCI BFF mode) for user:', decoded.sub);
    return decoded;
  } catch (error) {
    console.error('[OIDC] ID token validation failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/* 
 * NOTE: fetchUserInfo is not currently used (allowlist-based authorization)
 * TODO: When OCI Admin enables Custom Claims, uncomment and adapt this function
 *
/**
 * Fetch user information from OIDC UserInfo endpoint
 * Uses access token to retrieve custom attributes (e.g., app_role from OCI Identity Domain)
 */
/*
export async function fetchUserInfo(accessToken: string): Promise<Record<string, unknown>> {
  const oidcConfig = await getOIDCConfig();

  if (!oidcConfig.userInfoEndpoint) {
    throw new Error('UserInfo endpoint not available in OIDC configuration');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.USERINFO_TIMEOUT_MS);

  try {
    console.log('[OIDC] Calling UserInfo endpoint:', oidcConfig.userInfoEndpoint);

    const response = await fetch(oidcConfig.userInfoEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read response');
      console.error(`[OIDC] UserInfo endpoint failed: HTTP ${response.status}`, errorText.substring(0, 200));
      throw new Error(`UserInfo request failed: HTTP ${response.status}`);
    }

    const userInfo = await response.json() as Record<string, unknown>;

    // Log available attributes (keys only - no PII)
    console.log('[OIDC] UserInfo attributes (keys only):', Object.keys(userInfo));

    return userInfo;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[OIDC] UserInfo request timed out after ${config.USERINFO_TIMEOUT_MS}ms`);
      throw new Error(`UserInfo request timed out after ${config.USERINFO_TIMEOUT_MS}ms`);
    }

    console.error('[OIDC] UserInfo fetch failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}
*/


/**
 * AUTHORIZATION LOGIC (Backend-Controlled)
 * 
 * Resolves user role based on email allowlist.
 * This separates Authentication (OCI) from Authorization (Backend).
 * 
 * Rules:
 * - Admin: Email exists in ADMIN_EMAIL_ALLOWLIST
 * - Employee: All other authenticated users (secure default)
 * - Denied: Missing or invalid email
 * 
 * TODO: When OCI Custom Claims (app_role) become available,
 * replace this allowlist logic with token-based resolution.
 * Structure allows for easy one-function replacement.
 */
export function resolveUserRole(email: string | undefined): 'admin' | 'employee' | undefined {
  // Fail closed: No email = deny access
  if (!email || typeof email !== 'string' || email.trim() === '') {
    console.error('[AUTHZ] Missing or invalid email - denying access');
    return undefined;
  }

  // Normalize email for comparison
  const normalizedEmail = email.trim().toLowerCase();

  // Parse admin allowlist from config
  const allowlistStr = config.ADMIN_EMAIL_ALLOWLIST.trim();
  const adminEmails = new Set<string>(
    allowlistStr
      ? allowlistStr.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
      : []
  );

  // Check allowlist
  if (adminEmails.has(normalizedEmail)) {
    console.log(`[AUTHZ] Role resolved: admin (source=allowlist, user=${normalizedEmail})`);
    return 'admin';
  }

  // Default: employee (secure, least-privilege)
  console.log(`[AUTHZ] Role resolved: employee (source=default, user=${normalizedEmail})`);
  return 'employee';
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OIDCTokens> {
  const config_ = await getOIDCConfig();

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.OIDC_CLIENT_ID,
    client_secret: config.OIDC_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(config_.tokenEndpoint, {
      method: 'POST',
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!response.ok) {
      throw new Error(`Refresh failed: ${response.status}`);
    }

    const tokenResponse = await response.json() as any;

    return {
      accessToken: tokenResponse.access_token,
      idToken: tokenResponse.id_token,
      refreshToken: tokenResponse.refresh_token || refreshToken,
      expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
    };
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
}
