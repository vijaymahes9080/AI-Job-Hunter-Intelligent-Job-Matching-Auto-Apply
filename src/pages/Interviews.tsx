import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, MessageSquareText, Play, RotateCcw, Send, Target } from 'lucide-react';
import type { Difficulty, InterviewQuestion, InterviewSession } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { formatDate, relativeTime } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useSession } from '../lib/session';
import { JobSelector } from '../components/JobSelector';
import { Badge, Button, Card, EmptyState, ErrorNotice, Field, Input, LoadingBlock, PageHeader, Progress, ScoreRing, SectionTitle, Select, Textarea } from '../components/ui';

const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export function InterviewsPage() {
  const { profile } = useSession();
  const sessions = useAsync(() => api.interviews.list(), []);
  const [jobId, setJobId] = useState('');
  const [targetRole, setTargetRole] = useState(profile?.preferredRoles?.[0] || profile?.headline || '');
  const [difficulty, setDifficulty] = useState<Difficulty>('Intermediate');
  const [creating, setCreating] = useState(false);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [confidence, setConfidence] = useState(3);
  const [busy, setBusy] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const question: InterviewQuestion | null = session?.questions[questionIndex] || null;
  const answeredCount = session ? Object.keys(session.answers).length : 0;
  const currentAnswer = question && session ? session.answers[question.id] : null;

  const create = async () => {
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const created = await api.interviews.create({ jobId: jobId || null, targetRole: targetRole.trim() || undefined, difficulty });
      setSession(created);
      setQuestionIndex(0);
      setAnswerText('');
      setConfidence(3);
      await sessions.reload();
      setNotice('Practice session created. Questions are generated from generic topics and the selected posting’s published requirements — not from confidential company interviews.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setCreating(false);
    }
  };

  const openSession = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const loaded = await api.interviews.get(id);
      setSession(loaded);
      const firstUnanswered = loaded.questions.findIndex((item) => !loaded.answers[item.id]);
      setQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
      setAnswerText('');
      setNotice(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async () => {
    if (!session || !question) return;
    if (!answerText.trim()) {
      setError('Write an answer before requesting feedback.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await api.interviews.answer(session.id, question.id, answerText.trim(), confidence);
      setSession(response.session);
      setAnswerText('');
      const next = response.session.questions.findIndex((item) => !response.session.answers[item.id]);
      if (next >= 0) setQuestionIndex(next);
      await sessions.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    if (!session) return;
    setCompleting(true);
    setError(null);
    try {
      const response = await api.interviews.complete(session.id);
      setSession(response.session);
      await sessions.reload();
      setNotice('Session report generated from the answers you recorded. The score evaluates structure, specificity and keyword coverage — not your worth as a candidate.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setCompleting(false);
    }
  };

  const answeredQuestions = useMemo(() => session?.questions.filter((item) => session.answers[item.id]) || [], [session]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Prepare"
        title="Interview Practice"
        description="Practice questions built from the role and published requirements. Feedback is deterministic and explains exactly which structure and evidence signals it detected."
      />

      {error ? <ErrorNotice message={error} /> : null}
      {notice ? (
        <div className="rounded-xl border border-[rgba(96,165,250,0.3)] bg-[var(--info-soft)] px-4 py-2.5 text-xs leading-relaxed text-[var(--info)]">{notice}</div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="p-4">
            <SectionTitle title="New practice session" description="Pick a persisted job or practise for a target role." />
            <div className="space-y-3">
              <Field label="Job (optional)">
                <JobSelector value={jobId} onChange={(job) => { setJobId(job?.id || ''); if (job) setTargetRole(job.title); }} placeholder="Generic role practice" />
              </Field>
              <Field label="Target role">
                <Input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="e.g. Backend Developer" />
              </Field>
              <Field label="Difficulty">
                <Select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}>
                  {DIFFICULTIES.map((value) => <option key={value}>{value}</option>)}
                </Select>
              </Field>
              <Button className="w-full" onClick={create} loading={creating}><Play size={14} /> Start session</Button>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Previous sessions" description="Stored progress and reports." actions={<Button variant="ghost" size="sm" onClick={() => void sessions.reload()}><RotateCcw size={13} /></Button>} />
            {sessions.loading ? <LoadingBlock label="Loading sessions…" rows={3} /> : null}
            {sessions.error ? <ErrorNotice message={sessions.error} onRetry={sessions.reload} /> : null}
            {sessions.data?.items.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No practice sessions yet.</p>
            ) : (
              <div className="space-y-1.5">
                {sessions.data?.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void openSession(item.id)}
                    className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${session?.id === item.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium text-[var(--text)]">{item.role}</span>
                      {item.score !== null ? <Badge tone={item.score >= 70 ? 'success' : item.score >= 45 ? 'warning' : 'danger'}>{item.score}%</Badge> : <Badge tone="info">In progress</Badge>}
                    </div>
                    <div className="mt-0.5 text-[0.65rem] text-[var(--muted-2)]">{item.company || 'Generic practice'} · {relativeTime(item.createdAt)} · {item.status}</div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {!session ? (
            <Card className="p-6">
              <EmptyState
                icon={<MessageSquareText size={20} />}
                title="Select or start a session"
                description="Each session stores your answers and evaluation history. Nothing is shared with employers and no question is claimed to be a real interview question."
                action={<Button onClick={create} loading={creating}><Play size={14} /> Start a practice session</Button>}
              />
            </Card>
          ) : (
            <>
              <Card className="glass-highlight p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-[var(--text)]">{session.role}</h2>
                      <Badge tone={session.status === 'Completed' ? 'success' : 'info'}>{session.status}</Badge>
                      <Badge>{session.difficulty}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">{session.company || 'Generic role practice'} · created {formatDate(session.createdAt)} · {answeredCount}/{session.questions.length} answered</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {session.score !== null ? <ScoreRing value={session.score} size={64} label="Score" /> : null}
                    {session.status !== 'Completed' ? (
                      <Button size="sm" onClick={complete} loading={completing} disabled={answeredCount === 0}><CheckCircle2 size={14} /> Complete</Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={(answeredCount / Math.max(1, session.questions.length)) * 100} tone="accent" label="Session progress" />
                </div>
                <p className="mt-2 text-[0.65rem] leading-relaxed text-[var(--muted-2)]">{session.disclaimer}</p>
              </Card>

              <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                <div className="space-y-4">
                  {question ? (
                    <Card className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="accent">{question.category}</Badge>
                        <Badge tone={question.difficulty === 'Expert' || question.difficulty === 'Advanced' ? 'warning' : 'neutral'}>{question.difficulty}</Badge>
                        <Badge>{question.skill}</Badge>
                        <span className="ml-auto text-[0.65rem] text-[var(--muted-2)]">Question {questionIndex + 1} of {session.questions.length}</span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold leading-snug text-[var(--text)]">{question.prompt}</h3>
                      <p className="mt-1 text-[0.65rem] text-[var(--muted-2)]">Follow-up: {question.followUp}</p>

                      {currentAnswer ? (
                        <div className="mt-4 space-y-3">
                          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                            <div className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Your recorded answer</div>
                            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-[var(--muted)]">{currentAnswer.answer}</p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {[
                              { label: 'Overall', value: currentAnswer.evaluation.score },
                              { label: 'Technical', value: currentAnswer.evaluation.technicalCorrectness },
                              { label: 'Structure', value: currentAnswer.evaluation.structure },
                            ].map((metric) => (
                              <div key={metric.label} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                                <div className="text-[0.62rem] uppercase tracking-wide text-[var(--muted-2)]">{metric.label}</div>
                                <div className="mt-0.5 text-lg font-bold text-[var(--text)]">{Math.round(metric.value)}%</div>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                            <div className="text-xs font-semibold text-[var(--text)]">Evaluation evidence</div>
                            <div className="mt-1 space-y-1 text-[0.68rem] leading-relaxed">
                              <div className="text-[var(--success)]">Detected: {currentAnswer.evaluation.matchedPoints.join(' · ') || 'no named key points detected'}</div>
                              <div className="text-[var(--warning)]">Missing: {currentAnswer.evaluation.missingPoints.join(' · ') || 'nothing specific missing'}</div>
                              <div className="text-[var(--muted)]">Suggestions: {currentAnswer.evaluation.suggestions.join(' ')}</div>
                            </div>
                          </div>
                          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                            <div className="text-xs font-semibold text-[var(--text)]">Reference outline</div>
                            <p className="mt-1 text-[0.68rem] leading-relaxed text-[var(--muted)]">{question.modelOutline}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1">{question.keyPoints.map((point) => <span key={point} className="chip">{point}</span>)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <Field label="Your answer" hint="Use a concrete example: situation, action, technical detail and a verifiable result.">
                            <Textarea value={answerText} onChange={(event) => setAnswerText(event.target.value)} placeholder="Describe what you did, the trade-offs, and how you verified the result…" rows={7} />
                          </Field>
                          <Field label={`Confidence: ${confidence}/5`}>
                            <input type="range" min={1} max={5} step={1} value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} className="w-full accent-[var(--accent)]" />
                          </Field>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setQuestionIndex(Math.max(0, questionIndex - 1))}>Previous</Button>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setQuestionIndex(Math.min(session.questions.length - 1, questionIndex + 1))}>Skip <ArrowRight size={12} /></Button>
                              <Button onClick={submitAnswer} loading={busy}><Send size={14} /> Submit for feedback</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  ) : null}

                  {session.status === 'Completed' ? (
                    <Card className="p-4">
                      <SectionTitle title="Session report" description="Derived only from the answers recorded in this session." />
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-center">
                          <div className="text-[0.62rem] uppercase tracking-wide text-[var(--muted-2)]">Average score</div>
                          <div className="mt-1 text-2xl font-bold text-[var(--text)]">{session.score ?? 0}%</div>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-center">
                          <div className="text-[0.62rem] uppercase tracking-wide text-[var(--muted-2)]">Questions answered</div>
                          <div className="mt-1 text-2xl font-bold text-[var(--text)]">{answeredCount}</div>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-center">
                          <div className="text-[0.62rem] uppercase tracking-wide text-[var(--muted-2)]">Average confidence</div>
                          <div className="mt-1 text-2xl font-bold text-[var(--text)]">{session.confidenceAverage?.toFixed(1) ?? '—'}</div>
                        </div>
                      </div>
                    </Card>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <Card className="p-3.5">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted-2)]">Question navigator</div>
                    <div className="space-y-1">
                      {session.questions.map((item, index) => {
                        const answered = Boolean(session.answers[item.id]);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setQuestionIndex(index)}
                            className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-[0.68rem] transition ${index === questionIndex ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]' : 'border-transparent text-[var(--muted)] hover:bg-[var(--surface-2)]'}`}
                          >
                            <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[0.55rem] font-bold ${answered ? 'bg-[var(--success)] text-white' : 'bg-[var(--surface-2)] text-[var(--muted-2)]'}`}>{index + 1}</span>
                            <span className="truncate">{item.category} · {item.skill}</span>
                            {answered ? <CheckCircle2 size={11} className="ml-auto flex-shrink-0 text-[var(--success)]" /> : <ChevronRight size={11} className="ml-auto flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </Card>

                  {answeredQuestions.length ? (
                    <Card className="p-3.5">
                      <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--muted-2)]">Answer scores</div>
                      <div className="space-y-1.5">
                        {answeredQuestions.map((item) => {
                          const evaluation = session.answers[item.id].evaluation;
                          return (
                            <div key={item.id}>
                              <div className="flex justify-between text-[0.65rem]"><span className="truncate text-[var(--muted)]">{item.skill}</span><span className="font-semibold text-[var(--text)]">{Math.round(evaluation.score)}%</span></div>
                              <Progress value={evaluation.score} tone={evaluation.score >= 65 ? 'success' : evaluation.score >= 40 ? 'warning' : 'danger'} />
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  ) : null}

                  <Card className="p-3.5">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--muted-2)]"><Target size={12} /> Evaluator</div>
                    <p className="text-[0.68rem] leading-relaxed text-[var(--muted)]">
                      Deterministic structural evaluation: key-point coverage, specificity, action language and confidence.
                      {profile?.resumeText ? ' Your resume text is used only to personalise project prompts.' : ' Add resume evidence to get more specific project prompts.'}
                    </p>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
