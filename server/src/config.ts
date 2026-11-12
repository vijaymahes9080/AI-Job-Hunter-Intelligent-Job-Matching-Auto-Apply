import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const generatedSecret = crypto.randomBytes(48).toString('hex');

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const databaseUrl = process.env.DATABASE_URL || '';
const allowDemoDb = bool(process.env.ALLOW_DEMO_DB, !isProduction);

if (isProduction && !databaseUrl && !allowDemoDb) {
  throw new Error(
    'DATABASE_URL is required in production. Set ALLOW_DEMO_DB=true only for a temporary demo deployment (data is not durable).',
  );
}
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production.');
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction,
  port: int(process.env.PORT, 8787),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  databaseUrl,
  demoDb: !databaseUrl && allowDemoDb,
  allowDemoDb,
  jwtSecret: process.env.JWT_SECRET || generatedSecret,
  jwtTtl: '7d',
  cookieName: 'ajh_session',
  csrfCookie: 'ajh_csrf',
  bcryptRounds: int(process.env.BCRYPT_ROUNDS, isProduction ? 12 : 10),
  seedDemo: bool(process.env.SEED_DEMO, !databaseUrl && allowDemoDb),
  demoEmail: process.env.DEMO_EMAIL || 'demo@aijobhunter.local',
  demoPassword: process.env.DEMO_PASSWORD || 'Demo@12345',
  // Optional self-hosted/open-weight inference endpoint (Ollama, vLLM, llama.cpp).
  // No proprietary AI provider is required. Without this the platform uses
  // deterministic, evidence-based engines and clearly labels the source.
  llm: {
    baseUrl: process.env.LLM_BASE_URL || '',
    model: process.env.LLM_MODEL || '',
    apiKey: process.env.LLM_API_KEY || '',
  },
  githubToken: process.env.GITHUB_TOKEN || '',
  adzuna: {
    appId: process.env.ADZUNA_APP_ID || '',
    appKey: process.env.ADZUNA_APP_KEY || '',
  },
  discovery: {
    enabled: bool(process.env.ENABLE_SCHEDULER, false),
    intervalMinutes: int(process.env.DISCOVERY_INTERVAL_MINUTES, 360),
  },
  notificationWebhookUrl: process.env.NOTIFICATION_WEBHOOK_URL || '',
  cronSecret: process.env.CRON_SECRET || '',
  trustProxy: bool(process.env.TRUST_PROXY, isProduction),
  maxUploadBytes: int(process.env.MAX_UPLOAD_BYTES, 5 * 1024 * 1024),
  engineVersion: '2.0.0',
  demoMode: !databaseUrl && allowDemoDb,
};

export type AppConfig = typeof config;
