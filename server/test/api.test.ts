import request from 'supertest';
import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createDatabase, type Database } from '../src/db/index.js';
import { seedDemoData } from '../src/db/seed.js';

let db: Database;
let app: Express;
let agent: ReturnType<typeof request.agent>;
let csrf = '';
let jobId = '';
let applicationId = '';
let interviewId = '';
let roadmapId = '';

function tomorrow(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

beforeAll(async () => {
  db = await createDatabase();
  await seedDemoData(db);
  app = await createApp(db);
  agent = request.agent(app);
  const login = await agent.post('/api/v1/auth/demo-login').send({});
  expect(login.status).toBe(200);
  csrf = login.body.csrfToken as string;
  expect(csrf.length).toBeGreaterThan(20);
});

afterAll(async () => {
  await db.close();
});

describe('API health and authentication', () => {
  it('reports health without leaking private configuration', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('pg-mem');
    expect(response.body.durableStorage).toBe(false);
    expect(response.body.engineVersion).toBe('2.0.0');
  });

  it('rejects unauthenticated access to candidate data', async () => {
    const response = await request(app).get('/api/v1/dashboard');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('authentication_required');
  });

  it('returns the signed-in demo user and profile', async () => {
    const response = await agent.get('/api/v1/auth/me');
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('demo@aijobhunter.local');
    expect(response.body.demo).toBe(true);
    expect(response.body.profile.skills).toContain('React');
  });

  it('requires CSRF for cookie-authenticated mutations', async () => {
    const response = await agent.put('/api/v1/profile').send({ headline: 'CSRF should block this' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('csrf_validation_failed');
  });

  it('registers a new account with hashed credentials and empty profile data', async () => {
    const newAgent = request.agent(app);
    const email = `test-${Date.now()}@example.com`;
    const response = await newAgent.post('/api/v1/auth/register').send({
      name: 'Integration Test User',
      email,
      password: 'SecurePass123',
    });
    expect(response.status).toBe(201);
    const csrfToken = response.body.csrfToken as string;
    const profile = await newAgent.get('/api/v1/profile');
    expect(profile.status).toBe(200);
    expect(profile.body.profile.email).toBe(email);
    expect(profile.body.profile.skills).toEqual([]);
    const update = await newAgent
      .put('/api/v1/profile')
      .set('x-csrf-token', csrfToken)
      .send({ headline: 'Backend Developer', skills: ['Python', 'PostgreSQL'] });
    expect(update.status).toBe(200);
    expect(update.body.profile.headline).toBe('Backend Developer');
  });
});

describe('discovery, jobs, matching and research', () => {
  it('serves persisted jobs with transparent match evidence', async () => {
    const response = await agent.get('/api/v1/jobs?pageSize=10&sort=match');
    expect(response.status).toBe(200);
    expect(response.body.total).toBeGreaterThan(20);
    const first = response.body.items[0];
    expect(first.match.formula).toContain('Weighted evidence score');
    expect(first.deadline.status).toBeTruthy();
    jobId = first.id;
  });

  it('filters and paginates jobs', async () => {
    const response = await agent.get('/api/v1/jobs?pageSize=5&page=2&sort=newest');
    expect(response.status).toBe(200);
    expect(response.body.page).toBe(2);
    expect(response.body.items.length).toBeLessThanOrEqual(5);
    const detail = await agent.get(`/api/v1/jobs/${jobId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(jobId);
  });

  it('builds a persisted skill-gap report with explicit weights', async () => {
    const response = await agent
      .post('/api/v1/skills/gap')
      .set('x-csrf-token', csrf)
      .send({ targetRole: 'Full Stack Developer', limit: 25 });
    expect(response.status).toBe(200);
    expect(response.body.jobCount).toBeGreaterThan(0);
    expect(response.body.gapPercentage).toBeGreaterThanOrEqual(0);
    expect(response.body.formula).toContain('weighted');
    const latest = await agent.get('/api/v1/skills/gap/latest');
    expect(latest.body.targetRole).toBe('Full Stack Developer');
  });

  it('returns company evidence without inventing employee counts', async () => {
    const response = await agent.get('/api/v1/companies');
    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThan(0);
    const company = response.body.items[0];
    expect(company).toHaveProperty('jobCount');
    expect(company).not.toHaveProperty('employeeCount');
  });

  it('saves and unsaves a job idempotently', async () => {
    const save = await agent.post(`/api/v1/jobs/${jobId}/save`).set('x-csrf-token', csrf).send({});
    expect(save.status).toBe(200);
    expect(save.body.saved).toBe(true);
    const unsave = await agent.delete(`/api/v1/jobs/${jobId}/save`).set('x-csrf-token', csrf);
    expect(unsave.status).toBe(200);
    expect(unsave.body.saved).toBe(false);
  });
});

describe('authenticity, duplicate guard and application workflow', () => {
  it('runs a rule-based authenticity screen', async () => {
    const response = await agent.post(`/api/v1/jobs/${jobId}/authenticity`).set('x-csrf-token', csrf).send({});
    expect(response.status).toBe(200);
    expect(response.body.disclaimer).toContain('not a determination');
    const latest = await agent.get(`/api/v1/jobs/${jobId}/authenticity`);
    expect(latest.body.jobId).toBe(jobId);
  });

  it('prepares, approves and records a manually submitted application', async () => {
    const duplicateBefore = await agent.post(`/api/v1/jobs/${jobId}/duplicates`).set('x-csrf-token', csrf).send({});
    expect(duplicateBefore.body.blocked).toBe(false);

    const prepare = await agent
      .post('/api/v1/applications/prepare')
      .set('x-csrf-token', csrf)
      .send({ jobId, coverLetter: 'A truthful test cover letter.', screeningAnswers: { notice: '30 days' } });
    expect(prepare.status).toBe(201);
    expect(prepare.body.application.status).toBe('Prepared');
    expect(prepare.body.application.outcomeUnknown).toBe(false);
    applicationId = prepare.body.application.id;

    const duplicateAfter = await agent.post(`/api/v1/jobs/${jobId}/duplicates`).set('x-csrf-token', csrf).send({});
    expect(duplicateAfter.body.blocked).toBe(true);
    expect(duplicateAfter.body.exactDuplicates).toHaveLength(1);

    const blocked = await agent.post('/api/v1/applications/prepare').set('x-csrf-token', csrf).send({ jobId });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('duplicate_application');

    const cannotSubmitPreparedApproval = await agent
      .post(`/api/v1/applications/${applicationId}/submit`)
      .set('x-csrf-token', csrf)
      .send({ reference: 'REF-BEFORE-APPROVAL' });
    expect(cannotSubmitPreparedApproval.status).toBe(409);

    const approve = await agent.post(`/api/v1/applications/${applicationId}/approve`).set('x-csrf-token', csrf).send({});
    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe('Approved');

    const noEvidence = await agent.post(`/api/v1/applications/${applicationId}/submit`).set('x-csrf-token', csrf).send({});
    expect(noEvidence.status).toBe(400);
    expect(noEvidence.body.error.code).toBe('submission_evidence_required');

    const submit = await agent
      .post(`/api/v1/applications/${applicationId}/submit`)
      .set('x-csrf-token', csrf)
      .send({ reference: 'TEST-CONFIRMATION-123', note: 'Local integration test. Not a real employer submission.' });
    expect(submit.status).toBe(200);
    expect(submit.body.status).toBe('Submitted');
    expect(submit.body.submissionEvidence.reference).toBe('TEST-CONFIRMATION-123');
    expect(submit.body.outcomeUnknown).toBe(true);

    const detail = await agent.get(`/api/v1/applications/${applicationId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.events.map((event: { type: string }) => event.type)).toEqual(
      expect.arrayContaining(['Prepared', 'Approved', 'Submitted']),
    );
  });

  it('enforces valid status transitions and records outcomes', async () => {
    const invalid = await agent
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('x-csrf-token', csrf)
      .send({ status: 'Approved' });
    expect(invalid.status).toBe(409);

    const interview = await agent
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('x-csrf-token', csrf)
      .send({ status: 'Interview', note: 'Recruiter email received in the integration test fixture.' });
    expect(interview.status).toBe(200);
    expect(interview.body.status).toBe('Interview');
    const offer = await agent
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('x-csrf-token', csrf)
      .send({ status: 'Offer' });
    expect(offer.status).toBe(200);
    expect(offer.body.outcomeUnknown).toBe(false);
    const analytics = await agent.get('/api/v1/analytics');
    expect(analytics.body.counts.submitted).toBe(1);
    expect(analytics.body.counts.offers).toBe(1);
    expect(analytics.body.rates.find((rate: { key: string }) => rate.key === 'offer').value).toBe(100);
  });
});

describe('interview practice, roadmaps, deadlines and analytics', () => {
  it('creates and evaluates an interview session', async () => {
    const create = await agent
      .post('/api/v1/interviews')
      .set('x-csrf-token', csrf)
      .send({ jobId, difficulty: 'Intermediate' });
    expect(create.status).toBe(201);
    expect(create.body.questions.length).toBeGreaterThanOrEqual(8);
    interviewId = create.body.id;
    const question = create.body.questions[0];
    const answer = await agent
      .post(`/api/v1/interviews/${interviewId}/answers`)
      .set('x-csrf-token', csrf)
      .send({
        questionId: question.id,
        answer:
          'In my project I built a React dashboard with FastAPI and PostgreSQL. I measured a 30% reduction in page load time and documented the trade-off between caching and complexity.',
        confidence: 4,
      });
    expect(answer.status).toBe(200);
    expect(answer.body.evaluation.score).toBeGreaterThan(0);
    const complete = await agent.post(`/api/v1/interviews/${interviewId}/complete`).set('x-csrf-token', csrf).send({});
    expect(complete.status).toBe(200);
    expect(complete.body.session.status).toBe('Completed');
    expect(complete.body.report.score).toBeGreaterThan(0);
  });

  it('generates an eight-stage roadmap and persists milestone progress', async () => {
    const create = await agent
      .post('/api/v1/roadmaps')
      .set('x-csrf-token', csrf)
      .send({ targetRole: 'Full Stack Developer', weeklyHours: 8, experienceLevel: 'entry' });
    expect(create.status).toBe(201);
    expect(create.body.stages).toHaveLength(8);
    roadmapId = create.body.id;
    const key = create.body.milestones[0].key;
    const toggle = await agent
      .patch(`/api/v1/roadmaps/${roadmapId}/milestones/${key}`)
      .set('x-csrf-token', csrf)
      .send({ completed: true });
    expect(toggle.status).toBe(200);
    expect(toggle.body.progress).toBeGreaterThan(0);
    expect(toggle.body.milestones[0].completed).toBe(true);
  });

  it('rejects inverted or missing salary evidence rather than inventing it', async () => {
    const salaries = await agent.get('/api/v1/salaries');
    expect(salaries.status).toBe(200);
    expect(salaries.body.observations.length).toBeGreaterThan(0);
    expect(salaries.body.methodology).toContain('never converted');
    for (const observation of salaries.body.observations) {
      expect(observation.sourceUrl).toMatch(/^https?:\/\//);
      expect(observation.max).toBeGreaterThanOrEqual(observation.min);
    }
  });

  it('adds a manual job with an explicit deadline and detects closing soon', async () => {
    const manual = await agent
      .post('/api/v1/jobs/manual')
      .set('x-csrf-token', csrf)
      .send({
        title: 'Verification Test Engineer',
        company: 'Evidence Test Company',
        location: 'Chennai, India',
        workplaceType: 'Hybrid',
        employmentType: 'Full-time',
        applyUrl: `https://example.com/careers/verification-${Date.now()}`,
        description:
          'This is a manually entered, clearly labelled verification fixture used to test deadline handling. It is not a real employer posting and must not be treated as one. It contains enough text for validation.',
        deadlineDate: tomorrow(3),
        skills: ['JavaScript', 'SQL'],
      });
    expect(manual.status).toBe(201);
    expect(manual.body.deadline.status).toBe('Closing Soon');
    const board = await agent.get('/api/v1/deadlines?includeAll=true');
    expect(board.status).toBe(200);
    expect(board.body.items.some((item: { jobId: string }) => item.jobId === manual.body.id)).toBe(true);
    expect(board.body.summary.closingSoon).toBeGreaterThanOrEqual(1);
  });

  it('allows a manually verified deadline to be recorded', async () => {
    const response = await agent
      .patch(`/api/v1/jobs/${jobId}/deadline`)
      .set('x-csrf-token', csrf)
      .send({ date: tomorrow(45), note: 'Verified on the employer careers page in the integration fixture.' });
    expect(response.status).toBe(200);
    expect(response.body.deadline.date).toBe(tomorrow(45));
    expect(response.body.deadline.status).toBe('Open');
  });

  it('scans deadlines and lists notifications', async () => {
    const scan = await agent.post('/api/v1/deadlines/scan').set('x-csrf-token', csrf).send({});
    expect(scan.status).toBe(200);
    expect(scan.body).toHaveProperty('notificationsCreated');
    const notifications = await agent.get('/api/v1/notifications');
    expect(notifications.status).toBe(200);
    expect(notifications.body.items.length).toBeGreaterThan(0);
    expect(notifications.body.unread).toBeGreaterThan(0);
    const read = await agent.post('/api/v1/notifications/read-all').set('x-csrf-token', csrf).send({});
    expect(read.status).toBe(200);
    const after = await agent.get('/api/v1/notifications');
    expect(after.body.unread).toBe(0);
  });

  it('returns analytics with explicit rate definitions and data-derived recommendations', async () => {
    const response = await agent.get('/api/v1/analytics?days=90');
    expect(response.status).toBe(200);
    expect(response.body.counts.discovered).toBeGreaterThan(0);
    expect(response.body.rates.length).toBeGreaterThanOrEqual(8);
    expect(response.body.rates[0].definition).toBeTruthy();
    expect(response.body.weekly.length).toBe(8);
    expect(response.body.monthly.length).toBe(6);
    expect(response.body.recommendations.length).toBeGreaterThan(0);
  });

  it('exposes integration and scheduler status honestly', async () => {
    const response = await agent.get('/api/v1/integrations');
    expect(response.status).toBe(200);
    const keys = response.body.integrations.map((item: { key: string }) => item.key);
    expect(keys).toEqual(expect.arrayContaining(['remotive', 'greenhouse', 'lever', 'open-model', 'github']));
    expect(response.body.database).toBe('pg-mem');
    expect(response.body.demoMode).toBe(true);
  });
});
