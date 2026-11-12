import type { EmploymentType, JobPosting, SalaryRange, SourcePortal, WorkplaceType } from '../../../shared/types.js';
import { config } from '../config.js';
import type { Database } from '../db/index.js';
import { logger } from '../logger.js';
import {
  extractDeadlineFromText,
  extractSalaryFromDescription,
  inferExperienceRange,
  nowIso,
  parseSalaryText,
} from '../utils/dates.js';
import { fingerprint, normalizeUrl, unique } from '../utils/normalize.js';
import { mapJobRow } from './jobRepository.js';
import { extractSkillsFromText } from './matchEngine.js';

interface IngestJob {
  source: SourcePortal;
  sourceJobId: string;
  sourceName: string;
  title: string;
  company: string;
  companyDomain: string | null;
  location: string;
  workplaceType: WorkplaceType;
  employmentType: EmploymentType;
  experienceMin: number | null;
  experienceMax: number | null;
  salary: SalaryRange | null;
  skills: string[];
  description: string;
  applyUrl: string;
  postedAt: string | null;
  deadlineDate: string | null;
  deadlineSnippet: string | null;
}

export interface DiscoverySourceRun {
  source: string;
  status: 'success' | 'partial' | 'error';
  discovered: number;
  inserted: number;
  updated: number;
  message: string | null;
  startedAt: string;
  finishedAt: string;
}

export interface DiscoveryResult {
  runs: DiscoverySourceRun[];
  totalDiscovered: number;
  totalInserted: number;
  totalUpdated: number;
}

const COMPANY_INFO: Record<string, { name: string; domain: string | null; careersUrl: string }> = {
  gitlab: { name: 'GitLab', domain: 'gitlab.com', careersUrl: 'https://about.gitlab.com/jobs/' },
  elastic: { name: 'Elastic', domain: 'elastic.co', careersUrl: 'https://jobs.elastic.co/' },
  mongodb: { name: 'MongoDB', domain: 'mongodb.com', careersUrl: 'https://www.mongodb.com/careers' },
  datadog: { name: 'Datadog', domain: 'datadoghq.com', careersUrl: 'https://careers.datadoghq.com/' },
  databricks: { name: 'Databricks', domain: 'databricks.com', careersUrl: 'https://www.databricks.com/company/careers' },
  groww: { name: 'Groww', domain: 'groww.in', careersUrl: 'https://groww.in/careers' },
  vercel: { name: 'Vercel', domain: 'vercel.com', careersUrl: 'https://vercel.com/careers' },
  figma: { name: 'Figma', domain: 'figma.com', careersUrl: 'https://www.figma.com/careers/' },
  discord: { name: 'Discord', domain: 'discord.com', careersUrl: 'https://discord.com/careers' },
  stripe: { name: 'Stripe', domain: 'stripe.com', careersUrl: 'https://stripe.com/jobs' },
  cred: { name: 'CRED', domain: 'cred.club', careersUrl: 'https://careers.cred.club/' },
};

const DEFAULT_GREENHOUSE_BOARDS = (process.env.GREENHOUSE_BOARDS || 'gitlab,elastic,mongodb,datadog,databricks,groww,vercel,figma,discord,stripe')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const DEFAULT_LEVER_COMPANIES = (process.env.LEVER_COMPANIES || 'cred').split(',').map((item) => item.trim()).filter(Boolean);
const REMOTIVE_QUERIES = (process.env.REMOTIVE_QUERIES || 'software,react,python,data,security,devops,machine learning')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const TECH_TITLE =
  /(engineer|developer|software|data|python|react|node|full.?stack|machine learning|\bml\b|\bai\b|cyber|security|devops|cloud|backend|frontend|architect|scientist|analyst|\bsre\b|platform|technical|automation|agentic)/i;

const INDIA = /india|chennai|tamil nadu|coimbatore|madurai|tiruchirappalli|salem|bengaluru|bangalore|hyderabad|pune|mumbai|gurugram|gurgaon|noida|delhi/i;

export function cleanHtml(html: string): string {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferEmploymentType(raw: string): EmploymentType {
  const value = raw.toLowerCase();
  if (/intern/.test(value)) return 'Internship';
  if (/part.?time/.test(value)) return 'Part-time';
  if (/contract|freelance|temporary/.test(value)) return 'Contract';
  if (/full.?time|full_time/.test(value)) return 'Full-time';
  return 'Unknown';
}

function inferWorkplace(location: string, remoteFlag?: boolean): WorkplaceType {
  if (remoteFlag) return 'Remote';
  if (/remote|worldwide|anywhere/i.test(location)) return 'Remote';
  if (/hybrid/i.test(location)) return 'Hybrid';
  if (location.trim()) return 'On-site';
  return 'Unknown';
}

function sourceDeadline(description: string): { date: string | null; snippet: string | null } {
  const parsed = extractDeadlineFromText(description);
  return { date: parsed.date, snippet: parsed.snippet };
}

export function buildIngestJob(input: {
  source: SourcePortal;
  sourceJobId: string;
  sourceName: string;
  title: string;
  company: string;
  companyDomain: string | null;
  location: string;
  workplaceType: WorkplaceType;
  employmentType: EmploymentType;
  description: string;
  applyUrl: string;
  postedAt: string | null;
  salary?: SalaryRange | null;
  tags?: string[];
}): IngestJob {
  const description = cleanHtml(input.description).slice(0, 16000);
  const skillText = `${input.title} ${input.description} ${(input.tags || []).join(' ')}`;
  const skills = unique([...(input.tags || []), ...extractSkillsFromText(skillText)])
    .filter((skill) => skill.length > 0)
    .slice(0, 20);
  const experience = inferExperienceRange(`${input.title} ${description}`);
  const salary = input.salary || extractSalaryFromDescription(description);
  const deadline = sourceDeadline(description);
  return {
    ...input,
    description,
    skills,
    experienceMin: experience.min,
    experienceMax: experience.max,
    salary,
    deadlineDate: deadline.date,
    deadlineSnippet: deadline.snippet,
  };
}

async function ingestJob(db: Database, job: IngestJob): Promise<'inserted' | 'updated'> {
  const fp = fingerprint(job.source, job.sourceJobId);
  const existing = await db.query<{ id: string }>('SELECT id FROM jobs WHERE fingerprint = $1', [fp]);
  const now = nowIso();
  const normalized = normalizeUrl(job.applyUrl);
  const deadline = job.deadlineDate
    ? JSON.stringify({
        date: job.deadlineDate,
        sourceSnippet: job.deadlineSnippet,
        confidence: 'extracted',
      })
    : null;

  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE jobs SET title = $2, company = $3, company_domain = $4, location = $5, workplace_type = $6,
       employment_type = $7, experience_min = $8, experience_max = $9, salary = $10, skills = $11,
       description = $12, apply_url = $13, normalized_apply_url = $14, source_name = $15, retrieved_at = $16,
       posted_at = $17, deadline = $18, updated_at = $19 WHERE fingerprint = $1`,
      [
        fp,
        job.title,
        job.company,
        job.companyDomain,
        job.location,
        job.workplaceType,
        job.employmentType,
        job.experienceMin,
        job.experienceMax,
        job.salary ? JSON.stringify(job.salary) : null,
        JSON.stringify(job.skills),
        job.description,
        job.applyUrl,
        normalized,
        job.sourceName,
        now,
        job.postedAt,
        deadline,
        now,
      ],
    );
    return 'updated';
  }

  const id = `${job.source}-${job.sourceJobId}`.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  await db.query(
    `INSERT INTO jobs (
      id, fingerprint, title, company, company_domain, location, workplace_type, employment_type,
      experience_min, experience_max, salary, skills, description, apply_url, normalized_apply_url,
      source, source_job_id, source_name, retrieved_at, posted_at, deadline, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
    [
      id,
      fp,
      job.title,
      job.company,
      job.companyDomain,
      job.location,
      job.workplaceType,
      job.employmentType,
      job.experienceMin,
      job.experienceMax,
      job.salary ? JSON.stringify(job.salary) : null,
      JSON.stringify(job.skills),
      job.description,
      job.applyUrl,
      normalized,
      job.source,
      job.sourceJobId,
      job.sourceName,
      now,
      job.postedAt,
      deadline,
      now,
      now,
    ],
  );
  return 'inserted';
}

async function recordRun(db: Database, run: DiscoverySourceRun): Promise<void> {
  await db.query(
    `INSERT INTO discovery_runs (id, source, status, discovered, inserted, message, started_at, finished_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      `${run.source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      run.source,
      run.status,
      run.discovered,
      run.inserted,
      run.message,
      run.startedAt,
      run.finishedAt,
    ],
  ).catch(() => undefined);
}

async function discoverRemotive(db: Database): Promise<DiscoverySourceRun> {
  const startedAt = nowIso();
  const seen = new Set<string>();
  const jobs: IngestJob[] = [];
  const errors: string[] = [];
  for (const query of REMOTIVE_QUERIES.slice(0, 5)) {
    try {
      const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=30`, {
        headers: { Accept: 'application/json', 'User-Agent': 'AI-Job-Hunter/2.0 (open-source research tool)' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        jobs: Array<{
          id: number;
          url: string;
          title: string;
          company_name: string;
          candidate_required_location: string;
          job_type: string;
          publication_date: string;
          salary?: string;
          tags?: string[];
          description?: string;
        }>;
      };
      for (const raw of data.jobs || []) {
        if (!raw.id || seen.has(String(raw.id))) continue;
        if (!TECH_TITLE.test(raw.title || '')) continue;
        seen.add(String(raw.id));
        const salary = raw.salary ? parseSalaryText(raw.salary) || extractSalaryFromDescription(raw.salary) : null;
        jobs.push(
          buildIngestJob({
            source: 'remotive',
            sourceJobId: String(raw.id),
            sourceName: 'Remotive',
            title: raw.title,
            company: raw.company_name,
            companyDomain: null,
            location: raw.candidate_required_location || 'Remote',
            workplaceType: 'Remote',
            employmentType: inferEmploymentType(raw.job_type || ''),
            description: raw.description || '',
            applyUrl: raw.url,
            postedAt: raw.publication_date ? new Date(raw.publication_date).toISOString() : null,
            salary,
            tags: raw.tags || [],
          }),
        );
      }
    } catch (error) {
      errors.push(`“${query}”: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  let inserted = 0;
  let updated = 0;
  for (const job of jobs.slice(0, 60)) {
    try {
      const result = await ingestJob(db, job);
      if (result === 'inserted') inserted += 1;
      else updated += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'insert failed');
    }
  }
  const run: DiscoverySourceRun = {
    source: 'remotive',
    status: errors.length === 0 ? 'success' : jobs.length > 0 ? 'partial' : 'error',
    discovered: jobs.length,
    inserted,
    updated,
    message: errors.length ? errors.slice(0, 3).join('; ') : null,
    startedAt,
    finishedAt: nowIso(),
  };
  await recordRun(db, run);
  return run;
}

async function discoverGreenhouse(db: Database): Promise<DiscoverySourceRun> {
  const startedAt = nowIso();
  const jobs: IngestJob[] = [];
  const errors: string[] = [];
  for (const board of DEFAULT_GREENHOUSE_BOARDS) {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`, {
        headers: { Accept: 'application/json', 'User-Agent': 'AI-Job-Hunter/2.0' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        jobs: Array<{
          id: number;
          title: string;
          absolute_url: string;
          location?: { name?: string };
          content?: string;
          description?: string;
          updated_at?: string;
          metadata?: Array<{ name?: string; value?: unknown }>;
        }>;
      };
      const info = COMPANY_INFO[board] || { name: board, domain: null, careersUrl: '' };
      let accepted = 0;
      for (const raw of data.jobs || []) {
        if (!TECH_TITLE.test(raw.title || '')) continue;
        const location = raw.location?.name || '';
        const india = INDIA.test(location);
        const remote = /remote|worldwide|anywhere/i.test(location);
        if (!india && !remote) continue;
        if (accepted >= 35) break;
        accepted += 1;
        const placement = indianPlacement(location);
        const description = raw.content || raw.description || '';
        jobs.push(
          buildIngestJob({
            source: 'greenhouse',
            sourceJobId: String(raw.id),
            sourceName: `Greenhouse · ${info.name}`,
            title: raw.title.trim(),
            company: info.name,
            companyDomain: info.domain,
            location: location || 'Remote',
            workplaceType: placement,
            employmentType: inferEmploymentType(raw.title),
            description,
            applyUrl: raw.absolute_url,
            postedAt: raw.updated_at ? new Date(raw.updated_at).toISOString() : null,
            tags: [],
          }),
        );
      }
    } catch (error) {
      errors.push(`${board}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  let inserted = 0;
  let updated = 0;
  for (const job of jobs) {
    try {
      const result = await ingestJob(db, job);
      if (result === 'inserted') inserted += 1;
      else updated += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'insert failed');
    }
  }
  const run: DiscoverySourceRun = {
    source: 'greenhouse',
    status: errors.length === 0 ? 'success' : jobs.length > 0 ? 'partial' : 'error',
    discovered: jobs.length,
    inserted,
    updated,
    message: errors.length ? errors.slice(0, 3).join('; ') : null,
    startedAt,
    finishedAt: nowIso(),
  };
  await recordRun(db, run);
  return run;
}

function indianPlacement(location: string): WorkplaceType {
  if (/remote/i.test(location)) return 'Remote';
  if (/hybrid/i.test(location)) return 'Hybrid';
  if (INDIA.test(location)) return 'On-site';
  return inferWorkplace(location);
}

async function discoverLever(db: Database): Promise<DiscoverySourceRun> {
  const startedAt = nowIso();
  const jobs: IngestJob[] = [];
  const errors: string[] = [];
  for (const company of DEFAULT_LEVER_COMPANIES) {
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`, {
        headers: { Accept: 'application/json', 'User-Agent': 'AI-Job-Hunter/2.0' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Array<{
        id: string;
        text: string;
        hostedUrl: string;
        createdAt?: number;
        descriptionPlain?: string;
        description?: string;
        categories?: { location?: string; commitment?: string; team?: string };
        lists?: Array<{ text?: string; content?: string }>;
      }>;
      const info = COMPANY_INFO[company] || { name: company, domain: null, careersUrl: '' };
      for (const raw of data) {
        if (!TECH_TITLE.test(raw.text || '')) continue;
        const location = raw.categories?.location || '';
        if (!INDIA.test(location) && !/remote|worldwide|anywhere/i.test(location)) continue;
        const listContent = (raw.lists || []).map((list) => `${list.text || ''} ${cleanHtml(list.content || '')}`).join('\n');
        jobs.push(
          buildIngestJob({
            source: 'lever',
            sourceJobId: raw.id,
            sourceName: `Lever · ${info.name}`,
            title: raw.text,
            company: info.name,
            companyDomain: info.domain,
            location: location || 'Remote',
            workplaceType: indianPlacement(location),
            employmentType: inferEmploymentType(raw.categories?.commitment || ''),
            description: `${raw.descriptionPlain || raw.description || ''}\n${listContent}`,
            applyUrl: raw.hostedUrl,
            postedAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : null,
          }),
        );
      }
    } catch (error) {
      errors.push(`${company}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  let inserted = 0;
  let updated = 0;
  for (const job of jobs.slice(0, 80)) {
    try {
      const result = await ingestJob(db, job);
      if (result === 'inserted') inserted += 1;
      else updated += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'insert failed');
    }
  }
  const run: DiscoverySourceRun = {
    source: 'lever',
    status: errors.length === 0 ? 'success' : jobs.length > 0 ? 'partial' : 'error',
    discovered: jobs.length,
    inserted,
    updated,
    message: errors.length ? errors.slice(0, 3).join('; ') : null,
    startedAt,
    finishedAt: nowIso(),
  };
  await recordRun(db, run);
  return run;
}

export async function discoverJobs(db: Database): Promise<DiscoveryResult> {
  logger.info('discovery_started');
  const runs = await Promise.all([discoverRemotive(db), discoverGreenhouse(db), discoverLever(db)]);
  const result = {
    runs,
    totalDiscovered: runs.reduce((sum, run) => sum + run.discovered, 0),
    totalInserted: runs.reduce((sum, run) => sum + run.inserted, 0),
    totalUpdated: runs.reduce((sum, run) => sum + run.updated, 0),
  };
  logger.info('discovery_finished', result);
  return result;
}

export interface SourceStatus {
  source: string;
  label: string;
  url: string;
  status: string;
  lastRun: string | null;
  discovered: number;
  message: string | null;
}

export async function getSourceStatus(db: Database): Promise<SourceStatus[]> {
  const result = await db.query<{
    source: string;
    status: string;
    finished_at: string;
    discovered: number;
    message: string | null;
  }>('SELECT source, status, finished_at, discovered, message FROM discovery_runs ORDER BY finished_at DESC LIMIT 60');
  const map = new Map<string, (typeof result.rows)[number]>();
  for (const row of result.rows) if (!map.has(row.source)) map.set(row.source, row);
  const definitions = [
    { source: 'remotive', label: 'Remotive', url: 'https://remotive.com' },
    { source: 'greenhouse', label: 'Greenhouse public boards', url: 'https://developers.greenhouse.io/' },
    { source: 'lever', label: 'Lever public postings', url: 'https://api.lever.co/' },
    { source: 'manual', label: 'Manual verified entry', url: '' },
  ];
  return definitions.map((source) => {
    const last = map.get(source.source);
    return {
      ...source,
      status: last?.status || 'not-run',
      lastRun: last?.finished_at || null,
      discovered: last?.discovered || 0,
      message: last?.message || null,
    };
  });
}

export async function createManualJob(
  db: Database,
  input: {
    title: string;
    company: string;
    companyDomain: string | null;
    location: string;
    workplaceType: WorkplaceType;
    employmentType: EmploymentType;
    applyUrl: string;
    description: string;
    deadlineDate: string | null;
    salary: SalaryRange | null;
    skills: string[];
  },
): Promise<JobPosting> {
  const job = buildIngestJob({
    source: 'manual',
    sourceJobId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceName: 'Manual verified entry',
    title: input.title,
    company: input.company,
    companyDomain: input.companyDomain,
    location: input.location,
    workplaceType: input.workplaceType,
    employmentType: input.employmentType,
    description: input.description,
    applyUrl: input.applyUrl,
    postedAt: nowIso(),
    salary: input.salary,
    tags: input.skills,
  });
  if (input.deadlineDate) {
    job.deadlineDate = input.deadlineDate;
    job.deadlineSnippet = 'Deadline entered manually from the employer page.';
  }
  const result = await ingestJob(db, job);
  if (result === 'updated') throw new Error('A job with this source id already exists.');
  const row = await db.query('SELECT * FROM jobs WHERE fingerprint = $1', [fingerprint(job.source, job.sourceJobId)]);
  return mapJobRow(row.rows[0] as never);
}
