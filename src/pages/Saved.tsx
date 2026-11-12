import { useState } from 'react';
import { Bookmark, Compass, Layers } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { RoutePath } from '../lib/router';
import { JobCard } from '../components/JobCard';
import { JobDetailModal } from '../components/JobDetailModal';
import { Button, Card, EmptyState, ErrorNotice, LoadingBlock, PageHeader, Select, StatCard } from '../components/ui';

export function SavedPage({ navigate }: { navigate: (path: RoutePath) => void }) {
  const [sort, setSort] = useState<'match' | 'newest' | 'deadline' | 'salary'>('match');
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const jobs = useAsync(() => api.jobs.list({ savedOnly: true, sort, pageSize: 100 }), [sort]);

  const remove = async (jobId: string) => {
    setBusyId(jobId);
    setActionError(null);
    try {
      await api.jobs.unsave(jobId);
      await jobs.reload();
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  };

  const prepare = (jobId: string) => {
    localStorage.setItem('ajh-studio-job', jobId);
    navigate('studio');
  };

  const items = jobs.data?.items || [];
  const avgMatch = items.length ? Math.round(items.reduce((sum, job) => sum + (job.match?.overall || 0), 0) / items.length) : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Find opportunities"
        title="Saved Jobs"
        description="A deliberate shortlist. Saving a job does not create an application and never claims you applied."
        actions={<Button onClick={() => navigate('discovery')}><Compass size={15} /> Discover more</Button>}
      />

      {actionError ? <ErrorNotice message={actionError} /> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Saved roles" value={items.length} hint="Your current shortlist" icon={<Bookmark size={17} />} />
        <StatCard label="Average match" value={`${avgMatch}%`} hint="Across saved roles" icon={<Layers size={17} />} tone="info" />
        <StatCard label="Ready to prepare" value={items.filter((job) => !job.application).length} hint="No application record yet" icon={<Layers size={17} />} tone="success" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-[var(--muted)]">Sorted by evidence match. Open a role to review its full source record.</div>
        <Select className="w-auto min-w-[160px]" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort saved jobs">
          <option value="match">Best match</option>
          <option value="newest">Newest</option>
          <option value="deadline">Deadline first</option>
          <option value="salary">Salary first</option>
        </Select>
      </div>

      {jobs.loading ? <LoadingBlock label="Loading your shortlist…" /> : null}
      {jobs.error ? <ErrorNotice message={jobs.error} onRetry={jobs.reload} /> : null}

      {!jobs.loading && items.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<Bookmark size={20} />}
            title="Your shortlist is empty"
            description="Save roles you would genuinely apply to. The duplicate guard and preparation workflow start from this shortlist."
            action={<Button onClick={() => navigate('discovery')}><Compass size={14} /> Browse jobs</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onOpen={() => setOpenJobId(job.id)}
              onToggleSave={() => void remove(job.id)}
              busy={busyId === job.id}
              dense
            />
          ))}
        </div>
      )}

      {openJobId ? (
        <JobDetailModal jobId={openJobId} onClose={() => setOpenJobId(null)} onPrepare={prepare} onChanged={() => void jobs.reload()} />
      ) : null}
    </div>
  );
}
