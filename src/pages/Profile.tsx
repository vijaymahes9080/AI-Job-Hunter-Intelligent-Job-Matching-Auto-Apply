import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UserRound,
  Wrench,
} from 'lucide-react';
import type { CandidateProfile } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { formatDate } from '../lib/format';
import { useSession } from '../lib/session';
import type { RoutePath } from '../lib/router';
import {
  Badge,
  Button,
  Card,
  ErrorNotice,
  Field,
  Input,
  PageHeader,
  Progress,
  ScoreRing,
  SectionTitle,
  Select,
  TagInput,
  Textarea,
  Toggle,
} from '../components/ui';

const SKILL_SUGGESTIONS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'Go', 'SQL', 'PostgreSQL', 'MongoDB',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Git', 'REST APIs', 'GraphQL', 'System Design', 'Testing',
];

function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyExperience(): CandidateProfile['experience'][number] {
  return { id: uid('exp'), title: '', company: '', duration: '', description: '' };
}

function emptyEducation(): CandidateProfile['education'][number] {
  return { id: uid('edu'), degree: '', institution: '', year: '' };
}

function emptyProject(): CandidateProfile['projects'][number] {
  return { id: uid('proj'), title: '', description: '', technologies: [] };
}

function emptyCertification(): CandidateProfile['certifications'][number] {
  return { id: uid('cert'), name: '', issuer: '', year: '' };
}

export function ProfilePage({ navigate }: { navigate: (path: RoutePath) => void }) {
  const { profile, completeness, setProfile, setCompleteness } = useSession();
  const [form, setForm] = useState<CandidateProfile | null>(profile ? JSON.parse(JSON.stringify(profile)) as CandidateProfile : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!form && profile) setForm(JSON.parse(JSON.stringify(profile)) as CandidateProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const dirty = useMemo(() => Boolean(form && profile && JSON.stringify(form) !== JSON.stringify(profile)), [form, profile]);

  const update = <K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
    setNotice(null);
  };

  const save = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!form) return;
    if (form.name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (form.salaryExpectation.min < 0) {
      setError('Salary expectation cannot be negative.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await api.profile.update(form);
      setForm(JSON.parse(JSON.stringify(response.profile)) as CandidateProfile);
      setProfile(response.profile);
      setCompleteness(response.completeness);
      setNotice('Profile saved. Matching and gap analyses will use the updated evidence.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (!form) {
    return (
      <div className="space-y-4">
        <PageHeader title="Profile" description="Loading your verified candidate evidence…" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={save}>
      <PageHeader
        eyebrow="Account"
        title="Your evidence profile"
        description="Every match, gap and ATS result is derived from what you record here. Add only skills and experience you can evidence. The platform never enriches your profile with invented claims."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('resume')}><FileText size={15} /> Resume & ATS</Button>
            <Button type="submit" loading={busy} disabled={!dirty}><Save size={15} /> Save profile</Button>
          </>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}
      {notice ? (
        <div className="flex items-center gap-2 rounded-xl border border-[rgba(52,211,153,0.3)] bg-[var(--success-soft)] px-4 py-2.5 text-xs text-[var(--success)]">
          <CheckCircle2 size={14} /> {notice}
        </div>
      ) : null}
      {dirty ? (
        <div className="rounded-xl border border-[rgba(251,191,36,0.3)] bg-[var(--warning-soft)] px-4 py-2.5 text-xs text-[var(--warning)]">
          You have unsaved changes. Save before running new analyses.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_310px]">
        <div className="space-y-4">
          <Card className="p-4">
            <SectionTitle title="Identity and summary" description="Your public-facing professional context." />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" htmlFor="profile-name"><Input id="profile-name" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your name" /></Field>
              <Field label="Email" hint="Email changes are handled through account authentication and are not editable here."><Input value={form.email} readOnly disabled /></Field>
              <Field label="Headline" htmlFor="profile-headline"><Input id="profile-headline" value={form.headline} onChange={(event) => update('headline', event.target.value)} placeholder="Full-Stack Developer" /></Field>
              <Field label="Location" htmlFor="profile-location"><Input id="profile-location" value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="City, region, country" /></Field>
              <Field label="Phone" htmlFor="profile-phone"><Input id="profile-phone" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="Optional" /></Field>
              <Field label="Notice period (days)" htmlFor="profile-notice"><Input id="profile-notice" type="number" min={0} max={365} value={form.noticePeriodDays} onChange={(event) => update('noticePeriodDays', Number(event.target.value))} /></Field>
              <Field label="Professional summary" className="sm:col-span-2" hint={`${form.summary.length}/4000 characters. Use factual language about what you have actually done.`}>
                <Textarea rows={5} value={form.summary} maxLength={4000} onChange={(event) => update('summary', event.target.value)} placeholder="A concise, factual summary of your experience and strengths." />
              </Field>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Verified skills" description="Only add a skill if you can discuss it and show evidence. Related technologies are not treated as proof." />
            <TagInput value={form.skills} onChange={(skills) => update('skills', skills)} suggestions={SKILL_SUGGESTIONS} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SKILL_SUGGESTIONS.filter((skill) => !form.skills.some((entry) => entry.toLowerCase() === skill.toLowerCase())).slice(0, 10).map((skill) => (
                <button key={skill} type="button" className="chip hover:border-[var(--accent)] hover:text-[var(--accent)]" onClick={() => update('skills', [...form.skills, skill])}>
                  <Plus size={9} /> {skill}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle
              title="Experience"
              description="Paid, freelance, internship or open-source experience you can describe."
              actions={<Button size="sm" variant="secondary" type="button" onClick={() => update('experience', [...form.experience, emptyExperience()])}><Plus size={13} /> Add role</Button>}
            />
            {form.experience.length ? (
              <div className="space-y-3">
                {form.experience.map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text)]"><BriefcaseBusiness size={13} className="text-[var(--accent)]" /> Role {index + 1}</div>
                      <button type="button" aria-label="Remove experience" className="rounded p-1 text-[var(--muted-2)] hover:text-[var(--danger)]" onClick={() => update('experience', form.experience.filter((entry) => entry.id !== item.id))}><Trash2 size={13} /></button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Job title"><Input value={item.title} onChange={(event) => update('experience', form.experience.map((entry) => entry.id === item.id ? { ...entry, title: event.target.value } : entry))} /></Field>
                      <Field label="Company"><Input value={item.company} onChange={(event) => update('experience', form.experience.map((entry) => entry.id === item.id ? { ...entry, company: event.target.value } : entry))} /></Field>
                      <Field label="Dates / duration" className="sm:col-span-2"><Input value={item.duration} onChange={(event) => update('experience', form.experience.map((entry) => entry.id === item.id ? { ...entry, duration: event.target.value } : entry))} placeholder="Jan 2024 – Present" /></Field>
                      <Field label="What you did" className="sm:col-span-2"><Textarea rows={3} value={item.description} onChange={(event) => update('experience', form.experience.map((entry) => entry.id === item.id ? { ...entry, description: event.target.value } : entry))} placeholder="Concrete responsibilities, technologies and measurable results." /></Field>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-[var(--muted)]">No experience recorded. Projects can still provide technical evidence.</p>}
          </Card>

          <Card className="p-4">
            <SectionTitle
              title="Projects"
              description="Portfolio evidence with technologies you actually used."
              actions={<Button size="sm" variant="secondary" type="button" onClick={() => update('projects', [...form.projects, emptyProject()])}><Plus size={13} /> Add project</Button>}
            />
            {form.projects.length ? (
              <div className="space-y-3">
                {form.projects.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text)]"><Sparkles size={13} className="text-[var(--accent)]" /> Project</div>
                      <button type="button" aria-label="Remove project" className="rounded p-1 text-[var(--muted-2)] hover:text-[var(--danger)]" onClick={() => update('projects', form.projects.filter((entry) => entry.id !== item.id))}><Trash2 size={13} /></button>
                    </div>
                    <div className="space-y-2">
                      <Field label="Title"><Input value={item.title} onChange={(event) => update('projects', form.projects.map((entry) => entry.id === item.id ? { ...entry, title: event.target.value } : entry))} /></Field>
                      <Field label="Description"><Textarea rows={3} value={item.description} onChange={(event) => update('projects', form.projects.map((entry) => entry.id === item.id ? { ...entry, description: event.target.value } : entry))} /></Field>
                      <Field label="Technologies"><TagInput value={item.technologies} onChange={(technologies) => update('projects', form.projects.map((entry) => entry.id === item.id ? { ...entry, technologies } : entry))} /></Field>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-[var(--muted)]">No projects recorded.</p>}
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <SectionTitle title="Education" actions={<Button size="sm" variant="ghost" type="button" onClick={() => update('education', [...form.education, emptyEducation()])}><Plus size={13} /></Button>} />
              <div className="space-y-3">
                {form.education.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text)]"><GraduationCap size={13} className="text-[var(--accent)]" /> Education</span><button type="button" aria-label="Remove education" onClick={() => update('education', form.education.filter((entry) => entry.id !== item.id))}><Trash2 size={13} className="text-[var(--muted-2)] hover:text-[var(--danger)]" /></button></div>
                    <div className="space-y-2">
                      <Field label="Degree"><Input value={item.degree} onChange={(event) => update('education', form.education.map((entry) => entry.id === item.id ? { ...entry, degree: event.target.value } : entry))} /></Field>
                      <Field label="Institution"><Input value={item.institution} onChange={(event) => update('education', form.education.map((entry) => entry.id === item.id ? { ...entry, institution: event.target.value } : entry))} /></Field>
                      <Field label="Year"><Input value={item.year} onChange={(event) => update('education', form.education.map((entry) => entry.id === item.id ? { ...entry, year: event.target.value } : entry))} /></Field>
                    </div>
                  </div>
                ))}
                {!form.education.length ? <button type="button" className="w-full rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-xs text-[var(--muted)] hover:text-[var(--text)]" onClick={() => update('education', [...form.education, emptyEducation()])}>Add education</button> : null}
              </div>
            </Card>

            <Card className="p-4">
              <SectionTitle title="Certifications" actions={<Button size="sm" variant="ghost" type="button" onClick={() => update('certifications', [...form.certifications, emptyCertification()])}><Plus size={13} /></Button>} />
              <div className="space-y-3">
                {form.certifications.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text)]"><Award size={13} className="text-[var(--accent)]" /> Certification</span><button type="button" aria-label="Remove certification" onClick={() => update('certifications', form.certifications.filter((entry) => entry.id !== item.id))}><Trash2 size={13} className="text-[var(--muted-2)] hover:text-[var(--danger)]" /></button></div>
                    <div className="space-y-2">
                      <Field label="Name"><Input value={item.name} onChange={(event) => update('certifications', form.certifications.map((entry) => entry.id === item.id ? { ...entry, name: event.target.value } : entry))} /></Field>
                      <Field label="Issuer"><Input value={item.issuer} onChange={(event) => update('certifications', form.certifications.map((entry) => entry.id === item.id ? { ...entry, issuer: event.target.value } : entry))} /></Field>
                      <Field label="Year"><Input value={item.year} onChange={(event) => update('certifications', form.certifications.map((entry) => entry.id === item.id ? { ...entry, year: event.target.value } : entry))} /></Field>
                    </div>
                  </div>
                ))}
                {!form.certifications.length ? <button type="button" className="w-full rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-xs text-[var(--muted)] hover:text-[var(--text)]" onClick={() => update('certifications', [...form.certifications, emptyCertification()])}>Add certification</button> : null}
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <SectionTitle title="Job preferences" description="Used to filter and rank matches. These do not change the factual match score." />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Preferred roles"><TagInput value={form.preferredRoles} onChange={(preferredRoles) => update('preferredRoles', preferredRoles)} placeholder="Add a target role" /></Field>
              <Field label="Preferred locations"><TagInput value={form.preferredLocations} onChange={(preferredLocations) => update('preferredLocations', preferredLocations)} placeholder="Add a location" /></Field>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(['Remote', 'Hybrid', 'On-site'] as const).map((mode) => (
                <Toggle
                  key={mode}
                  label={mode}
                  checked={form.workplacePreferences.includes(mode)}
                  onChange={(checked) => update('workplacePreferences', checked ? [...form.workplacePreferences, mode] : form.workplacePreferences.filter((entry) => entry !== mode))}
                />
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Salary expectation" hint="Used only for your own context; never presented as market data."><Input type="number" min={0} value={form.salaryExpectation.min} onChange={(event) => update('salaryExpectation', { ...form.salaryExpectation, min: Number(event.target.value) })} /></Field>
              <Field label="Currency"><Select value={form.salaryExpectation.currency} onChange={(event) => update('salaryExpectation', { ...form.salaryExpectation, currency: event.target.value })}>{['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED', 'CAD', 'AUD'].map((currency) => <option key={currency}>{currency}</option>)}</Select></Field>
              <Field label="Period"><Select value={form.salaryExpectation.period} onChange={(event) => update('salaryExpectation', { ...form.salaryExpectation, period: event.target.value as 'year' | 'month' })}><option value="year">Per year</option><option value="month">Per month</option></Select></Field>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Professional links" description="Only public URLs you are comfortable sharing with an employer." />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="GitHub username"><Input value={form.githubUsername || ''} onChange={(event) => update('githubUsername', event.target.value || null)} placeholder="username" /></Field>
              <Field label="LinkedIn URL"><Input type="url" value={form.linkedinUrl || ''} onChange={(event) => update('linkedinUrl', event.target.value || null)} placeholder="https://linkedin.com/in/..." /></Field>
              <Field label="Portfolio URL"><Input type="url" value={form.portfolioUrl || ''} onChange={(event) => update('portfolioUrl', event.target.value || null)} placeholder="https://" /></Field>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="glass-highlight p-4">
            <SectionTitle title="Profile evidence" description="Completeness is a checklist, not a judgement." />
            <div className="flex items-center gap-4">
              <ScoreRing value={completeness} size={92} label="Complete" />
              <div className="min-w-0 text-[0.7rem] leading-relaxed text-[var(--muted)]">
                {completeness >= 70 ? 'Enough evidence for reliable matching.' : 'Add the missing sections to make matches more reliable.'}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {[
                ['Name and email', Boolean(form.name && form.email)],
                ['Headline', Boolean(form.headline)],
                ['Summary (40+ chars)', form.summary.length >= 40],
                ['At least 5 skills', form.skills.length >= 5],
                ['At least 1 role', form.experience.length >= 1],
                ['Education', form.education.length >= 1],
                ['Resume text (100+ chars)', form.resumeText.length >= 100],
                ['Preferred role', form.preferredRoles.length >= 1],
                ['Location', Boolean(form.location)],
              ].map(([label, passed]) => (
                <div key={String(label)} className="flex items-center justify-between gap-2 text-[0.68rem]">
                  <span className={passed ? 'text-[var(--muted)]' : 'text-[var(--text)]'}>{label}</span>
                  {passed ? <CheckCircle2 size={13} className="text-[var(--success)]" /> : <span className="text-[0.6rem] text-[var(--warning)]">missing</span>}
                </div>
              ))}
            </div>
            <div className="mt-3"><Progress value={completeness} tone={completeness >= 70 ? 'success' : 'warning'} /></div>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Resume evidence" />
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]"><FileText size={14} className="text-[var(--accent)]" /> {form.resumeFileName || 'No resume file'}</div>
              <div className="mt-0.5 text-[0.65rem] text-[var(--muted-2)]">
                {form.resumeUpdatedAt ? `Updated ${formatDate(form.resumeUpdatedAt)}` : 'Not uploaded'} · {form.resumeText.length.toLocaleString()} characters
              </div>
            </div>
            <Button type="button" variant="secondary" className="mt-2 w-full" onClick={() => navigate('resume')}><ExternalLink size={13} /> Manage Resume & ATS</Button>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Profile hygiene" />
            <ul className="space-y-2 text-[0.68rem] leading-relaxed text-[var(--muted)]">
              <li className="flex items-start gap-1.5"><MapPin size={12} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" /> Location and workplace preferences only influence filtering, never the evidence match itself.</li>
              <li className="flex items-start gap-1.5"><Wrench size={12} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" /> Skills are compared literally plus a curated related-skill map; related skills are labelled partial.</li>
              <li className="flex items-start gap-1.5"><Link2 size={12} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" /> GitHub analysis uses public repositories only.</li>
              <li className="flex items-start gap-1.5"><UserRound size={12} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" /> No profile data is shared with an employer unless you export it yourself.</li>
            </ul>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Save changes" description="Changes are not applied to analytics until saved." />
            <Button type="submit" className="w-full" loading={busy} disabled={!dirty}><Save size={14} /> {dirty ? 'Save profile' : 'No unsaved changes'}</Button>
            {dirty ? (
              <Button type="button" variant="ghost" className="mt-2 w-full" onClick={() => profile && setForm(JSON.parse(JSON.stringify(profile)) as CandidateProfile)}>
                <RefreshCw size={13} /> Discard unsaved edits
              </Button>
            ) : null}
            <div className="mt-2"><Badge tone={dirty ? 'warning' : 'success'}>{dirty ? 'Unsaved changes' : 'In sync'}</Badge></div>
          </Card>
        </div>
      </div>
    </form>
  );
}
