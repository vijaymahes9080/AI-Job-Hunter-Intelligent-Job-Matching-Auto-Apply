import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import type {
  ApplicationStatus,
  CandidateProfile,
  CompanyResearch,
  Difficulty,
  IntegrationStatusRecord,
  InterviewSession,
  RoadmapMilestone,
  UserSettings,
} from '../../shared/types.js';
import {
  clearAuthCookies,
  createAuthMiddleware,
  hashPassword,
  requireCsrf,
  setAuthCookies,
  signToken,
  verifyPassword,
} from './auth.js';
import { config } from './config.js';
import { createDatabase, type Database } from './db/index.js';
import { seedDemoData } from './db/seed.js';
import { AppError } from './errors.js';
import { asyncHandler, errorHandler, notFound, originGuard, requestContext, validate } from './middleware.js';
import { buildAnalytics } from './services/analytics.js';
import {
  approveApplication,
  getApplication,
  listApplications,
  prepareApplication,
  recordSubmission,
  updateApplicationNotes,
  updateApplicationStatus,
} from './services/applications.js';
import { runAuthenticityCheck } from './services/authenticity.js';
import { buildDashboard } from './services/dashboard.js';
import { buildDeadlineBoard } from './services/deadlines.js';
import { discoverJobs, getSourceStatus, createManualJob } from './services/discovery.js';
import { listCompanies, researchCompany } from './services/companyIntelligence.js';
import { checkDuplicates } from './services/duplicateGuard.js';
import { aggregateSkillGap, extractSkillsFromText } from './services/matchEngine.js';
import { getJobForCandidate, listJobs, mapJobRow, type JobRow } from './services/jobRepository.js';
import { generateInterviewSession, evaluateInterviewAnswer, summarizeInterview } from './services/interviewEngine.js';
import { analyzeGitHubPortfolio } from './services/githubPortfolio.js';
import { llmConfigured } from './services/llm.js';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  scanDeadlines,
} from './services/notifications.js';
import { DEFAULT_SETTINGS, getProfile, getSettings, newProfile, saveProfile, saveSettings } from './services/profiles.js';
import { generateRoadmap } from './services/roadmapEngine.js';
import { buildSalaryIntelligence } from './services/salaryIntelligence.js';
import { analyzeResume, extractResumeText } from './services/resume.js';
import { profileCompleteness } from './services/profiles.js';

function snapshotRetrievedAt(): string {
  const candidates = [
    fileURLToPath(new URL('./seed/jobs-snapshot.json', import.meta.url)),
    fileURLToPath(new URL('../../src/seed/jobs-snapshot.json', import.meta.url)),
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8')) as { retrievedAt?: string };
      if (parsed.retrievedAt) return parsed.retrievedAt;
    } catch {
      // try next path
    }
  }
  return 'unknown';
}

const SNAPSHOT_RETRIEVED_AT = snapshotRetrievedAt();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, 'Password must include a letter.')
    .regex(/[0-9]/, 'Password must include a number.'),
});
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});
const profileSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().max(254).optional(),
  phone: z.string().trim().max(40).optional(),
  location: z.string().trim().max(160).optional(),
  headline: z.string().trim().max(200).optional(),
  summary: z.string().max(4000).optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(80).optional(),
  experience: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().max(200),
        company: z.string().max(200),
        duration: z.string().max(120),
        description: z.string().max(4000),
      }),
    )
    .max(30)
    .optional(),
  education: z
    .array(z.object({ id: z.string(), degree: z.string().max(200), institution: z.string().max(200), year: z.string().max(20) }))
    .max(20)
    .optional(),
  projects: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().max(200),
        description: z.string().max(4000),
        technologies: z.array(z.string().max(80)).max(40),
      }),
    )
    .max(30)
    .optional(),
  certifications: z
    .array(z.object({ id: z.string(), name: z.string().max(200), issuer: z.string().max(200), year: z.string().max(20) }))
    .max(30)
    .optional(),
  preferredRoles: z.array(z.string().max(120)).max(20).optional(),
  preferredLocations: z.array(z.string().max(120)).max(20).optional(),
  workplacePreferences: z.array(z.enum(['Remote', 'Hybrid', 'On-site'])).max(3).optional(),
  salaryExpectation: z
    .object({ min: z.number().min(0).max(100_000_000), currency: z.string().max(8), period: z.enum(['year', 'month']) })
    .optional(),
  noticePeriodDays: z.number().int().min(0).max(365).optional(),
  resumeText: z.string().max(60_000).optional(),
  resumeFileName: z.string().max(200).nullable().optional(),
  githubUsername: z.string().trim().max(60).nullable().optional(),
  linkedinUrl: z.string().trim().max(500).nullable().optional(),
  portfolioUrl: z.string().trim().max(500).nullable().optional(),
});
const settingsSchema = z.object({
  theme: z.enum(['dark', 'light']).optional(),
  notifyDeadlines: z.boolean().optional(),
  notifyMatches: z.boolean().optional(),
  matchThreshold: z.number().int().min(0).max(100).optional(),
  weeklyDigest: z.boolean().optional(),
});
const resumeTextSchema = z.object({
  text: z.string().trim().min(80, 'Paste at least 80 characters of resume text.').max(60_000),
  fileName: z.string().trim().max(200).optional(),
});
const manualJobSchema = z.object({
  title: z.string().trim().min(2).max(200),
  company: z.string().trim().min(2).max(200),
  companyDomain: z.string().trim().max(200).nullable().optional(),
  location: z.string().trim().min(1).max(200),
  workplaceType: z.enum(['Remote', 'Hybrid', 'On-site', 'Unknown']).default('Unknown'),
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship', 'Unknown']).default('Unknown'),
  applyUrl: z.string().url().max(1200),
  description: z.string().trim().min(50, 'Provide the full job description (at least 50 characters).').max(30_000),
  deadlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  salary: z
    .object({
      min: z.number().min(0).nullable(),
      max: z.number().min(0).nullable(),
      currency: z.string().max(8).nullable(),
      period: z.enum(['year', 'month', 'hour', 'unknown']),
      source: z.enum(['published', 'description-extracted', 'unknown']),
      rawText: z.string().nullable(),
    })
    .nullable()
    .optional(),
  skills: z.array(z.string().max(80)).max(40).default([]),
});
const gapSchema = z.object({
  targetRole: z.string().trim().max(120).optional(),
  jobIds: z.array(z.string()).max(100).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
const companyResearchSchema = z.object({
  company: z.string().trim().min(2).max(200),
  website: z.string().trim().max(500).nullable().optional(),
});
const prepareAppSchema = z.object({
  jobId: z.string().min(1),
  resumeLabel: z.string().max(200).nullable().optional(),
  coverLetter: z.string().max(20_000).nullable().optional(),
  screeningAnswers: z.record(z.string(), z.string().max(4000)).optional(),
  duplicateOverrideReason: z.string().max(1000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});
const submissionSchema = z.object({
  url: z.string().trim().max(1200).nullable().optional(),
  reference: z.string().trim().max(300).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});
const statusSchema = z.object({
  status: z.enum(['Approved', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn']),
  note: z.string().max(2000).nullable().optional(),
});
const interviewCreateSchema = z.object({
  jobId: z.string().nullable().optional(),
  targetRole: z.string().trim().min(2).max(120).optional(),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).default('Intermediate'),
});
const answerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().trim().min(1).max(12_000),
  confidence: z.number().int().min(1).max(5).default(3),
});
const roadmapSchema = z.object({
  targetRole: z.string().trim().max(120).optional(),
  weeklyHours: z.number().int().min(2).max(40).default(8),
  experienceLevel: z.enum(['student', 'entry', 'mid', 'senior']).default('entry'),
});
const githubSchema = z.object({
  username: z.string().trim().max(60).optional(),
  jobIds: z.array(z.string()).max(20).optional(),
});
const resumeAnalysisSchema = z.object({
  jobId: z.string().nullable().optional(),
  resumeText: z.string().max(60_000).optional(),
});
const deadlineSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  note: z.string().max(500).optional(),
});
const notificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

interface InterviewRow {
  id: string;
  candidate_id: string;
  role: string;
  company: string | null;
  difficulty: string;
  questions: string;
  answers: string;
  status: string;
  score: number | null;
  confidence_average: number | null;
  created_at: string;
  completed_at: string | null;
}

function mapInterviewRow(row: InterviewRow): InterviewSession {
  const answers = JSON.parse(row.answers || '{}') as InterviewSession['answers'];
  return {
    id: row.id,
    role: row.role,
    company: row.company,
    difficulty: row.difficulty as Difficulty,
    questions: JSON.parse(row.questions || '[]') as InterviewSession['questions'],
    answers,
    status: (row.status as InterviewSession['status']) || 'In Progress',
    score: row.score,
    confidenceAverage: row.confidence_average,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    disclaimer:
      'Questions are generated from generic engineering topics and the selected job’s published requirements. They are practice questions, not actual or confidential company interview questions.',
  };
}

function parseCsv(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function targetRoleFor(profile: CandidateProfile, requested?: string): string {
  return (
    requested?.trim() ||
    profile.preferredRoles[0] ||
    profile.headline ||
    (profile.skills[0] ? `${profile.skills[0]} Developer` : 'Software Engineer')
  );
}

async function selectGapJobs(
  db: Database,
  candidateId: string,
  profile: CandidateProfile,
  targetRole: string,
  jobIds?: string[],
  limit = 40,
) {
  const rows = await db.query<JobRow>('SELECT * FROM jobs ORDER BY retrieved_at DESC LIMIT 3000');
  const all = rows.rows.map((row) => mapJobRow(row, { profile, includeMatch: true }));
  if (jobIds?.length) {
    const ids = new Set(jobIds);
    return all.filter((job) => ids.has(job.id)).slice(0, 100);
  }
  const tokens = targetRole
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((token) => token.length >= 3 && !['developer', 'engineer', 'senior', 'junior'].includes(token));
  const scored = all
    .map((job) => {
      const title = job.title.toLowerCase();
      const tokenHits = tokens.filter((token) => title.includes(token) || job.skills.some((skill) => skill.toLowerCase().includes(token))).length;
      return { job, tokenHits, match: job.match?.overall || 0 };
    })
    .filter((entry) => entry.tokenHits > 0 || entry.match >= 30)
    .sort((a, b) => b.tokenHits - a.tokenHits || b.match - a.match)
    .map((entry) => entry.job);
  return (scored.length > 0 ? scored : all).slice(0, limit);
}

async function buildGapFor(
  db: Database,
  candidateId: string,
  profile: CandidateProfile,
  targetRole: string,
  jobIds?: string[],
  limit?: number,
) {
  const jobs = await selectGapJobs(db, candidateId, profile, targetRole, jobIds, limit);
  const gap = aggregateSkillGap(profile, jobs, targetRole);
  await db.query(
    'INSERT INTO skill_gap_analyses (id, candidate_id, target_role, job_ids, result, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
    [
      `gap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      candidateId,
      targetRole,
      JSON.stringify(gap.jobIds),
      JSON.stringify(gap),
      gap.generatedAt,
    ],
  );
  return gap;
}

function integrationStatuses(): IntegrationStatusRecord[] {
  return [
    {
      key: 'remotive',
      name: 'Remotive public jobs API',
      category: 'job-source',
      configured: true,
      verification: 'live',
      description: 'Public remote-job feed used by discovery. No API key required.',
      envVars: [],
      docsUrl: 'https://remotive.com/api/remote-jobs',
      statusDetail: 'Discovery queries the public endpoint on demand.',
      actionRequired: null,
    },
    {
      key: 'greenhouse',
      name: 'Greenhouse public boards',
      category: 'job-source',
      configured: true,
      verification: 'live',
      description: 'Public employer boards are fetched directly; board tokens are configurable.',
      envVars: ['GREENHOUSE_BOARDS'],
      docsUrl: 'https://developers.greenhouse.io/',
      statusDetail: 'Uses public board APIs only; no candidate or employer account required.',
      actionRequired: null,
    },
    {
      key: 'lever',
      name: 'Lever public postings',
      category: 'job-source',
      configured: true,
      verification: 'live',
      description: 'Public job postings are read from Lever public APIs.',
      envVars: ['LEVER_COMPANIES'],
      docsUrl: 'https://api.lever.co/',
      statusDetail: 'Uses public posting endpoints only.',
      actionRequired: null,
    },
    {
      key: 'open-model',
      name: 'Open-weight AI endpoint (optional)',
      category: 'ai',
      configured: llmConfigured(),
      verification: llmConfigured() ? 'live' : 'optional',
      description:
        'Optional OpenAI-compatible endpoint served by Ollama, vLLM or llama.cpp. The platform remains fully functional with deterministic evidence engines when unset.',
      envVars: ['LLM_BASE_URL', 'LLM_MODEL', 'LLM_API_KEY'],
      docsUrl: 'https://ollama.com/',
      statusDetail: llmConfigured()
        ? `Configured model: ${config.llm.model}.`
        : 'Deterministic engines active. No proprietary AI provider is required.',
      actionRequired: llmConfigured() ? null : 'Set LLM_BASE_URL and LLM_MODEL to enable optional open-model assistance.',
    },
    {
      key: 'github',
      name: 'GitHub public portfolio',
      category: 'portfolio',
      configured: true,
      verification: 'live',
      description: 'Public repositories are analysed through the GitHub REST API. A token is optional but raises rate limits.',
      envVars: ['GITHUB_TOKEN'],
      docsUrl: 'https://docs.github.com/en/rest',
      statusDetail: config.githubToken ? 'A server-side GitHub token is configured.' : 'Using unauthenticated public API; 60 requests/hour may throttle deep analysis.',
      actionRequired: config.githubToken ? null : 'Optional: add GITHUB_TOKEN server-side for higher rate limits.',
    },
    {
      key: 'notifications',
      name: 'Notification webhook (optional)',
      category: 'notification',
      configured: Boolean(config.notificationWebhookUrl),
      verification: config.notificationWebhookUrl ? 'live' : 'optional',
      description: 'Optional generic webhook (Slack/Discord-compatible payload) for deadline and application alerts.',
      envVars: ['NOTIFICATION_WEBHOOK_URL'],
      docsUrl: 'https://api.slack.com/messaging/webhooks',
      statusDetail: config.notificationWebhookUrl ? 'Webhook delivery is attempted for new notifications.' : 'In-app notifications are active.',
      actionRequired: config.notificationWebhookUrl ? null : 'Optional: set NOTIFICATION_WEBHOOK_URL for external alerts.',
    },
    {
      key: 'scheduler',
      name: 'Background discovery scheduler',
      category: 'job-source',
      configured: config.discovery.enabled,
      verification: config.discovery.enabled ? 'live' : 'optional',
      description: 'In-process scheduler plus a secret-protected cron endpoint for serverless deployments.',
      envVars: ['ENABLE_SCHEDULER', 'DISCOVERY_INTERVAL_MINUTES', 'CRON_SECRET'],
      docsUrl: 'https://github.com/vijaymahes9080',
      statusDetail: config.discovery.enabled
        ? `Scheduler enabled every ${config.discovery.intervalMinutes} minutes.`
        : 'Scheduler disabled; trigger discovery from the UI or the cron endpoint.',
      actionRequired: config.discovery.enabled ? null : 'Optional: enable the scheduler or call the cron endpoint from an open-source scheduler.',
    },
  ];
}

async function handleResumeUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxUploadBytes, files: 1 },
    fileFilter: (_request, file, callback) => {
      const name = file.originalname.toLowerCase();
      const allowed =
        name.endsWith('.pdf') ||
        name.endsWith('.docx') ||
        name.endsWith('.txt') ||
        ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].includes(
          file.mimetype,
        );
      if (!allowed) callback(new AppError(400, 'unsupported_resume_type', 'Upload a PDF, DOCX or plain-text resume.'));
      else callback(null, true);
    },
  }).single('resume');

  upload(req, res, (error: unknown) => {
    if (!error) {
      void processUploadedResume(req, res).catch(next);
      return;
    }
    if (error instanceof multer.MulterError) {
      next(
        new AppError(
          400,
          'resume_upload_failed',
          error.code === 'LIMIT_FILE_SIZE'
            ? `The resume exceeds the ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB upload limit.`
            : `Resume upload failed: ${error.message}`,
        ),
      );
      return;
    }
    next(error);
  });
}

async function processUploadedResume(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError(401, 'authentication_required', 'Please sign in.');
  if (!req.file) throw new AppError(400, 'resume_file_required', 'Choose a PDF, DOCX or TXT resume file.');
  const parsed = await extractResumeText(req.file);
  const profile = await getProfile(req.db!, req.user.id);
  const updated: CandidateProfile = {
    ...profile,
    name: profile.name || req.user.name,
    email: req.user.email,
    resumeText: parsed.text,
    resumeFileName: req.file.originalname.slice(0, 200),
    resumeUpdatedAt: new Date().toISOString(),
  };
  await saveProfile(req.db!, req.user.id, updated);
  res.status(201).json({
    profile: updated,
    extractedCharacters: parsed.text.length,
    warnings: parsed.warnings,
    extractedSkills: extractSkillsFromText(parsed.text),
  });
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      db?: Database;
    }
  }
}

export async function createApp(db: Database): Promise<express.Express> {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy ? 1 : false);
  app.use(
    helmet({
      contentSecurityPolicy: config.isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        const allowed = [config.appUrl, ...(process.env.APP_ORIGINS || '').split(',').map((value) => value.trim())].filter(Boolean);
        if (allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
        return callback(new AppError(403, 'origin_not_allowed', 'Request origin is not allowed.'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'idempotency-key', 'x-request-id'],
      exposedHeaders: ['x-request-id'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());
  app.use(requestContext);
  app.use(originGuard);
  app.use((req, _res, next) => {
    req.db = db;
    next();
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 900,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'rate_limited', message: 'Too many requests. Please wait and retry.' } },
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 40,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'rate_limited', message: 'Too many authentication attempts. Try again in 15 minutes.' } },
  });
  app.use('/api/', apiLimiter);

  const router = express.Router();
  const auth = createAuthMiddleware(db);

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: db.kind,
      demoMode: config.demoMode,
      durableStorage: db.kind === 'postgres',
      engineVersion: config.engineVersion,
      ai: llmConfigured() ? 'open-weight endpoint configured' : 'deterministic evidence engine',
      jobSnapshotRetrievedAt: SNAPSHOT_RETRIEVED_AT,
    });
  });

  router.post(
    '/auth/register',
    authLimiter,
    asyncHandler(async (req, res) => {
      const input = validate(registerSchema, req.body);
      const existing = await db.query('SELECT id FROM users WHERE lower(email) = lower($1)', [input.email]);
      if (existing.rows.length > 0) throw new AppError(409, 'email_in_use', 'An account with this email already exists.');
      const now = new Date().toISOString();
      const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await db.query(
        'INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, input.email, await hashPassword(input.password), input.name, 'candidate', now],
      );
      const profile = newProfile(input.name, input.email);
      await saveProfile(db, id, profile);
      await saveSettings(db, id, DEFAULT_SETTINGS);
      const user = { id, email: input.email, name: input.name, role: 'candidate', createdAt: now };
      const csrfToken = setAuthCookies(res, signToken(user));
      res.status(201).json({ user, csrfToken, profile, settings: DEFAULT_SETTINGS, demo: false });
    }),
  );

  router.post(
    '/auth/login',
    authLimiter,
    asyncHandler(async (req, res) => {
      const input = validate(loginSchema, req.body);
      const result = await db.query<{ id: string; email: string; name: string; role: string; password_hash: string; created_at: string }>(
        'SELECT id, email, name, role, password_hash, created_at FROM users WHERE lower(email) = lower($1)',
        [input.email],
      );
      const row = result.rows[0];
      if (!row || !(await verifyPassword(input.password, row.password_hash))) {
        throw new AppError(401, 'invalid_credentials', 'Email or password is incorrect.');
      }
      const user = { id: row.id, email: row.email, name: row.name, role: row.role, createdAt: row.created_at };
      const csrfToken = setAuthCookies(res, signToken(user));
      res.json({ user, csrfToken, profile: await getProfile(db, row.id), settings: await getSettings(db, row.id), demo: false });
    }),
  );

  router.post(
    '/auth/demo-login',
    authLimiter,
    asyncHandler(async (_req, res) => {
      if (!config.seedDemo) {
        throw new AppError(403, 'demo_disabled', 'Demo login is disabled. Sign in with your own account.');
      }
      const result = await db.query<{ id: string; email: string; name: string; role: string; created_at: string }>(
        'SELECT id, email, name, role, created_at FROM users WHERE lower(email) = lower($1)',
        [config.demoEmail],
      );
      const row = result.rows[0];
      if (!row) throw new AppError(503, 'demo_unavailable', 'The demo account could not be loaded.');
      const user = { id: row.id, email: row.email, name: row.name, role: row.role, createdAt: row.created_at };
      const csrfToken = setAuthCookies(res, signToken(user));
      res.json({ user, csrfToken, profile: await getProfile(db, row.id), settings: await getSettings(db, row.id), demo: true });
    }),
  );

  router.post('/auth/logout', (req, res) => {
    void req;
    clearAuthCookies(res);
    res.json({ ok: true });
  });

  router.get(
    '/auth/me',
    auth,
    asyncHandler(async (req, res) => {
      const user = req.user!;
      res.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
        profile: await getProfile(db, user.id),
        settings: await getSettings(db, user.id),
        demo: config.seedDemo && user.email.toLowerCase() === config.demoEmail.toLowerCase(),
        profileCompleteness: profileCompleteness(await getProfile(db, user.id)),
      });
    }),
  );

  const protectedRouter = express.Router();
  protectedRouter.use(auth);
  protectedRouter.use(requireCsrf);

  protectedRouter.get(
    '/dashboard',
    asyncHandler(async (req, res) => {
      const profile = await getProfile(db, req.user!.id);
      res.json(await buildDashboard(db, req.user!.id, profile));
    }),
  );

  protectedRouter.get(
    '/profile',
    asyncHandler(async (req, res) => {
      const profile = await getProfile(db, req.user!.id);
      res.json({ profile, completeness: profileCompleteness(profile) });
    }),
  );

  protectedRouter.put(
    '/profile',
    asyncHandler(async (req, res) => {
      const input = validate(profileSchema, req.body);
      const current = await getProfile(db, req.user!.id);
      const allowEmailChange = false;
      const merged: CandidateProfile = {
        ...current,
        ...input,
        name: input.name || current.name,
        email: allowEmailChange ? input.email || current.email : req.user!.email,
        resumeText: input.resumeText !== undefined ? input.resumeText : current.resumeText,
        resumeFileName: input.resumeFileName !== undefined ? input.resumeFileName : current.resumeFileName,
        resumeUpdatedAt:
          input.resumeText !== undefined && input.resumeText !== current.resumeText
            ? new Date().toISOString()
            : current.resumeUpdatedAt,
      };
      await saveProfile(db, req.user!.id, merged);
      if (merged.name !== req.user!.name) {
        await db.query('UPDATE users SET name = $2 WHERE id = $1', [req.user!.id, merged.name]);
      }
      res.json({ profile: merged, completeness: profileCompleteness(merged) });
    }),
  );

  protectedRouter.post('/profile/resume', handleResumeUpload);
  protectedRouter.post(
    '/profile/resume-text',
    asyncHandler(async (req, res) => {
      const input = validate(resumeTextSchema, req.body);
      const current = await getProfile(db, req.user!.id);
      const updated: CandidateProfile = {
        ...current,
        email: req.user!.email,
        resumeText: input.text,
        resumeFileName: input.fileName || current.resumeFileName || 'pasted-resume.txt',
        resumeUpdatedAt: new Date().toISOString(),
      };
      await saveProfile(db, req.user!.id, updated);
      res.json({ profile: updated, extractedCharacters: input.text.length, extractedSkills: extractSkillsFromText(input.text) });
    }),
  );

  protectedRouter.post(
    '/resume/analyze',
    asyncHandler(async (req, res) => {
      const input = validate(resumeAnalysisSchema, req.body);
      const profile = await getProfile(db, req.user!.id);
      const job = input.jobId ? await getJobForCandidate(db, req.user!.id, profile, input.jobId) : null;
      if (input.jobId && !job) throw new AppError(404, 'job_not_found', 'The selected job was not found.');
      res.json(analyzeResume(profile, input.resumeText || profile.resumeText, job));
    }),
  );

  protectedRouter.get(
    '/settings',
    asyncHandler(async (req, res) => {
      res.json(await getSettings(db, req.user!.id));
    }),
  );

  protectedRouter.put(
    '/settings',
    asyncHandler(async (req, res) => {
      const input = validate(settingsSchema, req.body);
      const current = await getSettings(db, req.user!.id);
      const merged: UserSettings = { ...current, ...input };
      await saveSettings(db, req.user!.id, merged);
      res.json(merged);
    }),
  );

  protectedRouter.get(
    '/jobs',
    asyncHandler(async (req, res) => {
      const profile = await getProfile(db, req.user!.id);
      const page = await listJobs(db, req.user!.id, profile, {
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        location: typeof req.query.location === 'string' ? req.query.location : undefined,
        sources: parseCsv(req.query.sources),
        workplaceTypes: parseCsv(req.query.workplaceTypes),
        employmentTypes: parseCsv(req.query.employmentTypes),
        minMatch: req.query.minMatch ? Number(req.query.minMatch) : undefined,
        minSalary: req.query.minSalary ? Number(req.query.minSalary) : undefined,
        currency: typeof req.query.currency === 'string' ? req.query.currency : undefined,
        savedOnly: req.query.savedOnly === 'true' || req.query.savedOnly === '1',
        deadlineStatus: parseCsv(req.query.deadlineStatus),
        sort: (req.query.sort as 'match' | 'newest' | 'deadline' | 'salary' | undefined) || 'match',
        page: req.query.page ? Number(req.query.page) : 1,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : 20,
      });
      res.json(page);
    }),
  );

  protectedRouter.get(
    '/jobs/:id',
    asyncHandler(async (req, res) => {
      const profile = await getProfile(db, req.user!.id);
      const job = await getJobForCandidate(db, req.user!.id, profile, String(req.params.id));
      if (!job) throw new AppError(404, 'job_not_found', 'This job does not exist.');
      res.json(job);
    }),
  );

  protectedRouter.post(
    '/jobs/:id/save',
    asyncHandler(async (req, res) => {
      const job = await db.query('SELECT id FROM jobs WHERE id = $1', [String(req.params.id)]);
      if (job.rows.length === 0) throw new AppError(404, 'job_not_found', 'This job does not exist.');
      await db
        .query('INSERT INTO saved_jobs (candidate_id, job_id, saved_at) VALUES ($1,$2,$3)', [
          req.user!.id,
          String(req.params.id),
          new Date().toISOString(),
        ])
        .catch(() => undefined);
      res.json({ saved: true });
    }),
  );

  protectedRouter.delete(
    '/jobs/:id/save',
    asyncHandler(async (req, res) => {
      await db.query('DELETE FROM saved_jobs WHERE candidate_id = $1 AND job_id = $2', [req.user!.id, String(req.params.id)]);
      res.json({ saved: false });
    }),
  );

  protectedRouter.post(
    '/jobs/manual',
    asyncHandler(async (req, res) => {
      const input = validate(manualJobSchema, req.body);
      const job = await createManualJob(db, {
        title: input.title,
        company: input.company,
        companyDomain: input.companyDomain || null,
        location: input.location,
        workplaceType: input.workplaceType,
        employmentType: input.employmentType,
        applyUrl: input.applyUrl,
        description: input.description,
        deadlineDate: input.deadlineDate || null,
        salary: input.salary || null,
        skills: input.skills,
      });
      res.status(201).json(job);
    }),
  );

  protectedRouter.get(
    '/discovery/sources',
    asyncHandler(async (_req, res) => {
      res.json({ sources: await getSourceStatus(db), snapshotRetrievedAt: SNAPSHOT_RETRIEVED_AT });
    }),
  );

  protectedRouter.post(
    '/discovery/run',
    asyncHandler(async (req, res) => {
      const result = await discoverJobs(db);
      const settings = await getSettings(db, req.user!.id);
      if (settings.notifyMatches) {
        const profile = await getProfile(db, req.user!.id);
        const page = await listJobs(db, req.user!.id, profile, { minMatch: settings.matchThreshold, pageSize: 5, sort: 'match' });
        if (page.items.length > 0) {
          await db
            .query(
              `INSERT INTO notifications (id, user_id, title, message, type, job_id, read, dedupe_key, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8)`,
              [
                `notif-${Date.now()}-discovery`,
                req.user!.id,
                `${page.items.length} relevant match(es) available`,
                `Discovery completed. Top match: ${page.items[0].title} at ${page.items[0].company} (${page.items[0].match?.overall || 0}%).`,
                'match',
                page.items[0].id,
                `discovery-match-${new Date().toISOString().slice(0, 10)}`,
                new Date().toISOString(),
              ],
            )
            .catch(() => undefined);
        }
      }
      res.json(result);
    }),
  );

  protectedRouter.post(
    '/skills/gap',
    asyncHandler(async (req, res) => {
      const input = validate(gapSchema, req.body);
      const profile = await getProfile(db, req.user!.id);
      const role = targetRoleFor(profile, input.targetRole);
      res.json(await buildGapFor(db, req.user!.id, profile, role, input.jobIds, input.limit));
    }),
  );

  protectedRouter.get(
    '/skills/gap/latest',
    asyncHandler(async (req, res) => {
      const result = await db.query<{ result: string }>(
        'SELECT result FROM skill_gap_analyses WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 1',
        [req.user!.id],
      );
      res.json(result.rows[0] ? JSON.parse(result.rows[0].result) : null);
    }),
  );

  protectedRouter.get(
    '/companies',
    asyncHandler(async (_req, res) => {
      res.json({ items: await listCompanies(db) });
    }),
  );

  protectedRouter.post(
    '/companies/research',
    asyncHandler(async (req, res) => {
      const input = validate(companyResearchSchema, req.body);
      const research: CompanyResearch = await researchCompany(db, input.company, { websiteInput: input.website || null });
      res.json(research);
    }),
  );

  protectedRouter.patch(
    '/jobs/:id/deadline',
    asyncHandler(async (req, res) => {
      const input = validate(deadlineSchema, req.body);
      const job = await db.query('SELECT id FROM jobs WHERE id = $1', [String(req.params.id)]);
      if (job.rows.length === 0) throw new AppError(404, 'job_not_found', 'This job does not exist.');
      const stored = input.date
        ? JSON.stringify({
            date: input.date,
            sourceSnippet: input.note?.trim() || 'Deadline verified manually by the candidate on the employer page.',
            confidence: 'verified',
            verifiedAt: new Date().toISOString(),
          })
        : null;
      await db.query('UPDATE jobs SET deadline = $2, updated_at = $3 WHERE id = $1', [
        String(req.params.id),
        stored,
        new Date().toISOString(),
      ]);
      const profile = await getProfile(db, req.user!.id);
      const updated = await getJobForCandidate(db, req.user!.id, profile, String(req.params.id));
      res.json(updated);
    }),
  );

  protectedRouter.post(
    '/jobs/:id/authenticity',
    asyncHandler(async (req, res) => {
      const profile = await getProfile(db, req.user!.id);
      const job = await getJobForCandidate(db, req.user!.id, profile, String(req.params.id));
      if (!job) throw new AppError(404, 'job_not_found', 'This job does not exist.');
      res.json(await runAuthenticityCheck(db, job));
    }),
  );

  protectedRouter.get(
    '/jobs/:id/authenticity',
    asyncHandler(async (req, res) => {
      const result = await db.query<{ result: string }>(
        'SELECT result FROM authenticity_checks WHERE job_id = $1 ORDER BY checked_at DESC LIMIT 1',
        [String(req.params.id)],
      );
      res.json(result.rows[0] ? JSON.parse(result.rows[0].result) : null);
    }),
  );

  protectedRouter.post(
    '/jobs/:id/duplicates',
    asyncHandler(async (req, res) => {
      const profile = await getProfile(db, req.user!.id);
      const job = await getJobForCandidate(db, req.user!.id, profile, String(req.params.id));
      if (!job) throw new AppError(404, 'job_not_found', 'This job does not exist.');
      const requestedUrl = typeof req.body?.requestedUrl === 'string' ? req.body.requestedUrl : undefined;
      res.json(await checkDuplicates(db, req.user!.id, job, requestedUrl));
    }),
  );

  protectedRouter.get(
    '/applications',
    asyncHandler(async (req, res) => {
      res.json({ items: await listApplications(db, req.user!.id) });
    }),
  );

  protectedRouter.post(
    '/applications/prepare',
    asyncHandler(async (req, res) => {
      const input = validate(prepareAppSchema, req.body);
      const profile = await getProfile(db, req.user!.id);
      const result = await prepareApplication(db, req.user!.id, profile, {
        ...input,
        idempotencyKey: req.get('idempotency-key') || undefined,
      });
      res.status(201).json(result);
    }),
  );

  protectedRouter.get(
    '/applications/:id',
    asyncHandler(async (req, res) => {
      res.json(await getApplication(db, req.user!.id, String(req.params.id)));
    }),
  );

  protectedRouter.post(
    '/applications/:id/approve',
    asyncHandler(async (req, res) => {
      res.json(await approveApplication(db, req.user!.id, String(req.params.id)));
    }),
  );

  protectedRouter.post(
    '/applications/:id/submit',
    asyncHandler(async (req, res) => {
      const input = validate(submissionSchema, req.body);
      res.json(await recordSubmission(db, req.user!.id, String(req.params.id), input));
    }),
  );

  protectedRouter.patch(
    '/applications/:id/status',
    asyncHandler(async (req, res) => {
      const input = validate(statusSchema, req.body);
      res.json(
        await updateApplicationStatus(
          db,
          req.user!.id,
          String(req.params.id),
          input.status as ApplicationStatus,
          input.note,
        ),
      );
    }),
  );

  protectedRouter.patch(
    '/applications/:id/notes',
    asyncHandler(async (req, res) => {
      const input = validate(z.object({ notes: z.string().max(4000) }), req.body);
      res.json(await updateApplicationNotes(db, req.user!.id, String(req.params.id), input.notes));
    }),
  );

  protectedRouter.get(
    '/interviews',
    asyncHandler(async (req, res) => {
      const result = await db.query<InterviewRow>(
        'SELECT * FROM interview_sessions WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 100',
        [req.user!.id],
      );
      res.json({ items: result.rows.map(mapInterviewRow) });
    }),
  );

  protectedRouter.post(
    '/interviews',
    asyncHandler(async (req, res) => {
      const input = validate(interviewCreateSchema, req.body);
      const profile = await getProfile(db, req.user!.id);
      const job = input.jobId ? await getJobForCandidate(db, req.user!.id, profile, input.jobId) : null;
      if (input.jobId && !job) throw new AppError(404, 'job_not_found', 'The selected job was not found.');
      const role = targetRoleFor(profile, input.targetRole || job?.title);
      const session = generateInterviewSession(profile, job, role, input.difficulty);
      await db.query(
        `INSERT INTO interview_sessions
         (id, candidate_id, role, company, difficulty, questions, answers, status, score, confidence_average, created_at, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          session.id,
          req.user!.id,
          session.role,
          session.company,
          session.difficulty,
          JSON.stringify(session.questions),
          JSON.stringify(session.answers),
          session.status,
          null,
          null,
          session.createdAt,
          null,
        ],
      );
      res.status(201).json(session);
    }),
  );

  protectedRouter.get(
    '/interviews/:id',
    asyncHandler(async (req, res) => {
      const result = await db.query<InterviewRow>(
        'SELECT * FROM interview_sessions WHERE id = $1 AND candidate_id = $2',
        [String(req.params.id), req.user!.id],
      );
      if (result.rows.length === 0) throw new AppError(404, 'interview_not_found', 'This interview session does not exist.');
      res.json(mapInterviewRow(result.rows[0]));
    }),
  );

  protectedRouter.post(
    '/interviews/:id/answers',
    asyncHandler(async (req, res) => {
      const input = validate(answerSchema, req.body);
      const result = await db.query<InterviewRow>(
        'SELECT * FROM interview_sessions WHERE id = $1 AND candidate_id = $2',
        [String(req.params.id), req.user!.id],
      );
      if (result.rows.length === 0) throw new AppError(404, 'interview_not_found', 'This interview session does not exist.');
      const session = mapInterviewRow(result.rows[0]);
      if (session.status === 'Completed') throw new AppError(409, 'interview_completed', 'This interview session is already completed.');
      const question = session.questions.find((item) => item.id === input.questionId);
      if (!question) throw new AppError(404, 'question_not_found', 'This question does not belong to the session.');
      const evaluation = evaluateInterviewAnswer(question, input.answer, input.confidence);
      session.answers[question.id] = { answer: input.answer, confidence: input.confidence, evaluation };
      const summary = summarizeInterview(session);
      await db.query('UPDATE interview_sessions SET answers = $2, score = $3, confidence_average = $4 WHERE id = $1', [
        session.id,
        JSON.stringify(session.answers),
        summary.score,
        summary.confidenceAverage,
      ]);
      res.json({ session: { ...session, score: summary.score, confidenceAverage: summary.confidenceAverage }, evaluation, summary });
    }),
  );

  protectedRouter.post(
    '/interviews/:id/complete',
    asyncHandler(async (req, res) => {
      const result = await db.query<InterviewRow>(
        'SELECT * FROM interview_sessions WHERE id = $1 AND candidate_id = $2',
        [String(req.params.id), req.user!.id],
      );
      if (result.rows.length === 0) throw new AppError(404, 'interview_not_found', 'This interview session does not exist.');
      const session = mapInterviewRow(result.rows[0]);
      if (Object.keys(session.answers).length === 0) {
        throw new AppError(400, 'no_answers', 'Answer at least one question before generating a report.');
      }
      const summary = summarizeInterview(session);
      const completedAt = new Date().toISOString();
      await db.query(
        "UPDATE interview_sessions SET status = 'Completed', score = $2, confidence_average = $3, completed_at = $4 WHERE id = $1",
        [session.id, summary.score, summary.confidenceAverage, completedAt],
      );
      res.json({
        session: { ...session, status: 'Completed', score: summary.score, confidenceAverage: summary.confidenceAverage, completedAt },
        report: summary,
      });
    }),
  );

  protectedRouter.get(
    '/roadmaps',
    asyncHandler(async (req, res) => {
      const result = await db.query<{ id: string; plan: string; created_at: string; updated_at: string }>(
        'SELECT id, plan, created_at, updated_at FROM roadmaps WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 50',
        [req.user!.id],
      );
      res.json({ items: result.rows.map((row) => JSON.parse(row.plan)) });
    }),
  );

  protectedRouter.post(
    '/roadmaps',
    asyncHandler(async (req, res) => {
      const input = validate(roadmapSchema, req.body);
      const profile = await getProfile(db, req.user!.id);
      const role = targetRoleFor(profile, input.targetRole);
      const gap = await buildGapFor(db, req.user!.id, profile, role);
      const roadmap = generateRoadmap(role, gap, {
        weeklyHours: input.weeklyHours,
        experienceLevel: input.experienceLevel,
      });
      await db.query(
        'INSERT INTO roadmaps (id, candidate_id, target_role, plan, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6)',
        [roadmap.id, req.user!.id, roadmap.targetRole, JSON.stringify(roadmap), roadmap.createdAt, roadmap.updatedAt],
      );
      res.status(201).json(roadmap);
    }),
  );

  protectedRouter.get(
    '/roadmaps/:id',
    asyncHandler(async (req, res) => {
      const result = await db.query<{ plan: string }>('SELECT plan FROM roadmaps WHERE id = $1 AND candidate_id = $2', [
        String(req.params.id),
        req.user!.id,
      ]);
      if (result.rows.length === 0) throw new AppError(404, 'roadmap_not_found', 'This roadmap does not exist.');
      res.json(JSON.parse(result.rows[0].plan));
    }),
  );

  protectedRouter.patch(
    '/roadmaps/:id/milestones/:key',
    asyncHandler(async (req, res) => {
      const input = validate(z.object({ completed: z.boolean() }), req.body);
      const result = await db.query<{ plan: string }>('SELECT plan FROM roadmaps WHERE id = $1 AND candidate_id = $2', [
        String(req.params.id),
        req.user!.id,
      ]);
      if (result.rows.length === 0) throw new AppError(404, 'roadmap_not_found', 'This roadmap does not exist.');
      const plan = JSON.parse(result.rows[0].plan) as { milestones: RoadmapMilestone[]; progress: number; updatedAt: string };
      const milestone = plan.milestones.find((item) => item.key === String(req.params.key));
      if (!milestone) throw new AppError(404, 'milestone_not_found', 'This milestone does not exist in the roadmap.');
      milestone.completed = input.completed;
      milestone.completedAt = input.completed ? new Date().toISOString() : null;
      plan.progress = Math.round((plan.milestones.filter((item) => item.completed).length / plan.milestones.length) * 100);
      plan.updatedAt = new Date().toISOString();
      await db.query('UPDATE roadmaps SET plan = $2, updated_at = $3 WHERE id = $1', [String(req.params.id), JSON.stringify(plan), plan.updatedAt]);
      if (input.completed) {
        await db
          .query('INSERT INTO roadmap_progress (roadmap_id, milestone_key, completed_at) VALUES ($1,$2,$3)', [
            String(req.params.id),
            milestone.key,
            milestone.completedAt,
          ])
          .catch(() => undefined);
      } else {
        await db.query('DELETE FROM roadmap_progress WHERE roadmap_id = $1 AND milestone_key = $2', [
          String(req.params.id),
          milestone.key,
        ]);
      }
      res.json(plan);
    }),
  );

  protectedRouter.get(
    '/deadlines',
    asyncHandler(async (req, res) => {
      const profile = await getProfile(db, req.user!.id);
      res.json(await buildDeadlineBoard(db, req.user!.id, profile, { includeAll: req.query.includeAll === '1' || req.query.includeAll === 'true' }));
    }),
  );

  protectedRouter.post(
    '/deadlines/scan',
    asyncHandler(async (req, res) => {
      res.json(await scanDeadlines(db, req.user!.id));
    }),
  );

  protectedRouter.get(
    '/salaries',
    asyncHandler(async (req, res) => {
      res.json(
        await buildSalaryIntelligence(db, {
          currency: typeof req.query.currency === 'string' ? req.query.currency.toUpperCase() : undefined,
          location: typeof req.query.location === 'string' ? req.query.location : undefined,
          role: typeof req.query.role === 'string' ? req.query.role : undefined,
          minExperience: req.query.minExperience ? Number(req.query.minExperience) : undefined,
          maxExperience: req.query.maxExperience ? Number(req.query.maxExperience) : undefined,
        }),
      );
    }),
  );

  protectedRouter.get(
    '/github/latest',
    asyncHandler(async (req, res) => {
      const result = await db.query<{ result: string; analyzed_at: string }>(
        'SELECT result, analyzed_at FROM github_analyses WHERE candidate_id = $1 ORDER BY analyzed_at DESC LIMIT 1',
        [req.user!.id],
      );
      res.json(result.rows[0] ? JSON.parse(result.rows[0].result) : null);
    }),
  );

  protectedRouter.post(
    '/github/analyze',
    asyncHandler(async (req, res) => {
      const input = validate(githubSchema, req.body);
      const profile = await getProfile(db, req.user!.id);
      const username = input.username?.trim() || profile.githubUsername || '';
      if (!username) throw new AppError(400, 'github_username_required', 'Add a GitHub username to your profile or enter one explicitly.');
      const jobs = input.jobIds?.length
        ? (await Promise.all(input.jobIds.map((id) => getJobForCandidate(db, req.user!.id, profile, id)))).filter(
            (job): job is NonNullable<typeof job> => Boolean(job),
          )
        : (await listJobs(db, req.user!.id, profile, { pageSize: 10, sort: 'match' })).items;
      const analysis = await analyzeGitHubPortfolio(db, req.user!.id, profile, username, jobs);
      if (profile.githubUsername !== analysis.username) {
        await saveProfile(db, req.user!.id, { ...profile, githubUsername: analysis.username });
      }
      res.json(analysis);
    }),
  );

  protectedRouter.get(
    '/analytics',
    asyncHandler(async (req, res) => {
      const profile = await getProfile(db, req.user!.id);
      res.json(await buildAnalytics(db, req.user!.id, profile, req.query.days ? Number(req.query.days) : 90));
    }),
  );

  protectedRouter.get(
    '/notifications',
    asyncHandler(async (req, res) => {
      const query = notificationQuerySchema.parse(req.query);
      const items = await listNotifications(db, req.user!.id);
      res.json({ items: items.slice(0, query.limit), unread: items.filter((item) => !item.read).length });
    }),
  );

  protectedRouter.patch(
    '/notifications/:id/read',
    asyncHandler(async (req, res) => {
      await markNotificationRead(db, req.user!.id, String(req.params.id));
      res.json({ ok: true });
    }),
  );

  protectedRouter.post(
    '/notifications/read-all',
    asyncHandler(async (req, res) => {
      await markAllNotificationsRead(db, req.user!.id);
      res.json({ ok: true });
    }),
  );

  protectedRouter.delete(
    '/notifications/:id',
    asyncHandler(async (req, res) => {
      await deleteNotification(db, req.user!.id, String(req.params.id));
      res.json({ ok: true });
    }),
  );

  protectedRouter.get('/integrations', (_req, res) => {
    res.json({
      integrations: integrationStatuses(),
      llmConfigured: llmConfigured(),
      demoMode: config.demoMode,
      database: db.kind,
      scheduler: config.discovery,
    });
  });

  router.post(
    '/internal/cron',
    asyncHandler(async (req, res) => {
      if (!config.cronSecret) throw new AppError(404, 'not_found', 'The requested API route does not exist.');
      const header = req.get('authorization') || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : req.get('x-cron-secret') || '';
      if (token !== config.cronSecret) throw new AppError(401, 'invalid_cron_secret', 'Cron secret is invalid.');
      const discovery = await discoverJobs(db);
      const users = await db.query<{ id: string }>('SELECT id FROM users');
      let notificationsCreated = 0;
      for (const user of users.rows) {
        const scan = await scanDeadlines(db, user.id);
        notificationsCreated += scan.notificationsCreated;
      }
      res.json({ discovery, usersScanned: users.rows.length, notificationsCreated, finishedAt: new Date().toISOString() });
    }),
  );

  router.use(protectedRouter);
  router.use(notFound);
  app.use('/api/v1', router);
  app.use('/api', notFound);

  const webDist = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(path.join(webDist, 'index.html'))) {
    app.use(express.static(webDist, { index: false, maxAge: config.isProduction ? '1h' : 0 }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || !(req.get('accept') || '').includes('text/html')) return next();
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}

export async function createInitializedApp(): Promise<express.Express> {
  const db = await createDatabase();
  await seedDemoData(db);
  return createApp(db);
}


