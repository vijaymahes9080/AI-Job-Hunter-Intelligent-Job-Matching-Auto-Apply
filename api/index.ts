import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Express } from 'express';
import { createInitializedApp } from '../server/src/app.js';

/**
 * Vercel serverless adapter for the Express API.
 *
 * The same application is used locally and in Docker/Render. Durable data
 * requires DATABASE_URL (PostgreSQL); the pg-mem demo database is intentionally
 * non-durable and unsuitable for production serverless use.
 */
let appPromise: Promise<Express> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  appPromise ??= createInitializedApp();
  const app = await appPromise;
  await new Promise<void>((resolve, reject) => {
    res.on('finish', resolve);
    res.on('close', resolve);
    app(req as never, res as never, (error: unknown) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
