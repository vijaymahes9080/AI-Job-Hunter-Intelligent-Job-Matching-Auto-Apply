import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldCheck, ShieldQuestion } from 'lucide-react';
import type { AuthenticityResult, JobPosting } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { Badge, Button, Card, ErrorNotice, Field, LoadingBlock, PageHeader, ScoreRing, SectionTitle } from '../components/ui';
import { JobSelector } from '../components/JobSelector';

export function AuthenticityPage() {
  const [jobId, setJobId] = useState('');
  const [job, setJob] = useState<JobPosting | null>(null);
  const [result, setResult] = useState<AuthenticityResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setLoadingLatest(true);
    api.authenticity
      .latest(jobId)
      .then((latest) => {
        if (!cancelled) setResult(latest);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingLatest(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const run = async () => {
    if (!jobId) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await api.authenticity.run(jobId));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const classificationTone = result?.classification === 'Low Risk Indicators' ? 'success' : result?.classification === 'Needs Verification' ? 'warning' : 'danger';

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Research"
        title="Job Authenticity Screen"
        description="A transparent, rule-based review of posting text and apply URLs. It surfaces risk indicators; it cannot prove that an employer or posting is fraudulent."
        actions={<Button onClick={run} disabled={!jobId} loading={busy}><ShieldCheck size={15} /> Run authenticity check</Button>}
      />

      <Card className="p-3.5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Select a persisted job" hint={job ? `${job.company} · ${job.sourceName}` : 'Only stored postings can be screened.'}>
            <JobSelector value={jobId} onChange={(selected) => { setJobId(selected?.id || ''); setJob(selected); }} placeholder="Choose a job to screen" />
          </Field>
          <Button onClick={run} disabled={!jobId} loading={busy}><ShieldCheck size={14} /> Analyse</Button>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}
      {loadingLatest ? <LoadingBlock label="Loading the latest recorded screen…" rows={3} /> : null}

      {result ? (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Card className="glass-highlight p-4">
              <div className="flex flex-col items-center">
                <ScoreRing value={result.riskScore} size={124} label="Risk indicator score" />
                <Badge tone={classificationTone} className="mt-3">{result.classification}</Badge>
                <p className="mt-2 text-center text-xs leading-relaxed text-[var(--muted)]">{result.recommendedAction}</p>
              </div>
            </Card>
            <Card className="p-4">
              <SectionTitle title="What was checked" />
              <dl className="space-y-1.5 text-[0.7rem]">
                <div className="flex justify-between gap-3"><dt className="text-[var(--muted-2)]">Checked at</dt><dd className="text-right text-[var(--text)]">{new Date(result.checkedAt).toLocaleString()}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--muted-2)]">Indicators</dt><dd className="text-right text-[var(--text)]">{result.indicators.length}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--muted-2)]">Verified evidence</dt><dd className="text-right text-[var(--text)]">{result.verifiedEvidence.length}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--muted-2)]">Unverified claims</dt><dd className="text-right text-[var(--text)]">{result.unverifiedInformation.length}</dd></div>
              </dl>
              <p className="mt-2 border-t border-[var(--border)] pt-2 text-[0.65rem] leading-relaxed text-[var(--muted-2)]">{result.disclaimer}</p>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <SectionTitle title="Indicators" description="Each indicator states the exact signal that triggered it." />
              {result.indicators.length ? (
                <div className="space-y-2">
                  {result.indicators.map((indicator, index) => (
                    <div key={`${indicator.code}-${index}`} className="flex items-start gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg ${indicator.severity === 'high' ? 'bg-[var(--danger-soft)] text-[var(--danger)]' : indicator.severity === 'medium' ? 'bg-[var(--warning-soft)] text-[var(--warning)]' : 'bg-[var(--info-soft)] text-[var(--info)]'}`}>
                        {indicator.severity === 'high' ? <AlertTriangle size={13} /> : indicator.severity === 'medium' ? <ShieldQuestion size={13} /> : <HelpCircle size={13} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--text)]">{indicator.label}</span>
                          <Badge tone={indicator.severity === 'high' ? 'danger' : indicator.severity === 'medium' ? 'warning' : indicator.severity === 'low' ? 'info' : 'neutral'}>{indicator.severity}</Badge>
                          <Badge tone={indicator.verified ? 'success' : 'neutral'}>{indicator.verified ? 'verified' : 'from posting'}</Badge>
                        </div>
                        <p className="mt-1 text-[0.68rem] leading-relaxed text-[var(--muted)]">{indicator.evidence}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-[var(--muted)]">No specific risk indicators were detected. That does not prove the posting is legitimate.</p>}
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Card className="p-4">
                <SectionTitle title="Verified evidence" />
                <ul className="space-y-1.5">
                  {result.verifiedEvidence.map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-[var(--muted)]">
                      <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0 text-[var(--success)]" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4">
                <SectionTitle title="Unverified information" />
                <ul className="space-y-1.5">
                  {result.unverifiedInformation.map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-[var(--muted)]">
                      <ShieldQuestion size={13} className="mt-0.5 flex-shrink-0 text-[var(--warning)]" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {job ? (
              <Card className="p-4">
                <SectionTitle title="Source being screened" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-[var(--text)]">{job.title}</div>
                    <div className="text-[0.68rem] text-[var(--muted-2)]">{job.company} · {job.sourceName} · retrieved {new Date(job.retrievedAt).toLocaleDateString()}</div>
                  </div>
                  <a href={job.applyUrl} target="_blank" rel="noreferrer noopener" className="btn btn-secondary btn-sm">Open posting</a>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      ) : !loadingLatest && jobId ? (
        <Card className="p-8 text-center">
          <ShieldQuestion size={22} className="mx-auto text-[var(--muted-2)]" />
          <h3 className="mt-2 text-sm font-semibold text-[var(--text)]">No recorded screen for this job</h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[var(--muted)]">Run the check to review payment requests, suspicious contact channels, URL mismatches, description quality and other transparent signals.</p>
        </Card>
      ) : null}
    </div>
  );
}
