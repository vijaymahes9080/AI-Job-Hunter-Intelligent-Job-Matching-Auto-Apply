import type {
  ApplicationStatus,
  CandidateProfile,
  DeadlineBoardItem,
  DeadlineBoardResponse,
} from '../../../shared/types.js';
import type { Database } from '../db/index.js';
import { mapJobRow, type JobRow } from './jobRepository.js';

export async function buildDeadlineBoard(
  db: Database,
  candidateId: string,
  profile: CandidateProfile,
  options: { includeAll?: boolean } = {},
): Promise<DeadlineBoardResponse> {
  const [jobsResult, savedResult, applicationsResult] = await Promise.all([
    db.query<JobRow>('SELECT * FROM jobs ORDER BY retrieved_at DESC LIMIT 3000'),
    db.query<{ job_id: string }>('SELECT job_id FROM saved_jobs WHERE candidate_id = $1', [candidateId]),
    db.query<{ job_id: string; status: ApplicationStatus }>(
      'SELECT job_id, status FROM applications WHERE candidate_id = $1',
      [candidateId],
    ),
  ]);
  const saved = new Set(savedResult.rows.map((row) => row.job_id));
  const applications = new Map(applicationsResult.rows.map((row) => [row.job_id, row.status]));

  const items: DeadlineBoardItem[] = jobsResult.rows
    .filter((row) => options.includeAll || saved.has(row.id) || applications.has(row.id))
    .map((row) => {
      const job = mapJobRow(row);
      return {
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        applyUrl: job.applyUrl,
        sourceName: job.sourceName,
        isSaved: saved.has(job.id),
        applicationStatus: applications.get(job.id) || null,
        deadline: job.deadline,
      };
    });

  const statusRank: Record<string, number> = {
    'Closing Soon': 0,
    Open: 1,
    'Needs Verification': 2,
    'Not Specified': 3,
    'Deadline Passed': 4,
  };
  items.sort((a, b) => {
    const rank = (statusRank[a.deadline.status] ?? 9) - (statusRank[b.deadline.status] ?? 9);
    if (rank !== 0) return rank;
    return (a.deadline.daysRemaining ?? Number.MAX_SAFE_INTEGER) - (b.deadline.daysRemaining ?? Number.MAX_SAFE_INTEGER);
  });

  const count = (status: string) => items.filter((item) => item.deadline.status === status).length;
  return {
    items,
    summary: {
      closingSoon: count('Closing Soon'),
      open: count('Open'),
      passed: count('Deadline Passed'),
      notSpecified: count('Not Specified'),
      needsVerification: count('Needs Verification'),
      scannedJobs: jobsResult.rows.length,
    },
    generatedAt: new Date().toISOString(),
  };
}
