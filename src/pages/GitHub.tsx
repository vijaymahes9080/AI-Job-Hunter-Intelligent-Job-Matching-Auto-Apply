import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Github, GitFork, RefreshCw, Sparkles, Star } from 'lucide-react';
import type { GitHubPortfolioAnalysis } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { formatDate } from '../lib/format';
import { useSession } from '../lib/session';
import { Badge, Button, Card, EmptyState, ErrorNotice, Field, Input, LoadingBlock, PageHeader, Progress, SectionTitle } from '../components/ui';

export function GitHubPage() {
  const { profile } = useSession();
  const [username, setUsername] = useState(profile?.githubUsername || '');
  const [analysis, setAnalysis] = useState<GitHubPortfolioAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.github
      .latest()
      .then((latest) => {
        if (!cancelled && latest) {
          setAnalysis(latest);
          setUsername((current) => current || latest.username);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const analyze = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!username.trim()) {
      setError('Enter a public GitHub username.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setAnalysis(await api.github.analyze(username.trim()));
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
        title="GitHub Portfolio Matcher"
        description="Reads public repositories through the GitHub REST API, detects technologies from real repository evidence and compares them with published job requirements. Private repositories are never accessed."
        actions={<Button onClick={analyze} loading={busy}><RefreshCw size={15} /> Analyse portfolio</Button>}
      />

      <Card className="p-3.5">
        <form onSubmit={analyze} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Public GitHub username" hint="A server-side GITHUB_TOKEN is optional; unauthenticated requests are rate-limited by GitHub.">
            <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. torvalds" />
          </Field>
          <Button type="submit" loading={busy}><Github size={14} /> Analyse</Button>
        </form>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}
      {busy ? <LoadingBlock label="Fetching public repositories and README evidence…" rows={4} /> : null}

      {analysis ? (
        <>
          <Card className="glass-highlight p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {analysis.profile.avatarUrl ? <img src={analysis.profile.avatarUrl} alt="" className="h-12 w-12 rounded-xl border border-[var(--border)]" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)]"><Github size={22} /></div>}
                <div>
                  <div className="text-lg font-bold text-[var(--text)]">{analysis.profile.name || analysis.username}</div>
                  <a href={analysis.profile.htmlUrl} target="_blank" rel="noreferrer noopener" className="text-[0.68rem] text-[var(--accent)] hover:underline">github.com/{analysis.username}</a>
                  <div className="mt-0.5 text-[0.65rem] text-[var(--muted-2)]">{analysis.profile.publicRepos} public repos · analysed {formatDate(analysis.analyzedAt)}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="success">{analysis.repos.length} repos analysed</Badge>
                <Badge tone="accent">{analysis.technologyCoverage.length} technologies evidenced</Badge>
                <Badge tone="info">{analysis.matches.length} job matches</Badge>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <Card className="p-4">
                <SectionTitle title="Repository evidence" description="Only public repositories returned by GitHub. Quality checks are structural, not a judgement of code quality." />
                <div className="grid gap-3 md:grid-cols-2">
                  {analysis.repos.map((repo) => (
                    <div key={repo.name} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <a href={repo.url} target="_blank" rel="noreferrer noopener" className="text-xs font-semibold text-[var(--text)] hover:text-[var(--accent)]">{repo.name}</a>
                        <div className="flex items-center gap-2 text-[0.65rem] text-[var(--muted-2)]"><Star size={11} /> {repo.stars}</div>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[0.68rem] leading-relaxed text-[var(--muted)]">{repo.description || 'No repository description.'}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {repo.language ? <span className="chip">{repo.language}</span> : null}
                        {repo.topics.slice(0, 3).map((topic) => <span key={topic} className="chip">{topic}</span>)}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-[0.62rem]">
                        {[
                          ['Description', repo.quality.hasDescription],
                          ['README', repo.quality.hasReadme],
                          ['License', repo.quality.hasLicense],
                          ['Tests', repo.quality.hasTests],
                          ['CI', repo.quality.hasCI],
                          ['Recent', repo.quality.recentlyUpdated],
                        ].map(([label, passed]) => (
                          <span key={String(label)} className={passed ? 'text-[var(--success)]' : 'text-[var(--muted-2)]'}>
                            {passed ? '✓' : '○'} {label}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2"><Progress value={repo.quality.documentationScore} label="Documentation score" /></div>
                      {repo.technologies.length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {repo.technologies.slice(0, 6).map((tech) => <span key={tech.name} className="chip text-[var(--accent)]">{tech.name}</span>)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                {analysis.repos.length === 0 ? <EmptyState icon={<Github size={18} />} title="No public repositories returned" description="The username may have no public repositories, or GitHub may be rate-limiting this server." /> : null}
              </Card>

              <Card className="p-4">
                <SectionTitle title="Job requirement matches" description="Coverage uses published requirements from your top stored matches." />
                <div className="space-y-2">
                  {analysis.matches.map((match) => (
                    <div key={match.jobId} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-[var(--text)]">{match.jobTitle} <span className="font-normal text-[var(--muted-2)]">· {match.company}</span></div>
                        <Badge tone={match.coverage >= 60 ? 'success' : match.coverage >= 35 ? 'warning' : 'danger'}>{Math.round(match.coverage)}% portfolio coverage</Badge>
                      </div>
                      <Progress value={match.coverage} tone={match.coverage >= 60 ? 'success' : 'warning'} />
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {match.matched.map((item) => <span key={item.skill} className="chip text-[var(--success)]">{item.skill}</span>)}
                        {match.missing.map((item) => <span key={item} className="chip text-[var(--danger)]">missing: {item}</span>)}
                      </div>
                    </div>
                  ))}
                  {analysis.matches.length === 0 ? <p className="text-xs text-[var(--muted)]">No stored jobs were available for portfolio matching.</p> : null}
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="p-4">
                <SectionTitle title="Technology coverage" description="Skills evidenced by repository metadata or README text." />
                <div className="space-y-1.5">
                  {analysis.technologyCoverage.map((tech) => (
                    <div key={tech.skill} className="flex items-start justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5">
                      <span className="text-[0.7rem] font-medium text-[var(--text)]">{tech.skill}</span>
                      <span className="max-w-[55%] truncate text-right text-[0.62rem] text-[var(--muted-2)]" title={tech.evidence.join(' · ')}>{tech.evidence.join(' · ')}</span>
                    </div>
                  ))}
                  {analysis.technologyCoverage.length === 0 ? <p className="text-xs text-[var(--muted)]">No technologies detected.</p> : null}
                </div>
              </Card>

              <Card className="p-4">
                <SectionTitle title="Portfolio gaps" description="Requirements not evidenced by any public repository." />
                <div className="flex flex-wrap gap-1">
                  {analysis.missingPortfolioEvidence.map((item) => <span key={item} className="chip text-[var(--danger)]">{item}</span>)}
                  {analysis.missingPortfolioEvidence.length === 0 ? <span className="text-xs text-[var(--success)]">No portfolio evidence gaps detected for the matched roles.</span> : null}
                </div>
              </Card>

              <Card className="p-4">
                <SectionTitle title="Recommendations" />
                <ul className="space-y-1.5">
                  {analysis.recommendations.map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-[var(--muted)]"><Sparkles size={12} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" /> {item}</li>
                  ))}
                </ul>
              </Card>

              <Card className="p-4">
                <SectionTitle title="Limitations" />
                <ul className="space-y-1.5">
                  {analysis.limitations.map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-[var(--muted)]"><AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-[var(--warning)]" /> {item}</li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center gap-1.5 text-[0.62rem] text-[var(--muted-2)]"><CheckCircle2 size={11} className="text-[var(--success)]" /> Public data only · README text is not executed</div>
              </Card>
            </div>
          </div>
        </>
      ) : !busy ? (
        <Card className="p-6">
          <EmptyState
            icon={<Github size={20} />}
            title="No portfolio analysis yet"
            description="Add your public GitHub username and run the analysis. The platform will not access private repositories or invent project evidence."
            action={<Button onClick={analyze} loading={busy}><Github size={14} /> Analyse portfolio</Button>}
          />
        </Card>
      ) : null}
    </div>
  );
}
