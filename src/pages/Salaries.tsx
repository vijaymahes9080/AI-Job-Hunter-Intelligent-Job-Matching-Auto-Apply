import { useState } from 'react';
import { CircleDollarSign, ExternalLink, Info, Search, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, formatMoney } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { Badge, Button, Card, EmptyState, ErrorNotice, Field, Input, LoadingBlock, PageHeader, SectionTitle, Select, StatCard } from '../components/ui';

export function SalariesPage() {
  const [draft, setDraft] = useState({ role: '', location: '', currency: '', minExperience: '', maxExperience: '' });
  const [filters, setFilters] = useState(draft);
  const salaries = useAsync(() => api.salaries({
    role: filters.role.trim() || undefined,
    location: filters.location.trim() || undefined,
    currency: filters.currency || undefined,
    minExperience: filters.minExperience ? Number(filters.minExperience) : undefined,
    maxExperience: filters.maxExperience ? Number(filters.maxExperience) : undefined,
  }), [JSON.stringify(filters)]);
  const [error, setError] = useState<string | null>(null);

  const apply = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFilters(draft);
  };

  const data = salaries.data;
  const currencies = data ? [...new Set(data.observations.map((item) => item.currency))] : [];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Find opportunities"
        title="Salary Intelligence"
        description="Only explicit pay ranges published by employers. No market estimate, no currency conversion, no scraping of anonymous salary submissions."
      />

      <Card className="p-3.5">
        <form onSubmit={apply} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_120px_120px_120px_auto] lg:items-end">
          <Field label="Role keyword"><Input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} placeholder="e.g. Software Engineer" /></Field>
          <Field label="Location keyword"><Input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="e.g. Remote, India" /></Field>
          <Field label="Currency">
            <Select value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value })}>
              <option value="">All</option>
              {['USD', 'INR', 'EUR', 'GBP', 'SGD', 'AED', 'CAD', 'AUD'].map((value) => <option key={value}>{value}</option>)}
            </Select>
          </Field>
          <Field label="Min years"><Input type="number" min={0} max={40} value={draft.minExperience} onChange={(event) => setDraft({ ...draft, minExperience: event.target.value })} /></Field>
          <Field label="Max years"><Input type="number" min={0} max={40} value={draft.maxExperience} onChange={(event) => setDraft({ ...draft, maxExperience: event.target.value })} /></Field>
          <Button type="submit" loading={salaries.loading}><Search size={14} /> Filter</Button>
        </form>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}
      {salaries.error ? <ErrorNotice message={salaries.error} onRetry={salaries.reload} /> : null}
      {salaries.loading && !data ? <LoadingBlock label="Aggregating published salary evidence…" rows={4} /> : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Salary observations" value={data.observations.length} hint="Each tied to a stored posting" icon={<CircleDollarSign size={17} />} />
            <StatCard label="Currency groups" value={data.comparisons.length} hint="No cross-currency conversion" icon={<ShieldCheck size={17} />} tone="info" />
            <StatCard label="Currencies represented" value={currencies.length ? currencies.join(' · ') : '—'} hint="Kept separate; never converted" icon={<CircleDollarSign size={17} />} tone="success" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card className="p-4">
              <SectionTitle title="Published ranges" description="Click through to the original employer posting. Annualised values preserve the published period and never convert currency." />
              {data.observations.length === 0 ? (
                <EmptyState title="No published salary in these results" description="That is an honest result. Try clearing filters or selecting a different currency group. Missing pay ranges are never estimated or backfilled." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>Role</th><th>Company</th><th>Published range</th><th>Annualised</th><th>Experience</th><th></th></tr></thead>
                    <tbody>
                      {data.observations.map((item) => (
                        <tr key={item.jobId}>
                          <td><div className="max-w-[200px] truncate text-xs font-medium text-[var(--text)]">{item.title}</div><div className="truncate text-[0.62rem] text-[var(--muted-2)]">{item.location}</div></td>
                          <td className="text-xs text-[var(--muted)]">{item.company}</td>
                          <td className="whitespace-nowrap text-xs text-[var(--text)]">{formatMoney(item.min, item.currency)} – {formatMoney(item.max, item.currency)}<span className="text-[var(--muted-2)]">/{item.period === 'year' ? 'yr' : item.period === 'month' ? 'mo' : 'hr'}</span></td>
                          <td className="whitespace-nowrap text-xs text-[var(--muted)]">{item.annualizedMin !== null && item.annualizedMax !== null ? `${formatMoney(item.annualizedMin, item.currency)} – ${formatMoney(item.annualizedMax, item.currency)}` : 'Not annualisable'}</td>
                          <td className="whitespace-nowrap text-xs text-[var(--muted)]">{item.experienceMin ?? '?'}–{item.experienceMax ?? '?'} yrs</td>
                          <td><a href={item.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-[var(--accent)]" aria-label={`Open source posting for ${item.title}`}><ExternalLink size={13} /></a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card className="p-4">
                <SectionTitle title="Comparisons by currency and period" description="Groups are never merged across currencies." />
                <div className="space-y-2">
                  {data.comparisons.map((group) => (
                    <div key={`${group.label}-${group.currency}-${group.period}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[var(--text)]">{group.label}</span>
                        <Badge tone="accent">{group.count} observation(s)</Badge>
                      </div>
                      <div className="mt-1 grid grid-cols-3 gap-1 text-[0.68rem]">
                        <div><span className="block text-[0.6rem] uppercase text-[var(--muted-2)]">Min</span>{formatMoney(group.min, group.currency)}</div>
                        <div><span className="block text-[0.6rem] uppercase text-[var(--muted-2)]">Median</span><span className="font-semibold text-[var(--text)]">{formatMoney(group.median, group.currency)}</span></div>
                        <div><span className="block text-[0.6rem] uppercase text-[var(--muted-2)]">Max</span>{formatMoney(group.max, group.currency)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <SectionTitle title="By role" description="Median annualised value within each currency." />
                <div className="space-y-1.5">
                  {data.byRole.slice(0, 8).map((row) => (
                    <div key={`${row.label}-${row.currency}`} className="flex items-center justify-between gap-2 text-[0.7rem]">
                      <span className="truncate text-[var(--muted)]">{row.label}</span>
                      <span className="flex-shrink-0 font-semibold text-[var(--text)]">{formatMoney(row.medianAnnual, row.currency)} <span className="text-[0.6rem] font-normal text-[var(--muted-2)]">({row.count})</span></span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <SectionTitle title="By location & experience" />
                <div className="grid gap-2">
                  {data.byLocation.slice(0, 6).map((row) => (
                    <div key={`loc-${row.label}-${row.currency}`} className="flex items-center justify-between gap-2 text-[0.7rem]">
                      <span className="truncate text-[var(--muted)]">{row.label}</span>
                      <span className="flex-shrink-0 font-semibold text-[var(--text)]">{formatMoney(row.medianAnnual, row.currency)}</span>
                    </div>
                  ))}
                  {data.byExperience.map((row) => (
                    <div key={`exp-${row.label}-${row.currency}`} className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-1.5 text-[0.7rem]">
                      <span className="truncate text-[var(--muted)]">{row.label}</span>
                      <span className="flex-shrink-0 font-semibold text-[var(--text)]">{formatMoney(row.medianAnnual, row.currency)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="p-4">
              <SectionTitle title="Methodology" />
              <p className="text-[0.72rem] leading-relaxed text-[var(--muted)]">{data.methodology}</p>
              <p className="mt-2 text-[0.65rem] text-[var(--muted-2)]">Latest observation: {data.observations[0] ? formatDate(data.observations[0].observedAt) : '—'}</p>
            </Card>
            <Card className="p-4">
              <SectionTitle title="Caveats" />
              <ul className="space-y-1.5">
                {data.caveats.map((caveat) => (
                  <li key={caveat} className="flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-[var(--muted)]">
                    <Info size={12} className="mt-0.5 flex-shrink-0 text-[var(--warning)]" /> {caveat}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <p className="text-[0.65rem] leading-relaxed text-[var(--muted-2)]">
            What is deliberately absent: estimated market rates, cost-of-living adjustments, equity valuation, bonus
            guesses, and comparisons that silently convert currencies. Those would be fabricated or misleading.
          </p>
        </>
      ) : null}
    </div>
  );
}
