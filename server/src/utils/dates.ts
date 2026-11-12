import type { DeadlineInfo, DeadlineStatus, SalaryRange } from '../../../shared/types.js';

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value.length <= 10 ? `${value}T23:59:59.999Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysBetween(target: Date, from = new Date()): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.round((end - start) / 86_400_000);
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function toIso(year: number, month: number, day: number): string | null {
  if (year < 2000 || year > new Date().getUTCFullYear() + 3) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

export function extractDeadlineFromText(text: string): {
  date: string | null;
  snippet: string | null;
  confidence: 'extracted' | 'unknown';
} {
  const cleaned = text.replace(/\s+/g, ' ');
  const contextPattern = /(?:apply\s+by|application\s+deadline|closing\s+date|last\s+date\s+to\s+apply|deadline\s*(?:is|:)?|applications?\s+close[sd]?|close[sd]?\s+on)\s*[:\-–]?\s*([^.;\n]{4,60})/gi;
  const match = contextPattern.exec(cleaned);
  if (!match) return { date: null, snippet: null, confidence: 'unknown' };
  const raw = match[1].trim();
  const snippet = match[0].slice(0, 180).trim();

  const iso = raw.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const date = toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (date) return { date, snippet, confidence: 'extracted' };
  }

  const dayMonthYear = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(20\d{2})\b/);
  if (dayMonthYear) {
    const month = MONTHS[dayMonthYear[2].toLowerCase()];
    if (month) {
      const date = toIso(Number(dayMonthYear[3]), month, Number(dayMonthYear[1]));
      if (date) return { date, snippet, confidence: 'extracted' };
    }
  }

  const monthDayYear = raw.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/);
  if (monthDayYear) {
    const month = MONTHS[monthDayYear[1].toLowerCase()];
    if (month) {
      const date = toIso(Number(monthDayYear[3]), month, Number(monthDayYear[2]));
      if (date) return { date, snippet, confidence: 'extracted' };
    }
  }

  const slash = raw.match(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/);
  if (slash) {
    // Prefer day/month/year, then fall back to month/day/year when unambiguous.
    let day = Number(slash[1]);
    let month = Number(slash[2]);
    if (day <= 12 && month > 12) [day, month] = [month, day];
    const date = toIso(Number(slash[3]), month, day);
    if (date) return { date, snippet, confidence: 'extracted' };
  }

  return { date: null, snippet, confidence: 'unknown' };
}

export function classifyDeadline(
  date: string | null,
  confidence: DeadlineInfo['confidence'] = date ? 'verified' : 'unknown',
  sourceSnippet: string | null = null,
): DeadlineInfo {
  if (!date) {
    return {
      date: null,
      status: 'Not Specified',
      daysRemaining: null,
      sourceSnippet,
      confidence: 'unknown',
      note: 'No explicit application deadline was found in the source data.',
    };
  }
  const parsed = parseIsoDate(date);
  if (!parsed) {
    return {
      date,
      status: 'Needs Verification',
      daysRemaining: null,
      sourceSnippet,
      confidence: 'unknown',
      note: 'A closing date was mentioned but could not be parsed reliably.',
    };
  }
  const daysRemaining = daysBetween(parsed);
  let status: DeadlineStatus;
  if (daysRemaining < 0) status = 'Deadline Passed';
  else if (daysRemaining <= 7) status = 'Closing Soon';
  else status = 'Open';
  if (confidence === 'extracted' && !sourceSnippet) status = 'Needs Verification';
  return {
    date,
    status,
    daysRemaining,
    sourceSnippet,
    confidence,
    note:
      confidence === 'verified'
        ? 'Deadline supplied by the job source. Recheck the employer page before applying.'
        : confidence === 'extracted'
          ? 'Deadline extracted from the job description. Confirm on the employer page.'
          : 'Deadline requires manual verification.',
  };
}

export function inferExperienceRange(text: string): { min: number | null; max: number | null } {
  const patterns = [
    /(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*\+?\s*years?/i,
    /(\d{1,2})\s*\+\s*years?/i,
    /(?:minimum|at least)\s*(?:of\s*)?(\d{1,2})\s*years?/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const min = Number(match[1]);
    const max = match[2] ? Number(match[2]) : null;
    if (min >= 0 && min <= 30) return { min, max: max && max <= 40 ? max : null };
  }
  return { min: null, max: null };
}

const CURRENCY_SYMBOL: Record<string, string> = {
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '₹': 'INR',
};

function parseAmount(rawNumber: string, suffix?: string): number | null {
  let value = Number.parseFloat(rawNumber.replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  if (suffix?.toLowerCase() === 'k') value *= 1_000;
  if (suffix?.toLowerCase() === 'm') value *= 1_000_000;
  return value;
}

export function parseSalaryText(raw: string | null | undefined): SalaryRange | null {
  if (!raw) return null;
  const text = raw.replace(/\u00a0/g, ' ').trim();
  if (!text) return null;
  const currencySymbol = text.match(/[$€£₹]/)?.[0];
  const currencyCode = text.match(/\b(USD|INR|EUR|GBP|SGD|AED|CAD|AUD)\b/i)?.[1]?.toUpperCase();
  const currency = currencyCode || (currencySymbol ? CURRENCY_SYMBOL[currencySymbol] : null);
  if (!currency) return null;
  if (/lpa/i.test(text)) {
    const match = text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*lpa/i);
    if (match) {
      return {
        min: Number(match[1]) * 100_000,
        max: Number(match[2]) * 100_000,
        currency: 'INR',
        period: 'year',
        source: 'published',
        rawText: text,
      };
    }
    const single = text.match(/(\d+(?:\.\d+)?)\s*lpa/i);
    if (single)
      return {
        min: Number(single[1]) * 100_000,
        max: Number(single[1]) * 100_000,
        currency: 'INR',
        period: 'year',
        source: 'published',
        rawText: text,
      };
  }
  const range = text.match(
    /([$€£₹]\s?)?(\d[\d,.]*)\s?([kKmM])?\s*(?:-|–|to)\s*([$€£₹]\s?)?(\d[\d,.]*)\s?([kKmM])?/,
  );
  if (range) {
    const min = parseAmount(range[2], range[3]);
    const max = parseAmount(range[5], range[6]);
    if (min && max && max >= min) {
      const period: SalaryRange['period'] = /hour|hr|hourly/i.test(text)
        ? 'hour'
        : /month|monthly|per month|\/mo/i.test(text)
          ? 'month'
          : 'year';
      return { min, max, currency, period, source: 'published', rawText: text };
    }
  }
  return null;
}

export function extractSalaryFromDescription(text: string): SalaryRange | null {
  if (!text) return null;
  const patterns = [
    /(?:salary|compensation|ctc|package|pay range|base pay)[^.\n]{0,30}?([$€£₹]\s?\d[\d,.]*\s?(?:[kKmM])?\s*(?:-|–|to)\s*[$€£₹]?\s?\d[\d,.]*\s?(?:[kKmM])?[^.\n]{0,40})/i,
    /([₹$€£]\s?\d+(?:\.\d+)?\s*(?:-|–|to)\s*[₹$€£]?\s?\d+(?:\.\d+)?\s*(?:lpa|lakhs?|per annum|p\.a\.))/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const parsed = parseSalaryText(match[1] || match[0]);
    if (parsed) return { ...parsed, source: 'description-extracted' };
  }
  return null;
}

export function annualize(value: number | null, period: SalaryRange['period']): number | null {
  if (value === null) return null;
  if (period === 'hour') return Math.round(value * 2080);
  if (period === 'month') return Math.round(value * 12);
  if (period === 'year') return Math.round(value);
  return null;
}
