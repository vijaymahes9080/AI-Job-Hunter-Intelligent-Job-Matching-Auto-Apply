import type {
  ApplicationEventRecord,
  ApplicationRecord,
  ApplicationStatus,
  CandidateProfile,
} from '../../../shared/types.js';
import type { Database } from '../db/index.js';
import { AppError } from '../errors.js';
import {
  companyKey,
  normalizeUrl,
  titleKey,
} from '../utils/normalize.js';
import { checkDuplicates } from './duplicateGuard.js';
import { getJobForCandidate } from './jobRepository.js';
import { createNotification } from './notifications.js';

export interface ApplicationRow {
  id: string;
  candidate_id: string;
  job_id: string;
  job_title: string;
  company: string;
  source: string;
  status: ApplicationStatus;
  match_score: number;
  resume_label: string | null;
  resume_content: string | null;
  cover_letter: string | null;
  screening_answers: string;
  duplicate_override_reason: string | null;
  submission_evidence: string | null;
  notes: string | null;
  idempotency_key: string;
  normalized_apply_url: string;
  company_key: string;
  title_key: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

const FINAL_STATUSES = new Set<ApplicationStatus>(['Offer', 'Rejected', 'Withdrawn']);

export function isOutcomeUnknown(status: ApplicationStatus): boolean {
  return !FINAL_STATUSES.has(status) && status !== 'Prepared' && status !== 'Approved';
}

export function mapApplicationRow(row: ApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    jobId: row.job_id,
    jobTitle: row.job_title,
    company: row.company,
    source: row.source as ApplicationRecord['source'],
    status: row.status,
    matchScore: row.match_score,
    resumeLabel: row.resume_label,
    coverLetter: row.cover_letter,
    screeningAnswers: JSON.parse(row.screening_answers || '{}') as Record<string, string>,
    duplicateOverrideReason: row.duplicate_override_reason,
    submissionEvidence: row.submission_evidence
      ? (JSON.parse(row.submission_evidence) as ApplicationRecord['submissionEvidence'])
      : null,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    outcomeUnknown: isOutcomeUnknown(row.status),
    notes: row.notes,
  };
}

export async function listApplications(
  db: Database,
  candidateId: string,
): Promise<ApplicationRecord[]> {
  const result = await db.query<ApplicationRow>(
    'SELECT * FROM applications WHERE candidate_id = $1 ORDER BY updated_at DESC',
    [candidateId],
  );
  return result.rows.map(mapApplicationRow);
}

export async function getApplication(
  db: Database,
  candidateId: string,
  applicationId: string,
): Promise<{ application: ApplicationRecord; events: ApplicationEventRecord[] }> {
  const result = await db.query<ApplicationRow>(
    'SELECT * FROM applications WHERE id = $1 AND candidate_id = $2',
    [applicationId, candidateId],
  );
  if (result.rows.length === 0) {
    throw new AppError(404, 'application_not_found', 'This application does not exist.');
  }
  return {
    application: mapApplicationRow(result.rows[0]),
    events: await listEvents(db, candidateId, applicationId),
  };
}

export async function listEvents(
  db: Database,
  candidateId: string,
  applicationId: string,
): Promise<ApplicationEventRecord[]> {
  const owned = await db.query('SELECT id FROM applications WHERE id = $1 AND candidate_id = $2', [
    applicationId,
    candidateId,
  ]);
  if (owned.rows.length === 0) {
    throw new AppError(404, 'application_not_found', 'This application does not exist.');
  }
  const result = await db.query<{
    id: string;
    application_id: string;
    type: string;
    note: string | null;
    occurred_at: string;
  }>('SELECT * FROM application_events WHERE application_id = $1 ORDER BY occurred_at ASC', [
    applicationId,
  ]);
  return result.rows.map((row) => ({
    id: row.id,
    applicationId: row.application_id,
    type: row.type,
    note: row.note,
    occurredAt: row.occurred_at,
  }));
}

async function insertEvent(
  db: Database,
  applicationId: string,
  type: string,
  note: string | null,
): Promise<void> {
  await db.query(
    'INSERT INTO application_events (id, application_id, type, note, occurred_at) VALUES ($1,$2,$3,$4,$5)',
    [
      `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      applicationId,
      type,
      note,
      new Date().toISOString(),
    ],
  );
}

export interface PrepareApplicationInput {
  jobId: string;
  resumeLabel?: string | null;
  coverLetter?: string | null;
  screeningAnswers?: Record<string, string>;
  duplicateOverrideReason?: string | null;
  notes?: string | null;
  idempotencyKey?: string;
}

export async function prepareApplication(
  db: Database,
  candidateId: string,
  profile: CandidateProfile,
  input: PrepareApplicationInput,
): Promise<{ application: ApplicationRecord; duplicate: Awaited<ReturnType<typeof checkDuplicates>> }> {
  const job = await getJobForCandidate(db, candidateId, profile, input.jobId);
  if (!job) throw new AppError(404, 'job_not_found', 'This job does not exist.');

  const idempotencyKey = (input.idempotencyKey || '').trim();
  if (idempotencyKey) {
    const existing = await db.query<ApplicationRow>(
      'SELECT * FROM applications WHERE idempotency_key = $1 AND candidate_id = $2',
      [idempotencyKey, candidateId],
    );
    if (existing.rows.length > 0) {
      return {
        application: mapApplicationRow(existing.rows[0]),
        duplicate: await checkDuplicates(db, candidateId, job),
      };
    }
  }

  const duplicate = await checkDuplicates(db, candidateId, job);
  if (duplicate.blocked) {
    throw new AppError(
      409,
      'duplicate_application',
      'The duplicate guard blocked this application because you already have one for this job or an identical application URL.',
      { duplicate },
    );
  }
  if (duplicate.similar.length > 0 && !input.duplicateOverrideReason?.trim()) {
    throw new AppError(
      409,
      'similar_application_requires_review',
      'A similar application exists. Review it and provide a reason before preparing this one.',
      { duplicate },
    );
  }

  const existingForJob = await db.query(
    'SELECT id FROM applications WHERE candidate_id = $1 AND job_id = $2',
    [candidateId, job.id],
  );
  if (existingForJob.rows.length > 0) {
    throw new AppError(409, 'duplicate_application', 'An application for this job already exists.');
  }

  const now = new Date().toISOString();
  const id = `app-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const key = idempotencyKey || `${candidateId}:${job.id}`;
  const screeningAnswers = input.screeningAnswers || {};
  const resumeLabel = input.resumeLabel?.trim() || profile.resumeFileName || 'Profile resume text';
  const coverLetter = input.coverLetter?.trim() || null;
  const notes = input.notes?.trim() || null;

  await db.query(
    `INSERT INTO applications (
       id, candidate_id, job_id, job_title, company, source, status, match_score,
       resume_label, resume_content, cover_letter, screening_answers, duplicate_override_reason,
       submission_evidence, notes, idempotency_key, normalized_apply_url, company_key, title_key,
       submitted_at, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
    [
      id,
      candidateId,
      job.id,
      job.title,
      job.company,
      job.source,
      'Prepared',
      job.match?.overall ?? 0,
      resumeLabel,
      profile.resumeText || null,
      coverLetter,
      JSON.stringify(screeningAnswers),
      input.duplicateOverrideReason?.trim() || null,
      null,
      notes,
      key,
      normalizeUrl(job.applyUrl),
      companyKey(job.company),
      titleKey(job.title),
      null,
      now,
      now,
    ],
  );
  await insertEvent(
    db,
    id,
    'Prepared',
    `Application prepared with ${job.match?.overall ?? 0}% evidence match. Approval is required before recording a submission.`,
  );
  await createNotification(db, {
    userId: candidateId,
    title: `Application prepared: ${job.title}`,
    message: `${job.company} — review the prepared application, then approve it. No submission has been made.`,
    type: 'application',
    jobId: job.id,
    dedupeKey: `application-prepared-${id}`,
  });

  const saved = await db.query<ApplicationRow>('SELECT * FROM applications WHERE id = $1', [id]);
  return { application: mapApplicationRow(saved.rows[0]), duplicate };
}

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  Prepared: ['Approved', 'Withdrawn'],
  Approved: ['Submitted', 'Withdrawn'],
  Submitted: ['Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
  Assessment: ['Interview', 'Offer', 'Rejected', 'Withdrawn'],
  Interview: ['Offer', 'Rejected', 'Withdrawn'],
  Offer: ['Withdrawn'],
  Rejected: [],
  Withdrawn: [],
};

export async function approveApplication(
  db: Database,
  candidateId: string,
  applicationId: string,
): Promise<ApplicationRecord> {
  const result = await db.query<ApplicationRow>(
    'SELECT * FROM applications WHERE id = $1 AND candidate_id = $2',
    [applicationId, candidateId],
  );
  const row = result.rows[0];
  if (!row) throw new AppError(404, 'application_not_found', 'This application does not exist.');
  if (row.status !== 'Prepared') {
    throw new AppError(409, 'invalid_status_transition', `Only Prepared applications can be approved (current: ${row.status}).`);
  }
  const now = new Date().toISOString();
  await db.query("UPDATE applications SET status = 'Approved', updated_at = $2 WHERE id = $1", [applicationId, now]);
  await insertEvent(db, applicationId, 'Approved', 'Candidate approved the prepared application. Submission is still recorded manually.');
  return { ...mapApplicationRow(row), status: 'Approved', updatedAt: now, outcomeUnknown: false };
}

export async function recordSubmission(
  db: Database,
  candidateId: string,
  applicationId: string,
  evidence: { url?: string | null; reference?: string | null; note?: string | null },
): Promise<ApplicationRecord> {
  const result = await db.query<ApplicationRow>(
    'SELECT * FROM applications WHERE id = $1 AND candidate_id = $2',
    [applicationId, candidateId],
  );
  const row = result.rows[0];
  if (!row) throw new AppError(404, 'application_not_found', 'This application does not exist.');
  if (row.status !== 'Approved') {
    throw new AppError(
      409,
      'invalid_status_transition',
      `Only Approved applications can be recorded as submitted (current: ${row.status}). Approve it after you finish the employer's real application flow.`,
    );
  }
  if (!evidence.reference?.trim() && !evidence.url?.trim()) {
    throw new AppError(
      400,
      'submission_evidence_required',
      'Record at least a confirmation reference or the final confirmation URL. The platform does not invent submission evidence.',
    );
  }
  // Validate URL shape if supplied but keep the value as evidence, not as a fetch target.
  if (evidence.url?.trim()) {
    try {
      const parsed = new URL(evidence.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol');
    } catch {
      throw new AppError(400, 'invalid_evidence_url', 'Enter a valid http(s) confirmation URL.');
    }
  }
  const now = new Date().toISOString();
  const submissionEvidence = {
    url: evidence.url?.trim() || null,
    reference: evidence.reference?.trim() || null,
    recordedAt: now,
  };
  await db.query(
    "UPDATE applications SET status = 'Submitted', submission_evidence = $2, submitted_at = $3, updated_at = $3 WHERE id = $1",
    [applicationId, JSON.stringify(submissionEvidence), now],
  );
  await insertEvent(
    db,
    applicationId,
    'Submitted',
    `Submission recorded by the candidate. Evidence: ${submissionEvidence.reference || submissionEvidence.url}.${evidence.note ? ` ${evidence.note}` : ''}`,
  );
  await createNotification(db, {
    userId: candidateId,
    title: `Submission recorded: ${row.job_title}`,
    message: `${row.company} — the platform recorded your manually submitted application and confirmation evidence.`,
    type: 'application',
    jobId: row.job_id,
    dedupeKey: `application-submitted-${applicationId}`,
  });
  return {
    ...mapApplicationRow(row),
    status: 'Submitted',
    submittedAt: now,
    updatedAt: now,
    submissionEvidence,
    outcomeUnknown: true,
  };
}

export async function updateApplicationStatus(
  db: Database,
  candidateId: string,
  applicationId: string,
  status: ApplicationStatus,
  note?: string | null,
): Promise<ApplicationRecord> {
  if (status === 'Submitted') {
    throw new AppError(
      400,
      'submission_evidence_required',
      'Use the submission recording endpoint with confirmation evidence; status cannot be changed to Submitted directly.',
    );
  }
  const result = await db.query<ApplicationRow>(
    'SELECT * FROM applications WHERE id = $1 AND candidate_id = $2',
    [applicationId, candidateId],
  );
  const row = result.rows[0];
  if (!row) throw new AppError(404, 'application_not_found', 'This application does not exist.');
  if (!ALLOWED_TRANSITIONS[row.status].includes(status)) {
    throw new AppError(
      409,
      'invalid_status_transition',
      `Cannot change status from ${row.status} to ${status}.`,
      { allowed: ALLOWED_TRANSITIONS[row.status] },
    );
  }
  const now = new Date().toISOString();
  await db.query('UPDATE applications SET status = $2, updated_at = $3 WHERE id = $1', [
    applicationId,
    status,
    now,
  ]);
  await insertEvent(db, applicationId, status, note?.trim() || null);
  return { ...mapApplicationRow(row), status, updatedAt: now, outcomeUnknown: isOutcomeUnknown(status) };
}

export async function updateApplicationNotes(
  db: Database,
  candidateId: string,
  applicationId: string,
  notes: string,
): Promise<ApplicationRecord> {
  const result = await db.query<ApplicationRow>(
    'SELECT * FROM applications WHERE id = $1 AND candidate_id = $2',
    [applicationId, candidateId],
  );
  const row = result.rows[0];
  if (!row) throw new AppError(404, 'application_not_found', 'This application does not exist.');
  const now = new Date().toISOString();
  await db.query('UPDATE applications SET notes = $2, updated_at = $3 WHERE id = $1', [
    applicationId,
    notes.trim() || null,
    now,
  ]);
  await insertEvent(db, applicationId, 'Note', notes.trim());
  return { ...mapApplicationRow(row), notes: notes.trim() || null, updatedAt: now };
}
