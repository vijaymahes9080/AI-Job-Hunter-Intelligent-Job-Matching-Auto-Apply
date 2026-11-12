import { useMemo, useState } from 'react';
import {
  Bell,
  BellRing,
  BriefcaseBusiness,
  CalendarClock,
  CheckCheck,
  CircleDot,
  MessageSquareText,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { NotificationRecord } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { formatDateTime, relativeTime } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { JobDetailModal } from '../components/JobDetailModal';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  LoadingBlock,
  PageHeader,
  SectionTitle,
  StatCard,
  Tabs,
} from '../components/ui';

type Filter = 'all' | 'unread' | NotificationRecord['type'];

const TYPE_LABELS: Record<NotificationRecord['type'], string> = {
  deadline: 'Deadline',
  match: 'Match',
  application: 'Application',
  system: 'System',
  interview: 'Interview',
};

function typeIcon(type: NotificationRecord['type']) {
  switch (type) {
    case 'deadline':
      return CalendarClock;
    case 'match':
      return Sparkles;
    case 'application':
      return BriefcaseBusiness;
    case 'interview':
      return MessageSquareText;
    default:
      return Bell;
  }
}

interface NotificationApi {
  list: () => Promise<{ items: NotificationRecord[]; unread: number }>;
  read: (id: string) => Promise<{ ok: boolean }>;
  readAll: () => Promise<{ ok: boolean }>;
  remove: (id: string) => Promise<{ ok: boolean }>;
}

const notificationApi = api.notifications as NotificationApi;

export function NotificationsPage() {
  const notifications = useAsync(() => notificationApi.list(), []);
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openJobId, setOpenJobId] = useState<string | null>(null);

  const items = notifications.data?.items || [];
  const unread = notifications.data?.unread || 0;
  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'unread') return items.filter((item) => !item.read);
    return items.filter((item) => item.type === filter);
  }, [items, filter]);

  const refresh = async (message?: string) => {
    await notifications.reload();
    window.dispatchEvent(new Event('ajh:notifications-changed'));
    if (message) setNotice(message);
  };

  const markRead = async (item: NotificationRecord) => {
    if (item.read) return;
    setBusy(item.id);
    setError(null);
    try {
      await notificationApi.read(item.id);
      await refresh('Notification marked as read.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  const markAll = async () => {
    setBusy('all');
    setError(null);
    try {
      await notificationApi.readAll();
      await refresh('All notifications marked as read.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item: NotificationRecord) => {
    setBusy(item.id);
    setError(null);
    try {
      await notificationApi.remove(item.id);
      await refresh('Notification removed.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  const scan = async () => {
    setBusy('scan');
    setError(null);
    try {
      const result = await api.deadlines.scan();
      await refresh(`Deadline scan complete: ${result.notificationsCreated} new alert(s) from ${result.scannedJobs ?? 'the stored'} jobs.`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Account"
        title="Notifications"
        description="Alerts are generated from real workspace events: published deadlines you track, prepared applications and recorded submissions. No promotional or invented activity is injected."
        actions={
          <>
            <Button variant="secondary" onClick={scan} loading={busy === 'scan'}><BellRing size={15} /> Scan deadlines</Button>
            <Button onClick={markAll} loading={busy === 'all'} disabled={unread === 0}><CheckCheck size={15} /> Mark all read</Button>
          </>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}
      {notice ? (
        <div className="rounded-xl border border-[rgba(52,211,153,0.3)] bg-[var(--success-soft)] px-4 py-2.5 text-xs leading-relaxed text-[var(--success)]">{notice}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Unread" value={unread} hint="Alerts requiring attention" icon={<CircleDot size={17} />} tone={unread ? 'warning' : 'success'} />
        <StatCard label="Total stored" value={items.length} hint="Bounded to the latest 200" icon={<Bell size={17} />} tone="info" />
        <StatCard label="Deadline alerts" value={items.filter((item) => item.type === 'deadline').length} hint="From tracked published dates" icon={<CalendarClock size={17} />} tone="accent" />
      </div>

      <Card className="p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'all', label: 'All', count: items.length },
              { value: 'unread', label: 'Unread', count: unread },
              { value: 'deadline', label: 'Deadlines' },
              { value: 'match', label: 'Matches' },
              { value: 'application', label: 'Applications' },
              { value: 'system', label: 'System' },
            ]}
          />
          <Button variant="ghost" size="sm" onClick={() => void notifications.reload()}><RefreshIcon /> Refresh</Button>
        </div>
      </Card>

      {notifications.loading ? <LoadingBlock label="Loading notifications…" rows={4} /> : null}
      {notifications.error ? <ErrorNotice message={notifications.error} onRetry={notifications.reload} /> : null}

      {!notifications.loading ? (
        <Card className="overflow-hidden">
          {filtered.length ? (
            <div className="divide-y divide-[var(--border)]">
              {filtered.map((item) => {
                const Icon = typeIcon(item.type);
                return (
                  <div key={item.id} className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start ${item.read ? '' : 'bg-[var(--accent-soft)]'}`}>
                    <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${item.read ? 'bg-[var(--surface-2)] text-[var(--muted-2)]' : 'bg-[var(--accent)] text-white'}`}>
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-semibold ${item.read ? 'text-[var(--muted)]' : 'text-[var(--text)]'}`}>{item.title}</span>
                        <Badge tone={item.type === 'deadline' ? 'warning' : item.type === 'application' ? 'accent' : item.type === 'match' ? 'info' : 'neutral'}>{TYPE_LABELS[item.type]}</Badge>
                        {!item.read ? <Badge tone="accent">unread</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-[0.7rem] leading-relaxed text-[var(--muted)]">{item.message}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.62rem] text-[var(--muted-2)]">
                        <span title={formatDateTime(item.createdAt)}>{relativeTime(item.createdAt)}</span>
                        {item.jobId ? <span>· linked to a stored job</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-wrap items-center gap-1">
                      {item.jobId ? (
                        <Button size="sm" variant="ghost" onClick={() => setOpenJobId(item.jobId)}>View job</Button>
                      ) : null}
                      {!item.read ? (
                        <Button size="sm" variant="secondary" onClick={() => void markRead(item)} loading={busy === item.id}>Mark read</Button>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Delete notification: ${item.title}`}
                        className="rounded-lg p-1.5 text-[var(--muted-2)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                        onClick={() => void remove(item)}
                        disabled={busy === item.id}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={<Bell size={20} />}
                title={items.length ? 'Nothing matches this filter' : 'No notifications yet'}
                description={items.length ? 'Choose another type or show all notifications.' : 'Alerts appear here after deadlines are scanned, applications are prepared or submissions are recorded. Nothing is generated to create the appearance of activity.'}
              />
            </div>
          )}
        </Card>
      ) : null}

      <Card className="p-4">
        <SectionTitle title="Alert policy" />
        <div className="grid gap-2 md:grid-cols-3">
          {[
            ['Deadline alerts', 'Only for saved or applied roles with a published deadline within seven days.'],
            ['Application alerts', 'Created when you prepare an application or record submission evidence.'],
            ['No email claims', 'In-app notifications are always active. External delivery requires a configured open webhook.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
              <div className="text-xs font-semibold text-[var(--text)]">{title}</div>
              <p className="mt-0.5 text-[0.65rem] leading-relaxed text-[var(--muted)]">{text}</p>
            </div>
          ))}
        </div>
      </Card>

      {openJobId ? <JobDetailModal jobId={openJobId} onClose={() => setOpenJobId(null)} onChanged={() => void notifications.reload()} /> : null}
    </div>
  );
}

function RefreshIcon() {
  return <RefreshCwIcon />;
}

function RefreshCwIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>;
}
