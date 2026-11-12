/**
 * Normalisation helpers shared by duplicate detection, source adapters and analytics.
 */

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gh_src',
  'gh_jid',
  'source',
  'ref',
  'referrer',
  'trk',
  'trackingid',
  'lever-source',
  'lever-origin',
  'lever-via',
];

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.protocol = 'https:';
    for (const param of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.includes(param.toLowerCase())) url.searchParams.delete(param);
    }
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .replace(/\.js\b/g, 'js')
    .replace(/\bnodejs\b/g, 'node.js')
    .replace(/\breactjs\b/g, 'react')
    .replace(/\bpostgres\b/g, 'postgresql')
    .replace(/\bml\b/g, 'machine learning')
    .replace(/\bai\b/g, 'artificial intelligence')
    .replace(/[^a-z0-9+#./ -]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const SKILL_ALIASES: Record<string, string[]> = {
  react: ['react', 'react.js', 'reactjs'],
  'node.js': ['node', 'node.js', 'nodejs'],
  typescript: ['typescript', 'ts'],
  javascript: ['javascript', 'js'],
  python: ['python', 'python3'],
  postgresql: ['postgresql', 'postgres', 'psql'],
  'machine learning': ['machine learning', 'ml', 'machine-learning'],
  'artificial intelligence': ['artificial intelligence', 'ai', 'generative ai', 'genai'],
  'large language models': ['llm', 'large language model', 'large language models', 'genai'],
  aws: ['aws', 'amazon web services'],
  gcp: ['gcp', 'google cloud', 'google cloud platform'],
  kubernetes: ['kubernetes', 'k8s'],
  'ci/cd': ['ci/cd', 'cicd', 'continuous integration', 'continuous delivery'],
  'rest apis': ['rest', 'rest api', 'rest apis', 'restful'],
  graphql: ['graphql'],
  docker: ['docker', 'containers'],
  fastapi: ['fastapi', 'fast api'],
  django: ['django'],
  java: ['java'],
  'spring boot': ['spring boot', 'springboot'],
  sql: ['sql'],
  'power bi': ['power bi', 'powerbi'],
  cybersecurity: ['cybersecurity', 'cyber security', 'information security'],
  'penetration testing': ['penetration testing', 'pen testing', 'pentest'],
  'system design': ['system design', 'distributed systems'],
  'data engineering': ['data engineering', 'data engineer'],
  'data science': ['data science', 'data scientist'],
  'computer vision': ['computer vision'],
  nlp: ['nlp', 'natural language processing'],
  rag: ['rag', 'retrieval augmented generation', 'retrieval-augmented generation'],
  langchain: ['langchain'],
  pytorch: ['pytorch'],
  tensorflow: ['tensorflow'],
  pandas: ['pandas'],
  spark: ['spark', 'apache spark'],
  kafka: ['kafka', 'apache kafka'],
  airflow: ['airflow', 'apache airflow'],
};

export function skillMatches(required: string, candidate: string): boolean {
  const r = normalizeSkill(required);
  const c = normalizeSkill(candidate);
  if (!r || !c) return false;
  if (r === c) return true;
  const aliases = SKILL_ALIASES[r] || [];
  if (aliases.includes(c)) return true;
  const candidateAliases = SKILL_ALIASES[c] || [];
  if (candidateAliases.includes(r)) return true;
  // Conservative containment: React Native should not satisfy React.
  if (r.length >= 4 && c.includes(r) && !/(native|testing library)/.test(c)) return true;
  if (c.length >= 4 && r.includes(c) && !/(native|testing library)/.test(r)) return true;
  return false;
}

export function companyKey(company: string): string {
  return company
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|gmbh|plc|pvt|private)\b\.?/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(senior|sr|lead|principal|staff|junior|jr|ii|iii|iv)\b/g, ' ')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function titleSimilarity(a: string, b: string): number {
  const left = new Set(titleKey(a).split(' ').filter(Boolean));
  const right = new Set(titleKey(b).split(' ').filter(Boolean));
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / new Set([...left, ...right]).size;
}

export function fingerprint(source: string, sourceJobId: string): string {
  return `${source}:${sourceJobId}`.toLowerCase();
}

export function domainFromUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function isAtsDomain(domain: string | null): boolean {
  if (!domain) return false;
  return /(greenhouse\.io|lever\.co|ashbyhq\.com|workday\.com|smartrecruiters\.com|jobvite\.com|icims\.com|taleo\.net)$/.test(
    domain,
  );
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
