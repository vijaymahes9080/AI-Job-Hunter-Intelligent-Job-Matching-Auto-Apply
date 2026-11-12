import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  ExternalLink,
  HardDrive,
  LogOut,
  RefreshCw,
  Save,
  UserRound,
} from 'lucide-react';
import type { IntegrationStatusRecord, UserSettings } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { formatDate } from '../lib/format';
import { useSession } from '../lib/session';
import { useAsync } from '../lib/useAsync';
import type { RoutePath } from '../lib/router';
import {
  Badge,
  Button,
  Card,
  ErrorNotice,
  Field,
  InfoRow,
  LoadingBlock,
  PageHeader,
  SectionTitle,
  Toggle,
} from '../components/ui';

const CATEGORY_LABEL: Record<IntegrationStatusRecord['category'], string> = {
  'job-source': 'Job sources',
  ai: 'AI',
  portfolio: 'Portfolio',
  notification: 'Notifications',
};

function verificationTone(item: IntegrationStatusRecord): 'success' | 'warning' | 'danger' | 'neutral' {
  if (item.verification === 'live') return 'success';
  if (item.verification === 'optional') return 'neutral';
  if (item.verification === 'requires-credentials') return 'warning';
  return 'danger';
}

export function SettingsPage({ navigate }: { navigate: (path: RoutePath) => void }) {
  const { user, settings, demo, refresh, logout } = useSession();
  const integrations = useAsync(() => api.integrations(), []);
  const [form, setForm] = useState<UserSettings | null>(settings ? { ...settings, theme: 'light' } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (settings && !form) setForm({ ...settings, theme: 'light' });
  }, [settings, form]);

  const dirty = useMemo(
    () => Boolean(form && settings && (
      form.notifyDeadlines !== settings.notifyDeadlines ||
      form.notifyMatches !== settings.notifyMatches ||
      form.weeklyDigest !== settings.weeklyDigest ||
      form.matchThreshold !== settings.matchThreshold
    )),
    [form, settings],
  );

  const update = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
    setNotice(null);
  };

  const save = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await api.settings.update({
        theme: 'light',
        notifyDeadlines: form.notifyDeadlines,
        notifyMatches: form.notifyMatches,
        matchThreshold: Math.round(form.matchThreshold),
        weeklyDigest: form.weeklyDigest,
      });
      setForm({ ...saved, theme: 'light' });
      await refresh();
      setNotice('Preferences saved.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (!form) {
    return (
      <div className="space-y-4">
        <PageHeader title="Settings" description="Loading your preferences…" />
        <div className="skeleton h-48" />
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={save}>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage alerts, matching and the open-source services this workspace uses. The interface is light-only by design."
        actions={
          <Button type="submit" loading={busy} disabled={!dirty}>
            <Save size={15} /> Save changes
          </Button>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}
      {notice ? (
        <div className="flex items-center gap-2 rounded-lg border border-[#a7f3d0] bg-[var(--success-soft)] px-3 py-2 text-xs text-[var(--success)]">
          <CheckCircle2 size={14} /> {notice}
        </div>
      ) : null}
      {dirty ? (
        <div className="rounded-lg border border-[#fde68a] bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning)]">
          You have unsaved changes.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="p-4">
            <SectionTitle title="Alerts and matching" description="In-app alerts are generated from real workspace events and published deadlines." />
            <div className="space-y-2.5">
              <Toggle
                label="Deadline alerts"
                description="Alert for saved or applied roles closing within seven days."
                checked={form.notifyDeadlines}
                onChange={(checked) => update('notifyDeadlines', checked)}
              />
              <Toggle
                label="New match alerts"
                description="Alert when discovery finds a posting at or above your threshold."
                checked={form.notifyMatches}
                onChange={(checked) => update('notifyMatches', checked)}
              />
              <Toggle
                label="Weekly digest"
                description="Record one summary notification per week."
                checked={form.weeklyDigest}
                onChange={(checked) => update('weeklyDigest', checked)}
              />
              <Field label={`Match threshold: ${Math.round(form.matchThreshold)}%`} hint="Jobs below the threshold remain searchable; they are not highlighted as strong matches.">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={form.matchThreshold}
                  onChange={(event) => update('matchThreshold', Number(event.target.value))}
                  className="w-full accent-[var(--accent)]"
                  aria-label="Match threshold"
                />
              </Field>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle
              title="Integrations"
              description="Status is reported by the running server. No proprietary service is required."
              actions={
                <Button type="button" size="sm" variant="ghost" onClick={() => void integrations.reload()} loading={integrations.loading}>
                  <RefreshCw size={13} />
                </Button>
              }
            />
            {integrations.loading ? <LoadingBlock label="Checking integrations…" rows={2} /> : null}
            {integrations.error ? <ErrorNotice message={integrations.error} onRetry={integrations.reload} /> : null}
            {integrations.data ? (
              <div className="divide-y divide-[var(--border)]">
                {integrations.data.integrations.map((item) => (
                  <div key={item.key} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-[var(--text)]">{item.name}</span>
                        <span className="text-[0.6rem] uppercase tracking-wide text-[var(--muted-2)]">{CATEGORY_LABEL[item.category]}</span>
                      </div>
                      <p className="mt-0.5 text-[0.68rem] leading-relaxed text-[var(--muted)]">{item.description}</p>
                      <p className="text-[0.65rem] leading-relaxed text-[var(--muted-2)]">{item.statusDetail}</p>
                      {item.actionRequired ? (
                        <p className="mt-0.5 text-[0.65rem] text-[var(--warning)]">{item.actionRequired}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <Badge tone={verificationTone(item)}>
                        {item.verification === 'live' ? 'Live' : item.verification === 'optional' ? 'Optional' : item.verification === 'requires-credentials' ? 'Needs key' : 'Off'}
                      </Badge>
                      {item.docsUrl ? (
                        <a href={item.docsUrl} target="_blank" rel="noreferrer noopener" aria-label={`${item.name} documentation`} className="text-[var(--accent)]">
                          <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <Card className="p-4">
            <SectionTitle title="Data and automation" />
            {integrations.data ? (
              <div className="space-y-2">
                <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[0.7rem] leading-relaxed ${
                  integrations.data.database === 'postgres'
                    ? 'bg-[var(--success-soft)] text-[var(--success)]'
                    : 'bg-[var(--warning-soft)] text-[var(--warning)]'
                }`}>
                  {integrations.data.database === 'postgres' ? <Database size={14} className="mt-0.5" /> : <HardDrive size={14} className="mt-0.5" />}
                  <span>
                    {integrations.data.database === 'postgres'
                      ? 'PostgreSQL is connected. Records persist across restarts.'
                      : 'Demo database is in memory. Records are lost on restart; set DATABASE_URL for durable storage.'}
                  </span>
                </div>
                <dl>
                  <InfoRow label="Scheduler">
                    {integrations.data.scheduler.enabled
                      ? `Every ${integrations.data.scheduler.intervalMinutes} minutes`
                      : 'Manual / external cron'}
                  </InfoRow>
                  <InfoRow label="AI assistance">
                    {integrations.data.llmConfigured ? 'Open-weight endpoint configured' : 'Deterministic engines only'}
                  </InfoRow>
                  <InfoRow label="Demo mode">{integrations.data.demoMode ? 'Enabled' : 'Disabled'}</InfoRow>
                </dl>
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)]">Unavailable until the integration check succeeds.</p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <SectionTitle title="Account" />
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                {(user?.name || 'C').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[var(--text)]">{user?.name}</div>
                <div className="truncate text-[0.65rem] text-[var(--muted-2)]">{user?.email}</div>
              </div>
            </div>
            {demo ? <Badge tone="warning" className="mt-2">Demo account</Badge> : null}
            <dl className="mt-3">
              <InfoRow label="Member since">{user?.createdAt ? formatDate(user.createdAt) : 'Unknown'}</InfoRow>
              <InfoRow label="Storage">{integrations.data?.database === 'postgres' ? 'PostgreSQL' : 'In-memory demo'}</InfoRow>
            </dl>
            <div className="mt-3 grid gap-1.5">
              <Button type="button" variant="secondary" className="w-full" onClick={() => navigate('profile')}>
                <UserRound size={13} /> Edit profile
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => void logout()}>
                <LogOut size={13} /> Sign out
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Interface" />
            <p className="text-[0.7rem] leading-relaxed text-[var(--muted)]">
              This application uses a single accessible light theme. Dark mode is not offered, so every page has one
              consistent contrast profile.
            </p>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Open source" />
            <div className="flex flex-wrap gap-1">
              {['React', 'TypeScript', 'Vite', 'Express', 'PostgreSQL', 'Zod', 'Recharts'].map((item) => (
                <span key={item} className="chip">{item}</span>
              ))}
            </div>
            <p className="mt-2 text-[0.65rem] leading-relaxed text-[var(--muted-2)]">
              Data sources: Remotive, Greenhouse, Lever and the GitHub REST API. AI is optional and OpenAI-compatible.
            </p>
          </Card>
        </div>
      </div>

      <Button type="submit" loading={busy} disabled={!dirty} className="w-full sm:w-auto">
        <Save size={14} /> {dirty ? 'Save preferences' : 'No unsaved changes'}
      </Button>
    </form>
  );
}
