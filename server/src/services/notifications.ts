import type { NotificationRecord } from '../../../shared/types.js';
import { config } from '../config.js';
import type { Database } from '../db/index.js';
import { logger } from '../logger.js';
import { getSettings } from './profiles.js';

export async function createNotification(
  db: Database,
  input: {
    userId: string;
    title: string;
    message: string;
    type: NotificationRecord['type'];
    jobId?: string | null;
    dedupeKey: string;
  },
): Promise<boolean> {
  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const existing = await db.query('SELECT id FROM notifications WHERE user_id = $1 AND dedupe_key = $2', [
    input.userId,
    input.dedupeKey,
  ]);
  if (existing.rows.length > 0) return false;
  try {
    await db.query(
      `INSERT INTO notifications (id, user_id, title, message, type, job_id, read, dedupe_key, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8)`,
      [id, input.userId, input.title, input.message, input.type, input.jobId || null, input.dedupeKey, now],
    );
    void dispatchNotificationWebhook({ ...input, createdAt: now });
    return true;
  } catch {
    // A concurrent insert with the same dedupe key is the only expected error.
    return false;
  }
}

async function dispatchNotificationWebhook(payload: {
  title: string;
  message: string;
  type: string;
  createdAt: string;
}): Promise<void> {
  if (!config.notificationWebhookUrl) return;
  try {
    await fetch(config.notificationWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `**${payload.title}**\n${payload.message}`,
        text: `${payload.title}\n${payload.message}`,
      }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (error) {
    logger.warn('notification_webhook_failed', { error: error instanceof Error ? error.message : String(error) });
  }
}

export async function listNotifications(db: Database, userId: string): Promise<NotificationRecord[]> {
  const result = await db.query<{
    id: string;
    title: string;
    message: string;
    type: NotificationRecord['type'];
    job_id: string | null;
    read: number;
    created_at: string;
  }>('SELECT id, title, message, type, job_id, read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200', [
    userId,
  ]);
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    jobId: row.job_id,
    read: Boolean(row.read),
    createdAt: row.created_at,
  }));
}

export async function markNotificationRead(db: Database, userId: string, notificationId: string): Promise<void> {
  await db.query('UPDATE notifications SET read = 1 WHERE id = $1 AND user_id = $2', [notificationId, userId]);
}

export async function markAllNotificationsRead(db: Database, userId: string): Promise<void> {
  await db.query('UPDATE notifications SET read = 1 WHERE user_id = $1', [userId]);
}

export async function deleteNotification(db: Database, userId: string, notificationId: string): Promise<void> {
  await db.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [notificationId, userId]);
}

export async function scanDeadlines(
  db: Database,
  userId: string,
): Promise<{ closingSoon: number; passed: number; notificationsCreated: number }> {
  const settings = await getSettings(db, userId);
  if (!settings.notifyDeadlines) return { closingSoon: 0, passed: 0, notificationsCreated: 0 };

  const rows = await db.query<{
    id: string;
    title: string;
    company: string;
    location: string;
    workplace_type: string;
    employment_type: string;
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
    fingerprint: string;
    company_domain: string | null;
    experience_min: number | null;
    experience_max: number | null;
    salary: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT DISTINCT j.* FROM jobs j
     LEFT JOIN saved_jobs s ON s.job_id = j.id AND s.candidate_id = $1
     LEFT JOIN applications a ON a.job_id = j.id AND a.candidate_id = $1
     WHERE s.job_id IS NOT NULL OR a.id IS NOT NULL`,
    [userId],
  );
  const { mapJobRow } = await import('./jobRepository.js');
  let closingSoon = 0;
  let passed = 0;
  let notificationsCreated = 0;
  for (const row of rows.rows) {
    const job = mapJobRow(row);
    if (job.deadline.status === 'Closing Soon' && job.deadline.date) {
      closingSoon += 1;
      const created = await createNotification(db, {
        userId,
        title: `Deadline in ${job.deadline.daysRemaining} day(s): ${job.title}`,
        message: `${job.company} — ${job.location}. Deadline ${job.deadline.date}. Verify the closing date on the employer page before applying.`,
        type: 'deadline',
        jobId: job.id,
        dedupeKey: `deadline-closing-${job.id}-${job.deadline.date}`,
      });
      if (created) notificationsCreated += 1;
    } else if (job.deadline.status === 'Deadline Passed' && job.deadline.date) {
      passed += 1;
      const created = await createNotification(db, {
        userId,
        title: `Deadline passed: ${job.title}`,
        message: `${job.company} — the recorded deadline was ${job.deadline.date}. It is no longer treated as an open opportunity unless the employer confirms otherwise.`,
        type: 'deadline',
        jobId: job.id,
        dedupeKey: `deadline-passed-${job.id}-${job.deadline.date}`,
      });
      if (created) notificationsCreated += 1;
    }
  }
  return { closingSoon, passed, notificationsCreated };
}
