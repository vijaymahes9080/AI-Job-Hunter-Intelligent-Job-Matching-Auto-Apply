import crypto from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { config } from './config.js';
import { AppError, toApiError } from './errors.js';
import { logger } from './logger.js';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.get('x-request-id') || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  const started = Date.now();
  res.on('finish', () => {
    if (req.path === '/health') return;
    logger.info('http_request', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - started,
      userId: req.user?.id,
    });
  });
  next();
}

export function originGuard(req: Request, _res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  try {
    const originUrl = new URL(origin);
    const requestHost = req.get('host') || '';
    const allowedExtra = (process.env.APP_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const appOrigin = new URL(config.appUrl).origin;
    if (`${originUrl.protocol}//${originUrl.host}` !== appOrigin && originUrl.host !== requestHost && !allowedExtra.includes(origin)) {
      throw new AppError(403, 'origin_not_allowed', 'Request origin is not allowed.');
    }
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(403, 'origin_not_allowed', 'Invalid request origin.'));
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'not_found', 'The requested API route does not exist.'));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  const { statusCode, body } = toApiError(error);
  if (statusCode >= 500) {
    logger.error('request_failed', {
      requestId: req.requestId,
      path: req.path,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
  res.status(statusCode).json(body);
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function validate<T>(schema: ZodType<T>, value: unknown): T {
  return schema.parse(value);
}

export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
