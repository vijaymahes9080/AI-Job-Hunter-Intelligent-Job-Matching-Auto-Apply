import { useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  Fingerprint,
  Github,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { useSession } from '../lib/session';
import { Button, Field, Input } from './ui';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const { login, register, demoLogin, error } = useSession();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<'form' | 'demo' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    if (mode === 'register' && name.trim().length < 2) {
      setLocalError('Enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLocalError('Enter a valid email address.');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setLocalError('Password must be at least 8 characters and include a letter and a number.');
      return;
    }
    setBusy('form');
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
    } catch {
      // Session provider exposes the API error message.
    } finally {
      setBusy(null);
    }
  };

  const runDemo = async () => {
    setBusy('demo');
    setLocalError(null);
    try {
      await demoLogin();
    } catch {
      // handled by provider
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(600px 380px at 10% 0%, rgba(99,102,241,0.32), transparent 65%), radial-gradient(500px 400px at 90% 100%, rgba(34,211,238,0.18), transparent 60%), linear-gradient(160deg, #0b1020, #101735)',
            }}
          />
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-white">AI Job Hunter</div>
                <div className="text-[0.68rem] uppercase tracking-[0.16em] text-indigo-200/70">Career intelligence · v2</div>
              </div>
            </div>
            <h1 className="mt-12 max-w-md text-4xl font-bold leading-[1.08] text-white">
              Evidence over
              <br />
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">guesswork.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
              Ten working career-intelligence modules built on public job data, transparent matching rules and a
              human-approved application workflow. No fabricated skills, salaries, deadlines or outcomes.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: BadgeCheck, title: 'Real evidence, labelled', text: 'Salary, deadline and company facts keep their source snippets and confidence level.' },
              { icon: ShieldCheck, title: 'Human approval before submission', text: 'The platform prepares; you review, approve and record the real submission with evidence.' },
              { icon: Github, title: 'Open-source by design', text: 'Remotive, Greenhouse, Lever, GitHub REST and optional self-hosted open-weight models.' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 backdrop-blur">
                <item.icon size={17} className="mt-0.5 text-indigo-300" />
                <div>
                  <div className="text-xs font-semibold text-white">{item.title}</div>
                  <div className="mt-0.5 text-[0.7rem] leading-relaxed text-slate-400">{item.text}</div>
                </div>
              </div>
            ))}
            <p className="pt-2 text-[0.65rem] leading-relaxed text-slate-500">
              Direct portal auto-submission is intentionally not claimed. Employer application flows stay in your control.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--text)]">AI Job Hunter</div>
              <div className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted-2)]">Career intelligence</div>
            </div>
          </div>

          <div className="mb-5">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Candidate workspace</div>
            <h2 className="mt-1 text-2xl font-bold text-[var(--text)]">{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {mode === 'login' ? 'Sign in to continue to your evidence-backed pipeline.' : 'Start with a clean profile. Every result is derived from what you verify.'}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
            {(['login', 'register'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setLocalError(null);
                }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  mode === value ? 'bg-[var(--surface-solid)] text-[var(--text)] shadow' : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {value === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form className="space-y-3.5" onSubmit={submit} noValidate>
            {mode === 'register' ? (
              <Field label="Full name" htmlFor="auth-name">
                <Input id="auth-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
              </Field>
            ) : null}
            <Field label="Email" htmlFor="auth-email">
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password" htmlFor="auth-password" hint={mode === 'register' ? 'At least 8 characters, including a letter and a number.' : undefined}>
              <div className="relative">
                <Input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>

            {localError || error ? (
              <div className="flex items-start gap-2 rounded-lg border border-[rgba(251,113,133,0.3)] bg-[var(--danger-soft)] px-3 py-2 text-xs leading-relaxed text-[var(--danger)]" role="alert">
                <TriangleAlert size={14} className="mt-0.5 flex-shrink-0" />
                {localError || error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" size="lg" loading={busy === 'form'}>
              {mode === 'login' ? 'Sign in securely' : 'Create account'}
              {busy !== 'form' ? <ArrowRight size={15} /> : null}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--muted-2)]">or explore</span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <Button variant="secondary" className="w-full" size="lg" onClick={runDemo} loading={busy === 'demo'}>
            <Fingerprint size={16} />
            Enter the demo workspace
          </Button>
          <p className="mt-3 text-center text-[0.68rem] leading-relaxed text-[var(--muted-2)]">
            Demo credentials are local only. Demo mode uses an in-memory database and resets on restart; production
            requires <code className="rounded bg-[var(--surface-2)] px-1">DATABASE_URL</code>.
          </p>

          <div className="mt-6 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[0.68rem] text-[var(--muted)]">
            <LockKeyhole size={13} className="flex-shrink-0 text-[var(--success)]" />
            HttpOnly session cookies, CSRF checks, rate limits and parameterised SQL protect this workspace.
          </div>
        </div>
      </div>
    </div>
  );
}
