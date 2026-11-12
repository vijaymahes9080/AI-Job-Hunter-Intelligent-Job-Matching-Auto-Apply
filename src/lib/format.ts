import type { DeadlineInfo, SalaryRange } from '../../shared/types';

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return 'unknown';
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return 'unknown';
  const diff = Date.now() - date;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function formatMoney(value: number | null | undefined, currency: string | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const code = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: value >= 1000 ? 0 : 2,
      notation: value >= 1_000_000 ? 'compact' : 'standard',
    }).format(value);
  } catch {
    return `${code} ${Math.round(value).toLocaleString()}`;
  }
}

export function salaryLabel(salary: SalaryRange | null | undefined): string {
  if (!salary) return 'Not published';
  const period = salary.period === 'year' ? '/yr' : salary.period === 'month' ? '/mo' : salary.period === 'hour' ? '/hr' : '';
  if (salary.min === null && salary.max === null) return 'Not published';
  if (salary.min !== null && salary.max !== null && salary.min !== salary.max) {
    return `${formatMoney(salary.min, salary.currency)} – ${formatMoney(salary.max, salary.currency)}${period}`;
  }
  return `${formatMoney(salary.min ?? salary.max, salary.currency)}${period}`;
}

export function deadlineLabel(deadline: DeadlineInfo): string {
  if (deadline.status === 'Not Specified') return 'No published deadline';
  if (deadline.status === 'Needs Verification') return 'Needs verification';
  if (deadline.status === 'Deadline Passed') return 'Deadline passed';
  const days = deadline.daysRemaining;
  if (days === null) return deadline.date ? formatDate(deadline.date) : 'No published deadline';
  if (days === 0) return 'Closes today';
  if (days === 1) return 'Closes tomorrow';
  return `${days} days left · ${formatDate(deadline.date)}`;
}

export function titleCase(value: string): string {
  return value.replace(/(^|[\s-_])([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function truncate(value: string, length = 160): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length).trimEnd()}…`;
}

export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
  } catch {
    return null;
  }
  return null;
}

export function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent' {
  switch (status) {
    case 'Offer':
    case 'Low Risk Indicators':
    case 'Open':
      return 'success';
    case 'Interview':
    case 'Approved':
    case 'Assessment':
      return 'info';
    case 'Submitted':
      return 'accent';
    case 'Rejected':
    case 'High Risk':
    case 'Deadline Passed':
      return 'danger';
    case 'Withdrawn':
    case 'Suspicious':
    case 'Closing Soon':
    case 'Needs Verification':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function riskTone(classification: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (classification === 'Low Risk Indicators') return 'success';
  if (classification === 'Needs Verification') return 'warning';
  if (classification === 'Suspicious' || classification === 'High Risk') return 'danger';
  return 'neutral';
}
