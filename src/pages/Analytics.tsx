import { useState } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Info,
  LineChart,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { Badge, Button, Card, ErrorNotice, LoadingBlock, PageHeader, Progress, SectionTitle, StatCard, Tabs } from '../components/ui';

type Granularity = 'weekly' | 'monthly';

function shortBucket(bucket: string): string {
  const date = new Date(bucket);
  if (Number.isNaN(date.getTime())) return bucket;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function AnalyticsPage() {
  const [days, setDays] = useState(90);
  const [granularity, setGranularity] = useState<Granularity>('weekly');
  const analytics = useAsync(() => api.analytics(days), [days]);
  const data = analytics.data;
  const chartData = (granularity === 'weekly' ? data?.weekly : data?.monthly)?.map((row) => ({
    ...row,
    label: shortBucket(row.bucket),
  })) || [];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Apply"
        title="Application Success Analytics"
        description="Funnel rates calculated from persisted application records. Every rate shows its numerator and denominator, and unknown outcomes are never converted into rejections."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {[30, 90, 180, 365].map((value) => (
              <Button key={value} size="sm" variant={days === value ? 'primary' : 'secondary'} onClick={() => setDays(value)}>
                {value}d
              </Button>
            ))}
          </div>
        }
      />

      {analytics.loading && !data ? <LoadingBlock label="Calculating funnel metrics from stored applications…" rows={5} /> : null}
      {analytics.error ? <ErrorNotice message={analytics.error} onRetry={analytics.reload} /> : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Prepared" value={data.counts.prepared} hint="Application content created" icon={<ClipboardCheck size={17} />} tone="warning" />
            <StatCard label="Submitted" value={data.counts.submitted} hint="Evidence-backed submissions" icon={<Send size={17} />} tone="success" />
            <StatCard label="Interviews" value={data.counts.interviews} hint="Stages you recorded" icon={<Users size={17} />} tone="info" />
            <StatCard label="Offers" value={data.counts.offers} hint="Verified outcomes only" icon={<CheckCircle2 size={17} />} tone="success" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <Card className="p-4">
              <SectionTitle
                title="Activity over time"
                description={`Records from ${formatDate(data.period.from)} to ${formatDate(data.period.to)}.`}
                actions={<Tabs value={granularity} onChange={setGranularity} items={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} />}
              />
              {chartData.length ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: 'var(--muted-2)', fontSize: 10 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: 'var(--muted-2)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: 'var(--text)' }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted)' }} />
                      <Bar dataKey="prepared" name="Prepared" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="submitted" name="Submitted" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="interviews" name="Interviews" fill="var(--success)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-xs text-[var(--muted)]">No application activity falls inside this period.</div>
              )}
            </Card>

            <Card className="p-4">
              <SectionTitle title="Funnel definitions" description="Each rate is a ratio, not an inferred probability." />
              <div className="space-y-3">
                {data.rates.map((rate) => (
                  <div key={rate.key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--text)]">{rate.label}</span>
                      <Badge tone={rate.denominator === 0 ? 'neutral' : rate.value >= 20 ? 'success' : 'info'}>
                        {rate.denominator === 0 ? 'No denominator' : `${Math.round(rate.value)}%`}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[0.65rem] text-[var(--muted-2)]">{rate.numerator} / {rate.denominator}</div>
                    <div className="mt-1.5"><Progress value={rate.value} tone={rate.value >= 20 ? 'success' : 'accent'} /></div>
                    <p className="mt-1.5 text-[0.65rem] leading-relaxed text-[var(--muted)]">{rate.definition}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Discovered" value={data.counts.discovered} hint="Persisted public postings" icon={<BriefcaseBusiness size={17} />} />
            <StatCard label="Relevant" value={data.counts.relevant} hint="At or above your match threshold" icon={<Target size={17} />} tone="info" />
            <StatCard label="Shortlisted" value={data.counts.shortlisted} hint="Saved for deliberate review" icon={<TrendingUp size={17} />} tone="accent" />
            <StatCard label="Unknown outcomes" value={data.counts.unknownOutcomes} hint="Submitted, no recorded decision" icon={<Info size={17} />} tone="warning" />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {[
              { title: 'By role category', description: 'Grouped from stored job titles.', rows: data.byCategory },
              { title: 'By job source', description: 'Which public feed produced the posting.', rows: data.bySource },
              { title: 'By resume version', description: 'The resume label recorded at preparation time.', rows: data.byResumeVersion },
            ].map((section) => (
              <Card key={section.title} className="p-4">
                <SectionTitle title={section.title} description={section.description} />
                {section.rows.length ? (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead><tr><th>Group</th><th className="text-right">Total</th><th className="text-right">Interviews</th><th className="text-right">Offers</th></tr></thead>
                      <tbody>
                        {section.rows.slice(0, 12).map((row) => (
                          <tr key={row.label}>
                            <td className="max-w-[180px] truncate text-[0.7rem] text-[var(--text)]">{row.label}</td>
                            <td className="text-right text-[0.7rem] text-[var(--muted)]">{row.total}</td>
                            <td className="text-right text-[0.7rem] text-[var(--info)]">{row.interviews}</td>
                            <td className="text-right text-[0.7rem] text-[var(--success)]">{row.offers}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-xs text-[var(--muted)]">No records in this period.</p>}
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card className="p-4">
              <SectionTitle title="Evidence-based recommendations" description="Generated from the counts and definitions above, not from hidden scoring." />
              {data.recommendations.length ? (
                <ul className="space-y-2">
                  {data.recommendations.map((recommendation) => (
                    <li key={recommendation} className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[0.72rem] leading-relaxed text-[var(--muted)]">
                      <Sparkles size={13} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" /> {recommendation}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-[var(--muted)]">Not enough recorded activity to make a recommendation.</p>}
            </Card>

            <Card className="p-4">
              <SectionTitle title="Status breakdown" description="Every application in the current workspace." />
              <div className="space-y-2">
                {[
                  ['Prepared', data.counts.prepared, 'warning'],
                  ['Approved', data.counts.approved, 'info'],
                  ['Submitted', data.counts.submitted, 'accent'],
                  ['Assessments', data.counts.assessments, 'info'],
                  ['Interviews', data.counts.interviews, 'info'],
                  ['Offers', data.counts.offers, 'success'],
                  ['Rejections', data.counts.rejections, 'danger'],
                  ['Withdrawn', data.counts.withdrawals, 'neutral'],
                  ['Unknown outcomes', data.counts.unknownOutcomes, 'warning'],
                ].map(([label, value, tone]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5">
                    <span className="text-[0.7rem] text-[var(--muted)]">{label}</span>
                    <Badge tone={tone as 'warning' | 'info' | 'accent' | 'success' | 'danger' | 'neutral'}>{String(value)}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[0.65rem] leading-relaxed text-[var(--muted-2)]">
            <CalendarRange size={13} />
            Generated {formatDate(data.generatedAt)} · period {formatDate(data.period.from)} to {formatDate(data.period.to)} ·
            <LineChart size={13} /> no predictions, no synthetic outcomes.
            <BarChart3 size={13} /> rates require a real denominator.
          </div>
        </>
      ) : null}
    </div>
  );
}
