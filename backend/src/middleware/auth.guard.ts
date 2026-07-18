import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError, ForbiddenError } from '../errors/index.js';

export interface AuthPayload {
  userId: string;
  role: 'RECRUITER' | 'CANDIDATE' | 'ADMIN';
}

// Extend Express Request to carry auth payload
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      correlationId?: string;
    }
  }
}

/**
 * Verifies JWT access token from Authorization header.
 * Attaches decoded payload to req.user.
 */
export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed authorization header');
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

/**
 * Returns a middleware that checks if the authenticated user has
 * one of the allowed roles.
 */
export function requireRole(...roles: AuthPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Requires one of roles: ${roles.join(', ')}`);
    }
    next();
  };
}
