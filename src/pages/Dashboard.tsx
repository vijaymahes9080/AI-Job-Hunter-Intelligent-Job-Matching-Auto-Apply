import { useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Bookmark,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Compass,
  Cpu,
  FileCheck2,
  Layers,
  MessageSquareText,
  Send,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { RoutePath } from '../lib/router';
import { api } from '../lib/api';
import { formatDate, statusTone } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { JobCard } from '../components/JobCard';
import { JobDetailModal } from '../components/JobDetailModal';
import { Badge, Button, Card, ErrorNotice, LoadingBlock, PageHeader, Progress, ScoreRing, SectionTitle, StatCard } from '../components/ui';

export function DashboardPage({ navigate }: { navigate: (path: RoutePath) => void }) {
  const { data, loading, error, reload } = useAsync(() => api.dashboard(), []);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const prepare = (jobId: string) => {
    localStorage.setItem('ajh-studio-job', jobId);
    navigate('studio');
  };

  const toggleSave = async (jobId: string, saved: boolean) => {
    setSavingId(jobId);
    try {
      if (saved) await api.jobs.unsave(jobId);
      else await api.jobs.save(jobId);
      await reload();
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <LoadingBlock label="Loading your evidence dashboard…" rows={6} />;
  if (error) return <ErrorNotice message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Command centre"
        title="Your evidence-backed job hunt"
        description="Every number below comes from persisted records, public postings and actions you have actually taken."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('discovery')}>
              <Compass size={15} /> Discover jobs
            </Button>
            <Button onClick={() => navigate('studio')}>
              <Layers size={15} /> Application Studio
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Discovered" value={data.counts.discovered} hint="Persisted public postings" icon={<Compass size={17} />} />
        <StatCard label="Shortlisted" value={data.counts.saved} hint="Roles you saved" icon={<Bookmark size={17} />} tone="info" />
        <StatCard label="Prepared" value={data.counts.prepared} hint="Awaiting your approval" icon={<FileCheck2 size={17} />} tone="warning" />
        <StatCard label="Submitted" value={data.counts.submitted} hint="Recorded with evidence" icon={<Send size={17} />} tone="success" />
        <StatCard label="Interviews" value={data.counts.interviews} hint="Recorded stages" icon={<MessageSquareText size={17} />} tone="info" />
        <StatCard label="Offers" value={data.counts.offers} hint="Verified outcomes only" icon={<BadgeCheck size={17} />} tone="success" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        <div className="space-y-4">
          <Card className="p-4">
            <SectionTitle
              title="Top evidence matches"
              description="Ranked by the transparent weighted match formula using your verified profile and resume evidence."
              actions={<Button variant="ghost" size="sm" onClick={() => navigate('discovery')}>All jobs <ArrowRight size={13} /></Button>}
            />
            {data.topMatches.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-[var(--muted)]">
                No jobs are stored yet. Run discovery to fetch public postings.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.topMatches.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    dense
                    onOpen={() => setOpenJobId(job.id)}
                    onToggleSave={() => void toggleSave(job.id, Boolean(job.isSaved))}
                    busy={savingId === job.id}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <SectionTitle
              title="Recent applications"
              description="Only statuses you have recorded. No outcome is inferred from silence."
              actions={<Button variant="ghost" size="sm" onClick={() => navigate('applications')}>Pipeline <ArrowRight size={13} /></Button>}
            />
            {data.recentApplications.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-5 text-center text-xs text-[var(--muted)]">
                No applications yet. Open a saved role in Application Studio to prepare accurate content.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {data.recentApplications.map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    onClick={() => navigate('applications')}
                    className="flex w-full items-center gap-3 py-2.5 text-left first:pt-0 last:pb-0"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)]">
                      <BriefcaseBusiness size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-[var(--text)]">{application.jobTitle}</div>
                      <div className="truncate text-[0.65rem] text-[var(--muted-2)]">{application.company} · updated {formatDate(application.updatedAt)}</div>
                    </div>
                    <Badge tone={statusTone(application.status)}>{application.status}</Badge>
                    <span className="hidden text-[0.68rem] font-semibold text-[var(--muted)] sm:block">{application.matchScore}%</span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="p-4">
              <SectionTitle title="Closing soon" description="Saved or applied roles with a published deadline in the next 7 days." actions={<Button variant="ghost" size="sm" onClick={() => navigate('deadlines')}><CalendarClock size={13} /></Button>} />
              {data.closingSoon.length === 0 ? (
                <p className="text-xs leading-relaxed text-[var(--muted)]">No saved or applied role has a published closing date within 7 days. Verify deadlines on employer pages before relying on them.</p>
              ) : (
                <div className="space-y-2">
                  {data.closingSoon.map((item) => (
                    <button key={item.jobId} type="button" onClick={() => setOpenJobId(item.jobId)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2 text-left">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-[var(--text)]">{item.title}</div>
                        <div className="truncate text-[0.65rem] text-[var(--muted-2)]">{item.company}</div>
                      </div>
                      <Badge tone={item.daysRemaining <= 2 ? 'danger' : 'warning'}>{item.daysRemaining === 0 ? 'Today' : `${item.daysRemaining}d`}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <SectionTitle title="Recommended next actions" description="Generated from your actual workspace state." />
              <ul className="space-y-2">
                {data.recommendedActions.map((action) => (
                  <li key={action} className="flex items-start gap-2 text-xs leading-relaxed text-[var(--muted)]">
                    <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="glass-highlight p-4">
            <SectionTitle title="Profile evidence" description="Match quality depends on verified input." />
            <div className="flex items-center gap-4">
              <ScoreRing value={data.profileCompleteness} size={86} label="Complete" />
              <div className="min-w-0">
                <div className="text-xs leading-relaxed text-[var(--muted)]">
                  {data.profileCompleteness >= 70
                    ? 'Your profile has enough evidence for reliable matching.'
                    : 'Add skills, experience, projects and resume text to improve reliability.'}
                </div>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => navigate('profile')}>
                  Edit profile
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Progress value={Math.min(100, (data.counts.saved / Math.max(1, data.counts.discovered)) * 100)} label="Discovery shortlist ratio" tone="accent" />
              <Progress value={data.counts.submitted > 0 ? (data.counts.interviews / data.counts.submitted) * 100 : 0} label="Interview conversion" tone="success" />
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Engine status" description="What is actually powering this workspace." />
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                <Cpu size={15} className="mt-0.5 text-[var(--accent)]" />
                <div>
                  <div className="font-medium text-[var(--text)]">{data.engine.aiProvider}</div>
                  <div className="mt-0.5 text-[0.65rem] leading-relaxed text-[var(--muted-2)]">
                    {data.engine.aiConfigured
                      ? 'Optional open-weight endpoint configured. Outputs remain suggestions unless verified.'
                      : 'No external AI provider required. Matching, gaps, ATS and authenticity use transparent rules.'}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                <div className="mb-1 flex items-center gap-1.5 font-medium text-[var(--text)]"><Target size={14} className="text-[var(--success)]" /> Public job sources</div>
                <div className="flex flex-wrap gap-1">
                  {data.engine.jobSources.map((source) => <span key={source} className="chip">{source}</span>)}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                <div className="mb-1 flex items-center gap-1.5 font-medium text-[var(--text)]"><BellRing size={14} className="text-[var(--warning)]" /> Honest workflow</div>
                <div className="text-[0.65rem] leading-relaxed text-[var(--muted-2)]">
                  Prepared → Approved → you submit on the employer site → record confirmation evidence. The platform never claims an auto-submission.
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Quick paths" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Skill gaps', path: 'skill-gap' as RoutePath, icon: TrendingUp },
                { label: 'Mock interview', path: 'interviews' as RoutePath, icon: MessageSquareText },
                { label: 'Salary evidence', path: 'salaries' as RoutePath, icon: Sparkles },
                { label: 'Analytics', path: 'analytics' as RoutePath, icon: Target },
              ].map((item) => (
                <button key={item.path} type="button" onClick={() => navigate(item.path)} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2 text-left text-xs font-medium text-[var(--text)] transition hover:border-[var(--accent)]">
                  <item.icon size={14} className="text-[var(--accent)]" /> {item.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {openJobId ? (
        <JobDetailModal
          jobId={openJobId}
          onClose={() => setOpenJobId(null)}
          onPrepare={prepare}
          onChanged={() => void reload()}
        />
      ) : null}
    </div>
  );
}
