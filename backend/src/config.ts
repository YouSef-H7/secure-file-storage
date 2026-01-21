
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  PORT: process.env.PORT || 3000,
  // Fix: Use path.resolve() instead of process.cwd() to resolve type issues with the process global
  DATA_DIR: process.env.DATA_DIR || path.join(path.resolve(), 'data'),
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_only',
  MAX_FILE_MB: parseInt(process.env.MAX_FILE_MB || '25'),
  ALLOWED_MIME: (process.env.ALLOWED_MIME || 'image/png,image/jpeg,application/pdf').split(','),
  
  // OIDC (OCI Identity Domain) - BFF Pattern
  OIDC_ISSUER: process.env.OIDC_ISSUER || '',
  OIDC_DISCOVERY_URL: process.env.OIDC_DISCOVERY_URL || '',
  OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID || '',
  OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET || '',
  OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  OIDC_LOGOUT_REDIRECT_URI: process.env.OIDC_LOGOUT_REDIRECT_URI || 'http://localhost:5173/login',
  OIDC_SCOPES: (process.env.OIDC_SCOPES || 'openid,profile,email').split(','),
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev_session_secret_only',
  SESSION_COOKIE_SECURE: process.env.NODE_ENV === 'production',
  // 🔥 CRITICAL: Use 'lax' for localhost (not 'none'), since we're not using secure cookies in dev
  // 'lax' allows same-site cookies; 'none' requires secure: true which breaks localhost HTTP
  SESSION_COOKIE_SAMESITE: 'lax' as const,
  SESSION_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Frontend
  FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
  FRONTEND_SUCCESS_URL: process.env.FRONTEND_SUCCESS_URL || 'http://localhost:5173/callback',
};
