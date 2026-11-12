import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import type { CandidateProfile, UserSettings } from '../../../shared/types.js';
import { config } from '../config.js';
import type { Database } from '../db/index.js';
import { logger } from '../logger.js';
import { normalizeUrl, fingerprint as makeFingerprint } from '../utils/normalize.js';

const DEMO_USER_ID = 'demo-user-0000000000000001';

const DEMO_PROFILE: CandidateProfile = {
  name: 'Demo Candidate',
  email: config.demoEmail,
  phone: '+91 90000 00000',
  location: 'Chennai, Tamil Nadu, India',
  headline: 'Full-Stack Developer (React, Python, PostgreSQL)',
  summary:
    'Early-career full-stack developer building web applications with React, TypeScript, FastAPI and PostgreSQL. ' +
    'This sample profile exists only to demonstrate matching; replace it with your own resume data.',
  skills: ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'FastAPI', 'PostgreSQL', 'Docker', 'Git', 'REST APIs'],
  experience: [
    {
      id: 'demo-exp-1',
      title: 'Software Engineering Intern',
      company: 'Sample Technologies (demo data)',
      duration: 'Jan 2025 - Jun 2025',
      description: 'Built React dashboards and FastAPI endpoints backed by PostgreSQL. Wrote automated tests with Vitest.',
    },
  ],
  education: [
    {
      id: 'demo-edu-1',
      degree: 'B.E. Computer Science and Engineering',
      institution: 'Sample Engineering College (demo data)',
      year: '2025',
    },
  ],
  projects: [
    {
      id: 'demo-project-1',
      title: 'Job Application Tracker',
      description: 'Full-stack application that tracks job applications with a React frontend and FastAPI/PostgreSQL API.',
      technologies: ['React', 'TypeScript', 'FastAPI', 'PostgreSQL', 'Docker'],
    },
  ],
  certifications: [],
  preferredRoles: ['Full Stack Developer', 'Frontend Developer', 'Backend Developer'],
  preferredLocations: ['Chennai', 'Bengaluru', 'Remote India'],
  workplacePreferences: ['Remote', 'Hybrid', 'On-site'],
  salaryExpectation: { min: 600000, currency: 'INR', period: 'year' },
  noticePeriodDays: 30,
  resumeText:
    'Demo Candidate. Full-Stack Developer. Skills: React, TypeScript, JavaScript, Node.js, Python, FastAPI, PostgreSQL, Docker, Git, REST APIs. ' +
    'Internship: built React dashboards and FastAPI endpoints backed by PostgreSQL. Project: Job Application Tracker.',
  resumeFileName: 'demo-candidate-resume.txt',
  resumeUpdatedAt: new Date().toISOString(),
  githubUsername: null,
  linkedinUrl: null,
  portfolioUrl: null,
};

const DEMO_SETTINGS: UserSettings = {
  theme: 'dark',
  notifyDeadlines: true,
  notifyMatches: true,
  matchThreshold: 60,
  weeklyDigest: true,
};

interface SeedJob {
  id: string;
  title: string;
  company: string;
  companyDomain: string | null;
  location: string;
  workplaceType: string;
  employmentType: string;
  experienceMin: number | null;
  experienceMax: number | null;
  salary: unknown;
  skills: string[];
  description: string;
  applyUrl: string;
  normalizedApplyUrl: string;
  source: string;
  sourceJobId: string;
  sourceName: string;
  retrievedAt: string;
  postedAt: string | null;
  deadline: unknown;
  fingerprint: string;
}

function loadSnapshot(): { retrievedAt: string; jobs: SeedJob[] } | null {
  const candidates = [
    fileURLToPath(new URL('./jobs-snapshot.json', import.meta.url)),
    fileURLToPath(new URL('../../src/seed/jobs-snapshot.json', import.meta.url)),
  ];
  for (const path of candidates) {
    try {
      return JSON.parse(fs.readFileSync(path, 'utf8'));
    } catch {
      // try next location
    }
  }
  return null;
}

export async function seedDemoData(db: Database): Promise<void> {
  if (!config.seedDemo) return;

  const existing = await db.query<{ id: string }>('SELECT id FROM users WHERE id = $1', [DEMO_USER_ID]);
  if (existing.rows.length === 0) {
    const passwordHash = await bcrypt.hash(config.demoPassword, config.bcryptRounds);
    await db.query(
      'INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [DEMO_USER_ID, config.demoEmail, passwordHash, 'Demo Candidate', 'candidate', new Date().toISOString()],
    );
    await db.query('INSERT INTO profiles (user_id, data, updated_at) VALUES ($1, $2, $3)', [
      DEMO_USER_ID,
      JSON.stringify(DEMO_PROFILE),
      new Date().toISOString(),
    ]);
    await db.query('INSERT INTO settings (user_id, data, updated_at) VALUES ($1, $2, $3)', [
      DEMO_USER_ID,
      JSON.stringify(DEMO_SETTINGS),
      new Date().toISOString(),
    ]);
    logger.info('demo_user_created', { email: config.demoEmail });
  }

  const snapshot = loadSnapshot();
  if (!snapshot) {
    logger.warn('seed_snapshot_missing', { message: 'No jobs snapshot found; discovery can be run from the UI.' });
    return;
  }

  let inserted = 0;
  const now = new Date().toISOString();
  for (const job of snapshot.jobs) {
    const fingerprint = job.fingerprint || makeFingerprint(job.source, job.sourceJobId);
    const found = await db.query('SELECT id FROM jobs WHERE fingerprint = $1', [fingerprint]);
    if (found.rows.length > 0) continue;
    const normalized = normalizeUrl(job.normalizedApplyUrl || job.applyUrl);
    await db.query(
      `INSERT INTO jobs (
        id, fingerprint, title, company, company_domain, location, workplace_type, employment_type,
        experience_min, experience_max, salary, skills, description, apply_url, normalized_apply_url,
        source, source_job_id, source_name, retrieved_at, posted_at, deadline, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
      [
        job.id,
        fingerprint,
        job.title,
        job.company,
        job.companyDomain || null,
        job.location,
        job.workplaceType || 'Unknown',
        job.employmentType || 'Unknown',
        job.experienceMin,
        job.experienceMax,
        job.salary ? JSON.stringify(job.salary) : null,
        JSON.stringify(job.skills || []),
        job.description || '',
        job.applyUrl,
        normalized,
        job.source,
        job.sourceJobId,
        job.sourceName,
        job.retrievedAt || snapshot.retrievedAt,
        job.postedAt,
        job.deadline ? JSON.stringify(job.deadline) : null,
        now,
        now,
      ],
    );
    inserted += 1;
  }

  if (inserted > 0) {
    const indiaJobs = await db.query<{ id: string }>(
      "SELECT id FROM jobs WHERE lower(location) LIKE '%india%' OR lower(location) LIKE '%chennai%' OR lower(location) LIKE '%bengaluru%' ORDER BY retrieved_at DESC LIMIT 4",
    );
    for (const job of indiaJobs.rows) {
      const saved = await db.query(
        'SELECT job_id FROM saved_jobs WHERE candidate_id = $1 AND job_id = $2',
        [DEMO_USER_ID, job.id],
      );
      if (saved.rows.length === 0) {
        await db.query('INSERT INTO saved_jobs (candidate_id, job_id, saved_at) VALUES ($1, $2, $3)', [
          DEMO_USER_ID,
          job.id,
          now,
        ]);
      }
    }
    await db.query(
      'INSERT INTO notifications (id, user_id, title, message, type, read, dedupe_key, created_at) VALUES ($1,$2,$3,$4,$5,0,$6,$7)',
      [
        'demo-welcome-notification',
        DEMO_USER_ID,
        'Welcome to AI Job Hunter 2.0',
        'The demo workspace includes a verified snapshot of public job postings. Run Discover to fetch fresh listings.',
        'system',
        'demo-welcome',
        now,
      ],
    ).catch(() => undefined);
  }

  logger.info('seed_complete', { inserted, snapshotRetrievedAt: snapshot.retrievedAt });
}

export const DEMO_ACCOUNT = { userId: DEMO_USER_ID, email: config.demoEmail, password: config.demoPassword };
