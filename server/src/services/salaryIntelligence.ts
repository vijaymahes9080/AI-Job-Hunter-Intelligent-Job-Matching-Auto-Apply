import type { JobPosting, SalaryIntelligence, SalaryObservation } from '../../../shared/types.js';
import type { Database } from '../db/index.js';
import { mapJobRow, type JobRow } from './jobRepository.js';
import { annualize } from '../utils/dates.js';
import { median } from '../utils/normalize.js';

function classifyRole(title: string): string {
  const value = title.toLowerCase();
  if (/full.?stack/.test(value)) return 'Full-stack';
  if (/front.?end|react|ui\b/.test(value)) return 'Frontend';
  if (/back.?end|api\b/.test(value)) return 'Backend';
  if (/data engineer|etl|pipeline/.test(value)) return 'Data engineering';
  if (/data scien|analyst|analytics/.test(value)) return 'Data / analytics';
  if (/\bai\b|machine learning|\bml\b|agentic/.test(value)) return 'AI / ML';
  if (/security|cyber/.test(value)) return 'Cybersecurity';
  if (/devops|sre|platform|cloud|infrastructure/.test(value)) return 'Cloud / DevOps';
  if (/mobile|android|ios|flutter|react native/.test(value)) return 'Mobile';
  if (/architect|solution/.test(value)) return 'Solutions / architecture';
  return 'Other engineering';
}

function experienceBand(min: number | null, max: number | null): string {
  const value = min ?? max;
  if (value === null) return 'Not specified';
  if (value <= 1) return '0–1 years';
  if (value <= 3) return '2–3 years';
  if (value <= 5) return '4–5 years';
  if (value <= 8) return '6–8 years';
  return '9+ years';
}

function locationBucket(location: string): string {
  const value = location.toLowerCase();
  if (/chennai|tamil nadu|coimbatore|madurai/.test(value)) return 'Tamil Nadu';
  if (/bengaluru|bangalore/.test(value)) return 'Bengaluru';
  if (/hyderabad/.test(value)) return 'Hyderabad';
  if (/mumbai|pune/.test(value)) return 'Mumbai / Pune';
  if (/gurugram|gurgaon|noida|delhi/.test(value)) return 'Delhi NCR';
  if (/india/.test(value)) return 'India (other)';
  if (/remote|worldwide|anywhere/.test(value)) return 'Remote / worldwide';
  return location || 'Not specified';
}

function groupMedian(
  observations: SalaryObservation[],
  label: (observation: SalaryObservation) => string,
): Array<{ label: string; currency: string; count: number; medianAnnual: number }> {
  const groups = new Map<string, { label: string; currency: string; values: number[] }>();
  for (const observation of observations) {
    if (observation.annualizedMin === null) continue;
    const key = `${label(observation)}|${observation.currency}`;
    const current = groups.get(key) || { label: label(observation), currency: observation.currency, values: [] };
    current.values.push(observation.annualizedMin);
    groups.set(key, current);
  }
  return [...groups.values()]
    .map((group) => ({
      label: group.label,
      currency: group.currency,
      count: group.values.length,
      medianAnnual: Math.round(median(group.values)),
    }))
    .sort((a, b) => b.count - a.count);
}

export async function buildSalaryIntelligence(
  db: Database,
  filters: { currency?: string; location?: string; role?: string; minExperience?: number; maxExperience?: number } = {},
): Promise<SalaryIntelligence> {
  const result = await db.query<JobRow>('SELECT * FROM jobs ORDER BY retrieved_at DESC LIMIT 2000');
  const jobs = result.rows.map((row) => mapJobRow(row));
  let observations = jobs
    .filter((job): job is JobPosting & { salary: NonNullable<JobPosting['salary']> } => Boolean(job.salary?.min && job.salary?.max && job.salary.currency))
    .map((job) => {
      const salary = job.salary;
      return {
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        experienceMin: job.experienceMin,
        experienceMax: job.experienceMax,
        min: salary.min!,
        max: salary.max!,
        currency: salary.currency!,
        period: salary.period === 'unknown' ? ('year' as const) : salary.period,
        annualizedMin: annualize(salary.min, salary.period),
        annualizedMax: annualize(salary.max, salary.period),
        source: salary.source === 'description-extracted' ? 'Extracted from job description' : 'Published by job source',
        sourceUrl: job.applyUrl,
        observedAt: job.retrievedAt,
      } satisfies SalaryObservation;
    });

  if (filters.currency) observations = observations.filter((observation) => observation.currency === filters.currency);
  if (filters.location) {
    const location = filters.location.toLowerCase();
    observations = observations.filter((observation) => observation.location.toLowerCase().includes(location));
  }
  if (filters.role) {
    const role = filters.role.toLowerCase();
    observations = observations.filter((observation) => observation.title.toLowerCase().includes(role));
  }
  if (typeof filters.minExperience === 'number') {
    observations = observations.filter((observation) => (observation.experienceMin ?? 0) >= filters.minExperience!);
  }
  if (typeof filters.maxExperience === 'number') {
    observations = observations.filter((observation) => (observation.experienceMin ?? 0) <= filters.maxExperience!);
  }

  const comparisonGroups = new Map<string, { label: string; currency: string; period: string; values: number[] }>();
  for (const observation of observations) {
    const key = `${observation.currency}|${observation.period}`;
    const current = comparisonGroups.get(key) || {
      label: `${observation.currency} · per ${observation.period}`,
      currency: observation.currency,
      period: observation.period,
      values: [],
    };
    current.values.push(observation.min, observation.max);
    comparisonGroups.set(key, current);
  }

  const comparisons = [...comparisonGroups.values()].map((group) => ({
    label: group.label,
    currency: group.currency,
    period: group.period,
    count: group.values.length / 2,
    min: Math.min(...group.values),
    median: Math.round(median(group.values)),
    max: Math.max(...group.values),
  }));

  return {
    observations: observations.sort((a, b) => (b.annualizedMin || 0) - (a.annualizedMin || 0)),
    comparisons,
    byRole: groupMedian(observations, (observation) => classifyRole(observation.title)),
    byLocation: groupMedian(observations, (observation) => locationBucket(observation.location)),
    byExperience: groupMedian(observations, (observation) => experienceBand(observation.experienceMin, observation.experienceMax)),
    methodology:
      'Only explicitly published or description-extracted salary ranges are included. Monthly figures are annualised ×12 and hourly figures ×2080; currencies are never converted. Medians are calculated on annualised minimum values within each currency group. No salary is estimated or imputed.',
    caveats: [
      'A published range may include variable pay, equity or location adjustments; CTC and base salary are not always distinguished by the source.',
      'Sample sizes can be small; a median from fewer than three observations is weak evidence.',
      'Salary observations reflect the source retrieval date and may be outdated. Confirm compensation with the employer.',
    ],
  };
}
