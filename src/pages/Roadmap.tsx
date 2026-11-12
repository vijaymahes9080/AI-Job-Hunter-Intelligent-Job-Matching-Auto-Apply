import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock, Flag, Map, Route, Sparkles } from 'lucide-react';
import type { CareerRoadmap } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { formatDate } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useSession } from '../lib/session';
import { Badge, Button, Card, EmptyState, ErrorNotice, Field, Input, LoadingBlock, PageHeader, Progress, SectionTitle, Select } from '../components/ui';

export function RoadmapPage() {
  const { profile } = useSession();
  const roadmaps = useAsync(() => api.roadmaps.list(), []);
  const [selected, setSelected] = useState<CareerRoadmap | null>(null);
  const [targetRole, setTargetRole] = useState(profile?.preferredRoles?.[0] || profile?.headline || '');
  const [weeklyHours, setWeeklyHours] = useState(8);
  const [experienceLevel, setExperienceLevel] = useState<'student' | 'entry' | 'mid' | 'senior'>('entry');
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && roadmaps.data?.items.length) setSelected(roadmaps.data.items[0]);
  }, [roadmaps.data, selected]);

  const create = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const roadmap = await api.roadmaps.create({ targetRole: targetRole.trim() || undefined, weeklyHours, experienceLevel });
      setSelected(roadmap);
      await roadmaps.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (key: string, completed: boolean) => {
    if (!selected) return;
    setToggling(key);
    setError(null);
    try {
      const updated = await api.roadmaps.toggleMilestone(selected.id, key, completed);
      setSelected(updated);
      await roadmaps.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Prepare"
        title="Career Roadmap"
        description="A staged plan derived from your measured skill gaps, available weekly hours and experience level. Completion is self-reported and persisted; it is not a certification."
        actions={<Button onClick={create} loading={creating}><Sparkles size={15} /> Generate roadmap</Button>}
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-3.5">
        <form onSubmit={create} className="grid gap-2 sm:grid-cols-[1fr_140px_170px_auto] sm:items-end">
          <Field label="Target role"><Input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="e.g. Full Stack Developer" /></Field>
          <Field label="Weekly hours"><Input type="number" min={2} max={40} value={weeklyHours} onChange={(event) => setWeeklyHours(Number(event.target.value))} /></Field>
          <Field label="Current level">
            <Select value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value as typeof experienceLevel)}>
              <option value="student">Student / no experience</option>
              <option value="entry">Entry level</option>
              <option value="mid">Mid level</option>
              <option value="senior">Senior</option>
            </Select>
          </Field>
          <Button type="submit" loading={creating}><Route size={14} /> Generate</Button>
        </form>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <Card className="p-3.5">
          <SectionTitle title="Your roadmaps" description="Generated plans are stored for this account." />
          {roadmaps.loading ? <LoadingBlock label="Loading roadmaps…" rows={3} /> : null}
          {roadmaps.data?.items.length === 0 ? <p className="text-xs text-[var(--muted)]">No roadmap yet. Generate one from your measured gaps.</p> : null}
          <div className="space-y-1.5">
            {roadmaps.data?.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${selected?.id === item.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]'}`}
              >
                <div className="truncate text-xs font-semibold text-[var(--text)]">{item.targetRole}</div>
                <div className="mt-0.5 text-[0.65rem] text-[var(--muted-2)]">{item.stages.length} stages · {formatDate(item.createdAt)}</div>
                <div className="mt-1.5"><Progress value={item.progress} tone={item.progress >= 70 ? 'success' : 'accent'} /></div>
              </button>
            ))}
          </div>
        </Card>

        {selected ? (
          <div className="space-y-4">
            <Card className="glass-highlight p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-[var(--text)]">{selected.targetRole}</h2>
                    <Badge tone={selected.progress >= 70 ? 'success' : 'accent'}>{selected.progress}% complete</Badge>
                  </div>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)]">{selected.summary}</p>
                  <p className="mt-1 text-[0.65rem] text-[var(--muted-2)]">Created {formatDate(selected.createdAt)} · updated {formatDate(selected.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                  <Flag size={15} className="text-[var(--accent)]" />
                  <div>
                    <div className="text-xs font-semibold text-[var(--text)]">{selected.milestones.filter((item) => item.completed).length}/{selected.milestones.length}</div>
                    <div className="text-[0.62rem] text-[var(--muted-2)]">milestones</div>
                  </div>
                </div>
              </div>
              <div className="mt-3"><Progress value={selected.progress} tone="success" label="Verified self-reported progress" /></div>
            </Card>

            <Card className="p-4">
              <SectionTitle title="Milestones" description="Tick only what you have actually completed. No certificate or evidence is uploaded automatically." />
              <div className="grid gap-2 sm:grid-cols-2">
                {selected.milestones.map((milestone) => (
                  <button
                    key={milestone.key}
                    type="button"
                    disabled={toggling === milestone.key}
                    onClick={() => void toggle(milestone.key, !milestone.completed)}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${milestone.completed ? 'border-[rgba(52,211,153,0.3)] bg-[var(--success-soft)]' : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]'}`}
                  >
                    {milestone.completed ? <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-[var(--success)]" /> : <Circle size={17} className="mt-0.5 flex-shrink-0 text-[var(--muted-2)]" />}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-[var(--text)]">{milestone.title}</span>
                        <Badge tone="neutral"><Clock size={9} /> week {milestone.week}</Badge>
                      </div>
                      <p className="mt-0.5 text-[0.68rem] leading-relaxed text-[var(--muted)]">{milestone.deliverable}</p>
                      {milestone.completedAt ? <p className="mt-0.5 text-[0.62rem] text-[var(--success)]">Completed {formatDate(milestone.completedAt)}</p> : null}
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <div className="space-y-3">
              {selected.stages.map((stage) => (
                <Card key={stage.key} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">{stage.order}</div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text)]">{stage.title}</h3>
                        <p className="text-[0.65rem] text-[var(--muted-2)]">{stage.weeks} week{stage.weeks === 1 ? '' : 's'} · {stage.objectives.length} objectives</p>
                      </div>
                    </div>
                    <Badge tone="accent">Stage {stage.order}</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Objectives</div>
                      <ul className="mt-1 space-y-1">
                        {stage.objectives.map((objective) => <li key={objective} className="flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-[var(--muted)]"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--accent)]" /> {objective}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Activities</div>
                      <ul className="mt-1 space-y-1">
                        {stage.activities.map((activity) => <li key={activity} className="flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-[var(--muted)]"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--accent-3)]" /> {activity}</li>)}
                      </ul>
                    </div>
                  </div>
                  {stage.project ? (
                    <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                      <div className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Portfolio project</div>
                      <div className="mt-0.5 text-xs font-semibold text-[var(--text)]">{stage.project.title}</div>
                      <p className="mt-0.5 text-[0.68rem] leading-relaxed text-[var(--muted)]">{stage.project.description}</p>
                      <p className="mt-1 text-[0.65rem] leading-relaxed text-[var(--success)]">Acceptance: {stage.project.acceptance}</p>
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-[0.65rem]">
                    {stage.certification ? <span className="chip">Certification suggestion: {stage.certification.name}</span> : null}
                    <span className="chip">Assessment: {stage.assessment}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="p-6">
            <EmptyState icon={<Map size={20} />} title="No roadmap selected" description="Generate a roadmap from your measured skill gaps, then work through the staged milestones at your chosen weekly pace." action={<Button onClick={create} loading={creating}><Sparkles size={14} /> Generate roadmap</Button>} />
          </Card>
        )}
      </div>
    </div>
  );
}
