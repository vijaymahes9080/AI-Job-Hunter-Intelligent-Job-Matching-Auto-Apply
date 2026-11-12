import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  FileText,
  History,
  MessageSquareText,
  Search,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import type {
  ApplicationEventRecord,
  ApplicationRecord,
  ApplicationStatus,
  JobPosting,
} from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { formatDate, formatDateTime, relativeTime, statusTone } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  SectionTitle,
  Select,
  StatCard,
  Tabs,
  Textarea,
} from '../components/ui';

type PipelineTab = 'all' | 'prepared' | 'approved' | 'active' | 'outcomes';

const NEXT_STATUSES: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  Prepared: ['Withdrawn'],
  Approved: ['Withdrawn'],
  Submitted: ['Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
  Assessment: ['Interview', 'Offer', 'Rejected', 'Withdrawn'],
  Interview: ['Offer', 'Rejected', 'Withdrawn'],
  Offer: ['Withdrawn'],
  Rejected: [],
  Withdrawn: [],
};

const STATUS_OPTIONS: ApplicationStatus[] = [
  'Prepared',
  'Approved',
  'Submitted',
  'Assessment',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
];

function inTab(application: ApplicationRecord, tab: PipelineTab): boolean {
  switch (tab) {
    case 'prepared':
      return application.status === 'Prepared';
    case 'approved':
      return application.status === 'Approved';
    case 'active':
      return ['Submitted', 'Assessment', 'Interview'].includes(application.status);
    case 'outcomes':
      return ['Offer', 'Rejected', 'Withdrawn'].includes(application.status);
    default:
      return true;
  }
}

export function ApplicationsPage({ navigate }: { navigate: (path: 'studio' | 'discovery') => void }) {
  const applications = useAsync(() => api.applications.list(), []);
  const [tab, setTab] = useState<PipelineTab>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const items = applications.data?.items || [];
  const counts = useMemo(
    () => ({
      prepared: items.filter((item) => item.status === 'Prepared').length,
      approved: items.filter((item) => item.status === 'Approved').length,
      submitted: items.filter((item) => item.status !== 'Prepared' && item.status !== 'Approved').length,
      offers: items.filter((item) => item.status === 'Offer').length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return items.filter((application) => {
      if (!inTab(application, tab)) return false;
      if (!search) return true;
      return `${application.jobTitle} ${application.company} ${application.status}`.toLowerCase().includes(search);
    });
  }, [items, query, tab]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Apply"
        title="Applications"
        description="A human-approved pipeline. Prepared content is reviewed, approved and then submitted by you on the employer's site. The platform records confirmation evidence; it never claims an automatic submission."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('discovery')}>
              <Search size={15} /> Find jobs
            </Button>
            <Button onClick={() => navigate('studio')}>
              <ClipboardList size={15} /> Application Studio
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting approval" value={counts.prepared} hint="Prepared content needs your review" icon={<ClipboardCheck size={17} />} tone="warning" />
        <StatCard label="Approved" value={counts.approved} hint="Ready for your manual submission" icon={<ShieldCheck size={17} />} tone="info" />
        <StatCard label="Recorded submissions" value={counts.submitted} hint="Backed by confirmation evidence" icon={<Send size={17} />} tone="success" />
        <StatCard label="Offers" value={counts.offers} hint="Only outcomes you recorded" icon={<BadgeCheck size={17} />} tone="success" />
      </div>

      <Card className="p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'all', label: 'All', count: items.length },
              { value: 'prepared', label: 'Prepared', count: counts.prepared },
              { value: 'approved', label: 'Approved', count: counts.approved },
              { value: 'active', label: 'In progress' },
              { value: 'outcomes', label: 'Outcomes' },
            ]}
          />
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
            <Input className="pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search role or company" aria-label="Search applications" />
          </div>
        </div>
      </Card>

      {applications.loading ? <LoadingBlock label="Loading your application pipeline…" /> : null}
      {applications.error ? <ErrorNotice message={applications.error} onRetry={applications.reload} /> : null}

      {!applications.loading && items.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<ClipboardList size={20} />}
            title="No applications yet"
            description="Choose a role in Application Studio, review the generated content, and prepare your first application. Nothing is submitted without your explicit action."
            action={<Button onClick={() => navigate('studio')}><ArrowRight size={14} /> Open Studio</Button>}
          />
        </Card>
      ) : null}

      {items.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Match</th>
                  <th>Evidence</th>
                  <th>Updated</th>
                  <th className="text-right">Review</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <div className="max-w-[280px]">
                        <div className="truncate text-xs font-semibold text-[var(--text)]">{application.jobTitle}</div>
                        <div className="truncate text-[0.65rem] text-[var(--muted-2)]">{application.company} · {application.source}</div>
                      </div>
                    </td>
                    <td>
                      <Badge tone={statusTone(application.status)}>{application.status}</Badge>
                      {application.outcomeUnknown ? <div className="mt-0.5 text-[0.6rem] text-[var(--muted-2)]">Outcome not yet known</div> : null}
                    </td>
                    <td className="whitespace-nowrap text-xs font-semibold text-[var(--text)]">{application.matchScore}%</td>
                    <td>
                      <div className="max-w-[220px] text-[0.68rem] text-[var(--muted)]">
                        {application.submissionEvidence
                          ? application.submissionEvidence.reference || application.submissionEvidence.url || 'Evidence recorded'
                          : application.status === 'Approved'
                            ? 'Approved · submission not recorded'
                            : application.status === 'Prepared'
                              ? 'Awaiting approval'
                              : 'No submission evidence'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-[0.68rem] text-[var(--muted-2)]" title={formatDateTime(application.updatedAt)}>{relativeTime(application.updatedAt)}</td>
                    <td className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => setOpenId(application.id)}>Open</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--muted)]">No applications match this filter. Clear the search or choose another pipeline stage.</div>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { title: 'Prepared ≠ submitted', text: 'Preparation stores content and a match snapshot. No employer receives anything until you submit on their own site.', icon: ClipboardCheck },
          { title: 'Evidence required', text: 'Recording a submission requires a confirmation reference or URL, so the pipeline cannot contain invented outcomes.', icon: ShieldCheck },
          { title: 'Unknown stays unknown', text: 'Silence after submission is not treated as rejection. Unknown outcomes are counted separately in analytics.', icon: History },
        ].map((item) => (
          <Card key={item.title} className="p-3.5">
            <div className="flex items-center gap-2">
              <item.icon size={15} className="text-[var(--accent)]" />
              <div className="text-xs font-semibold text-[var(--text)]">{item.title}</div>
            </div>
            <p className="mt-1 text-[0.7rem] leading-relaxed text-[var(--muted)]">{item.text}</p>
          </Card>
        ))}
      </div>

      {openId ? (
        <ApplicationDetailModal
          applicationId={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => void applications.reload()}
        />
      ) : null}
    </div>
  );
}

function ApplicationDetailModal({
  applicationId,
  onClose,
  onChanged,
}: {
  applicationId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [events, setEvents] = useState<ApplicationEventRecord[]>([]);
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [nextStatus, setNextStatus] = useState<ApplicationStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await api.applications.get(applicationId);
      setApplication(detail.application);
      setEvents(detail.events);
      setNotes(detail.application.notes || '');
      setNotesDirty(false);
      setNextStatus('');
      setJob(await api.jobs.get(detail.application.jobId).catch(() => null));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const refreshAfterMutation = async (message: string) => {
    setNotice(message);
    await load();
    onChanged();
    window.dispatchEvent(new Event('ajh:notifications-changed'));
  };

  const approve = async () => {
    if (!application) return;
    setBusy('approve');
    setError(null);
    try {
      await api.applications.approve(application.id);
      await refreshAfterMutation('Application approved. Submit it on the employer site, then record the confirmation evidence here.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    if (!application) return;
    if (!evidenceReference.trim() && !evidenceUrl.trim()) {
      setError('Add a confirmation reference or the final confirmation URL. A submission cannot be recorded without evidence.');
      return;
    }
    setBusy('submit');
    setError(null);
    try {
      await api.applications.submit(application.id, {
        url: evidenceUrl.trim() || null,
        reference: evidenceReference.trim() || null,
        note: evidenceNote.trim() || null,
      });
      setEvidenceUrl('');
      setEvidenceReference('');
      setEvidenceNote('');
      await refreshAfterMutation('Submission and its confirmation evidence were recorded.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = async () => {
    if (!application || !nextStatus) return;
    setBusy('status');
    setError(null);
    try {
      await api.applications.status(application.id, nextStatus, statusNote.trim() || undefined);
      setStatusNote('');
      await refreshAfterMutation(`Status changed to ${nextStatus}.`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  const saveNotes = async () => {
    if (!application) return;
    setBusy('notes');
    setError(null);
    try {
      await api.applications.notes(application.id, notes);
      await refreshAfterMutation('Notes saved.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  const applyUrl = job ? (() => {
    try {
      const parsed = new URL(job.applyUrl);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
    } catch {
      return null;
    }
  })() : null;

  const allowedNext = application ? NEXT_STATUSES[application.status] || [] : [];

  return (
    <Modal
      open
      onClose={onClose}
      title={application?.jobTitle || 'Application details'}
      description={application ? `${application.company} · ${application.source} · match ${application.matchScore}%` : undefined}
      width="max-w-4xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {application?.status === 'Prepared' ? (
            <Button onClick={approve} loading={busy === 'approve'}><ShieldCheck size={14} /> Approve for submission</Button>
          ) : null}
          {applyUrl ? (
            <a href={applyUrl} target="_blank" rel="noreferrer noopener" className="btn btn-primary btn-sm">
              <ExternalLink size={14} /> Open employer posting
            </a>
          ) : null}
        </>
      }
    >
      {loading ? <LoadingBlock label="Loading the application record and event history…" rows={5} /> : null}
      {error ? <div className="mb-3"><ErrorNotice message={error} /></div> : null}
      {notice ? (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-[rgba(52,211,153,0.3)] bg-[var(--success-soft)] px-3 py-2 text-xs text-[var(--success)]">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss notice" onClick={() => setNotice(null)}><X size={13} /></button>
        </div>
      ) : null}

      {application ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(application.status)}>{application.status}</Badge>
            <Badge tone={application.outcomeUnknown ? 'warning' : 'neutral'}>
              {application.outcomeUnknown ? 'Outcome unknown' : application.status === 'Offer' ? 'Outcome recorded' : 'Not yet submitted'}
            </Badge>
            {application.duplicateOverrideReason ? <Badge tone="warning">Duplicate override recorded</Badge> : null}
            <span className="text-[0.65rem] text-[var(--muted-2)]">Created {formatDateTime(application.createdAt)}</span>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="p-3.5">
              <SectionTitle title="Application content" description="The exact content approved for this application." />
              <dl className="space-y-2 text-[0.7rem]">
                <div>
                  <dt className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Resume label</dt>
                  <dd className="mt-0.5 text-[var(--text)]">{application.resumeLabel || 'Profile resume text'}</dd>
                </div>
                <div>
                  <dt className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Cover letter</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap leading-relaxed text-[var(--muted)]">{application.coverLetter || 'No cover letter stored.'}</dd>
                </div>
                <div>
                  <dt className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Screening answers</dt>
                  <dd className="mt-1 space-y-1.5">
                    {Object.keys(application.screeningAnswers).length ? Object.entries(application.screeningAnswers).map(([question, answer]) => (
                      <div key={question} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5">
                        <div className="text-[0.65rem] font-medium text-[var(--text)]">{question}</div>
                        <div className="mt-0.5 whitespace-pre-wrap text-[0.65rem] leading-relaxed text-[var(--muted)]">{answer || 'Not answered'}</div>
                      </div>
                    )) : <span className="text-[var(--muted)]">No screening answers stored.</span>}
                  </dd>
                </div>
                {application.duplicateOverrideReason ? (
                  <div>
                    <dt className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Duplicate review reason</dt>
                    <dd className="mt-0.5 text-[var(--warning)]">{application.duplicateOverrideReason}</dd>
                  </div>
                ) : null}
              </dl>
            </Card>

            <div className="space-y-3">
              {application.submissionEvidence ? (
                <Card className="p-3.5">
                  <SectionTitle title="Submission evidence" description="Recorded by you after submitting on the employer site." />
                  <div className="rounded-lg border border-[rgba(52,211,153,0.3)] bg-[var(--success-soft)] p-2.5 text-[0.7rem] leading-relaxed text-[var(--success)]">
                    <div className="font-semibold">Submission recorded</div>
                    <div>At {formatDateTime(application.submittedAt)}</div>
                    {application.submissionEvidence.reference ? <div className="mt-1 break-all">Reference: {application.submissionEvidence.reference}</div> : null}
                    {application.submissionEvidence.url ? <div className="mt-1 break-all">URL: {application.submissionEvidence.url}</div> : null}
                  </div>
                </Card>
              ) : null}

              {application.status === 'Approved' ? (
                <Card className="p-3.5">
                  <SectionTitle title="Record your submission" description="Only use this after completing the real employer application flow." />
                  <div className="space-y-2.5">
                    <Field label="Confirmation reference" hint="Application ID, confirmation number or the employer's reference.">
                      <Input value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} placeholder="e.g. GH-2026-00421" />
                    </Field>
                    <Field label="Confirmation URL (alternative)">
                      <Input type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://..." />
                    </Field>
                    <Field label="Optional note">
                      <Textarea rows={2} value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="Where did you submit, and what did the confirmation say?" />
                    </Field>
                    <Button className="w-full" onClick={submit} loading={busy === 'submit'}><Send size={14} /> Record submission</Button>
                  </div>
                </Card>
              ) : null}

              {allowedNext.length ? (
                <Card className="p-3.5">
                  <SectionTitle title="Update the recorded stage" description="Only stage changes you have actually observed should be recorded." />
                  <div className="space-y-2.5">
                    <Field label="Next status">
                      <Select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as ApplicationStatus | '')}>
                        <option value="">Choose a status</option>
                        {allowedNext.map((status) => <option key={status} value={status}>{status}</option>)}
                      </Select>
                    </Field>
                    <Field label="Evidence or note">
                      <Input value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="e.g. Recruiter email received 12 Nov" />
                    </Field>
                    <Button variant="secondary" className="w-full" onClick={changeStatus} disabled={!nextStatus} loading={busy === 'status'}>Save stage update</Button>
                  </div>
                </Card>
              ) : null}
            </div>
          </div>

          <Card className="p-3.5">
            <SectionTitle
              title="Notes"
              description="Private notes stored with the application. They are never sent to an employer automatically."
              actions={
                notesDirty ? <Button size="sm" onClick={saveNotes} loading={busy === 'notes'}>Save notes</Button> : null
              }
            />
            <Textarea
              rows={3}
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setNotesDirty(true);
              }}
              placeholder="Interview feedback, recruiter contact, follow-up date…"
            />
          </Card>

          <Card className="p-3.5">
            <SectionTitle title="Event history" description="Every stored transition, note and evidence record in chronological order." />
            {events.length ? (
              <ol className="relative ml-2 space-y-3 border-l border-[var(--border)] pl-4">
                {events.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface-solid)] bg-[var(--accent)]" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--text)]">{event.type}</span>
                      <span className="text-[0.62rem] text-[var(--muted-2)]">{formatDateTime(event.occurredAt)}</span>
                    </div>
                    {event.note ? <p className="mt-0.5 text-[0.68rem] leading-relaxed text-[var(--muted)]">{event.note}</p> : null}
                  </li>
                ))}
              </ol>
            ) : <p className="text-xs text-[var(--muted)]">No events recorded.</p>}
          </Card>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-[0.65rem] leading-relaxed text-[var(--muted)]">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-[var(--text)]"><FileText size={12} /> Employer posting</div>
              {job ? `${job.title} at ${job.company} · retrieved ${formatDate(job.retrievedAt)} from ${job.sourceName}` : 'The linked job record could not be loaded.'}
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-[0.65rem] leading-relaxed text-[var(--muted)]">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-[var(--text)]"><MessageSquareText size={12} /> Honest outcome tracking</div>
              The platform never infers an interview, offer or rejection from silence. Record only messages or events you actually received.
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export function statusOptions(): ApplicationStatus[] {
  return STATUS_OPTIONS;
}
