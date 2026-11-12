import { useState } from 'react';
import { Building2, ExternalLink, Globe2, Search, ShieldQuestion } from 'lucide-react';
import type { CompanyResearch } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { formatDate, safeExternalUrl, truncate } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { Badge, Button, Card, EmptyState, ErrorNotice, Field, Input, LoadingBlock, PageHeader, SectionTitle } from '../components/ui';

export function CompaniesPage() {
  const companies = useAsync(() => api.companies.list(), []);
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [result, setResult] = useState<CompanyResearch | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const research = async (name: string, site?: string | null) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.companies.research(name, site));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void research(company.trim(), website.trim() || undefined);
  };

  const websiteUrl = safeExternalUrl(result?.website || null);
  const careersUrl = safeExternalUrl(result?.careersUrl || null);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Research"
        title="Company Intelligence"
        description="Built from persisted postings, fetched company pages and ATS boards. The platform does not invent employee counts, revenue, funding or culture claims."
      />

      <Card className="p-3.5">
        <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Company name"><Input required value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. GitLab" /></Field>
          <Field label="Known website (optional)" hint="Used only if you have a verified URL."><Input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://" /></Field>
          <div className="flex items-end"><Button type="submit" className="w-full" loading={busy}><Search size={14} /> Research company</Button></div>
        </form>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      {busy ? <LoadingBlock label="Collecting public posting and website evidence…" rows={4} /> : null}

      {result ? (
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <Card className="glass-highlight p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-[var(--text)]">{result.company}</h2>
                    <Badge tone={result.confidence === 'high' ? 'success' : result.confidence === 'medium' ? 'info' : result.confidence === 'low' ? 'warning' : 'neutral'}>
                      {result.confidence} confidence
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">Researched {formatDate(result.researchDate)} · {result.openPositions.length} open positions in this workspace</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {websiteUrl ? <a href={websiteUrl} target="_blank" rel="noreferrer noopener" className="btn btn-secondary btn-sm"><Globe2 size={13} /> Website</a> : null}
                  {careersUrl ? <a href={careersUrl} target="_blank" rel="noreferrer noopener" className="btn btn-primary btn-sm"><ExternalLink size={13} /> Careers page</a> : null}
                </div>
              </div>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                  <dt className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Locations observed in postings</dt>
                  <dd className="mt-1 text-xs text-[var(--text)]">{result.locations.length ? result.locations.join(' · ') : 'Not stated in available postings'}</dd>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                  <dt className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Posting history</dt>
                  <dd className="mt-1 text-xs text-[var(--text)]">{result.postingHistory.count} observed · {result.postingHistory.firstSeen ? formatDate(result.postingHistory.firstSeen) : 'no first-seen date'} → {result.postingHistory.lastSeen ? formatDate(result.postingHistory.lastSeen) : 'unknown'}</dd>
                </div>
              </dl>
              {result.industry ? <p className="mt-2 text-xs text-[var(--muted)]">Industry field returned by a verified source: {result.industry}</p> : null}
            </Card>

            <Card className="p-4">
              <SectionTitle title="Technology evidence" description="Technologies counted only when named in this company's persisted postings." />
              {result.techStack.length ? (
                <div className="space-y-1.5">
                  {result.techStack.map((tech) => (
                    <div key={tech.technology} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[var(--text)]">{tech.technology}</span>
                        <Badge tone="accent">{tech.postings} posting(s)</Badge>
                      </div>
                      <div className="mt-0.5 text-[0.65rem] leading-relaxed text-[var(--muted-2)]">Evidence: {tech.evidence.join(' · ')}</div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-[var(--muted)]">No technology names were detected in the available posting text.</p>}
            </Card>

            <Card className="p-4">
              <SectionTitle title="Open positions" description="Links point to the original public posting." />
              {result.openPositions.length ? (
                <div className="space-y-1.5">
                  {result.openPositions.map((position) => {
                    const url = safeExternalUrl(position.url);
                    return (
                      <div key={`${position.url}-${position.title}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-[var(--text)]">{position.title}</div>
                          <div className="text-[0.65rem] text-[var(--muted-2)]">{position.location} · {position.source}</div>
                        </div>
                        {url ? <a href={url} target="_blank" rel="noreferrer noopener" className="btn btn-ghost btn-sm"><ExternalLink size={12} /> Open</a> : null}
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs text-[var(--muted)]">No open positions are stored for this company.</p>}
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <SectionTitle title="Sources used" description="Each source retains its URL and retrieval time." />
              <div className="space-y-2">
                {result.sources.map((source) => {
                  const url = safeExternalUrl(source.url);
                  return (
                    <div key={`${source.label}-${source.url}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[var(--text)]">{source.label}</span>
                        {url ? <a href={url} target="_blank" rel="noreferrer noopener" className="text-[var(--accent)]"><ExternalLink size={12} /></a> : null}
                      </div>
                      <div className="mt-0.5 truncate text-[0.62rem] text-[var(--muted-2)]" title={source.url}>{source.url}</div>
                      <div className="text-[0.62rem] text-[var(--muted-2)]">Retrieved {formatDate(source.retrievedAt)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4">
              <SectionTitle title="Research notes" />
              <ul className="space-y-1.5">
                {result.notes.map((note) => (
                  <li key={note} className="flex items-start gap-2 text-[0.7rem] leading-relaxed text-[var(--muted)]">
                    <ShieldQuestion size={13} className="mt-0.5 flex-shrink-0 text-[var(--warning)]" /> {note}
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-[var(--border)] pt-2 text-[0.62rem] leading-relaxed text-[var(--muted-2)]">
                Not included because no verified source was available: employee count, revenue, funding, Glassdoor rating, layoffs or culture statements.
              </p>
            </Card>
          </div>
        </div>
      ) : null}

      <Card className="p-4">
        <SectionTitle title="Companies in your job evidence" description="Derived from persisted public postings. Click a company to research it." />
        {companies.loading ? <LoadingBlock label="Loading company evidence…" rows={3} /> : null}
        {companies.error ? <ErrorNotice message={companies.error} onRetry={companies.reload} /> : null}
        {!companies.loading && companies.data?.items.length === 0 ? (
          <EmptyState icon={<Building2 size={20} />} title="No companies yet" description="Run job discovery or add a verified job to build company evidence." />
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {companies.data?.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setCompany(item.company); setWebsite(item.website || ''); void research(item.company, item.website); }}
              className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-left transition hover:border-[var(--accent)]"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Building2 size={15} /></div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-[var(--text)]">{item.company}</div>
                <div className="mt-0.5 text-[0.65rem] leading-relaxed text-[var(--muted-2)]">
                  {item.openPositions.length} stored posting(s) · {item.locations.slice(0, 3).join(', ') || 'location not stated'}
                </div>
                <div className="mt-1 text-[0.62rem] text-[var(--muted-2)]">{truncate(item.notes[0] || 'Click to collect current evidence.', 90)}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
