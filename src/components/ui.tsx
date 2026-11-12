import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useState,
} from 'react';
import { AlertTriangle, Check, Inbox, Loader2, Plus, X } from 'lucide-react';
import { cn } from '../lib/cn';

export { cn };

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      className={cn('btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ children, className, hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={cn('card', hover && 'card-hover', className)}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">{eyebrow}</div>
        ) : null}
        <h1 className="text-2xl font-bold text-[var(--text)] sm:text-[1.7rem]">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-start justify-between gap-3', className)}>
      <div>
        <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
        {description ? <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  className?: string;
}) {
  return <span className={cn('badge', tone !== 'neutral' && `badge-${tone}`, className)}>{children}</span>;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'accent',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const toneBg: Record<string, string> = {
    accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
    success: 'bg-[var(--success-soft)] text-[var(--success)]',
    warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
    danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    info: 'bg-[var(--info-soft)] text-[var(--info)]',
  };
  return (
    <Card className="glass-highlight p-4" hover>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--muted-2)]">{label}</div>
          <div className="mt-1.5 text-2xl font-bold text-[var(--text)]">{value}</div>
          {hint ? <div className="mt-1 text-xs leading-snug text-[var(--muted)]">{hint}</div> : null}
        </div>
        {icon ? <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl', toneBg[tone])}>{icon}</div> : null}
      </div>
    </Card>
  );
}

export function Progress({ value, tone = 'accent', label }: { value: number; tone?: 'accent' | 'success' | 'warning' | 'danger'; label?: string }) {
  const colors: Record<string, string> = {
    accent: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
    success: 'linear-gradient(90deg, #10b981, #34d399)',
    warning: 'linear-gradient(90deg, #d97706, #fbbf24)',
    danger: 'linear-gradient(90deg, #e11d48, #fb7185)',
  };
  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-[0.7rem] text-[var(--muted)]">
          <span>{label}</span>
          <span className="font-semibold text-[var(--text)]">{Math.round(value)}%</span>
        </div>
      ) : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: colors[tone] }} />
      </div>
    </div>
  );
}

export function ScoreRing({ value, size = 78, label }: { value: number; size?: number; label?: string }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const color = clamped >= 75 ? 'var(--success)' : clamped >= 50 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className="flex flex-col items-center gap-1" aria-label={`${label || 'Score'}: ${Math.round(value)} percent`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={6} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 500ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-[var(--text)]">{Math.round(clamped)}%</div>
      </div>
      {label ? <div className="text-[0.68rem] font-medium uppercase tracking-wide text-[var(--muted-2)]">{label}</div> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? (
        <label className="label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className="mt-1 text-xs text-[var(--danger)]">{error}</p> : hint ? <p className="mt-1 text-xs text-[var(--muted-2)]">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('input', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('textarea', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('select', className)} {...rest}>
      {children}
    </select>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-2xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('card animate-rise max-h-[92vh] w-full overflow-hidden rounded-b-none sm:rounded-2xl', width)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-[var(--text)]">
              {title}
            </h2>
            {description ? <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{description}</p> : null}
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={17} />
          </IconButton>
        </div>
        <div className="scroll-thin max-h-[calc(92vh-9rem)] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--muted)]">
        {icon || <Inbox size={20} />}
      </div>
      <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…', rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
        <Loader2 size={14} className="animate-spin" /> {label}
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-16 w-full" />
      ))}
    </div>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(251,113,133,0.3)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="scroll-thin flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1" role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition',
            value === item.value ? 'bg-[var(--surface-solid)] text-[var(--text)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]',
          )}
        >
          {item.label}
          {item.count !== undefined ? <span className="rounded-full bg-[var(--accent-soft)] px-1.5 text-[0.65rem] text-[var(--accent)]">{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
      <div>
        <div className="text-sm font-medium text-[var(--text)]">{label}</div>
        {description ? <div className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{description}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full border transition',
          checked ? 'border-transparent bg-[var(--accent)]' : 'border-[var(--border-strong)] bg-[var(--surface-solid)]',
          disabled && 'opacity-50',
        )}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[1.35rem]' : 'left-0.5')} />
      </button>
    </label>
  );
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Add a skill and press Enter',
  suggestions = [],
  id,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  id?: string;
}) {
  const [draft, setDraft] = useState('');
  const listId = useId();
  const add = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;
    if (!value.some((item) => item.toLowerCase() === cleaned.toLowerCase())) onChange([...value, cleaned]);
    setDraft('');
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] p-2">
        {value.map((item) => (
          <span key={item} className="chip">
            {item}
            <button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((entry) => entry !== item))}>
              <X size={11} />
            </button>
          </span>
        ))}
        <div className="flex min-w-[150px] flex-1 items-center gap-1">
          <input
            id={id}
            list={suggestions.length ? listId : undefined}
            className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted-2)]"
            value={draft}
            placeholder={placeholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                add(draft);
              }
              if (event.key === 'Backspace' && !draft && value.length > 0) onChange(value.slice(0, -1));
            }}
            onBlur={() => add(draft)}
          />
          {draft.trim() ? (
            <button type="button" className="rounded p-1 text-[var(--accent)]" aria-label="Add value" onClick={() => add(draft)}>
              <Plus size={14} />
            </button>
          ) : null}
        </div>
      </div>
      {suggestions.length ? (
        <datalist id={listId}>
          {suggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}

export function InfoRow({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-2 last:border-0">
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className={cn('max-w-[70%] text-right text-xs font-medium text-[var(--text)]', mono && 'font-mono break-all')}>{children}</dd>
    </div>
  );
}

export function CheckItem({ passed, children }: { passed: boolean; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs leading-relaxed">
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full',
          passed ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--danger-soft)] text-[var(--danger)]',
        )}
      >
        {passed ? <Check size={10} /> : <X size={10} />}
      </span>
      <span className={passed ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>{children}</span>
    </div>
  );
}
