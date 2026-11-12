import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import type { Database } from './db/index.js';
import { AppError } from './errors.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      authMethod?: 'cookie' | 'bearer';
      requestId?: string;
    }
  }
}

interface TokenPayload {
  sub: string;
  email: string;
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email } satisfies TokenPayload, config.jwtSecret, {
    expiresIn: config.jwtTtl,
  });
}

export function verifyToken(token: string): TokenPayload {
  const payload = jwt.verify(token, config.jwtSecret);
  if (typeof payload === 'string' || !payload.sub) throw new AppError(401, 'invalid_token', 'Invalid session token.');
  return { sub: String(payload.sub), email: String(payload.email || '') };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcryptRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function setAuthCookies(res: Response, token: string): string {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie(config.cookieName, token, baseCookieOptions());
  res.cookie(config.csrfCookie, csrfToken, {
    ...baseCookieOptions(),
    httpOnly: false,
  });
  return csrfToken;
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(config.cookieName, { path: '/' });
  res.clearCookie(config.csrfCookie, { path: '/' });
}

function extractToken(req: Request): { token: string; method: 'cookie' | 'bearer' } | null {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) {
    return { token: header.slice(7).trim(), method: 'bearer' };
  }
  const cookieToken = req.cookies?.[config.cookieName];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return { token: cookieToken, method: 'cookie' };
  }
  return null;
}

export function createAuthMiddleware(db: Database) {
  return async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const extracted = extractToken(req);
      if (!extracted) throw new AppError(401, 'authentication_required', 'Please sign in to continue.');
      let payload: TokenPayload;
      try {
        payload = verifyToken(extracted.token);
      } catch {
        throw new AppError(401, 'session_expired', 'Your session has expired. Please sign in again.');
      }
      const result = await db.query<AuthUser>(
        'SELECT id, email, name, role, created_at as "createdAt" FROM users WHERE id = $1',
        [payload.sub],
      );
      const user = result.rows[0];
      if (!user) throw new AppError(401, 'account_not_found', 'This account no longer exists.');
      req.user = user;
      req.authMethod = extracted.method;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.authMethod === 'bearer') return next();
  const cookieToken = req.cookies?.[config.csrfCookie];
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken.length < 16 || cookieToken !== headerToken) {
    return next(new AppError(403, 'csrf_validation_failed', 'Security check failed. Refresh the page and retry.'));
  }
  next();
}

export function requireRole(...roles: string[]) {
  return function roleGuard(req: Request, _res: Response, next: NextFunction): void {
    if (!req.user) return next(new AppError(401, 'authentication_required', 'Please sign in.'));
    if (!roles.includes(req.user.role)) return next(new AppError(403, 'forbidden', 'You do not have access to this action.'));
    next();
  };
}
