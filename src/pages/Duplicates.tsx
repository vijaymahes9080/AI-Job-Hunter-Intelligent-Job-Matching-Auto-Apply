import { useState } from 'react';
import { Copy, ShieldAlert, ShieldCheck, Link2, Search } from 'lucide-react';
import type { DuplicateCheckResult, JobPosting } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { formatDate, statusTone } from '../lib/format';
import { Badge, Button, Card, ErrorNotice, Field, Input, LoadingBlock, PageHeader, SectionTitle } from '../components/ui';
import { JobSelector } from '../components/JobSelector';

export function DuplicatesPage() {
  const [jobId, setJobId] = useState('');
  const [job, setJob] = useState<JobPosting | null>(null);
  const [requestedUrl, setRequestedUrl] = useState('');
  const [result, setResult] = useState<DuplicateCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!jobId) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await api.duplicates.check(jobId, requestedUrl.trim() || undefined));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Research"
        title="Duplicate Application Guard"
        description="Prevents accidental repeat applications by comparing the job record, normalised application URL, company and title similarity against your real application history."
      />

      <Card className="p-3.5">
        <form onSubmit={check} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Job to prepare" hint={job ? `${job.company} · ${job.sourceName}` : undefined}>
            <JobSelector value={jobId} onChange={(selected) => { setJobId(selected?.id || ''); setJob(selected); setResult(null); }} placeholder="Select the job you intend to apply to" />
          </Field>
          <Field label="Final application URL (optional)" hint="Paste the URL you are about to submit to. Tracking parameters are normalised.">
            <Input value={requestedUrl} onChange={(event) => setRequestedUrl(event.target.value)} placeholder="https://boards.greenhouse.io/..." />
          </Field>
          <Button type="submit" disabled={!jobId} loading={busy}><Search size={14} /> Check duplicates</Button>
        </form>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}
      {busy ? <LoadingBlock label="Comparing your application records…" rows={3} /> : null}

      {result ? (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Card className={`glass-highlight p-4 ${result.blocked ? 'border-[rgba(251,113,133,0.35)]' : 'border-[rgba(52,211,153,0.3)]'}`}>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${result.blocked ? 'bg-[var(--danger-soft)] text-[var(--danger)]' : 'bg-[var(--success-soft)] text-[var(--success)]'}`}>
                {result.blocked ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
              </div>
              <h3 className="mt-3 text-lg font-bold text-[var(--text)]">{result.blocked ? 'Duplicate blocked' : 'No exact duplicate'}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                {result.blocked
                  ? 'The platform will refuse to prepare this application until the duplicate is resolved.'
                  : result.similar.length
                    ? 'No exact duplicate exists, but similar applications require an explicit review reason before preparing.'
                    : 'No exact or similar application was found in your records.'}
              </p>
              <div className="mt-3 space-y-1 text-[0.68rem]">
                <div className="flex justify-between gap-2"><span className="text-[var(--muted-2)]">Exact duplicates</span><span className="font-semibold text-[var(--text)]">{result.exactDuplicates.length}</span></div>
                <div className="flex justify-between gap-2"><span className="text-[var(--muted-2)]">Similar applications</span><span className="font-semibold text-[var(--text)]">{result.similar.length}</span></div>
                <div className="flex justify-between gap-2"><span className="text-[var(--muted-2)]">Override allowed</span><span className="font-semibold text-[var(--text)]">{result.canOverride ? 'With a reason' : 'No'}</span></div>
              </div>
            </Card>

            <Card className="p-4">
              <SectionTitle title="Normalised target URL" />
              <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                <Link2 size={14} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" />
                <span className="break-all font-mono text-[0.65rem] text-[var(--muted)]">{result.normalizedUrl}</span>
              </div>
              <p className="mt-2 text-[0.65rem] leading-relaxed text-[var(--muted-2)]">
                Tracking parameters, fragments, www prefixes and trailing slashes are removed before comparison.
              </p>
            </Card>
          </div>

          <div className="space-y-4">
            {result.reasons.length ? (
              <Card className="p-4">
                <SectionTitle title="Why this result was returned" />
                <ul className="space-y-1.5">
                  {result.reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-2 text-[0.72rem] leading-relaxed text-[var(--muted)]">
                      <Copy size={13} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" /> {reason}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <Card className="p-4">
              <SectionTitle title="Exact duplicates" description="Same stored job, identical normalised URL or identical company + title record." />
              {result.exactDuplicates.length ? (
                <div className="space-y-2">
                  {result.exactDuplicates.map((match) => (
                    <div key={match.applicationId} className="rounded-lg border border-[rgba(251,113,133,0.3)] bg-[var(--danger-soft)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-[var(--text)]">{match.title}</div>
                        <Badge tone={statusTone(match.status)}>{match.status}</Badge>
                      </div>
                      <div className="mt-0.5 text-[0.68rem] text-[var(--muted)]">{match.company} · applied {match.appliedAt ? formatDate(match.appliedAt) : 'date not recorded'} · similarity {Math.round(match.similarity * 100)}%</div>
                      <p className="mt-1 text-[0.65rem] leading-relaxed text-[var(--muted)]">{match.reason}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-[var(--muted)]">None found.</p>}
            </Card>

            <Card className="p-4">
              <SectionTitle title="Similar applications" description="Different posting, but very close company and title. Review before preparing another application." />
              {result.similar.length ? (
                <div className="space-y-2">
                  {result.similar.map((match) => (
                    <div key={match.applicationId} className="rounded-lg border border-[rgba(251,191,36,0.3)] bg-[var(--warning-soft)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-[var(--text)]">{match.title}</div>
                        <Badge tone={statusTone(match.status)}>{match.status}</Badge>
                      </div>
                      <div className="mt-0.5 text-[0.68rem] text-[var(--muted)]">{match.company} · similarity {Math.round(match.similarity * 100)}% · {match.appliedAt ? formatDate(match.appliedAt) : 'no submission date'}</div>
                      <p className="mt-1 text-[0.65rem] leading-relaxed text-[var(--muted)]">{match.reason}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-[var(--muted)]">No similar applications found.</p>}
            </Card>

            <Card className="p-4">
              <SectionTitle title="What the guard can and cannot do" />
              <ul className="space-y-1.5 text-[0.7rem] leading-relaxed text-[var(--muted)]">
                <li>• It compares against applications recorded in this workspace only.</li>
                <li>• An employer may still treat two similar postings as one application; the duplicate guard cannot see employer-side records.</li>
                <li>• A review reason is stored with the prepared application if you deliberately override a similar match.</li>
                <li>• The final submission remains manual, so the guard cannot create an application by itself.</li>
              </ul>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
