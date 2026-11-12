import { useEffect, useState } from 'react';
import { ExternalLink, ShieldCheck, Sparkles, CalendarCheck2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { AuthenticityResult, JobPosting } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { deadlineLabel, salaryLabel, statusTone } from '../lib/format';
import { Badge, Button, ErrorNotice, Field, Input, LoadingBlock, Modal, Progress, ScoreRing, Tabs } from './ui';

type DetailTab = 'overview' | 'match' | 'authenticity';

export function JobDetailModal({
  jobId,
  onClose,
  onPrepare,
  onChanged,
}: {
  jobId: string | null;
  onClose: () => void;
  onPrepare?: (jobId: string) => void;
  onChanged?: () => void;
}) {
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>('overview');
  const [saving, setSaving] = useState(false);
  const [authenticity, setAuthenticity] = useState<AuthenticityResult | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineNote, setDeadlineNote] = useState('');
  const [deadlineSaving, setDeadlineSaving] = useState(false);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTab('overview');
    setAuthenticity(null);
    setDeadlineDate('');
    setDeadlineNote('');
    api.jobs
      .get(jobId)
      .then((result) => {
        if (!cancelled) setJob(result);
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const toggleSave = async () => {
    if (!job) return;
    setSaving(true);
    try {
      if (job.isSaved) await api.jobs.unsave(job.id);
      else await api.jobs.save(job.id);
      setJob({ ...job, isSaved: !job.isSaved });
      onChanged?.();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const runAuthenticity = async () => {
    if (!job) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      setAuthenticity(await api.authenticity.run(job.id));
    } catch (caught) {
      setAuthError(errorMessage(caught));
    } finally {
      setAuthLoading(false);
    }
  };

  const saveDeadline = async () => {
    if (!job || !deadlineDate) return;
    setDeadlineSaving(true);
    setDeadlineError(null);
    try {
      const updated = await api.jobs.verifyDeadline(job.id, deadlineDate, deadlineNote.trim() || undefined);
      setJob(updated);
      setDeadlineNote('');
      onChanged?.();
    } catch (caught) {
      setDeadlineError(errorMessage(caught));
    } finally {
      setDeadlineSaving(false);
    }
  };

  const applyUrl = job ? (() => {
    try {
      const url = new URL(job.applyUrl);
      return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
    } catch {
      return null;
    }
  })() : null;

  return (
    <Modal
      open={Boolean(jobId)}
      onClose={onClose}
      title={job?.title || 'Job evidence'}
      description={job ? `${job.company} · ${job.location} · ${job.sourceName}` : undefined}
      width="max-w-4xl"
      footer={
        job ? (
          <>
            {applyUrl ? (
              <a href={applyUrl} target="_blank" rel="noreferrer noopener" className="btn btn-secondary btn-sm">
                <ExternalLink size={14} /> Employer posting
              </a>
            ) : null}
            <Button variant="secondary" size="sm" onClick={toggleSave} loading={saving}>
              {job.isSaved ? 'Remove from saved' : 'Save job'}
            </Button>
            {onPrepare ? (
              <Button size="sm" onClick={() => onPrepare(job.id)}>
                <Sparkles size={14} /> Prepare application
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {loading ? <LoadingBlock label="Loading the persisted job record…" rows={5} /> : null}
      {error ? <ErrorNotice message={error} /> : null}
      {job ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{job.workplaceType}</Badge>
            <Badge>{job.employmentType}</Badge>
            <Badge tone={statusTone(job.deadline.status)}>{job.deadline.status}</Badge>
            <Badge tone={job.salary ? 'success' : 'neutral'}>{job.salary ? salaryLabel(job.salary) : 'Salary not published'}</Badge>
            {job.isSaved ? <Badge tone="accent">Shortlisted</Badge> : null}
            {job.application ? <Badge tone="warning">{job.application.status}</Badge> : null}
          </div>

          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'overview', label: 'Overview' },
              { value: 'match', label: 'Match evidence' },
              { value: 'authenticity', label: 'Authenticity' },
            ]}
          />

          {tab === 'overview' ? (
            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">Published description</h3>
                  <p className="mt-1 text-[0.68rem] leading-relaxed text-[var(--muted-2)]">
                    Retrieved {new Date(job.retrievedAt).toLocaleString()} from {job.sourceName}. Formatting is
                    normalised; the employer page is the authoritative source.
                  </p>
                  <div className="scroll-thin mt-2 max-h-[340px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs leading-relaxed text-[var(--muted)]">
                    {job.description || 'No description was returned by the source.'}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">Published requirements detected</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {job.skills.length ? job.skills.map((skill) => <span key={skill} className="chip">{skill}</span>) : <span className="text-xs text-[var(--muted-2)]">No skills detected in the posting text.</span>}
                  </div>
                  <p className="mt-2 text-[0.68rem] text-[var(--muted-2)]">
                    Skills are extracted from the posting text. Absence does not prove a requirement is unimportant.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="card-flat p-3">
                  <div className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Compensation evidence</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--text)]">{salaryLabel(job.salary)}</div>
                  {job.salary?.rawText ? (
                    <blockquote className="mt-2 border-l-2 border-[var(--accent)] pl-2 text-[0.68rem] leading-relaxed text-[var(--muted)]">
                      “{job.salary.rawText}”
                    </blockquote>
                  ) : (
                    <p className="mt-1 text-[0.68rem] leading-relaxed text-[var(--muted-2)]">
                      No explicit pay range was found. Salary Intelligence does not estimate missing values.
                    </p>
                  )}
                  {job.salary ? <div className="mt-2"><Badge tone="info">source: {job.salary.source}</Badge></div> : null}
                </div>

                <div className="card-flat p-3">
                  <div className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Deadline evidence</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--text)]">{deadlineLabel(job.deadline)}</div>
                  {job.deadline.sourceSnippet ? (
                    <blockquote className="mt-2 border-l-2 border-[var(--warning)] pl-2 text-[0.68rem] leading-relaxed text-[var(--muted)]">
                      “{job.deadline.sourceSnippet}”
                    </blockquote>
                  ) : (
                    <p className="mt-1 text-[0.68rem] leading-relaxed text-[var(--muted-2)]">{job.deadline.note}</p>
                  )}
                  <div className="mt-2 flex items-center gap-1.5">
                    <Badge tone="neutral">confidence: {job.deadline.confidence}</Badge>
                  </div>
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <Field label="Verify on the employer page" hint="Only record a date you have actually seen on the employer's site.">
                      <div className="flex gap-1.5">
                        <Input type="date" value={deadlineDate} onChange={(event) => setDeadlineDate(event.target.value)} />
                        <Button size="sm" variant="secondary" onClick={saveDeadline} disabled={!deadlineDate} loading={deadlineSaving}>
                          <CalendarCheck2 size={14} /> Save
                        </Button>
                      </div>
                    </Field>
                    <Input className="mt-1.5" placeholder="Optional source note" value={deadlineNote} onChange={(event) => setDeadlineNote(event.target.value)} />
                    {deadlineError ? <p className="mt-1 text-xs text-[var(--danger)]">{deadlineError}</p> : null}
                  </div>
                </div>

                <div className="card-flat p-3">
                  <div className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Source record</div>
                  <dl className="mt-1 space-y-1 text-[0.68rem]">
                    <div className="flex justify-between gap-2"><dt className="text-[var(--muted-2)]">Source</dt><dd className="text-right text-[var(--text)]">{job.sourceName}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-[var(--muted-2)]">Source job ID</dt><dd className="text-right font-mono text-[var(--text)]">{job.sourceJobId}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-[var(--muted-2)]">Fingerprint</dt><dd className="max-w-[60%] truncate text-right font-mono text-[var(--text)]" title={job.fingerprint}>{job.fingerprint}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-[var(--muted-2)]">Posted</dt><dd className="text-right text-[var(--text)]">{job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'Not stated'}</dd></div>
                  </dl>
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'match' && job.match ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
              <div className="card-flat flex flex-col items-center justify-center gap-3 p-4">
                <ScoreRing value={job.match.overall} size={110} label="Evidence match" />
                <p className="text-center text-xs leading-relaxed text-[var(--muted)]">{job.match.summary}</p>
                <p className="text-center text-[0.65rem] text-[var(--muted-2)]">{job.match.experienceAssessment}</p>
                <div className="w-full space-y-2">
                  {job.match.factors.map((factor) => (
                    <div key={factor.key}>
                      <div className="mb-0.5 flex justify-between text-[0.65rem]"><span className="text-[var(--muted-2)]">{factor.label} · weight {factor.weight}%</span><span className="text-[var(--text)]">{Math.round(factor.score)}%</span></div>
                      <Progress value={factor.score} tone={factor.score >= 65 ? 'success' : factor.score >= 40 ? 'warning' : 'danger'} />
                    </div>
                  ))}
                </div>
                <p className="text-center text-[0.62rem] leading-relaxed text-[var(--muted-2)]">{job.match.formula}</p>
              </div>
              <div className="space-y-3">
                <div className="card-flat p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--success)]"><CheckCircle2 size={14} /> Matching evidence ({job.match.matchingSkills.length})</div>
                  <div className="space-y-1.5">
                    {job.match.matchingSkills.length ? job.match.matchingSkills.map((skill) => (
                      <div key={skill.skill} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">
                        <div className="flex justify-between text-xs"><span className="font-medium text-[var(--text)]">{skill.skill}</span><Badge tone={skill.importance === 'High' ? 'danger' : skill.importance === 'Medium' ? 'warning' : 'neutral'}>{skill.importance}</Badge></div>
                        <div className="mt-0.5 text-[0.65rem] text-[var(--muted-2)]">Required by {skill.requiredByJobs} of the analysed jobs · {skill.evidence.join(' · ')}</div>
                      </div>
                    )) : <p className="text-xs text-[var(--muted-2)]">No direct evidence was found.</p>}
                  </div>
                </div>
                <div className="card-flat p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--danger)]"><AlertTriangle size={14} /> Missing requirements ({job.match.missingSkills.length})</div>
                  <div className="flex flex-wrap gap-1">
                    {job.match.missingSkills.length ? job.match.missingSkills.map((skill) => <span key={skill.skill} className="chip text-[var(--danger)]">{skill.skill} · {skill.importance}</span>) : <span className="text-xs text-[var(--muted-2)]">No published requirements are missing from your evidence.</span>}
                  </div>
                </div>
                {job.match.partialSkills.length ? (
                  <div className="card-flat p-3">
                    <div className="mb-1.5 text-xs font-semibold text-[var(--warning)]">Related but not claimed ({job.match.partialSkills.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {job.match.partialSkills.map((skill) => <span key={skill.skill} className="chip text-[var(--warning)]">{skill.skill} · related {skill.evidence.join(', ')}</span>)}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === 'match' && !job.match ? (
            <p className="text-sm text-[var(--muted)]">Add profile skills and resume evidence to compute a match.</p>
          ) : null}

          {tab === 'authenticity' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
                <div>
                  <div className="text-xs font-semibold text-[var(--text)]">Transparent risk indicators</div>
                  <div className="text-[0.65rem] text-[var(--muted-2)]">Rule-based screen of the posting text and apply URL. Not a fraud determination.</div>
                </div>
                <Button size="sm" onClick={runAuthenticity} loading={authLoading}><ShieldCheck size={14} /> Run check</Button>
              </div>
              {authError ? <ErrorNotice message={authError} /> : null}
              {authenticity ? (
                <>
                  <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <ScoreRing value={authenticity.riskScore} size={88} label="Risk score" />
                    <div className="min-w-0 flex-1">
                      <Badge tone={authenticity.classification === 'Low Risk Indicators' ? 'success' : authenticity.classification === 'Needs Verification' ? 'warning' : 'danger'}>{authenticity.classification}</Badge>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{authenticity.recommendedAction}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {authenticity.indicators.map((indicator) => (
                      <div key={`${indicator.code}-${indicator.label}`} className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                        <Badge tone={indicator.severity === 'high' ? 'danger' : indicator.severity === 'medium' ? 'warning' : indicator.severity === 'low' ? 'info' : 'neutral'}>{indicator.severity}</Badge>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-[var(--text)]">{indicator.label} {indicator.verified ? <span className="text-[var(--success)]">· verified</span> : null}</div>
                          <div className="text-[0.68rem] leading-relaxed text-[var(--muted)]">{indicator.evidence}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="card-flat p-3">
                      <div className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--success)]">Verified evidence</div>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[0.68rem] leading-relaxed text-[var(--muted)]">
                        {authenticity.verifiedEvidence.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="card-flat p-3">
                      <div className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--warning)]">Unverified information</div>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[0.68rem] leading-relaxed text-[var(--muted)]">
                        {authenticity.unverifiedInformation.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  </div>
                  <p className="text-[0.65rem] leading-relaxed text-[var(--muted-2)]">{authenticity.disclaimer}</p>
                </>
              ) : !authLoading ? (
                <p className="text-xs text-[var(--muted-2)]">Run the check to see each indicator and its evidence. A low score does not guarantee legitimacy.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
