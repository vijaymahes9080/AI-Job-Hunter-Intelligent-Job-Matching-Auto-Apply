import type { ApplicationStatus, DuplicateCheckResult, DuplicateMatch, JobPosting } from '../../../shared/types.js';
import type { Database } from '../db/index.js';
import { companyKey, normalizeUrl, titleKey, titleSimilarity } from '../utils/normalize.js';

interface AppRow {
  id: string;
  job_id: string;
  job_title: string;
  company: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  created_at: string;
  apply_url: string;
  normalized_apply_url: string;
  company_key: string;
  title_key: string;
}

export async function checkDuplicates(
  db: Database,
  candidateId: string,
  job: JobPosting,
  requestedUrl?: string,
): Promise<DuplicateCheckResult> {
  const normalizedUrl = normalizeUrl(requestedUrl || job.applyUrl);
  const result = await db.query<AppRow>(
    `SELECT a.id, a.job_id, a.job_title, a.company, a.status, a.submitted_at, a.created_at,
            j.apply_url, a.normalized_apply_url, a.company_key, a.title_key
     FROM applications a JOIN jobs j ON j.id = a.job_id
     WHERE a.candidate_id = $1`,
    [candidateId],
  );

  const exact: DuplicateMatch[] = [];
  const similar: DuplicateMatch[] = [];
  const targetCompany = companyKey(job.company);
  const targetTitle = titleKey(job.title);

  for (const row of result.rows) {
    const reasons: string[] = [];
    if (row.job_id === job.id) reasons.push('This exact job is already in your application history.');
    if (row.normalized_apply_url === normalizedUrl) reasons.push('The normalised application URL is identical.');
    if (reasons.length > 0) {
      exact.push({
        applicationId: row.id,
        jobId: row.job_id,
        title: row.job_title,
        company: row.company,
        status: row.status,
        appliedAt: row.submitted_at || row.created_at,
        applyUrl: row.apply_url,
        similarity: 100,
        reason: reasons.join(' '),
      });
      continue;
    }

    const sameCompany = row.company_key === targetCompany;
    const titleScore = titleSimilarity(row.job_title, job.title);
    const sameTitleKey = row.title_key === targetTitle;
    if (sameCompany && (sameTitleKey || titleScore >= 0.8)) {
      similar.push({
        applicationId: row.id,
        jobId: row.job_id,
        title: row.job_title,
        company: row.company,
        status: row.status,
        appliedAt: row.submitted_at || row.created_at,
        applyUrl: row.apply_url,
        similarity: Math.round(titleScore * 100),
        reason: 'Same company and a near-identical job title. This may be a reposted or duplicate listing.',
      });
    }
  }

  const withdrawnExact = exact.filter((match) => match.status === 'Withdrawn');
  const blocked = exact.length > 0;
  const canOverride = !blocked && similar.length > 0;
  const reasons: string[] = [];
  if (exact.length > 0) {
    reasons.push(
      withdrawnExact.length === exact.length
        ? 'You previously withdrew an application for this exact job. The duplicate guard still blocks a second submission; contact the employer or use the original application channel.'
        : 'You have already applied to this exact job. The server-side duplicate guard blocks resubmission.',
    );
  }
  if (similar.length > 0) reasons.push('A similar application exists. Review it before proceeding.');
  if (exact.length === 0 && similar.length === 0) reasons.push('No duplicate application was found in your persisted history.');

  return {
    normalizedUrl,
    exactDuplicates: exact,
    similar,
    blocked,
    canOverride,
    reasons,
    checkedAt: new Date().toISOString(),
  };
}
