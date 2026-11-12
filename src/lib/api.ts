import type {
  AnalyticsResult,
  ApplicationEventRecord,
  ApplicationRecord,
  ApplicationStatus,
  AuthenticityResult,
  CandidateProfile,
  CareerRoadmap,
  CompanyResearch,
  DashboardResponse,
  DeadlineBoardResponse,
  Difficulty,
  DuplicateCheckResult,
  GitHubPortfolioAnalysis,
  IntegrationStatusRecord,
  InterviewAnswerEvaluation,
  InterviewSession,
  JobPosting,
  NotificationRecord,
  Paginated,
  ResumeAnalysis,
  SalaryIntelligence,
  SkillGapResult,
  UserSettings,
} from '../../shared/types';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function readCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; formData?: FormData; signal?: AbortSignal } = {},
): Promise<T> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers['x-csrf-token'] = readCookie('ajh_csrf');
  }

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body,
    credentials: 'include',
    signal: options.signal,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    throw new ApiError(
      response.status,
      error?.code || 'request_failed',
      error?.message || `Request failed with status ${response.status}.`,
      error?.details,
    );
  }
  return payload as T;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const value = search.toString();
  return value ? `?${value}` : '';
}

export interface SessionResponse {
  user: { id: string; email: string; name: string; role?: string; createdAt: string };
  csrfToken?: string;
  profile: CandidateProfile;
  settings: UserSettings;
  demo: boolean;
  profileCompleteness?: number;
}

export interface JobFilters {
  q?: string;
  location?: string;
  sources?: string;
  workplaceTypes?: string;
  employmentTypes?: string;
  minMatch?: number;
  minSalary?: number;
  currency?: string;
  savedOnly?: boolean;
  deadlineStatus?: string;
  sort?: 'match' | 'newest' | 'deadline' | 'salary';
  page?: number;
  pageSize?: number;
}

export interface DiscoveryResult {
  runs: Array<{
    source: string;
    status: 'success' | 'partial' | 'error';
    discovered: number;
    inserted: number;
    updated: number;
    message: string | null;
    startedAt: string;
    finishedAt: string;
  }>;
  totalDiscovered: number;
  totalInserted: number;
  totalUpdated: number;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<SessionResponse>('/auth/login', { method: 'POST', body: { email, password } }),
    register: (name: string, email: string, password: string) =>
      request<SessionResponse>('/auth/register', { method: 'POST', body: { name, email, password } }),
    demo: () => request<SessionResponse>('/auth/demo-login', { method: 'POST', body: {} }),
    logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    me: () => request<SessionResponse>('/auth/me'),
  },
  dashboard: () => request<DashboardResponse>('/dashboard'),
  profile: {
    get: () => request<{ profile: CandidateProfile; completeness: number }>('/profile'),
    update: (profile: Partial<CandidateProfile>) =>
      request<{ profile: CandidateProfile; completeness: number }>('/profile', { method: 'PUT', body: profile }),
    uploadResume: (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      return request<{
        profile: CandidateProfile;
        extractedCharacters: number;
        warnings: string[];
        extractedSkills: string[];
      }>('/profile/resume', { method: 'POST', formData });
    },
    saveResumeText: (text: string, fileName?: string) =>
      request<{ profile: CandidateProfile; extractedCharacters: number; extractedSkills: string[] }>(
        '/profile/resume-text',
        { method: 'POST', body: { text, fileName } },
      ),
  },
  resume: {
    analyze: (jobId?: string | null, resumeText?: string) =>
      request<ResumeAnalysis>('/resume/analyze', {
        method: 'POST',
        body: { jobId: jobId || null, resumeText: resumeText || undefined },
      }),
  },
  settings: {
    get: () => request<UserSettings>('/settings'),
    update: (settings: Partial<UserSettings>) =>
      request<UserSettings>('/settings', { method: 'PUT', body: settings }),
  },
  jobs: {
    list: (filters: JobFilters = {}) =>
      request<Paginated<JobPosting>>(
        `/jobs${qs({
          ...filters,
          sources: filters.sources,
          savedOnly: filters.savedOnly ? 'true' : undefined,
        })}`,
      ),
    get: (id: string) => request<JobPosting>(`/jobs/${id}`),
    save: (id: string) => request<{ saved: boolean }>(`/jobs/${id}/save`, { method: 'POST', body: {} }),
    unsave: (id: string) => request<{ saved: boolean }>(`/jobs/${id}/save`, { method: 'DELETE' }),
    addManual: (input: Record<string, unknown>) => request<JobPosting>('/jobs/manual', { method: 'POST', body: input }),
    verifyDeadline: (id: string, date: string | null, note?: string) =>
      request<JobPosting>(`/jobs/${id}/deadline`, { method: 'PATCH', body: { date, note } }),
  },
  discovery: {
    sources: () =>
      request<{
        sources: Array<{
          source: string;
          label: string;
          configured: boolean;
          lastRunAt: string | null;
          lastStatus: string | null;
          inserted: number;
          message: string | null;
        }>;
        snapshotRetrievedAt: string;
      }>('/discovery/sources'),
    run: () => request<DiscoveryResult>('/discovery/run', { method: 'POST', body: {} }),
  },
  skills: {
    gap: (targetRole?: string, jobIds?: string[], limit?: number) =>
      request<SkillGapResult>('/skills/gap', { method: 'POST', body: { targetRole, jobIds, limit } }),
    latest: () => request<SkillGapResult | null>('/skills/gap/latest'),
  },
  companies: {
    list: () => request<{ items: CompanyResearch[] }>('/companies'),
    research: (company: string, website?: string | null) =>
      request<CompanyResearch>('/companies/research', { method: 'POST', body: { company, website } }),
  },
  authenticity: {
    run: (jobId: string) => request<AuthenticityResult>(`/jobs/${jobId}/authenticity`, { method: 'POST', body: {} }),
    latest: (jobId: string) => request<AuthenticityResult | null>(`/jobs/${jobId}/authenticity`),
  },
  duplicates: {
    check: (jobId: string, requestedUrl?: string) =>
      request<DuplicateCheckResult>(`/jobs/${jobId}/duplicates`, { method: 'POST', body: { requestedUrl } }),
  },
  applications: {
    list: () => request<{ items: ApplicationRecord[] }>('/applications'),
    get: (id: string) => request<{ application: ApplicationRecord; events: ApplicationEventRecord[] }>(`/applications/${id}`),
    prepare: (input: {
      jobId: string;
      resumeLabel?: string | null;
      coverLetter?: string | null;
      screeningAnswers?: Record<string, string>;
      duplicateOverrideReason?: string | null;
      notes?: string | null;
    }) => request<{ application: ApplicationRecord; duplicate: DuplicateCheckResult }>('/applications/prepare', {
      method: 'POST',
      body: input,
    }),
    approve: (id: string) => request<ApplicationRecord>(`/applications/${id}/approve`, { method: 'POST', body: {} }),
    submit: (id: string, evidence: { url?: string | null; reference?: string | null; note?: string | null }) =>
      request<ApplicationRecord>(`/applications/${id}/submit`, { method: 'POST', body: evidence }),
    status: (id: string, status: ApplicationStatus, note?: string) =>
      request<ApplicationRecord>(`/applications/${id}/status`, { method: 'PATCH', body: { status, note } }),
    notes: (id: string, notes: string) =>
      request<ApplicationRecord>(`/applications/${id}/notes`, { method: 'PATCH', body: { notes } }),
  },
  interviews: {
    list: () => request<{ items: InterviewSession[] }>('/interviews'),
    get: (id: string) => request<InterviewSession>(`/interviews/${id}`),
    create: (input: { jobId?: string | null; targetRole?: string; difficulty: Difficulty }) =>
      request<InterviewSession>('/interviews', { method: 'POST', body: input }),
    answer: (id: string, questionId: string, answer: string, confidence: number) =>
      request<{ session: InterviewSession; evaluation: InterviewAnswerEvaluation; summary: { score: number; confidenceAverage: number } }>(
        `/interviews/${id}/answers`,
        { method: 'POST', body: { questionId, answer, confidence } },
      ),
    complete: (id: string) =>
      request<{ session: InterviewSession; report: { score: number; confidenceAverage: number; [key: string]: unknown } }>(
        `/interviews/${id}/complete`,
        { method: 'POST', body: {} },
      ),
  },
  roadmaps: {
    list: () => request<{ items: CareerRoadmap[] }>('/roadmaps'),
    get: (id: string) => request<CareerRoadmap>(`/roadmaps/${id}`),
    create: (input: { targetRole?: string; weeklyHours: number; experienceLevel: 'student' | 'entry' | 'mid' | 'senior' }) =>
      request<CareerRoadmap>('/roadmaps', { method: 'POST', body: input }),
    toggleMilestone: (id: string, key: string, completed: boolean) =>
      request<CareerRoadmap>(`/roadmaps/${id}/milestones/${key}`, { method: 'PATCH', body: { completed } }),
  },
  deadlines: {
    board: (includeAll = false) => request<DeadlineBoardResponse>(`/deadlines${includeAll ? '?includeAll=1' : ''}`),
    scan: () => request<{ notificationsCreated: number; scannedJobs: number; [key: string]: unknown }>('/deadlines/scan', {
      method: 'POST',
      body: {},
    }),
  },
  salaries: (filters: { role?: string; location?: string; currency?: string; minExperience?: number; maxExperience?: number } = {}) =>
    request<SalaryIntelligence>(`/salaries${qs(filters)}`),
  github: {
    latest: () => request<GitHubPortfolioAnalysis | null>('/github/latest'),
    analyze: (username?: string, jobIds?: string[]) =>
      request<GitHubPortfolioAnalysis>('/github/analyze', { method: 'POST', body: { username, jobIds } }),
  },
  analytics: (days = 90) => request<AnalyticsResult>(`/analytics?days=${days}`),
  notifications: {
    list: () => request<{ items: NotificationRecord[]; unread: number }>('/notifications'),
    read: (id: string) => request<{ ok: boolean }>(`/notifications/${id}/read`, { method: 'PATCH', body: {} }),
    readAll: () => request<{ ok: boolean }>('/notifications/read-all', { method: 'POST', body: {} }),
    remove: (id: string) => request<{ ok: boolean }>(`/notifications/${id}`, { method: 'DELETE' }),
  },
  integrations: () =>
    request<{
      integrations: IntegrationStatusRecord[];
      llmConfigured: boolean;
      demoMode: boolean;
      database: string;
      scheduler: { enabled: boolean; intervalMinutes: number };
    }>('/integrations'),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}
