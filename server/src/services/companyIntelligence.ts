import type { CompanyOpenPosition, CompanyResearch, Confidence, JobPosting } from '../../../shared/types.js';
import type { Database } from '../db/index.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import { nowIso } from '../utils/dates.js';
import { companyKey, domainFromUrl, normalizeUrl, unique } from '../utils/normalize.js';
import { safeFetch } from '../utils/safeFetch.js';
import type { JobRow } from './jobRepository.js';
import { mapJobRow } from './jobRepository.js';

const INDUSTRY_KEYWORDS: Array<{ label: string; terms: string[] }> = [
  { label: 'FinTech / payments', terms: ['payments', 'banking', 'lending', 'financial', 'trading', 'investment', 'credit'] },
  { label: 'Developer tools / cloud infrastructure', terms: ['developer platform', 'devops', 'cloud', 'infrastructure', 'observability', 'database'] },
  { label: 'AI / data platforms', terms: ['artificial intelligence', 'machine learning', 'data platform', 'analytics', 'generative ai'] },
  { label: 'Cybersecurity', terms: ['security', 'threat', 'vulnerability', 'compliance'] },
  { label: 'E-commerce / consumer internet', terms: ['e-commerce', 'marketplace', 'consumer', 'shopping'] },
  { label: 'Enterprise software / SaaS', terms: ['saas', 'enterprise software', 'b2b', 'platform'] },
];

function slugTokens(company: string): string[] {
  return company
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|gmbh|plc|pvt|private|technologies|technology|systems|labs)\b/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function classifyIndustry(jobs: Array<{ title: string; description: string }>): { industry: string | null; note: string } {
  const text = jobs.map((job) => `${job.title} ${job.description}`).join(' ').toLowerCase();
  let best: { label: string; hits: number } | null = null;
  for (const category of INDUSTRY_KEYWORDS) {
    const hits = category.terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
    if (hits >= 2 && (!best || hits > best.hits)) best = { label: category.label, hits };
  }
  if (!best) return { industry: null, note: 'Industry could not be classified from verified posting text.' };
  return {
    industry: `${best.label} (derived from posting language)`,
    note: `Classification is derived from ${best.hits} domain terms found in the employer's persisted job descriptions; it is not an official registry classification.`,
  };
}

function detectBoard(job: JobRow): { type: 'greenhouse' | 'lever'; token: string } | null {
  if (job.source === 'greenhouse') {
    const fromUrl = job.apply_url.match(/(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/([^/]+)/i);
    if (fromUrl) return { type: 'greenhouse', token: fromUrl[1] };
    const fromName = job.source_name.match(/Greenhouse\s*·\s*(.+)$/i);
    if (fromName) return { type: 'greenhouse', token: fromName[1].trim().toLowerCase().replace(/\s+/g, '') };
  }
  if (job.source === 'lever') {
    const fromUrl = job.apply_url.match(/jobs\.lever\.co\/([^/]+)/i);
    if (fromUrl) return { type: 'lever', token: fromUrl[1] };
    const fromName = job.source_name.match(/Lever\s*·\s*(.+)$/i);
    if (fromName) return { type: 'lever', token: fromName[1].trim().toLowerCase().replace(/\s+/g, '') };
  }
  return null;
}

async function fetchOpenPositions(board: { type: 'greenhouse' | 'lever'; token: string }): Promise<CompanyOpenPosition[]> {
  if (board.type === 'greenhouse') {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.token)}/jobs`, {
      headers: { Accept: 'application/json', 'User-Agent': 'AI-Job-Hunter/2.0' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`Greenhouse board returned HTTP ${res.status}`);
    const data = (await res.json()) as { jobs?: Array<{ title: string; absolute_url: string; location?: { name?: string }; updated_at?: string }> };
    return (data.jobs || []).map((job) => ({
      title: job.title,
      location: job.location?.name || 'Not specified',
      url: job.absolute_url,
      source: 'Greenhouse public board',
      retrievedAt: job.updated_at ? new Date(job.updated_at).toISOString() : nowIso(),
    }));
  }
  const res = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(board.token)}?mode=json`, {
    headers: { Accept: 'application/json', 'User-Agent': 'AI-Job-Hunter/2.0' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Lever board returned HTTP ${res.status}`);
  const data = (await res.json()) as Array<{ text: string; hostedUrl: string; categories?: { location?: string }; createdAt?: number }>;
  return data.map((job) => ({
    title: job.text,
    location: job.categories?.location || 'Not specified',
    url: job.hostedUrl,
    source: 'Lever public postings API',
    retrievedAt: job.createdAt ? new Date(job.createdAt).toISOString() : nowIso(),
  }));
}

async function verifyWebsite(url: string, company: string): Promise<{ url: string; title: string | null } | null> {
  try {
    const result = await safeFetch(url);
    if (result.status >= 200 && result.status < 400) {
      const haystack = `${result.title || ''} ${result.text.slice(0, 20_000)}`.toLowerCase();
      const tokens = slugTokens(company);
      if (tokens.length === 0 || tokens.some((token) => haystack.includes(token))) {
        return { url: result.url, title: result.title };
      }
    }
  } catch (error) {
    logger.warn('company_website_verification_failed', { url, error: error instanceof Error ? error.message : String(error) });
  }
  return null;
}

async function discoverCareers(website: string, company: string): Promise<{ url: string; title: string | null } | null> {
  let base: URL;
  try {
    base = new URL(website);
  } catch {
    return null;
  }
  const candidates = ['/careers', '/jobs', '/careers/jobs', '/company/careers'];
  for (const path of candidates) {
    const candidate = new URL(path, base).toString();
    try {
      const result = await safeFetch(candidate);
      if (result.status < 200 || result.status >= 400) continue;
      const haystack = `${result.title || ''} ${result.text.slice(0, 30_000)}`.toLowerCase();
      if (/(career|job|hiring|opening|position)/i.test(haystack) && slugTokens(company).some((token) => haystack.includes(token))) {
        return { url: result.url, title: result.title };
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function findWebsiteInDescriptions(company: string, rows: JobRow[]): Promise<string | null> {
  const tokens = slugTokens(company);
  for (const row of rows) {
    const urls = row.description.match(/https?:\/\/[^\s<>"')]+/gi) || [];
    for (const raw of urls) {
      const domain = domainFromUrl(raw);
      if (!domain) continue;
      if (tokens.some((token) => domain.replace(/[^a-z0-9]/g, '').includes(token))) return `https://${domain}`;
    }
  }
  return null;
}

export async function researchCompany(
  db: Database,
  companyName: string,
  options: { websiteInput?: string | null } = {},
): Promise<CompanyResearch> {
  const cleanedCompany = companyName.trim();
  if (cleanedCompany.length < 2) throw new AppError(400, 'invalid_company', 'Enter a valid company name.');
  const rows = await db.query<JobRow>('SELECT * FROM jobs WHERE lower(company) = lower($1) ORDER BY retrieved_at DESC LIMIT 200', [
    cleanedCompany,
  ]);
  if (rows.rows.length === 0 && !options.websiteInput) {
    throw new AppError(
      404,
      'company_not_found',
      'No persisted job records exist for this company. Provide the official website to verify the company directly.',
    );
  }

  const now = nowIso();
  const jobs = rows.rows.map((row) => mapJobRow(row));
  const recordedDomain = rows.rows.find((row) => row.company_domain)?.company_domain || null;
  const descriptionWebsite = await findWebsiteInDescriptions(cleanedCompany, rows.rows);
  const notes: string[] = [];
  const sources: CompanyResearch['sources'] = [];
  let website: string | null = null;
  let websiteTitle: string | null = null;

  const candidateWebsite = options.websiteInput
    ? options.websiteInput.startsWith('http')
      ? options.websiteInput
      : `https://${options.websiteInput}`
    : recordedDomain
      ? `https://${recordedDomain}`
      : descriptionWebsite;

  if (candidateWebsite) {
    const verified = await verifyWebsite(candidateWebsite, cleanedCompany);
    if (verified) {
      website = verified.url;
      websiteTitle = verified.title;
      sources.push({
        label: options.websiteInput ? 'Official website (user-supplied, fetch-verified)' : 'Official website (discovered and fetch-verified)',
        url: verified.url,
        retrievedAt: now,
      });
    } else if (recordedDomain) {
      website = `https://${recordedDomain}`;
      notes.push(
        'The website could not be fetched during this research run. The domain is shown because it is recorded in the employer ATS source, not because the page was verified now.',
      );
      sources.push({ label: 'Company domain recorded in job source', url: website, retrievedAt: now });
    } else {
      notes.push('A candidate website was found but could not be verified; it is not shown as official.');
    }
  } else {
    notes.push('No official company website could be verified from persisted evidence or a user-supplied URL.');
  }

  let careersUrl: string | null = null;
  const board = rows.rows.map((row) => detectBoard(row)).find(Boolean) as { type: 'greenhouse' | 'lever'; token: string } | undefined;
  let livePositions: CompanyOpenPosition[] = [];
  if (board) {
    try {
      livePositions = await fetchOpenPositions(board);
      sources.push({
        label: `${board.type === 'greenhouse' ? 'Greenhouse' : 'Lever'} public board (${board.token})`,
        url:
          board.type === 'greenhouse'
            ? `https://boards.greenhouse.io/${board.token}`
            : `https://jobs.lever.co/${board.token}`,
        retrievedAt: now,
      });
    } catch (error) {
      notes.push(`Live open-position discovery failed: ${error instanceof Error ? error.message : 'unknown error'}.`);
    }
    careersUrl =
      board.type === 'greenhouse'
        ? `https://boards.greenhouse.io/${board.token}`
        : `https://jobs.lever.co/${board.token}`;
  } else if (website) {
    const discovered = await discoverCareers(website, cleanedCompany);
    if (discovered) {
      careersUrl = discovered.url;
      sources.push({ label: 'Careers page (discovered and fetch-verified)', url: discovered.url, retrievedAt: now });
    } else {
      notes.push('A careers page could not be verified by fetching the official website.');
    }
  }

  const dbPositions: CompanyOpenPosition[] = jobs.map((job) => ({
    title: job.title,
    location: job.location,
    url: job.applyUrl,
    source: job.sourceName,
    retrievedAt: job.retrievedAt,
  }));
  const seenPositions = new Set<string>();
  const openPositions = [...livePositions, ...dbPositions]
    .filter((position) => {
      const key = normalizeUrl(position.url);
      if (seenPositions.has(key)) return false;
      seenPositions.add(key);
      return true;
    })
    .slice(0, 100);

  const techCounts = new Map<string, { postings: number; evidence: string[] }>();
  for (const job of jobs) {
    for (const skill of job.skills) {
      const key = skill.toLowerCase();
      const current = techCounts.get(key) || { postings: 0, evidence: [] };
      current.postings += 1;
      if (current.evidence.length < 3) current.evidence.push(`${job.title} — ${job.applyUrl}`);
      techCounts.set(key, current);
    }
  }
  const techStack = [...techCounts.entries()]
    .map(([technology, value]) => ({ technology, ...value }))
    .sort((a, b) => b.postings - a.postings)
    .slice(0, 20);

  const industry = classifyIndustry(jobs);
  notes.push(industry.note);

  const postingHistory = {
    firstSeen: rows.rows.length > 0 ? rows.rows[rows.rows.length - 1].retrieved_at : null,
    lastSeen: rows.rows.length > 0 ? rows.rows[0].retrieved_at : null,
    count: rows.rows.length,
  };

  for (const source of unique(rows.rows.map((row) => `${row.source}|${row.source_name}`))) {
    const [sourceKey, sourceName] = source.split('|');
    sources.push({
      label: sourceName || sourceKey,
      url:
        sourceKey === 'greenhouse'
          ? 'https://boards-api.greenhouse.io/v1/boards/'
          : sourceKey === 'lever'
            ? 'https://api.lever.co/'
            : sourceKey === 'remotive'
              ? 'https://remotive.com/api/remote-jobs'
              : 'Manual entry',
      retrievedAt: postingHistory.lastSeen || now,
    });
  }

  let confidence: Confidence = 'low';
  if (website && careersUrl && livePositions.length > 0) confidence = 'high';
  else if (website || careersUrl || rows.rows.some((row) => row.company_domain)) confidence = 'medium';
  if (!website && !recordedDomain) confidence = 'low';

  const result: CompanyResearch = {
    id: `company-${Buffer.from(companyKey(cleanedCompany)).toString('hex').slice(0, 24)}`,
    company: cleanedCompany,
    website,
    careersUrl,
    industry: industry.industry,
    locations: unique(jobs.map((job) => job.location)).slice(0, 30),
    techStack,
    openPositions,
    postingHistory,
    sources: sources.filter((source, index, all) => all.findIndex((item) => item.label === source.label) === index),
    confidence,
    researchDate: now,
    notes: unique(notes),
  };

  const existing = await db.query<{ id: string }>('SELECT id FROM companies WHERE name_key = $1', [companyKey(cleanedCompany)]);
  if (existing.rows.length > 0) {
    await db.query('UPDATE companies SET company = $2, data = $3, updated_at = $4 WHERE name_key = $1', [
      companyKey(cleanedCompany),
      cleanedCompany,
      JSON.stringify({ ...result, id: existing.rows[0].id }),
      now,
    ]);
    result.id = existing.rows[0].id;
  } else {
    await db.query('INSERT INTO companies (id, name_key, company, data, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6)', [
      result.id,
      companyKey(cleanedCompany),
      cleanedCompany,
      JSON.stringify(result),
      now,
      now,
    ]);
  }

  return result;
}

export async function listCompanies(db: Database): Promise<
  Array<{ company: string; jobCount: number; locations: string[]; lastRetrieved: string; trust: string; research: CompanyResearch | null }>
> {
  const rows = await db.query<{ company: string; location: string; retrieved_at: string }>(
    'SELECT company, location, retrieved_at FROM jobs ORDER BY retrieved_at DESC',
  );
  const grouped = new Map<string, { company: string; jobCount: number; locations: Set<string>; lastRetrieved: string }>();
  for (const row of rows.rows) {
    const current = grouped.get(row.company) || {
      company: row.company,
      jobCount: 0,
      locations: new Set<string>(),
      lastRetrieved: row.retrieved_at,
    };
    current.jobCount += 1;
    if (row.location) current.locations.add(row.location);
    if (row.retrieved_at > current.lastRetrieved) current.lastRetrieved = row.retrieved_at;
    grouped.set(row.company, current);
  }
  const researched = await db.query<{ name_key: string; data: string }>('SELECT name_key, data FROM companies');
  const researchMap = new Map(researched.rows.map((row) => [row.name_key, JSON.parse(row.data) as CompanyResearch]));
  return [...grouped.values()]
    .sort((a, b) => b.jobCount - a.jobCount)
    .slice(0, 100)
    .map((row) => {
      const research = researchMap.get(companyKey(row.company)) || null;
      return {
        company: row.company,
        jobCount: row.jobCount,
        locations: [...row.locations].slice(0, 8),
        lastRetrieved: row.lastRetrieved,
        trust: research?.confidence || 'unresearched',
        research,
      };
    });
}
