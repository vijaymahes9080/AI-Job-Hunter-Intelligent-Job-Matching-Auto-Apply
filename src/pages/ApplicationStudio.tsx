import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Layers,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  ApplicationRecord,
  CandidateProfile,
  DuplicateCheckResult,
  JobPosting,
} from '../../shared/types';
import { ApiError, api, errorMessage } from '../lib/api';
import { formatDate, salaryLabel, statusTone } from '../lib/format';
import { useSession } from '../lib/session';
import type { RoutePath } from '../lib/router';
import { JobSelector } from '../components/JobSelector';
import {
  Badge,
  Button,
  Card,
  CheckItem,
  EmptyState,
  ErrorNotice,
  Field,
  InfoRow,
  Input,
  LoadingBlock,
  PageHeader,
  Progress,
  ScoreRing,
  SectionTitle,
  Textarea,
} from '../components/ui';

const DEFAULT_QUESTIONS = [
  'Why are you interested in this role?',
  'What relevant experience can you evidence?',
  'What is your notice period?',
  'What are your salary expectations?',
];

function draftCoverLetter(profile: CandidateProfile | null, job: JobPosting): string {
  const skills = (job.match?.matchingSkills || []).map((item) => item.skill).slice(0, 5);
  const evidence = skills.length ? skills.join(', ') : profile?.skills.slice(0, 5).join(', ') || 'the skills listed in my profile';
  return [
    `Dear ${job.company} Hiring Team,`,
    '',
    `I am applying for the ${job.title} role. ${profile?.summary || 'My profile contains the verified experience and project evidence for this application.'}`,
    '',
    `The evidence in my profile overlaps with this posting on: ${evidence}. I have not added experience or skills that are absent from my verified profile.`,
    '',
    'I would welcome the opportunity to discuss how my background matches the published requirements.',
    '',
    'Sincerely,',
    profile?.name || 'Candidate',
  ].join('\n');
}

export function ApplicationStudioPage({ navigate }: { navigate: (path: RoutePath) => void }) {
  const { profile, settings } = useSession();
  const [jobId, setJobId] = useState(() => localStorage.getItem('ajh-studio-job') || '');
  const [job, setJob] = useState<JobPosting | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateCheckResult | null>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [applicationUrl, setApplicationUrl] = useState('');
  const [resumeLabel, setResumeLabel] = useState(profile?.resumeFileName || '');
  const [coverLetter, setCoverLetter] = useState('');
  const [screeningAnswers, setScreeningAnswers] = useState<Array<{ question: string; answer: string }>>(
    DEFAULT_QUESTIONS.map((question) => ({ question, answer: '' })),
  );
  const [overrideReason, setOverrideReason] = useState('');
  const [notes, setNotes] = useState('');
  const [prepared, setPrepared] = useState<ApplicationRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setDuplicate(null);
      return;
    }
    let cancelled = false;
    setJobLoading(true);
    setPrepared(null);
    setError(null);
    setNotice(null);
    api.jobs
      .get(jobId)
      .then((loaded) => {
        if (cancelled) return;
        setJob(loaded);
        setResumeLabel(loaded.title ? profile?.resumeFileName || 'Profile resume text' : '');
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setJobLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const runDuplicateCheck = async (id = jobId) => {
    if (!id) return null;
    setDuplicateLoading(true);
    setDuplicateError(null);
    try {
      const result = await api.duplicates.check(id, applicationUrl.trim() || undefined);
      setDuplicate(result);
      return result;
    } catch (caught) {
      setDuplicateError(errorMessage(caught));
      return null;
    } finally {
      setDuplicateLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;
    void runDuplicateCheck(jobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const selectJob = (selected: JobPosting | null) => {
    const nextId = selected?.id || '';
    setJobId(nextId);
    setJob(selected);
    if (nextId) localStorage.setItem('ajh-studio-job', nextId);
    else localStorage.removeItem('ajh-studio-job');
    setApplicationUrl('');
    setDuplicate(null);
    setPrepared(null);
    setError(null);
    setNotice(null);
  };

  const prepare = async () => {
    if (!job) {
      setError('Select a job before preparing an application.');
      return;
    }
    if (job.application) {
      setError(`An application already exists for this role (status: ${job.application.status}).`);
      return;
    }
    const answers: Record<string, string> = {};
    for (const item of screeningAnswers) {
      if (item.question.trim() && item.answer.trim()) answers[item.question.trim()] = item.answer.trim();
    }
    if (duplicate?.similar.length && !overrideReason.trim()) {
      setError('A similar application exists. Review it and record why this is a different opportunity before preparing.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.applications.prepare({
        jobId: job.id,
        resumeLabel: resumeLabel.trim() || null,
        coverLetter: coverLetter.trim() || null,
        screeningAnswers: answers,
        duplicateOverrideReason: overrideReason.trim() || null,
        notes: notes.trim() || null,
      });
      setPrepared(result.application);
      setDuplicate(result.duplicate);
      setNotice('Application prepared. Review the stored content, then approve it in Applications before submitting.');
      window.dispatchEvent(new Event('ajh:notifications-changed'));
    } catch (caught) {
      if (caught instanceof ApiError) {
        const details = caught.details as { duplicate?: DuplicateCheckResult } | undefined;
        if (details?.duplicate) setDuplicate(details.duplicate);
      }
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const matchingSkills = job?.match?.matchingSkills || [];
  const missingSkills = job?.match?.missingSkills || [];
  const rankedQuestions = useMemo(() => {
    if (!job) return DEFAULT_QUESTIONS;
    const specific = [
      `How would you demonstrate the ${job.title} requirements in your first 90 days?`,
      ...(missingSkills.slice(0, 2).map((skill) => `How would you address the ${skill.skill} requirement?`)),
    ];
    return [...DEFAULT_QUESTIONS, ...specific];
  }, [job, missingSkills]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Apply"
        title="Application Studio"
        description="Prepare accurate, editable application content from your verified profile. Duplicate checks run before preparation; approval and submission stay in your hands."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('discovery')}><Layers size={15} /> Browse jobs</Button>
            <Button onClick={() => navigate('applications')}><ClipboardCheck size={15} /> Open pipeline</Button>
          </>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}
      {notice ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-[rgba(52,211,153,0.3)] bg-[var(--success-soft)] px-4 py-3 text-xs leading-relaxed text-[var(--success)]">
          <span>{notice}</span>
          {prepared ? <Button size="sm" variant="secondary" onClick={() => navigate('applications')}>Review <ArrowRight size={13} /></Button> : null}
        </div>
      ) : null}

      <Card className="p-3.5">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <Field label="Select a persisted job" hint={job ? `${job.company} · ${job.sourceName} · retrieved ${formatDate(job.retrievedAt)}` : 'The Studio starts from a real stored posting.'}>
            <JobSelector value={jobId} onChange={selectJob} placeholder="Choose a role to prepare" />
          </Field>
          <Field label="Final application URL (optional)" hint="Paste the URL you will actually submit to; it is normalised for duplicate checking.">
            <Input value={applicationUrl} onChange={(event) => setApplicationUrl(event.target.value)} placeholder="https://boards.greenhouse.io/..." />
          </Field>
          <Button variant="secondary" onClick={() => void runDuplicateCheck()} loading={duplicateLoading} disabled={!jobId}>
            <RefreshCw size={14} /> Re-check
          </Button>
        </div>
      </Card>

      {jobLoading ? <LoadingBlock label="Loading the selected job evidence…" /> : null}

      {!jobId ? (
        <Card className="p-6">
          <EmptyState
            icon={<Layers size={20} />}
            title="Choose a role to prepare"
            description="Saved jobs and discovered postings both work. The duplicate guard, match evidence and application content all come from persisted records."
            action={<Button onClick={() => navigate('discovery')}>Find a job <ArrowRight size={14} /></Button>}
          />
        </Card>
      ) : null}

      {job ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_350px]">
          <div className="space-y-4">
            <Card className="glass-highlight p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-[var(--text)]">{job.title}</h2>
                    <Badge tone="info">{job.workplaceType}</Badge>
                    <Badge>{job.employmentType}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{job.company} · {job.location} · {job.sourceName}</p>
                  <p className="mt-1 text-[0.68rem] text-[var(--muted-2)]">Published salary: {salaryLabel(job.salary)} · Deadline: {job.deadline.date || 'Not specified'}</p>
                </div>
                <ScoreRing value={job.match?.overall || 0} size={78} label="Match" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {matchingSkills.slice(0, 8).map((skill) => <span key={skill.skill} className="chip text-[var(--success)]">{skill.skill}</span>)}
                {missingSkills.slice(0, 5).map((skill) => <span key={skill.skill} className="chip text-[var(--danger)]">missing: {skill.skill}</span>)}
              </div>
              {job.application ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[rgba(251,191,36,0.3)] bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning)]">
                  <AlertTriangle size={14} /> An application already exists for this role.
                  <Badge tone={statusTone(job.application.status)}>{job.application.status}</Badge>
                </div>
              ) : null}
            </Card>

            <Card className="p-4">
              <SectionTitle
                title="Cover letter"
                description="Start from your verified profile if useful, then edit every claim. The platform cannot verify statements you add."
                actions={
                  <Button size="sm" variant="secondary" onClick={() => setCoverLetter(draftCoverLetter(profile, job))}>
                    <Sparkles size={13} /> Draft from profile
                  </Button>
                }
              />
              <Textarea
                rows={12}
                value={coverLetter}
                onChange={(event) => setCoverLetter(event.target.value)}
                placeholder="Write a specific, truthful cover letter. Explicitly leave out claims you cannot evidence."
              />
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[0.65rem] text-[var(--muted-2)]">
                <span>{coverLetter.trim().split(/\s+/).filter(Boolean).length} words</span>
                <span>Stored with the prepared application, not sent automatically.</span>
              </div>
            </Card>

            <Card className="p-4">
              <SectionTitle
                title="Screening answers"
                description="Only answer questions that actually appear in the employer's process. Blank answers are not stored."
                actions={
                  <Button size="sm" variant="secondary" onClick={() => setScreeningAnswers([...screeningAnswers, { question: '', answer: '' }])}>
                    <Plus size={13} /> Add question
                  </Button>
                }
              />
              <div className="space-y-3">
                {screeningAnswers.map((item, index) => (
                  <div key={index} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <Field label={`Question ${index + 1}`}>
                          <Input
                            list={index < rankedQuestions.length ? 'studio-question-suggestions' : undefined}
                            value={item.question}
                            onChange={(event) => setScreeningAnswers(screeningAnswers.map((entry, entryIndex) => entryIndex === index ? { ...entry, question: event.target.value } : entry))}
                            placeholder="Question from the employer application"
                          />
                        </Field>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove question"
                        className="mt-6 rounded-lg p-1.5 text-[var(--muted-2)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                        onClick={() => setScreeningAnswers(screeningAnswers.filter((_, entryIndex) => entryIndex !== index))}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <Field label="Your answer" className="mt-2">
                      <Textarea
                        rows={3}
                        value={item.answer}
                        onChange={(event) => setScreeningAnswers(screeningAnswers.map((entry, entryIndex) => entryIndex === index ? { ...entry, answer: event.target.value } : entry))}
                        placeholder="A truthful, concise answer based on your experience"
                      />
                    </Field>
                  </div>
                ))}
              </div>
              <datalist id="studio-question-suggestions">
                {rankedQuestions.map((question) => <option key={question} value={question} />)}
              </datalist>
            </Card>

            <Card className="p-4">
              <SectionTitle title="Preparation notes" description="Private notes stored with the application record." />
              <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Recruiter contact, referral details, follow-up plan…" />
            </Card>
          </div>

          <div className="space-y-4">
            <Card className={`p-4 ${duplicate?.blocked ? 'border-[rgba(251,113,133,0.35)]' : duplicate?.similar.length ? 'border-[rgba(251,191,36,0.35)]' : ''}`}>
              <SectionTitle
                title="Duplicate guard"
                description="Compares the stored job, normalised URL, company and title with your application history."
                actions={<Button size="sm" variant="ghost" onClick={() => void runDuplicateCheck()} loading={duplicateLoading}><RefreshCw size={13} /></Button>}
              />
              {duplicateError ? <ErrorNotice message={duplicateError} /> : null}
              {duplicate ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {duplicate.blocked ? <XCircle size={17} className="text-[var(--danger)]" /> : duplicate.similar.length ? <AlertTriangle size={17} className="text-[var(--warning)]" /> : <CheckCircle2 size={17} className="text-[var(--success)]" />}
                    <span className="text-xs font-semibold text-[var(--text)]">
                      {duplicate.blocked ? 'Duplicate blocks preparation' : duplicate.similar.length ? 'Similar application needs review' : 'No duplicate found'}
                    </span>
                  </div>
                  <p className="text-[0.68rem] leading-relaxed text-[var(--muted)]">
                    {duplicate.blocked
                      ? 'An exact duplicate exists. Open the existing application instead of preparing another.'
                      : duplicate.similar.length
                        ? 'A different posting is very similar to one you already prepared. Review it and record a reason below.'
                        : 'No exact or similar application was found in this workspace.'}
                  </p>
                  {[...duplicate.exactDuplicates, ...duplicate.similar].slice(0, 4).map((match) => (
                    <div key={match.applicationId} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-[0.65rem]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[var(--text)]">{match.title}</span>
                        <Badge tone={statusTone(match.status)}>{match.status}</Badge>
                      </div>
                      <div className="mt-0.5 text-[var(--muted-2)]">{match.company} · similarity {Math.round(match.similarity * 100)}%</div>
                      <div className="mt-0.5 leading-relaxed text-[var(--muted)]">{match.reason}</div>
                    </div>
                  ))}
                  {duplicate.similar.length && !duplicate.blocked ? (
                    <Field label="Why is this a different opportunity?" hint="Stored with the application for audit.">
                      <Textarea rows={2} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Different team, location or scope — explain briefly." />
                    </Field>
                  ) : null}
                  <button type="button" className="text-[0.65rem] text-[var(--accent)] hover:underline" onClick={() => navigate('duplicates')}>Open full duplicate review</button>
                </div>
              ) : !duplicateLoading ? <p className="text-xs text-[var(--muted)]">Select a job to run the duplicate check.</p> : null}
            </Card>

            <Card className="p-4">
              <SectionTitle title="Prepare application" description="Stores the content and run evidence. Does not submit it." />
              <div className="space-y-2.5">
                <Field label="Resume label">
                  <Input value={resumeLabel} onChange={(event) => setResumeLabel(event.target.value)} placeholder="Profile resume text" />
                </Field>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-[0.65rem] leading-relaxed text-[var(--muted)]">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--text)]"><FileText size={12} /> Resume evidence</div>
                  {profile?.resumeText ? `${profile.resumeText.length.toLocaleString()} characters stored in your profile.` : 'No resume text stored yet. Add it in Resume & ATS for better analysis.'}
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-[0.65rem] leading-relaxed text-[var(--muted)]">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--text)]"><ShieldCheck size={12} /> Human approval required</div>
                  After preparing, open Applications, review the content, approve it, submit on the employer site and record your confirmation evidence.
                </div>
                <Button className="w-full" onClick={prepare} loading={busy} disabled={Boolean(job.application) || Boolean(duplicate?.blocked)}>
                  <ClipboardCheck size={14} /> Prepare for approval
                </Button>
                <p className="text-[0.62rem] leading-relaxed text-[var(--muted-2)]">
                  A duplicate, a missing profile or a blocking risk is shown as an error; it is never silently circumvented.
                </p>
              </div>
            </Card>

            <Card className="p-4">
              <SectionTitle title="Match evidence" description="The same weighted score used throughout the workspace." />
              {job.match ? (
                <div className="space-y-2">
                  {job.match.factors.map((factor) => (
                    <div key={factor.key}>
                      <div className="mb-0.5 flex justify-between text-[0.65rem]"><span className="text-[var(--muted-2)]">{factor.label}</span><span className="text-[var(--text)]">{Math.round(factor.score)}%</span></div>
                      <Progress value={factor.score} tone={factor.score >= 65 ? 'success' : factor.score >= 40 ? 'warning' : 'danger'} />
                    </div>
                  ))}
                  <p className="border-t border-[var(--border)] pt-2 text-[0.62rem] leading-relaxed text-[var(--muted-2)]">{job.match.formula}</p>
                </div>
              ) : <p className="text-xs text-[var(--muted)]">Match is unavailable until your profile has evidence.</p>}
            </Card>

            <Card className="p-4">
              <SectionTitle title="Preferences applied" />
              <dl>
                <InfoRow label="Match threshold">{settings?.matchThreshold ?? 60}%</InfoRow>
                <InfoRow label="Preferred workplace">{profile?.workplacePreferences?.join(', ') || 'Not set'}</InfoRow>
                <InfoRow label="Preferred roles">{profile?.preferredRoles?.slice(0, 3).join(', ') || 'Not set'}</InfoRow>
                <InfoRow label="Deadline alert">{settings?.notifyDeadlines ? 'Enabled' : 'Disabled'}</InfoRow>
              </dl>
            </Card>
          </div>
        </div>
      ) : null}

      {prepared ? (
        <Card className="glass-highlight p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]"><CheckCircle2 size={20} /></div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Application prepared for {prepared.company}</h3>
                <p className="mt-0.5 text-xs text-[var(--muted)]">Status: {prepared.status}. Match snapshot: {prepared.matchScore}%. Submission has not been recorded.</p>
                <p className="mt-1 text-[0.65rem] text-[var(--muted-2)]">Next: review in Applications, approve, submit on the employer site, then record confirmation evidence.</p>
              </div>
            </div>
            <Button onClick={() => navigate('applications')}>Review application <ArrowRight size={14} /></Button>
          </div>
        </Card>
      ) : null}

      <Card className="p-3.5">
        <SectionTitle title="What this page deliberately does not do" />
        <div className="grid gap-2 md:grid-cols-3">
          <CheckItem passed>Submit to an employer portal on your behalf</CheckItem>
          <CheckItem passed>Invent skills, employers or salary expectations</CheckItem>
          <CheckItem passed>Bypass a duplicate or approval requirement</CheckItem>
        </div>
      </Card>
    </div>
  );
}
