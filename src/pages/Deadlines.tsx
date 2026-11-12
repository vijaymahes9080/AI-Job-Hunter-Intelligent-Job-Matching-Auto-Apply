import { useMemo, useState } from 'react';
import { BellRing, CalendarCheck2, CalendarClock, CheckCircle2, ShieldQuestion, XCircle } from 'lucide-react';
import type { DeadlineBoardItem } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { deadlineLabel, formatDateTime } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { Badge, Button, Card, ErrorNotice, Field, Input, LoadingBlock, Modal, PageHeader, StatCard, Tabs } from '../components/ui';

type StatusFilter = 'all' | 'Closing Soon' | 'Open' | 'Needs Verification' | 'Not Specified' | 'Deadline Passed';

export function DeadlinesPage() {
  const [includeAll, setIncludeAll] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const board = useAsync(() => api.deadlines.board(includeAll), [includeAll]);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DeadlineBoardItem | null>(null);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const items = useMemo(() => {
    const all = board.data?.items || [];
    return filter === 'all' ? all : all.filter((item) => item.deadline.status === filter);
  }, [board.data, filter]);

  const summary = board.data?.summary;

  const scan = async () => {
    setScanning(true);
    setError(null);
    try {
      const result = await api.deadlines.scan();
      setScanNotice(`Scan complete across ${result.scannedJobs ?? 'the stored'} jobs · ${result.notificationsCreated} new deadline notification(s).`);
      window.dispatchEvent(new Event('ajh:notifications-changed'));
      await board.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setScanning(false);
    }
  };

  const openVerify = (item: DeadlineBoardItem) => {
    setSelected(item);
    setDate(item.deadline.date || '');
    setNote('');
    setModalError(null);
  };

  const saveDeadline = async () => {
    if (!selected) return;
    setSaving(true);
    setModalError(null);
    try {
      await api.jobs.verifyDeadline(selected.jobId, date || null, note.trim() || undefined);
      setSelected(null);
      await board.reload();
    } catch (caught) {
      setModalError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Find opportunities"
        title="Deadline Intelligence"
        description="Only dates explicitly published in employer text are shown as reported. ‘Needs Verification’ and ‘Not Specified’ are honest states, not guesses."
        actions={
          <>
            <Button variant="secondary" onClick={() => setIncludeAll((value) => !value)}>
              {includeAll ? 'Show saved/applied only' : 'Show all stored jobs'}
            </Button>
            <Button onClick={scan} loading={scanning}><BellRing size={15} /> Scan & alert</Button>
          </>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}
      {scanNotice ? <div className="rounded-xl border border-[rgba(52,211,153,0.3)] bg-[var(--success-soft)] px-4 py-2.5 text-xs text-[var(--success)]">{scanNotice}</div> : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Closing soon" value={summary.closingSoon} hint="Published date within 7 days" icon={<CalendarClock size={17} />} tone="warning" />
          <StatCard label="Open" value={summary.open} hint="Published date beyond 7 days" icon={<CalendarCheck2 size={17} />} tone="success" />
          <StatCard label="Needs verification" value={summary.needsVerification} hint="Ambiguous or unconfirmed date" icon={<ShieldQuestion size={17} />} tone="info" />
          <StatCard label="Not specified" value={summary.notSpecified} hint="No date found in posting text" icon={<XCircle size={17} />} />
          <StatCard label="Passed" value={summary.passed} hint="Published date is in the past" icon={<XCircle size={17} />} tone="danger" />
        </div>
      ) : null}

      <Card className="p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'all', label: 'All', count: board.data?.items.length },
              { value: 'Closing Soon', label: 'Closing soon', count: summary?.closingSoon },
              { value: 'Open', label: 'Open', count: summary?.open },
              { value: 'Needs Verification', label: 'Needs verification', count: summary?.needsVerification },
              { value: 'Not Specified', label: 'Not specified', count: summary?.notSpecified },
              { value: 'Deadline Passed', label: 'Passed', count: summary?.passed },
            ]}
          />
          <div className="text-[0.65rem] text-[var(--muted-2)]">Scanned {summary?.scannedJobs ?? 0} stored jobs</div>
        </div>
      </Card>

      {board.loading ? <LoadingBlock label="Building the deadline board…" /> : null}
      {board.error ? <ErrorNotice message={board.error} onRetry={board.reload} /> : null}

      {board.data ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Evidence / confidence</th>
                  <th>Pipeline</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.jobId}>
                    <td>
                      <div className="max-w-[260px]">
                        <div className="truncate text-xs font-semibold text-[var(--text)]">{item.title}</div>
                        <div className="truncate text-[0.65rem] text-[var(--muted-2)]">{item.company} · {item.location}</div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-xs text-[var(--text)]">{item.deadline.date || '—'}</td>
                    <td>
                      <Badge tone={item.deadline.status === 'Closing Soon' ? 'danger' : item.deadline.status === 'Open' ? 'success' : item.deadline.status === 'Deadline Passed' ? 'danger' : item.deadline.status === 'Needs Verification' ? 'warning' : 'neutral'}>
                        {item.deadline.status}
                      </Badge>
                      <div className="mt-0.5 text-[0.62rem] text-[var(--muted-2)]">{deadlineLabel(item.deadline)}</div>
                    </td>
                    <td>
                      <div className="max-w-[280px]">
                        <div className="text-[0.65rem] text-[var(--muted)]">{item.deadline.sourceSnippet || item.deadline.note}</div>
                        <div className="mt-0.5 text-[0.6rem] uppercase tracking-wide text-[var(--muted-2)]">confidence: {item.deadline.confidence}</div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {item.isSaved ? <Badge tone="accent">Saved</Badge> : null}
                        {item.applicationStatus ? <Badge tone="info">{item.applicationStatus}</Badge> : null}
                        {!item.isSaved && !item.applicationStatus ? <span className="text-[0.65rem] text-[var(--muted-2)]">Not tracked</span> : null}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <a href={item.applyUrl} target="_blank" rel="noreferrer noopener" className="btn btn-ghost btn-sm">Posting</a>
                        <Button variant="secondary" size="sm" onClick={() => openVerify(item)}><CalendarCheck2 size={12} /> Verify</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--muted)]">No deadlines match this filter. This can be a valid state when the posting does not publish a closing date.</div>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { title: 'Published dates', text: 'Extracted only when the posting contains an explicit application deadline. The snippet is retained next to the date.', tone: 'success' as const, icon: CheckCircle2 },
          { title: 'Needs verification', text: 'Ambiguous date language or conflicting signals. Verify on the employer page before treating it as final.', tone: 'warning' as const, icon: ShieldQuestion },
          { title: 'No date found', text: 'The platform does not invent a deadline from “rolling” or “open until filled” language. The status stays Not Specified.', tone: 'neutral' as const, icon: XCircle },
        ].map((card) => (
          <Card key={card.title} className="p-3.5">
            <div className="flex items-center gap-2">
              <card.icon size={15} className={card.tone === 'success' ? 'text-[var(--success)]' : card.tone === 'warning' ? 'text-[var(--warning)]' : 'text-[var(--muted-2)]'} />
              <div className="text-xs font-semibold text-[var(--text)]">{card.title}</div>
              <Badge tone={card.tone}>{card.tone === 'success' ? 'reported' : card.tone === 'warning' ? 'unconfirmed' : 'not guessed'}</Badge>
            </div>
            <p className="mt-1 text-[0.7rem] leading-relaxed text-[var(--muted)]">{card.text}</p>
          </Card>
        ))}
      </div>

      <p className="text-[0.65rem] text-[var(--muted-2)]">Board generated {board.data ? formatDateTime(board.data.generatedAt) : '—'}. Alerts are in-app and optional webhook only; no email is sent without a configured provider.</p>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Record a verified deadline"
        description={selected ? `${selected.title} · ${selected.company}. Only save a date you have seen on the employer page.` : undefined}
        footer={<><Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button><Button onClick={saveDeadline} loading={saving}>Save verified deadline</Button></>}
      >
        <div className="space-y-3">
          <Field label="Deadline date" hint="Leave blank and save to clear a previously recorded date.">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="Verification note" hint="Example: “Saw ‘Applications close 30 November’ on the employer careers page.”">
            <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Where and when you verified it" />
          </Field>
          {selected?.deadline.sourceSnippet ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
              <div className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Current source snippet</div>
              <p className="mt-1 text-[0.68rem] leading-relaxed text-[var(--muted)]">“{selected.deadline.sourceSnippet}”</p>
            </div>
          ) : null}
          {modalError ? <ErrorNotice message={modalError} /> : null}
        </div>
      </Modal>
    </div>
  );
}
