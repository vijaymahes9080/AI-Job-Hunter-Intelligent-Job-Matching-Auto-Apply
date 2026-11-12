import { useMemo, useState } from 'react';
import { Compass, Filter, Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import type { JobPosting } from '../../shared/types';
import { api, errorMessage, type DiscoveryResult, type JobFilters } from '../lib/api';
import { formatDateTime, relativeTime } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import type { RoutePath } from '../lib/router';
import { JobCard } from '../components/JobCard';
import { JobDetailModal } from '../components/JobDetailModal';
import { Badge, Button, Card, ErrorNotice, Field, Input, LoadingBlock, Modal, PageHeader, Select, TagInput, Textarea } from '../components/ui';

const DEFAULT_FILTERS: JobFilters = { sort: 'match', page: 1, pageSize: 12, sources: '', workplaceTypes: '' };

export function DiscoveryPage({ navigate }: { navigate: (path: RoutePath) => void }) {
  const [draft, setDraft] = useState({ q: '', location: '', minMatch: '', source: '', workplace: '' });
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<DiscoveryResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const jobs = useAsync(() => api.jobs.list(filters), [JSON.stringify(filters)]);
  const sources = useAsync(() => api.discovery.sources(), []);

  const applyFilters = (event?: React.FormEvent) => {
    event?.preventDefault();
    setFilters({
      ...DEFAULT_FILTERS,
      q: draft.q.trim() || undefined,
      location: draft.location.trim() || undefined,
      minMatch: draft.minMatch ? Number(draft.minMatch) : undefined,
      sources: draft.source || undefined,
      workplaceTypes: draft.workplace || undefined,
      sort: filters.sort || 'match',
      pageSize: 12,
      page: 1,
    });
  };

  const runDiscovery = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const result = await api.discovery.run();
      setRunResult(result);
      await Promise.all([jobs.reload(), sources.reload()]);
    } catch (caught) {
      setRunError(errorMessage(caught));
    } finally {
      setRunning(false);
    }
  };

  const toggleSave = async (job: JobPosting) => {
    setSavingId(job.id);
    try {
      if (job.isSaved) await api.jobs.unsave(job.id);
      else await api.jobs.save(job.id);
      await jobs.reload();
    } catch (caught) {
      setRunError(errorMessage(caught));
    } finally {
      setSavingId(null);
    }
  };

  const prepare = (jobId: string) => {
    localStorage.setItem('ajh-studio-job', jobId);
    navigate('studio');
  };

  const page = jobs.data;
  const totalPages = page ? Math.max(1, Math.ceil(page.total / page.pageSize)) : 1;
  const activeFilterCount = useMemo(
    () => [draft.q, draft.location, draft.minMatch, draft.source, draft.workplace].filter(Boolean).length,
    [draft],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Find opportunities"
        title="Job Discovery"
        description="Public postings from Remotive, Greenhouse and Lever, matched with a transparent weighted formula. The demo snapshot stores real listings with their source URLs."
        actions={
          <>
            <Button variant="secondary" onClick={() => setManualOpen(true)}><Plus size={15} /> Add verified job</Button>
            <Button onClick={runDiscovery} loading={running}><RefreshCw size={15} /> Run discovery</Button>
          </>
        }
      />

      {runError ? <ErrorNotice message={runError} /> : null}
      {runResult ? (
        <Card className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-[var(--text)]">
              Discovery finished · {runResult.totalDiscovered} discovered · {runResult.totalInserted} new · {runResult.totalUpdated} updated
            </div>
            <button type="button" className="text-[0.68rem] text-[var(--muted-2)] hover:text-[var(--text)]" onClick={() => setRunResult(null)}>Dismiss</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {runResult.runs.map((run) => (
              <span key={run.source} title={run.message || ''}>
                <Badge tone={run.status === 'success' ? 'success' : run.status === 'partial' ? 'warning' : 'danger'}>
                  {run.source}: {run.inserted} new / {run.updated} updated
                </Badge>
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Card className="p-3.5">
            <form onSubmit={applyFilters} className="space-y-2.5">
              <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_auto]">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
                  <Input className="pl-9" placeholder="Search title, company, skill or description" value={draft.q} onChange={(event) => setDraft({ ...draft, q: event.target.value })} aria-label="Search jobs" />
                </div>
                <Input placeholder="Location filter" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} aria-label="Location filter" />
                <Button type="submit"><Filter size={14} /> Apply</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select className="w-auto min-w-[150px]" value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} aria-label="Job source">
                  <option value="">All public sources</option>
                  <option value="remotive">Remotive</option>
                  <option value="greenhouse">Greenhouse</option>
                  <option value="lever">Lever</option>
                </Select>
                <Select className="w-auto min-w-[145px]" value={draft.workplace} onChange={(event) => setDraft({ ...draft, workplace: event.target.value })} aria-label="Workplace type">
                  <option value="">Any workplace</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </Select>
                <Select className="w-auto min-w-[140px]" value={draft.minMatch} onChange={(event) => setDraft({ ...draft, minMatch: event.target.value })} aria-label="Minimum match">
                  <option value="">Any match</option>
                  <option value="40">40%+ match</option>
                  <option value="60">60%+ match</option>
                  <option value="75">75%+ match</option>
                </Select>
                <Select className="w-auto min-w-[140px]" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value as JobFilters['sort'], page: 1 })} aria-label="Sort jobs">
                  <option value="match">Best match</option>
                  <option value="newest">Newest retrieved</option>
                  <option value="deadline">Deadline first</option>
                  <option value="salary">Salary first</option>
                </Select>
                <button
                  type="button"
                  onClick={() => { setDraft({ q: '', location: '', minMatch: '', source: '', workplace: '' }); setFilters(DEFAULT_FILTERS); }}
                  className="inline-flex items-center gap-1 text-[0.68rem] font-medium text-[var(--muted)] hover:text-[var(--text)]"
                >
                  <SlidersHorizontal size={12} /> Reset {activeFilterCount ? `(${activeFilterCount})` : ''}
                </button>
              </div>
            </form>
          </Card>

          {jobs.loading ? <LoadingBlock label="Filtering persisted jobs…" rows={5} /> : null}
          {jobs.error ? <ErrorNotice message={jobs.error} onRetry={jobs.reload} /> : null}

          {page ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-[var(--muted)]">
                  <span className="font-semibold text-[var(--text)]">{page.total}</span> jobs match · showing page {page.page} of {totalPages}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="secondary" disabled={page.page <= 1} onClick={() => setFilters({ ...filters, page: page.page - 1 })}>Previous</Button>
                  <Button size="sm" variant="secondary" disabled={page.page >= totalPages} onClick={() => setFilters({ ...filters, page: page.page + 1 })}>Next</Button>
                </div>
              </div>
              {page.items.length === 0 ? (
                <Card className="p-8 text-center">
                  <Compass size={22} className="mx-auto text-[var(--muted-2)]" />
                  <h3 className="mt-2 text-sm font-semibold text-[var(--text)]">No jobs match these filters</h3>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[var(--muted)]">Reset the filters or run discovery to fetch fresh public postings. Discovery depends on the availability of the public APIs.</p>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {page.items.map((job) => (
                    <JobCard key={job.id} job={job} onOpen={() => setOpenJobId(job.id)} onToggleSave={() => void toggleSave(job)} busy={savingId === job.id} />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="space-y-3">
          <Card className="p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--muted-2)]">Source status</h2>
              <Badge tone="success">Open APIs</Badge>
            </div>
            {sources.data ? (
              <>
                <div className="space-y-2">
                  {sources.data.sources.filter((source) => source.source !== 'manual').map((source) => (
                    <div key={source.source} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium text-[var(--text)]">{source.label}</div>
                        <Badge tone={source.lastStatus === 'error' ? 'danger' : source.lastStatus === 'partial' ? 'warning' : 'success'}>
                          {source.lastStatus || 'ready'}
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-[0.65rem] text-[var(--muted-2)]">
                        {source.lastRunAt ? `Last run ${relativeTime(source.lastRunAt)} · ${source.inserted} inserted` : 'Not run in this workspace yet'}
                      </div>
                      {source.message ? <div className="mt-0.5 text-[0.65rem] text-[var(--warning)]">{source.message}</div> : null}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[0.62rem] leading-relaxed text-[var(--muted-2)]">
                  Snapshot retrieved {formatDateTime(sources.data.snapshotRetrievedAt)}. Source APIs can change or throttle; failures are reported, never hidden.
                </div>
              </>
            ) : sources.loading ? <div className="skeleton h-24" /> : <ErrorNotice message={sources.error || 'Sources unavailable'} />}
          </Card>

          <Card className="p-3.5">
            <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--muted-2)]">How match works</h2>
            <p className="text-[0.68rem] leading-relaxed text-[var(--muted)]">
              The weighted score compares your verified profile and resume evidence with skills extracted from the
              posting. Related technologies count as partial, never as a match. The full factor breakdown is visible on
              every job.
            </p>
          </Card>
        </div>
      </div>

      {openJobId ? (
        <JobDetailModal jobId={openJobId} onClose={() => setOpenJobId(null)} onPrepare={prepare} onChanged={() => void jobs.reload()} />
      ) : null}
      <ManualJobModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onCreated={() => {
          setManualOpen(false);
          void jobs.reload();
        }}
      />
    </div>
  );
}

function ManualJobModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: '',
    company: '',
    location: '',
    workplaceType: 'Remote',
    employmentType: 'Full-time',
    applyUrl: '',
    description: '',
    deadlineDate: '',
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: 'INR',
    salaryPeriod: 'year',
    skills: [] as string[],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.jobs.addManual({
        title: form.title,
        company: form.company,
        location: form.location,
        workplaceType: form.workplaceType,
        employmentType: form.employmentType,
        applyUrl: form.applyUrl,
        description: form.description,
        deadlineDate: form.deadlineDate || null,
        skills: form.skills,
        salary:
          form.salaryMin || form.salaryMax
            ? {
                min: form.salaryMin ? Number(form.salaryMin) : null,
                max: form.salaryMax ? Number(form.salaryMax) : null,
                currency: form.salaryCurrency,
                period: form.salaryPeriod,
                source: 'published',
                rawText: 'Manually recorded by candidate from the employer posting.',
              }
            : null,
      });
      setForm({ ...form, title: '', company: '', location: '', applyUrl: '', description: '', deadlineDate: '', salaryMin: '', salaryMax: '', skills: [] });
      onCreated();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a verified job" description="Only add a posting you have actually seen. The record is labelled manual and never masquerades as an API source." width="max-w-3xl"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Save job</Button></>}
    >
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Job title"><Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
        <Field label="Company"><Input required value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></Field>
        <Field label="Location"><Input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
        <Field label="Apply URL" hint="The real employer or ATS URL."><Input required type="url" value={form.applyUrl} onChange={(event) => setForm({ ...form, applyUrl: event.target.value })} placeholder="https://" /></Field>
        <Field label="Workplace">
          <Select value={form.workplaceType} onChange={(event) => setForm({ ...form, workplaceType: event.target.value })}>
            {['Remote', 'Hybrid', 'On-site', 'Unknown'].map((value) => <option key={value}>{value}</option>)}
          </Select>
        </Field>
        <Field label="Employment type">
          <Select value={form.employmentType} onChange={(event) => setForm({ ...form, employmentType: event.target.value })}>
            {['Full-time', 'Part-time', 'Contract', 'Internship', 'Unknown'].map((value) => <option key={value}>{value}</option>)}
          </Select>
        </Field>
        <Field label="Published deadline" hint="Leave blank if the posting does not state one."><Input type="date" value={form.deadlineDate} onChange={(event) => setForm({ ...form, deadlineDate: event.target.value })} /></Field>
        <Field label="Skills detected" hint="Enter only technologies named in the posting."><TagInput value={form.skills} onChange={(skills) => setForm({ ...form, skills })} /></Field>
        <div className="sm:col-span-2">
          <Field label="Full job description" hint="At least 50 characters. Paste the employer's text.">
            <Textarea required minLength={50} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="mb-2 text-xs font-semibold text-[var(--text)]">Published salary (optional)</div>
          <div className="grid gap-2 sm:grid-cols-4">
            <Input type="number" min="0" placeholder="Min" value={form.salaryMin} onChange={(event) => setForm({ ...form, salaryMin: event.target.value })} />
            <Input type="number" min="0" placeholder="Max" value={form.salaryMax} onChange={(event) => setForm({ ...form, salaryMax: event.target.value })} />
            <Select value={form.salaryCurrency} onChange={(event) => setForm({ ...form, salaryCurrency: event.target.value })}>
              {['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED', 'CAD', 'AUD'].map((value) => <option key={value}>{value}</option>)}
            </Select>
            <Select value={form.salaryPeriod} onChange={(event) => setForm({ ...form, salaryPeriod: event.target.value })}>
              {['year', 'month', 'hour'].map((value) => <option key={value}>{value}</option>)}
            </Select>
          </div>
        </div>
        {error ? <div className="sm:col-span-2"><ErrorNotice message={error} /></div> : null}
      </form>
    </Modal>
  );
}
