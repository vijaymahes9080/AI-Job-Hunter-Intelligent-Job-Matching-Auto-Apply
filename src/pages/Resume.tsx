import { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  FileText,
  Info,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
} from 'lucide-react';
import type { JobPosting, ResumeAnalysis } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { formatDate, formatDateTime } from '../lib/format';
import { useSession } from '../lib/session';
import { JobSelector } from '../components/JobSelector';
import {
  Badge,
  Button,
  Card,
  CheckItem,
  EmptyState,
  ErrorNotice,
  Field,
  LoadingBlock,
  PageHeader,
  Progress,
  ScoreRing,
  SectionTitle,
  Textarea,
} from '../components/ui';

export function ResumePage() {
  const { profile, setProfile, setCompleteness } = useSession();
  const [text, setText] = useState(profile?.resumeText || '');
  const [jobId, setJobId] = useState('');
  const [job, setJob] = useState<JobPosting | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const syncProfile = async () => {
    const response = await api.profile.get();
    setProfile(response.profile);
    setCompleteness(response.completeness);
    setText(response.profile.resumeText);
    return response;
  };

  const uploadFile = async (file: File) => {
    setBusy('upload');
    setError(null);
    setNotice(null);
    try {
      const response = await api.profile.uploadResume(file);
      setProfile(response.profile);
      setText(response.profile.resumeText);
      await syncProfile();
      setAnalysis(null);
      setNotice(
        `Parsed ${response.extractedCharacters.toLocaleString()} characters from ${file.name}` +
          (response.extractedSkills.length ? ` · detected ${response.extractedSkills.length} skill term(s).` : '.') +
          (response.warnings.length ? ` ${response.warnings.join(' ')}` : ''),
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveText = async () => {
    if (text.trim().length < 80) {
      setError('Paste at least 80 characters of resume text before saving.');
      return;
    }
    setBusy('save');
    setError(null);
    setNotice(null);
    try {
      const response = await api.profile.saveResumeText(text, 'pasted-resume.txt');
      setProfile(response.profile);
      setText(response.profile.resumeText);
      await syncProfile();
      setAnalysis(null);
      setNotice(`Resume text saved. Detected ${response.extractedSkills.length} skill term(s) from the text.`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  const analyze = async () => {
    if (text.trim().length < 80) {
      setError('Add resume text before running the ATS analysis.');
      return;
    }
    setBusy('analyze');
    setError(null);
    setNotice(null);
    try {
      setAnalysis(await api.resume.analyze(jobId || null, text));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  const checkScore = analysis ? Math.round(analysis.checks.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0)) : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Prepare"
        title="Resume & ATS"
        description="Upload or paste your resume, then run a transparent ATS readiness check against a real posting. Checks are explicit rules with evidence and suggestions—not a proprietary black-box score."
        actions={
          <>
            <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={busy === 'upload'}><Upload size={15} /> Upload file</Button>
            <Button onClick={analyze} loading={busy === 'analyze'}><FileSearch size={15} /> Analyse</Button>
          </>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFile(file);
        }}
      />

      {error ? <ErrorNotice message={error} /> : null}
      {notice ? (
        <div className="rounded-xl border border-[rgba(52,211,153,0.3)] bg-[var(--success-soft)] px-4 py-2.5 text-xs leading-relaxed text-[var(--success)]">{notice}</div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        <div className="space-y-4">
          <Card className="p-4">
            <SectionTitle
              title="Resume text"
              description="PDF, DOCX and TXT up to 5 MB. Extraction never changes your file; it stores the parsed text with this profile."
              actions={
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} loading={busy === 'upload'}><Upload size={13} /> Upload</Button>
                  <Button size="sm" onClick={saveText} loading={busy === 'save'}><Save size={13} /> Save text</Button>
                </div>
              }
            />
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[0.65rem] text-[var(--muted-2)]">
              <Badge tone={profile?.resumeText ? 'success' : 'warning'}>{profile?.resumeText ? 'Resume stored' : 'No resume stored'}</Badge>
              <span>{profile?.resumeFileName || 'No file name'}</span>
              {profile?.resumeUpdatedAt ? <span>· updated {formatDate(profile.resumeUpdatedAt)}</span> : null}
              <span>· {text.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
            </div>
            <Textarea
              rows={20}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setNotice(null);
              }}
              placeholder="Paste your full resume text here. Use plain text; tables and columns may not extract cleanly from PDFs."
              className="font-mono text-[0.72rem]"
            />
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[0.65rem] text-[var(--muted-2)]">
              <span>{text.length.toLocaleString()} characters · stored only when you press Save text.</span>
              <span>Maximum 60,000 characters.</span>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Target job for keyword analysis" description="Choose a persisted posting to compare its published requirements with your resume." />
            <JobSelector
              value={jobId}
              onChange={(selected) => {
                setJobId(selected?.id || '');
                setJob(selected);
                setAnalysis(null);
              }}
              placeholder="Optional: choose a target job"
            />
            {job ? (
              <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-[0.68rem] text-[var(--muted)]">
                <span className="font-semibold text-[var(--text)]">{job.title}</span> · {job.company} · {job.skills.length} published skill term(s) detected.
              </div>
            ) : <p className="mt-2 text-[0.65rem] text-[var(--muted-2)]">Without a target job, the analysis checks general resume and ATS structure only.</p>}
          </Card>

          {analysis ? (
            <>
              <Card className="glass-highlight p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <ScoreRing value={analysis.score} size={112} label="ATS readiness" />
                    <div>
                      <h2 className="text-lg font-bold text-[var(--text)]">{analysis.targetJobTitle || 'General ATS analysis'}</h2>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{analysis.wordCount.toLocaleString()} words · {analysis.characterCount.toLocaleString()} characters · generated {formatDateTime(analysis.generatedAt)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone={analysis.score >= 70 ? 'success' : analysis.score >= 45 ? 'warning' : 'danger'}>{analysis.score}% weighted checks</Badge>
                        <Badge tone="accent">{analysis.matchedKeywords.length} matched keywords</Badge>
                        <Badge tone={analysis.missingKeywords.length ? 'warning' : 'success'}>{analysis.missingKeywords.length} missing</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={analyze} loading={busy === 'analyze'}><RefreshCw size={13} /> Re-run</Button>
                </div>
                <div className="mt-3"><Progress value={analysis.score} tone={analysis.score >= 70 ? 'success' : analysis.score >= 45 ? 'warning' : 'danger'} label="Weighted ATS readiness" /></div>
              </Card>

              <Card className="p-4">
                <SectionTitle title="ATS checks" description="Each check states its weight, the evidence found and a concrete suggestion." />
                <div className="space-y-2">
                  {analysis.checks.map((check) => (
                    <div key={check.key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge tone={check.passed ? 'success' : 'danger'}>{check.passed ? 'passed' : 'needs work'}</Badge>
                          <span className="text-xs font-semibold text-[var(--text)]">{check.label}</span>
                        </div>
                        <span className="text-[0.65rem] text-[var(--muted-2)]">weight {check.weight}</span>
                      </div>
                      <p className="mt-1 text-[0.68rem] leading-relaxed text-[var(--muted)]">{check.evidence}</p>
                      {check.suggestion ? <p className={`mt-1 text-[0.68rem] leading-relaxed ${check.passed ? 'text-[var(--muted-2)]' : 'text-[var(--warning)]'}`}>{check.suggestion}</p> : null}
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <SectionTitle title="Matched keywords" description="Terms found in both your resume and the target posting." />
                  <div className="space-y-1.5">
                    {analysis.matchedKeywords.length ? analysis.matchedKeywords.map((keyword) => (
                      <div key={keyword.keyword} className="flex items-start justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5">
                        <span className="text-[0.7rem] font-medium text-[var(--success)]">{keyword.keyword}</span>
                        <span className="max-w-[60%] text-right text-[0.62rem] text-[var(--muted-2)]">{keyword.evidence}</span>
                      </div>
                    )) : <p className="text-xs text-[var(--muted)]">No target-job keywords were available to compare.</p>}
                  </div>
                </Card>

                <Card className="p-4">
                  <SectionTitle title="Missing keywords" description="Terms in the posting that were not found in your resume text. Add them only if they are genuinely part of your experience." />
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.missingKeywords.length ? analysis.missingKeywords.map((keyword) => <span key={keyword} className="chip text-[var(--danger)]">{keyword}</span>) : <span className="text-xs text-[var(--success)]">No missing keywords detected.</span>}
                  </div>
                  {analysis.additionalSkills.length ? (
                    <>
                      <div className="mt-3 text-[0.62rem] font-bold uppercase tracking-wide text-[var(--muted-2)]">Additional skill terms found</div>
                      <div className="mt-1 flex flex-wrap gap-1">{analysis.additionalSkills.map((skill) => <span key={skill} className="chip">{skill}</span>)}</div>
                    </>
                  ) : null}
                </Card>
              </div>

              <Card className="p-4">
                <SectionTitle title="Suggestions" description="Edits to consider; none are applied automatically." />
                <ul className="space-y-1.5">
                  {analysis.suggestions.map((suggestion) => (
                    <li key={suggestion} className="flex items-start gap-2 text-[0.7rem] leading-relaxed text-[var(--muted)]"><Sparkles size={12} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" /> {suggestion}</li>
                  ))}
                </ul>
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-[rgba(251,191,36,0.3)] bg-[var(--warning-soft)] px-3 py-2 text-[0.65rem] leading-relaxed text-[var(--warning)]">
                  <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> {analysis.disclaimer}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-6">
              <EmptyState
                icon={<FileText size={20} />}
                title="Run an ATS analysis"
                description="Add resume text and optionally choose a target job. The engine checks structure, measurable evidence, contact information, keyword coverage and formatting risks. It does not claim to replicate a specific employer's ATS."
                action={<Button onClick={analyze} loading={busy === 'analyze'}><FileSearch size={14} /> Analyse resume</Button>}
              />
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <SectionTitle title="Stored evidence" />
            <dl className="space-y-2 text-[0.7rem]">
              {[
                ['File', profile?.resumeFileName || 'None'),
                ['Characters', profile ? profile.resumeText.length.toLocaleString() : '0'],
                ['Last updated', profile?.resumeUpdatedAt ? formatDate(profile.resumeUpdatedAt) : 'Never'],
                ['GitHub username', profile?.githubUsername || 'Not set'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-1.5 last:border-0">
                  <dt className="text-[var(--muted-2)]">{label}</dt>
                  <dd className="text-right font-medium text-[var(--text)]">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-4">
            <SectionTitle title="What is checked" />
            <div className="space-y-1.5">
              {analysis ? analysis.checks.map((check) => (
                <CheckItem key={check.key} passed={check.passed}>{check.label}</CheckItem>
              )) : [
                ['Contact information', true],
                ['A clear summary', true],
                ['Measurable evidence', true],
                ['Skills section', true],
                ['Readable formatting', true],
                ['Target keyword coverage', true],
              ].map(([label, passed]) => <CheckItem key={String(label)} passed={Boolean(passed)}>{label}</CheckItem>)}
            </div>
            {!analysis ? <p className="mt-2 text-[0.65rem] text-[var(--muted-2)]">These are the checks the engine will run; their current pass/fail state requires an analysis.</p> : null}
          </Card>

          <Card className="p-4">
            <SectionTitle title="Honest limitations" />
            <ul className="space-y-1.5">
              {[
                'No ATS vendor provides an open scoring standard; this is a transparent readiness checklist, not a guarantee.',
                'PDF extraction can lose columns, tables and icons. Review the extracted text before relying on it.',
                'Missing keywords should only be added if they truthfully describe your experience.',
                'No resume content is sent to a third-party AI unless an open-weight endpoint is configured by the operator.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-[var(--muted)]"><Info size={11} className="mt-0.5 flex-shrink-0 text-[var(--warning)]" /> {item}</li>
              ))}
            </ul>
            {checkScore !== analysis?.score && analysis ? (
              <p className="mt-2 text-[0.62rem] text-[var(--muted-2)]">Weighted check total: {checkScore} (the score may include balance rules).</p>
            ) : null}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]"><CheckCircle2 size={14} className="text-[var(--success)]" /> Evidence separation</div>
            <p className="mt-1 text-[0.68rem] leading-relaxed text-[var(--muted)]">
              Resume text is factual input. ATS suggestions and cover-letter drafts are generated guidance and are labelled as such.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
