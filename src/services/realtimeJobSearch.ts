import type { Job, JobSource, CandidateProfile } from '../types';
import { sanitizeInput } from './inputSanitizer';

export interface LivePortalQuery {
  keywords: string;
  location: string;
  portals: JobSource[];
}

/** Detect if we are running on the deployed Vercel backend or local dev */
function getApiBase(): string {
  if (typeof window !== 'undefined') {
    // On Vercel or any HTTPS host the API lives at /api
    if (window.location.hostname !== 'localhost') return '/api';
    // During local dev — call the real APIs directly via the Vite dev server proxy
    return '/api';
  }
  return '/api';
}

/**
 * Fetch live jobs from the real backend proxy (/api/jobs/search).
 * Falls back to an empty array (not fake data) on any failure.
 */
export async function searchRealtimeJobs(
  profile: CandidateProfile,
  query: LivePortalQuery
): Promise<Job[]> {
  const roles      = profile.preferredRoles?.length > 0 ? profile.preferredRoles : [query.keywords || 'Software Engineer'];
  const topSkills  = profile.skills?.length > 0 ? profile.skills.slice(0, 5) : ['React', 'TypeScript', 'Python'];
  const location   = profile.location || query.location || 'Remote';
  const portals    = query.portals?.length > 0 ? query.portals : ['Remotive', 'Greenhouse', 'Lever'] as JobSource[];

  const keywords = sanitizeInput(roles.concat(topSkills.slice(0, 2)).join(' '));

  // ── If offline, return empty immediately ───────────────────────────────────
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[RealTimeSearch] Offline — skipping API call, using cached data.');
    return [];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${getApiBase()}/jobs/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords, location, portals, minSalary: profile.preferredSalaryMin || 0 }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[RealTimeSearch] API returned ${res.status} — returning empty.`);
      return [];
    }

    const data = await res.json() as { jobs: any[]; errors?: string[] };

    if (data.errors?.length) {
      console.warn('[RealTimeSearch] Partial source errors:', data.errors);
    }

    // Normalize: ensure every required Job field exists
    return (data.jobs || []).map(normalizeJob).filter(Boolean) as Job[];

  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[RealTimeSearch] Request timed out (12s).');
    } else {
      console.warn('[RealTimeSearch] Fetch error:', err.message);
    }
    return [];
  }
}

/** Map any raw API job object to the canonical Job shape */
function normalizeJob(raw: any): Job | null {
  if (!raw?.id || !raw?.title) return null;
  return {
    id:                raw.id,
    title:             raw.title,
    company:           raw.company || 'Unknown Company',
    companyRating:     raw.companyRating ?? 4.0,
    companyLogo:       raw.companyLogo || `https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=120&q=80`,
    companyType:       raw.companyType || 'Startup',
    location:          raw.location || 'Remote',
    workplaceType:     raw.workplaceType || 'Remote',
    jobType:           raw.jobType || 'Full-Time',
    salaryMin:         Number(raw.salaryMin) || 0,
    salaryMax:         Number(raw.salaryMax) || 0,
    salaryCurrency:    raw.salaryCurrency || 'INR',
    experienceMin:     Number(raw.experienceMin) || 2,
    experienceMax:     Number(raw.experienceMax) || 7,
    skillsRequired:    Array.isArray(raw.skillsRequired) ? raw.skillsRequired.slice(0, 10) : [],
    educationRequired: raw.educationRequired || 'B.Tech or equivalent',
    description:       raw.description || `${raw.title} role at ${raw.company}.`,
    benefits:          Array.isArray(raw.benefits) ? raw.benefits : [],
    applyUrl:          raw.applyUrl || '#',
    sourcePortal:      raw.sourcePortal || 'Wellfound',
    postedTime:        raw.postedTime || 'Recently',
    deadline:          raw.deadline || '',
    matchScore:        undefined // computed later by aiMatchEngine
  };
}

/**
 * Deduplicates and merges a new batch of jobs with the existing list.
 * Keeps existing matchScore for jobs already present; adds new ones to the top.
 */
export function deduplicateAndMerge(existing: Job[], incoming: Job[]): Job[] {
  const existingIds = new Set(existing.map(j => j.id));
  const trulyNew    = incoming.filter(j => !existingIds.has(j.id));
  return [...trulyNew, ...existing].slice(0, 100); // cap at 100 total
}
