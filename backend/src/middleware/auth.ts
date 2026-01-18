
import { Request as ExpressRequest, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Define AuthRequest by extending the base Express Request interface.
export interface AuthRequest extends ExpressRequest {
  user?: { userId: number; email: string };
  file?: any;
}

// Fix: Use 'any' for the req parameter to resolve the TypeScript error where 'headers' is not found on AuthRequest.
// This is a common workaround for Express/TypeScript environments where inherited properties from IncomingMessage 
// are sometimes not correctly resolved in custom request interfaces.
export const authenticate = (req: any, res: Response, next: NextFunction) => {
  // Retrieve the authorization header.
  const authHeader = req.headers.authorization;
  
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { userId: number; email: string };
    // Assign the decoded payload to the user property defined in the AuthRequest interface.
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
