import type {
  AnalyticsCounts,
  AnalyticsResult,
  ApplicationStatus,
  CandidateProfile,
} from '../../../shared/types.js';
import type { Database } from '../db/index.js';
import type { ApplicationRow } from './applications.js';
import { mapJobRow, type JobRow } from './jobRepository.js';
import { getSettings, profileCompleteness } from './profiles.js';

function startOfWeekUtc(date: Date): Date {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay();
  copy.setUTCDate(copy.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return copy;
}

function startOfMonthUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function roleCategory(title: string): string {
  const value = title.toLowerCase();
  if (/full.?stack/.test(value)) return 'Full-stack';
  if (/front.?end|react|ui\b/.test(value)) return 'Frontend';
  if (/back.?end|api\b/.test(value)) return 'Backend';
  if (/data engineer|etl|pipeline/.test(value)) return 'Data engineering';
  if (/data scien|analyst|analytics/.test(value)) return 'Data / analytics';
  if (/\bai\b|machine learning|\bml\b|agentic/.test(value)) return 'AI / ML';
  if (/security|cyber/.test(value)) return 'Cybersecurity';
  if (/devops|sre|platform|cloud|infrastructure/.test(value)) return 'Cloud / DevOps';
  if (/mobile|android|ios|flutter/.test(value)) return 'Mobile';
  return 'Other engineering';
}

function rate(
  key: string,
  label: string,
  numerator: number,
  denominator: number,
  definition: string,
): AnalyticsResult['rates'][number] {
  return {
    key,
    label,
    numerator,
    denominator,
    value: denominator === 0 ? 0 : Math.round((numerator / denominator) * 1000) / 10,
    definition,
  };
}

interface EventRow {
  application_id: string;
  type: string;
  occurred_at: string;
}

export async function buildAnalytics(
  db: Database,
  candidateId: string,
  profile: CandidateProfile,
  periodDays = 90,
): Promise<AnalyticsResult> {
  const settings = await getSettings(db, candidateId);
  const now = new Date();
  const from = new Date(now.getTime() - Math.max(7, Math.min(730, periodDays)) * 86_400_000);
  const fromIso = from.toISOString();

  const [jobsResult, savedResult, appsResult, eventsResult] = await Promise.all([
    db.query<JobRow>('SELECT * FROM jobs ORDER BY retrieved_at DESC LIMIT 5000'),
    db.query<{ job_id: string }>('SELECT job_id FROM saved_jobs WHERE candidate_id = $1', [candidateId]),
    db.query<ApplicationRow>('SELECT * FROM applications WHERE candidate_id = $1 ORDER BY created_at DESC', [
      candidateId,
    ]),
    db.query<EventRow>(
      `SELECT e.application_id, e.type, e.occurred_at
       FROM application_events e JOIN applications a ON a.id = e.application_id
       WHERE a.candidate_id = $1`,
      [candidateId],
    ),
  ]);

  const jobs = jobsResult.rows.map((row) => mapJobRow(row, { profile, includeMatch: true }));
  const relevant = jobs.filter((job) => (job.match?.overall || 0) >= settings.matchThreshold).length;
  const shortlisted = savedResult.rows.length;
  const apps = appsResult.rows;
  const events = eventsResult.rows;

  const byStatus = new Map<ApplicationStatus, number>();
  for (const app of apps) byStatus.set(app.status, (byStatus.get(app.status) || 0) + 1);
  const submitted = apps.filter((app) => Boolean(app.submitted_at)).length;
  const preparedEver = events.filter((event) => event.type === 'Prepared').length;
  const approvedEver = events.filter((event) => event.type === 'Approved').length;
  const interviewsEver = new Set(
    events
      .filter((event) => event.type === 'Interview')
      .map((event) => event.application_id)
      .concat(apps.filter((app) => app.status === 'Interview' || app.status === 'Offer').map((app) => app.id)),
  ).size;
  const assessmentsEver = new Set(
    events
      .filter((event) => event.type === 'Assessment')
      .map((event) => event.application_id)
      .concat(apps.filter((app) => app.status === 'Assessment').map((app) => app.id)),
  ).size;
  const offersEver = new Set(
    events
      .filter((event) => event.type === 'Offer')
      .map((event) => event.application_id)
      .concat(apps.filter((app) => app.status === 'Offer').map((app) => app.id)),
  ).size;
  const rejectionsEver = new Set(
    events
      .filter((event) => event.type === 'Rejected')
      .map((event) => event.application_id)
      .concat(apps.filter((app) => app.status === 'Rejected').map((app) => app.id)),
  ).size;
  const withdrawalsEver = new Set(
    events
      .filter((event) => event.type === 'Withdrawn')
      .map((event) => event.application_id)
      .concat(apps.filter((app) => app.status === 'Withdrawn').map((app) => app.id)),
  ).size;
  const respondedEver = new Set([
    ...events.filter((event) => ['Assessment', 'Interview', 'Offer', 'Rejected'].includes(event.type)).map((event) => event.application_id),
    ...apps.filter((app) => ['Assessment', 'Interview', 'Offer', 'Rejected'].includes(app.status)).map((app) => app.id),
  ]).size;
  const unknownOutcomes = apps.filter(
    (app) => app.submitted_at && ['Submitted', 'Assessment', 'Interview'].includes(app.status),
  ).length;

  const counts: AnalyticsCounts = {
    discovered: jobs.length,
    relevant,
    shortlisted,
    prepared: byStatus.get('Prepared') || 0,
    approved: byStatus.get('Approved') || 0,
    submitted,
    interviews: interviewsEver,
    assessments: assessmentsEver,
    offers: offersEver,
    rejections: rejectionsEver,
    withdrawals: withdrawalsEver,
    unknownOutcomes,
  };

  const rates = [
    rate('relevance', 'Relevant discovery rate', relevant, jobs.length, 'Jobs scoring at or above the saved match threshold ÷ all discovered jobs.'),
    rate('shortlist', 'Shortlist rate', shortlisted, relevant || jobs.length, 'Saved jobs ÷ jobs that met the match threshold.'),
    rate('preparation', 'Preparation rate', preparedEver, shortlisted || relevant, 'Applications ever prepared ÷ shortlisted jobs (or relevant jobs when nothing is saved).'),
    rate('approval', 'Approval rate', approvedEver, preparedEver, 'Applications ever approved ÷ applications ever prepared.'),
    rate('submission', 'Submission rate', submitted, approvedEver, 'Applications with recorded submission evidence ÷ applications ever approved.'),
    rate('interview', 'Interview rate', interviewsEver, submitted, 'Applications that ever reached Interview ÷ applications with recorded submissions.'),
    rate('offer', 'Offer rate', offersEver, submitted, 'Applications that ever reached Offer ÷ applications with recorded submissions.'),
    rate('response', 'Response rate', respondedEver, submitted, 'Applications with any recorded assessment, interview, offer or rejection ÷ recorded submissions.'),
    rate('unknown', 'Unknown outcome share', unknownOutcomes, submitted, 'Submitted or interview-stage applications with no final outcome recorded ÷ recorded submissions.'),
  ];

  // Weekly buckets are based on application creation, submission evidence and interview events.
  const weekly: AnalyticsResult['weekly'] = [];
  const weekStart = startOfWeekUtc(now);
  for (let index = 7; index >= 0; index -= 1) {
    const start = new Date(weekStart.getTime() - index * 7 * 86_400_000);
    const end = new Date(start.getTime() + 7 * 86_400_000);
    const inWeek = (iso: string | null) => {
      if (!iso) return false;
      const date = new Date(iso);
      return date >= start && date < end;
    };
    weekly.push({
      bucket: start.toISOString().slice(0, 10),
      prepared: apps.filter((app) => inWeek(app.created_at)).length,
      submitted: apps.filter((app) => inWeek(app.submitted_at)).length,
      interviews: new Set(
        events.filter((event) => event.type === 'Interview' && inWeek(event.occurred_at)).map((event) => event.application_id),
      ).size,
    });
  }

  const monthly: AnalyticsResult['monthly'] = [];
  for (let index = 5; index >= 0; index -= 1) {
    const reference = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    const bucket = startOfMonthUtc(reference);
    monthly.push({
      bucket,
      prepared: apps.filter((app) => app.created_at.slice(0, 7) === bucket).length,
      submitted: apps.filter((app) => (app.submitted_at || '').slice(0, 7) === bucket).length,
      interviews: new Set(
        events
          .filter((event) => event.type === 'Interview' && event.occurred_at.slice(0, 7) === bucket)
          .map((event) => event.application_id),
      ).size,
    });
  }

  const group = (
    labelFor: (app: ApplicationRow) => string,
  ): AnalyticsResult['byCategory'] => {
    const map = new Map<string, { total: number; interviews: number; offers: number }>();
    for (const app of apps) {
      const label = labelFor(app);
      const current = map.get(label) || { total: 0, interviews: 0, offers: 0 };
      current.total += 1;
      const appEvents = events.filter((event) => event.application_id === app.id);
      if (appEvents.some((event) => event.type === 'Interview') || ['Interview', 'Offer'].includes(app.status)) {
        current.interviews += 1;
      }
      if (appEvents.some((event) => event.type === 'Offer') || app.status === 'Offer') current.offers += 1;
      map.set(label, current);
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, ...value }))
      .sort((a, b) => b.total - a.total);
  };

  const byCategory = group((app) => roleCategory(app.job_title));
  const bySource = group((app) => app.source);
  const byResumeVersion = group((app) => app.resume_label || 'Unlabelled resume');

  const recommendations: string[] = [];
  if (jobs.length === 0) recommendations.push('Run discovery or add a verified job manually before interpreting analytics.');
  if (shortlisted === 0 && relevant > 0) recommendations.push('Shortlist a small set of relevant jobs; preparation and outcome analytics need real applications, not saved counts.');
  if (preparedEver === 0 && shortlisted > 0) recommendations.push('Prepare one application for your strongest saved match, review it, then approve it.');
  if (preparedEver > 0 && approvedEver < preparedEver) recommendations.push('Some applications are still in Prepared state. Review and approve them only when the content is accurate.');
  if (approvedEver > 0 && submitted < approvedEver) recommendations.push('Record submission evidence for approved applications you have actually submitted on the employer site.');
  if (submitted >= 3 && unknownOutcomes / Math.max(1, submitted) > 0.5) {
    recommendations.push('More than half of recorded submissions have unknown outcomes. Update statuses from real recruiter emails; do not infer outcomes.');
  }
  if (submitted >= 3 && interviewsEver === 0) recommendations.push('No interview has been recorded yet. Recheck resume evidence against target requirements and run mock interviews before changing strategy.');
  if (profileCompleteness(profile) < 70) recommendations.push('Profile completeness is below 70%. Add verified skills, projects and resume text to make match and gap evidence reliable.');
  if (recommendations.length === 0) recommendations.push('Analytics are based only on recorded events. Keep update notes factual and avoid changing status without recruiter evidence.');

  return {
    period: { from: fromIso, to: now.toISOString() },
    counts,
    rates,
    weekly,
    monthly,
    byCategory,
    bySource,
    byResumeVersion,
    recommendations,
    generatedAt: now.toISOString(),
  };
}
