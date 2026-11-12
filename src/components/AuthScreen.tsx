import { useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden flex-col justify-between bg-[var(--accent-soft)] p-8 lg:flex">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--text)]">AI Job Hunter</div>
                <div className="text-[0.62rem] text-[var(--muted-2)]">Career intelligence</div>
              </div>
            </div>
            <h1 className="mt-10 text-3xl font-bold leading-tight text-[var(--text)]">
              A calmer, evidence-first job search.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Real public postings, transparent matching and a human-approved application workflow.
            </p>
          </div>
          <ul className="space-y-2.5">
            {[
              'Only published salaries and deadlines are shown.',
              'Prepared, approved and submitted are separate states.',
              'Open-source data sources and optional self-hosted AI.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[0.72rem] leading-relaxed text-[var(--muted)]">
                <ShieldCheck size={13} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" /> {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 sm:p-9">
          <div className="mb-5 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
              <Sparkles size={16} />
            </div>
            <div className="text-sm font-semibold text-[var(--text)]">AI Job Hunter</div>
          </div>

          <div className="mb-5">
            <h2 className="text-xl font-bold text-[var(--text)]">{mode === 'login' ? 'Welcome back' : 'Create an account'}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {mode === 'login' ? 'Sign in to your workspace.' : 'Start with a clean, verifiable profile.'}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1">
            {(['login', 'register'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setLocalError(null);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  mode === value ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'
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
              <div className="flex items-start gap-2 rounded-lg border border-[#fecaca] bg-[var(--danger-soft)] px-3 py-2 text-xs leading-relaxed text-[var(--danger)]" role="alert">
                <TriangleAlert size={14} className="mt-0.5 flex-shrink-0" />
                {localError || error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" size="lg" loading={busy === 'form'}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
              {busy !== 'form' ? <ArrowRight size={15} /> : null}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted-2)]">or</span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <Button variant="secondary" className="w-full" size="lg" onClick={runDemo} loading={busy === 'demo'}>
            <Fingerprint size={16} />
            Explore the demo workspace
          </Button>
          <p className="mt-3 text-center text-[0.65rem] leading-relaxed text-[var(--muted-2)]">
            Demo mode uses an in-memory database and resets on restart. Production needs <code>DATABASE_URL</code>.
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-[0.65rem] text-[var(--muted)]">
            <LockKeyhole size={13} className="flex-shrink-0 text-[var(--success)]" />
            HttpOnly cookies, CSRF protection and parameterised SQL.
          </div>
        </div>
      </div>
    </div>
  );
}
