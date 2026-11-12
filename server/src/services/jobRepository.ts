import type {
  ApplicationStatus,
  AuthenticityResult,
  CandidateProfile,
  DeadlineInfo,
  JobPosting,
  SalaryRange,
  SourcePortal,
} from '../../../shared/types.js';
import type { Database } from '../db/index.js';
import { classifyDeadline, extractDeadlineFromText, extractSalaryFromDescription, inferExperienceRange } from '../utils/dates.js';
import { normalizeUrl } from '../utils/normalize.js';
import { evaluateJobMatch } from './matchEngine.js';

export interface JobRow {
  id: string;
  fingerprint: string;
  title: string;
  company: string;
  company_domain: string | null;
  location: string;
  workplace_type: string;
  employment_type: string;
  experience_min: number | null;
  experience_max: number | null;
  salary: string | null;
  skills: string;
  description: string;
  apply_url: string;
  normalized_apply_url: string;
  source: string;
  source_job_id: string;
  source_name: string;
  retrieved_at: string;
  posted_at: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobListFilters {
  q?: string;
  location?: string;
  sources?: string[];
  workplaceTypes?: string[];
  employmentTypes?: string[];
  minMatch?: number;
  minSalary?: number;
  currency?: string;
  savedOnly?: boolean;
  deadlineStatus?: string[];
  sort?: 'match' | 'newest' | 'deadline' | 'salary';
  page?: number;
  pageSize?: number;
}

function resolveDeadline(row: JobRow): DeadlineInfo {
  if (row.deadline) {
    try {
      const stored = JSON.parse(row.deadline) as Partial<DeadlineInfo> & { date?: string | null; confidence?: string };
      if (stored.date) {
        return classifyDeadline(
          stored.date,
          (stored.confidence as DeadlineInfo['confidence']) || 'verified',
          stored.sourceSnippet || null,
        );
      }
    } catch {
      // fall through to extraction
    }
  }
  const extracted = extractDeadlineFromText(row.description || '');
  return classifyDeadline(extracted.date, extracted.confidence, extracted.snippet);
}

function resolveSalary(row: JobRow): SalaryRange | null {
  if (row.salary) {
    try {
      return JSON.parse(row.salary) as SalaryRange;
    } catch {
      // ignore malformed stored data and try description extraction
    }
  }
  return extractSalaryFromDescription(row.description || '');
}

export function mapJobRow(
  row: JobRow,
  options: {
    profile?: CandidateProfile;
    saved?: boolean;
    application?: { id: string; status: ApplicationStatus } | null;
    authenticity?: AuthenticityResult | null;
    includeMatch?: boolean;
  } = {},
): JobPosting {
  const salary = resolveSalary(row);
  const experienceFromText = inferExperienceRange(`${row.title} ${row.description.slice(0, 4000)}`);
  const job: JobPosting = {
    id: row.id,
    title: row.title,
    company: row.company,
    companyDomain: row.company_domain,
    location: row.location,
    workplaceType: (row.workplace_type as JobPosting['workplaceType']) || 'Unknown',
    employmentType: (row.employment_type as JobPosting['employmentType']) || 'Unknown',
    experienceMin: row.experience_min ?? experienceFromText.min,
    experienceMax: row.experience_max ?? experienceFromText.max,
    salary,
    skills: JSON.parse(row.skills || '[]') as string[],
    description: row.description,
    applyUrl: row.apply_url,
    normalizedApplyUrl: row.normalized_apply_url || normalizeUrl(row.apply_url),
    source: row.source as SourcePortal,
    sourceJobId: row.source_job_id,
    sourceName: row.source_name,
    retrievedAt: row.retrieved_at,
    postedAt: row.posted_at,
    deadline: resolveDeadline(row),
    fingerprint: row.fingerprint,
    isSaved: options.saved || false,
    application: options.application || null,
    authenticity: options.authenticity || null,
    companyId: null,
  };
  if (options.includeMatch && options.profile) {
    job.match = evaluateJobMatch(options.profile, job);
  }
  return job;
}

export async function getJobRow(db: Database, jobId: string): Promise<JobRow | null> {
  const result = await db.query<JobRow>('SELECT * FROM jobs WHERE id = $1', [jobId]);
  return result.rows[0] || null;
}

export async function getJobForCandidate(
  db: Database,
  candidateId: string,
  profile: CandidateProfile,
  jobId: string,
): Promise<JobPosting | null> {
  const row = await getJobRow(db, jobId);
  if (!row) return null;
  const [saved, application, authenticity] = await Promise.all([
    db.query('SELECT job_id FROM saved_jobs WHERE candidate_id = $1 AND job_id = $2', [candidateId, jobId]),
    db.query<{ id: string; status: ApplicationStatus }>(
      'SELECT id, status FROM applications WHERE candidate_id = $1 AND job_id = $2',
      [candidateId, jobId],
    ),
    db.query<{ result: string }>(
      'SELECT result FROM authenticity_checks WHERE job_id = $1 ORDER BY checked_at DESC LIMIT 1',
      [jobId],
    ),
  ]);
  return mapJobRow(row, {
    profile,
    includeMatch: true,
    saved: saved.rows.length > 0,
    application: application.rows[0] || null,
    authenticity: authenticity.rows[0] ? (JSON.parse(authenticity.rows[0].result) as AuthenticityResult) : null,
  });
}

export async function listJobs(
  db: Database,
  candidateId: string,
  profile: CandidateProfile,
  filters: JobListFilters = {},
): Promise<{ items: JobPosting[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));

  const [rows, savedRows, applicationRows, authenticityRows] = await Promise.all([
    db.query<JobRow>('SELECT * FROM jobs ORDER BY retrieved_at DESC LIMIT 2000'),
    db.query<{ job_id: string }>('SELECT job_id FROM saved_jobs WHERE candidate_id = $1', [candidateId]),
    db.query<{ id: string; job_id: string; status: ApplicationStatus }>(
      'SELECT id, job_id, status FROM applications WHERE candidate_id = $1',
      [candidateId],
    ),
    db.query<{ job_id: string; result: string; checked_at: string }>(
      'SELECT job_id, result, checked_at FROM authenticity_checks ORDER BY checked_at DESC',
    ),
  ]);
  const saved = new Set(savedRows.rows.map((row) => row.job_id));
  const applications = new Map(applicationRows.rows.map((row) => [row.job_id, { id: row.id, status: row.status }]));
  const authenticity = new Map<string, AuthenticityResult>();
  for (const row of authenticityRows.rows) {
    if (!authenticity.has(row.job_id)) authenticity.set(row.job_id, JSON.parse(row.result) as AuthenticityResult);
  }

  let items = rows.rows.map((row) =>
    mapJobRow(row, {
      profile,
      includeMatch: true,
      saved: saved.has(row.id),
      application: applications.get(row.id) || null,
      authenticity: authenticity.get(row.id) || null,
    }),
  );

  const q = filters.q?.trim().toLowerCase();
  if (q) {
    items = items.filter((job) =>
      [job.title, job.company, job.location, job.description, ...job.skills].join(' ').toLowerCase().includes(q),
    );
  }
  if (filters.location?.trim()) {
    const location = filters.location.trim().toLowerCase();
    items = items.filter((job) => job.location.toLowerCase().includes(location) || (location === 'remote' && job.workplaceType === 'Remote'));
  }
  if (filters.sources?.length) items = items.filter((job) => filters.sources!.includes(job.source));
  if (filters.workplaceTypes?.length) {
    items = items.filter((job) => filters.workplaceTypes!.includes(job.workplaceType));
  }
  if (filters.employmentTypes?.length) {
    items = items.filter((job) => filters.employmentTypes!.includes(job.employmentType));
  }
  if (filters.savedOnly) items = items.filter((job) => job.isSaved);
  if (typeof filters.minMatch === 'number' && filters.minMatch > 0) {
    items = items.filter((job) => (job.match?.overall || 0) >= filters.minMatch!);
  }
  if (typeof filters.minSalary === 'number' && filters.minSalary > 0) {
    items = items.filter((job) => {
      if (!job.salary?.max) return false;
      if (filters.currency && job.salary.currency !== filters.currency) return false;
      return job.salary.max >= filters.minSalary!;
    });
  }
  if (filters.deadlineStatus?.length) {
    items = items.filter((job) => filters.deadlineStatus!.includes(job.deadline.status));
  }

  const sort = filters.sort || 'match';
  items.sort((a, b) => {
    if (sort === 'newest') return (b.postedAt || b.retrievedAt).localeCompare(a.postedAt || a.retrievedAt);
    if (sort === 'deadline') {
      const left = a.deadline.daysRemaining ?? Number.MAX_SAFE_INTEGER;
      const right = b.deadline.daysRemaining ?? Number.MAX_SAFE_INTEGER;
      return left - right;
    }
    if (sort === 'salary') return (b.salary?.max || 0) - (a.salary?.max || 0);
    return (b.match?.overall || 0) - (a.match?.overall || 0);
  });

  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize };
}

export async function checkApplicationRequirements(
  db: Database,
  candidateId: string,
  jobId: string,
): Promise<{ saved: boolean; application: { id: string; status: ApplicationStatus } | null }> {
  const [saved, application] = await Promise.all([
    db.query('SELECT job_id FROM saved_jobs WHERE candidate_id = $1 AND job_id = $2', [candidateId, jobId]),
    db.query<{ id: string; status: ApplicationStatus }>(
      'SELECT id, status FROM applications WHERE candidate_id = $1 AND job_id = $2',
      [candidateId, jobId],
    ),
  ]);
  return { saved: saved.rows.length > 0, application: application.rows[0] || null };
}
