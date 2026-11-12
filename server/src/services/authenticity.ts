import type { AuthenticityIndicator, AuthenticityResult, JobPosting, RiskClassification } from '../../../shared/types.js';
import type { Database } from '../db/index.js';
import { isAtsDomain, normalizeSkill } from '../utils/normalize.js';

const SHORTENERS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'cutt.ly',
  'rb.gy',
  'is.gd',
  'shorturl.at',
  'rebrand.ly',
  'tiny.cc',
  'ow.ly',
  'buff.ly',
]);

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.click', '.work', '.gq', '.tk', '.ml', '.cf', '.ga', '.buzz', '.rest'];

const PAYMENT_TERMS = [
  'registration fee',
  'security deposit',
  'pay to apply',
  'application fee',
  'processing fee',
  'training fee',
  'refundable deposit',
  'pay a fee',
  'payment is required',
  'purchase equipment',
  'buy your own equipment',
];

const SENSITIVE_TERMS = [
  'bank account',
  'net banking',
  'aadhaar',
  'aadhar',
  'pan card',
  'passport number',
  'credit card number',
  'debit card',
  'cvv',
  'otp',
  'one-time password',
  'mother maiden name',
];

const FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'protonmail.com', 'rediffmail.com'];

function add(
  indicators: AuthenticityIndicator[],
  code: string,
  label: string,
  severity: AuthenticityIndicator['severity'],
  evidence: string,
  verified = true,
): void {
  indicators.push({ code, label, severity, evidence, verified });
}

function isPrivateHostname(hostname: string): boolean {
  return (
    /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.)/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    hostname.endsWith('.local')
  );
}

export function analyzeJobAuthenticity(
  job: JobPosting,
  extras: { duplicateCount?: number; sourceRecordCount?: number; companyDomain?: string | null } = {},
): AuthenticityResult {
  const indicators: AuthenticityIndicator[] = [];
  const verifiedEvidence: string[] = [];
  const unverifiedInformation: string[] = [];
  const description = job.description || '';
  const lower = description.toLowerCase();
  let url: URL | null = null;
  try {
    url = new URL(job.applyUrl);
  } catch {
    add(indicators, 'invalid_apply_url', 'Application URL could not be parsed', 'high', job.applyUrl);
  }

  if (url) {
    if (url.protocol !== 'https:') {
      add(indicators, 'non_https_url', 'Application page is not HTTPS', 'medium', `${url.protocol}//${url.host}`);
    } else {
      add(indicators, 'https_url', 'Application URL uses HTTPS', 'info', job.applyUrl);
    }
    if (SHORTENERS.has(url.hostname.replace(/^www\./, ''))) {
      add(
        indicators,
        'url_shortener',
        'Application URL uses a link shortener',
        'medium',
        `The final destination is hidden by ${url.hostname}. Open the link in a sandboxed browser and verify the employer domain.`,
      );
    }
    if (isPrivateHostname(url.hostname)) {
      add(indicators, 'private_host', 'Application URL targets a private/local host', 'high', url.hostname);
    }
    if (SUSPICIOUS_TLDS.some((tld) => url.hostname.endsWith(tld))) {
      add(indicators, 'unusual_tld', 'Application URL uses an unusual top-level domain', 'low', url.hostname);
    }
    const domain = url.hostname.replace(/^www\./, '');
    const companyDomain = extras.companyDomain || job.companyDomain;
    if (isAtsDomain(domain)) {
      verifiedEvidence.push(`Application is hosted on a recognised applicant tracking system (${domain}).`);
      add(
        indicators,
        'known_ats',
        'Application is hosted on a known ATS domain',
        'info',
        `${domain} is a public applicant-tracking platform. The employer record still needs verification.`,
      );
    } else if (companyDomain) {
      if (domain === companyDomain || domain.endsWith(`.${companyDomain}`)) {
        verifiedEvidence.push(`Application domain ${domain} matches the recorded company domain ${companyDomain}.`);
        add(indicators, 'domain_match', 'Application domain matches company domain', 'info', `${domain} ↔ ${companyDomain}`);
      } else {
        add(
          indicators,
          'domain_mismatch',
          'Application domain does not match the recorded company domain',
          'medium',
          `URL domain ${domain}; recorded company domain ${companyDomain}. This can be legitimate when an ATS or recruiter page is used, but verify it.`,
        );
      }
    } else {
      unverifiedInformation.push('The official company domain could not be verified from persisted evidence.');
    }
  }

  if (PAYMENT_TERMS.some((term) => lower.includes(term))) {
    const matched = PAYMENT_TERMS.filter((term) => lower.includes(term));
    add(
      indicators,
      'payment_request',
      'Job text mentions a payment, deposit or fee',
      'high',
      `Matched terms: ${matched.join(', ')}. Legitimate employers do not ask candidates to pay to apply.`,
    );
  }

  if (SENSITIVE_TERMS.some((term) => lower.includes(term))) {
    const matched = SENSITIVE_TERMS.filter((term) => lower.includes(term));
    add(
      indicators,
      'sensitive_information',
      'Job text requests sensitive personal information',
      'high',
      `Matched terms: ${matched.join(', ')}. Never share OTPs, bank credentials, card details or identity numbers before a verified offer and formal onboarding.`,
    );
  }

  if (/(whatsapp|telegram)\s*(?:number|contact|chat)?/i.test(lower)) {
    add(
      indicators,
      'informal_channel',
      'Communication is directed to an informal channel',
      'medium',
      'The description asks candidates to contact via WhatsApp/Telegram instead of a company channel.',
    );
  }

  const emailMatch = description.match(/[a-z0-9._%+-]+@([a-z0-9.-]+\.[a-z]{2,})/i);
  if (emailMatch && FREE_EMAIL_DOMAINS.includes(emailMatch[1].toLowerCase())) {
    add(
      indicators,
      'free_email_contact',
      'Recruiter contact uses a free email domain',
      'medium',
      `Contact email domain: ${emailMatch[1]}. Verify the recruiter's identity through the company website.`,
    );
  }

  if (description.length < 200) {
    add(indicators, 'thin_description', 'Job description is unusually short', 'medium', `Only ${description.length} characters of description were provided.`);
  } else {
    verifiedEvidence.push(`A substantive job description was provided (${description.length} characters).`);
  }

  if (job.skills.length === 0) {
    add(indicators, 'no_skills', 'No explicit skills were listed', 'low', 'The record does not list verifiable skill requirements.');
  }

  if (!job.company || !job.company.trim()) {
    add(indicators, 'missing_company', 'Company name is missing', 'high', 'No employer identity is attached to this record.');
  } else if (!job.companyDomain) {
    add(indicators, 'company_domain_unknown', 'Official company domain is not verified', 'low', `Company “${job.company}” has no verified domain in the local evidence store.`);
  } else {
    verifiedEvidence.push(`Company domain recorded: ${job.companyDomain}.`);
  }

  if (job.salary?.min && job.salary?.max && job.salary.max > job.salary.min * 4) {
    add(
      indicators,
      'broad_salary_range',
      'Published salary range is unusually broad',
      'low',
      `${job.salary.currency} ${job.salary.min.toLocaleString()}–${job.salary.max.toLocaleString()}. Verify whether the range includes variable pay or equity.`,
    );
  }
  if (
    job.salary?.max &&
    job.experienceMin !== null &&
    job.experienceMin <= 1 &&
    ((job.salary.currency === 'INR' && job.salary.max > 5_000_000) ||
      (['USD', 'EUR', 'GBP'].includes(job.salary.currency || '') && job.salary.max > 250_000))
  ) {
    add(
      indicators,
      'improbable_junior_salary',
      'Very high salary claimed for an entry-level role',
      'medium',
      `Published maximum ${job.salary.currency} ${job.salary.max.toLocaleString()} with ${job.experienceMin} year(s) required. Verify the compensation structure with the employer.`,
    );
  }

  if (/(no experience (?:is )?(?:required|needed)|freshers? welcome)/i.test(lower) && /(high salary|earn up to|lakhs? per month|daily payout)/i.test(lower)) {
    add(
      indicators,
      'unrealistic_fresher_claim',
      'High-earning claim paired with no experience requirement',
      'medium',
      'The description combines a no-experience claim with unusual earnings language.',
    );
  }

  if (description.length > 100 && description === description.toUpperCase()) {
    add(indicators, 'all_caps', 'Description is written entirely in capitals', 'low', 'All-caps descriptions correlate with low-quality or spam postings.');
  }

  const duplicates = extras.duplicateCount || 0;
  if (duplicates > 0) {
    add(
      indicators,
      'duplicate_listing',
      'Same employer-job combination appears in multiple records',
      'info',
      `${duplicates} possible duplicate record(s) were found in the local job store. This is common when aggregators republish ATS feeds.`,
    );
  }

  if (job.source === 'greenhouse' || job.source === 'lever') {
    verifiedEvidence.push(`Record came directly from the ${job.source} public posting API; source job id ${job.sourceJobId}.`);
    add(indicators, 'public_source_api', 'Job record came from a public employer ATS API', 'info', `${job.source} public API`);
  } else if (job.source === 'remotive') {
    verifiedEvidence.push('Record came from the Remotive public job API. Remotive is an aggregator, not the employer.');
  } else if (job.source === 'manual') {
    add(
      indicators,
      'manual_entry',
      'Job was added manually',
      'medium',
      'Manual records must be verified against the employer careers page before applying.',
    );
  }

  unverifiedInformation.push(
    'Employer legal registration and recruiter identity are not checked by this automated analysis.',
    'Salary, benefits and remote-work claims are only as reliable as the original posting.',
  );

  const severityWeight = { info: 0, low: 8, medium: 18, high: 35 } as const;
  const riskScore = Math.min(100, indicators.reduce((sum, indicator) => sum + severityWeight[indicator.severity], 5));
  let classification: RiskClassification;
  if (riskScore <= 20) classification = 'Low Risk Indicators';
  else if (riskScore <= 45) classification = 'Needs Verification';
  else if (riskScore <= 70) classification = 'Suspicious';
  else classification = 'High Risk';

  const highIndicators = indicators.filter((indicator) => indicator.severity === 'high');
  const recommendedAction =
    classification === 'High Risk'
      ? 'Do not pay money or share sensitive documents. Verify the employer through its official website and independently contacted HR before proceeding.'
      : classification === 'Suspicious'
        ? 'Pause the application. Open the official careers page, confirm the posting, and contact the employer through a verified channel.'
        : classification === 'Needs Verification'
          ? 'Proceed only after confirming the posting on the employer’s official careers page. Keep records of all communication.'
          : 'No major risk indicators were detected. Still confirm the posting and compensation on the employer’s official careers page before sharing documents.';

  return {
    jobId: job.id,
    riskScore,
    classification,
    indicators,
    verifiedEvidence,
    unverifiedInformation,
    recommendedAction,
    checkedAt: new Date().toISOString(),
    disclaimer:
      'This is an automated rule-based risk screen, not a determination that a job is genuine or fraudulent. High-risk indicators may have legitimate explanations; low risk does not guarantee authenticity.',
  };
}

export async function runAuthenticityCheck(db: Database, job: JobPosting): Promise<AuthenticityResult> {
  const duplicate = await db.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM jobs WHERE lower(company) = lower($1) AND lower(title) = lower($2)',
    [job.company, job.title],
  );
  const count = Number(duplicate.rows[0]?.count || 0);
  const result = analyzeJobAuthenticity(job, { duplicateCount: Math.max(0, count - 1) });
  await db.query(
    `INSERT INTO authenticity_checks (id, job_id, risk_score, classification, result, checked_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      `auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      job.id,
      result.riskScore,
      result.classification,
      JSON.stringify(result),
      result.checkedAt,
    ],
  );
  return result;
}
