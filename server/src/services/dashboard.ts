import type { CandidateProfile, DashboardResponse, JobPosting } from '../../../shared/types.js';
import { config } from '../config.js';
import type { Database } from '../db/index.js';
import { listApplications } from './applications.js';
import { getSourceStatus } from './discovery.js';
import { listJobs } from './jobRepository.js';
import { llmConfigured } from './llm.js';
import { getSettings, profileCompleteness } from './profiles.js';

export async function buildDashboard(
  db: Database,
  candidateId: string,
  profile: CandidateProfile,
): Promise<DashboardResponse> {
  const settings = await getSettings(db, candidateId);
  const [jobPage, savedResult, applications, sources] = await Promise.all([
    listJobs(db, candidateId, profile, { pageSize: 100, sort: 'match' }),
    db.query<{ count: string }>('SELECT COUNT(*) as count FROM saved_jobs WHERE candidate_id = $1', [candidateId]),
    listApplications(db, candidateId),
    getSourceStatus(db),
  ]);

  const jobs = jobPage.items;
  const savedIds = new Set(
    (await db.query<{ job_id: string }>('SELECT job_id FROM saved_jobs WHERE candidate_id = $1', [candidateId])).rows.map(
      (row) => row.job_id,
    ),
  );
  const relevantToCandidate = jobs.filter((job) => savedIds.has(job.id) || applications.some((app) => app.jobId === job.id));

  const closingSoon = relevantToCandidate
    .filter((job) => job.deadline.daysRemaining !== null && job.deadline.daysRemaining <= 7 && job.deadline.daysRemaining >= 0)
    .sort((a, b) => (a.deadline.daysRemaining || 0) - (b.deadline.daysRemaining || 0))
    .slice(0, 6)
    .map((job) => ({
      jobId: job.id,
      title: job.title,
      company: job.company,
      deadline: job.deadline.date || 'Not specified',
      daysRemaining: job.deadline.daysRemaining || 0,
    }));

  const counts = {
    discovered: jobPage.total,
    saved: Number(savedResult.rows[0]?.count || 0),
    prepared: applications.filter((app) => app.status === 'Prepared').length,
    submitted: applications.filter((app) => Boolean(app.submittedAt)).length,
    interviews: applications.filter((app) => ['Interview', 'Offer'].includes(app.status)).length,
    offers: applications.filter((app) => app.status === 'Offer').length,
  };

  const recommendedActions: string[] = [];
  if (profileCompleteness(profile) < 60) {
    recommendedActions.push('Complete your profile and resume evidence so matching and skill-gap checks are trustworthy.');
  }
  if (jobPage.total === 0) {
    recommendedActions.push('Run job discovery to fetch live postings from Remotive, Greenhouse and Lever.');
  }
  if (counts.saved === 0 && jobPage.total > 0) {
    recommendedActions.push(`Review high-match roles and save the ones you would genuinely apply to (threshold: ${settings.matchThreshold}%).`);
  }
  if (counts.prepared > 0) {
    recommendedActions.push(`${counts.prepared} prepared application(s) await your review. Approve only accurate content, then complete the real submission on the employer site.`);
  }
  if (counts.saved > 0 && counts.prepared === 0) {
    recommendedActions.push('Open Application Studio to prepare an application from a saved role.');
  }
  if (applications.some((app) => app.outcomeUnknown)) {
    recommendedActions.push('Update applications without a final outcome using evidence from recruiter messages.');
  }
  if (closingSoon.length > 0) {
    recommendedActions.push(`${closingSoon.length} saved or applied role(s) close within 7 days. Verify each closing date on the employer page.`);
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push('Your workspace is up to date. Run a mock interview or review salary evidence for your target role.');
  }

  return {
    profileCompleteness: profileCompleteness(profile),
    counts,
    topMatches: jobPage.items.slice(0, 6) as JobPosting[],
    closingSoon,
    recentApplications: applications.slice(0, 5),
    recommendedActions: recommendedActions.slice(0, 6),
    engine: {
      aiProvider: llmConfigured() ? `Open-weight endpoint (${config.llm.model})` : 'Deterministic evidence engine',
      aiConfigured: llmConfigured(),
      jobSources: sources.filter((source) => source.source !== 'manual').map((source) => source.label),
    },
  };
}
