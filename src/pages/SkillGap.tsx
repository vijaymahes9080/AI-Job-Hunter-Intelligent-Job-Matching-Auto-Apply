import { useState } from 'react';
import { BookOpen, ExternalLink, GraduationCap, Sparkles, Target, TrendingUp } from 'lucide-react';
import type { SkillGapResult } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useSession } from '../lib/session';
import { Badge, Button, Card, ErrorNotice, Field, Input, LoadingBlock, PageHeader, Progress, ScoreRing, SectionTitle } from '../components/ui';

export function SkillGapPage() {
  const { profile } = useSession();
  const latest = useAsync(() => api.skills.latest(), []);
  const [targetRole, setTargetRole] = useState(profile?.preferredRoles?.[0] || profile?.headline || '');
  const [limit, setLimit] = useState(40);
  const [result, setResult] = useState<SkillGapResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = result || latest.data;

  const run = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await api.skills.gap(targetRole.trim() || undefined, undefined, limit));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Prepare"
        title="Skill Gap Intelligence"
        description="Requirements are counted only when they appear in real posting text. Gap percentage is weighted by requirement frequency and importance; it is not a personal deficiency score."
        actions={<Button onClick={run} loading={busy}><TrendingUp size={15} /> Run fresh analysis</Button>}
      />

      <Card className="p-3.5">
        <form onSubmit={run} className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
          <Field label="Target role">
            <Input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="e.g. Full Stack Developer" />
          </Field>
          <Field label="Postings analysed">
            <select className="select" value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
              <option value={20}>Up to 20</option>
              <option value={40}>Up to 40</option>
              <option value={60}>Up to 60</option>
            </select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full" loading={busy}><Sparkles size={14} /> Analyse gaps</Button>
          </div>
        </form>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}
      {latest.loading && !data ? <LoadingBlock label="Loading your latest gap analysis…" /> : null}
      {latest.error && !data ? <ErrorNotice message={latest.error} onRetry={latest.reload} /> : null}

      {!data && !latest.loading ? (
        <Card className="p-8 text-center">
          <Target size={24} className="mx-auto text-[var(--muted-2)]" />
          <h3 className="mt-2 text-sm font-semibold text-[var(--text)]">No gap analysis yet</h3>
          <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-[var(--muted)]">
            Choose a target role and run the analysis. The engine selects relevant persisted postings, extracts explicit
            skill mentions and compares them with your verified profile and resume.
          </p>
        </Card>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
            <Card className="glass-highlight p-4">
              <div className="flex flex-col items-center">
                <ScoreRing value={data.gapPercentage} size={124} label="Weighted gap" />
                <p className="mt-2 text-center text-xs leading-relaxed text-[var(--muted)]">
                  {data.jobCount} posting{data.jobCount === 1 ? '' : 's'} analysed for <span className="font-semibold text-[var(--text)]">{data.targetRole}</span>.
                </p>
              </div>
              <dl className="mt-3 space-y-1.5 text-[0.68rem]">
                <div className="flex justify-between"><dt className="text-[var(--muted-2)]">High-priority gaps</dt><dd className="font-semibold text-[var(--danger)]">{data.highPrioritySkills.length}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--muted-2)]">Matching skills</dt><dd className="font-semibold text-[var(--success)]">{data.matchingSkills.length}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--muted-2)]">Partial evidence</dt><dd className="font-semibold text-[var(--warning)]">{data.partialSkills.length}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--muted-2)]">Generated</dt><dd className="text-[var(--text)]">{new Date(data.generatedAt).toLocaleString()}</dd></div>
              </dl>
              <div className="mt-3 border-t border-[var(--border)] pt-2.5">
                <div className="text-[0.62rem] font-semibold uppercase tracking-wide text-[var(--muted-2)]">Formula</div>
                <p className="mt-1 text-[0.65rem] leading-relaxed text-[var(--muted)]">{data.formula}</p>
              </div>
            </Card>

            <div className="space-y-4">
              <Card className="p-4">
                <SectionTitle title="Your verified evidence" description="Skills present in your profile or resume text. Nothing is added automatically." />
                <div className="flex flex-wrap gap-1.5">
                  {data.existingSkills.length ? data.existingSkills.map((skill) => <span key={skill} className="chip text-[var(--success)]">{skill}</span>) : <span className="text-xs text-[var(--muted-2)]">No skills recorded yet. Complete your profile first.</span>}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {data.matchingSkills.slice(0, 10).map((skill) => (
                    <div key={skill.skill} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-[var(--text)]">{skill.skill}</span>
                        <Badge tone={skill.importance === 'High' ? 'danger' : skill.importance === 'Medium' ? 'warning' : 'neutral'}>{skill.importance}</Badge>
                      </div>
                      <div className="mt-0.5 text-[0.65rem] text-[var(--muted-2)]">Required by {skill.requiredByJobs} posting(s)</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <SectionTitle title="Missing requirements" description="Textual absence from your evidence, ranked by posting frequency and importance." />
                <div className="space-y-1.5">
                  {data.missingSkills.length ? data.missingSkills.slice(0, 16).map((skill) => (
                    <div key={skill.skill} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5">
                      <span className="text-xs font-medium text-[var(--text)]">{skill.skill}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge tone="neutral">{skill.requiredByJobs} posting(s)</Badge>
                        <Badge tone={skill.importance === 'High' ? 'danger' : skill.importance === 'Medium' ? 'warning' : 'neutral'}>{skill.importance}</Badge>
                      </div>
                    </div>
                  )) : <p className="text-xs text-[var(--success)]">No missing requirements detected in the analysed postings.</p>}
                </div>
                {data.partialSkills.length ? (
                  <div className="mt-3 border-t border-[var(--border)] pt-2.5">
                    <div className="mb-1 text-[0.68rem] font-semibold text-[var(--warning)]">Related but not directly evidenced</div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.partialSkills.map((skill) => <span key={skill.skill} className="chip text-[var(--warning)]">{skill.skill} · related to {skill.evidence.join(', ')}</span>)}
                    </div>
                  </div>
                ) : null}
              </Card>
            </div>
          </div>

          <Card className="p-4">
            <SectionTitle title="Learning recommendations" description="Topic suggestions generated from the measured gaps. They are guidance, not claims that you lack the skill in every context." />
            <div className="grid gap-3 md:grid-cols-2">
              {data.recommendations.map((recommendation) => (
                <div key={recommendation.skill} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text)]"><GraduationCap size={15} className="text-[var(--accent)]" /> {recommendation.skill}</div>
                    <Badge tone={recommendation.priority === 'High' ? 'danger' : recommendation.priority === 'Medium' ? 'warning' : 'neutral'}>{recommendation.priority} priority</Badge>
                  </div>
                  <p className="mt-1.5 text-[0.7rem] leading-relaxed text-[var(--muted)]">{recommendation.why}</p>
                  <dl className="mt-2 space-y-1.5 text-[0.68rem] leading-relaxed">
                    <div><dt className="font-semibold text-[var(--text)]">Concept</dt><dd className="text-[var(--muted)]">{recommendation.concept}</dd></div>
                    <div><dt className="font-semibold text-[var(--text)]">Practice</dt><dd className="text-[var(--muted)]">{recommendation.practice}</dd></div>
                    <div><dt className="font-semibold text-[var(--text)]">Portfolio project</dt><dd className="text-[var(--muted)]">{recommendation.project}</dd></div>
                  </dl>
                  {recommendation.resources.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {recommendation.resources.map((resource) => (
                        <a key={resource.url} href={resource.url} target="_blank" rel="noreferrer noopener" className="chip hover:border-[var(--accent)] hover:text-[var(--accent)]">
                          <BookOpen size={10} /> {resource.label} <ExternalLink size={9} />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Evidence notes" description="How to read this analysis honestly." />
            <ul className="space-y-1.5">
              {data.evidenceNotes.map((note) => (
                <li key={note} className="flex items-start gap-2 text-[0.7rem] leading-relaxed text-[var(--muted)]">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--accent)]" /> {note}
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Progress value={100 - data.gapPercentage} label="Evidence coverage of published requirements" tone="success" />
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
