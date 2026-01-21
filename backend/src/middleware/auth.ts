import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import type { Session } from 'express-session';

export interface AuthRequest extends Request {
  user?: {
    userId?: string;
    email?: string;
    tenantId?: string;
    sub?: string;  // OIDC user ID
    name?: string; // OIDC user name
  };
  session: Session & { user?: any; tokens?: any };
}

/**
 * 🔐 OCI Identity Domain JWKS client
 * 编辑 DOMAIN_NAME 只有
 */
const client = jwksClient({
  jwksUri: 'https://identity.oraclecloud.com/.well-known/jwks.json',
});

/**
 * Retrieve signing key from OCI JWKS
 */
function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Authentication middleware
 * Supports both:
 * 1. Session-based auth (OIDC BFF pattern) - preferred
 * 2. Bearer token auth (legacy JWT) - fallback
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Priority 1: Check session (OIDC BFF pattern)
  if (req.session && (req.session as any).user) {
    const sessionUser = (req.session as any).user;
    
    // Map OIDC session user to our auth context
    req.user = {
      userId: sessionUser.sub,     // OIDC subject
      email: sessionUser.email,
      tenantId: 'default-tenant',  // Default tenant for OIDC users
      sub: sessionUser.sub,
      name: sessionUser.name,
    };

    return next();
  }

  // Priority 2: Check Bearer token (legacy support)
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authentication' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(
    token,
    getKey,
    {
      algorithms: ['RS256'],
    },
    (err: any, decoded: any) => {
      if (err) {
        console.error('Token verification failed:', err);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      /**
       * 🧠 Mapping OCI token claims → app context
       */
      req.user = {
        userId: decoded.sub,                 // OCI user ID
        email: decoded.email || decoded.upn, // depends on IdP
        tenantId: decoded.tenant || 'default-tenant',
        sub: decoded.sub,
      };

      next();
    }
  );
};
