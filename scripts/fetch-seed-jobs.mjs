/**
 * Builds the demo snapshot from public job APIs only.
 * - Greenhouse public boards (real postings, including explicitly published pay ranges)
 * - Remotive public API (real remote postings)
 * No job, salary or company field is invented. Salary values are extracted from
 * the employer's own posting text and retain the exact source snippet.
 */
import fs from 'node:fs';

const NOW = new Date().toISOString();

const BOARDS = [
  { token: 'gitlab', company: 'GitLab', domain: 'gitlab.com' },
  { token: 'elastic', company: 'Elastic', domain: 'elastic.co' },
  { token: 'mongodb', company: 'MongoDB', domain: 'mongodb.com' },
  { token: 'datadog', company: 'Datadog', domain: 'datadoghq.com' },
  { token: 'databricks', company: 'Databricks', domain: 'databricks.com' },
  { token: 'groww', company: 'Groww', domain: 'groww.in' },
  { token: 'vercel', company: 'Vercel', domain: 'vercel.com' },
  { token: 'figma', company: 'Figma', domain: 'figma.com' },
  { token: 'discord', company: 'Discord', domain: 'discord.com' },
  { token: 'stripe', company: 'Stripe', domain: 'stripe.com' },
];

const SKILLS = [
  'Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Next.js', 'FastAPI', 'Django', 'Flask',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST APIs', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
  'Terraform', 'CI/CD', 'Git', 'Linux', 'Go', 'Rust', 'C++', 'C#', 'Ruby', 'Kotlin', 'Swift', 'SQL',
  'Machine Learning', 'Deep Learning', 'Artificial Intelligence', 'Large Language Models', 'RAG', 'LangChain',
  'PyTorch', 'TensorFlow', 'Data Science', 'Spark', 'Kafka', 'Airflow', 'Snowflake', 'dbt', 'Tableau', 'Power BI',
  'Cybersecurity', 'Penetration Testing', 'Cloud Security', 'DevOps', 'SRE', 'Microservices', 'System Design',
  'HTML', 'CSS', 'Tailwind CSS', 'Vue', 'Angular', 'Express', 'Spring Boot', '.NET', 'PHP',
  'iOS', 'Android', 'React Native', 'Flutter', 'Embedded', 'IoT', 'MLOps', 'NLP', 'Computer Vision',
  'Pandas', 'NumPy', 'ETL', 'Data Engineering', 'Salesforce',
];

const TITLE_OK = /(engineer|developer|software|data|python|react|node|full.?stack|machine learning|\bml\b|\bai\b|cyber|security|devops|cloud|backend|frontend|architect|scientist|analyst|\bsre\b|platform|technical|automation|agentic)/i;
const INDIA = /india|chennai|tamil nadu|coimbatore|madurai|bengaluru|bangalore|hyderabad|pune|mumbai|gurugram|gurgaon|noida|delhi/i;
const CURRENCY_SYMBOL = { $: 'USD', '€': 'EUR', '£': 'GBP', '₹': 'INR' };

function cleanHtml(html = '') {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSalary(raw) {
  if (!raw) return null;
  const text = String(raw).replace(/\u00a0/g, ' ').trim();
  const currencySymbol = text.match(/[$€£₹]/)?.[0];
  const currencyCode = text.match(/\b(USD|INR|EUR|GBP|SGD|AED|CAD|AUD)\b/i)?.[1]?.toUpperCase();
  const currency = currencyCode || (currencySymbol ? CURRENCY_SYMBOL[currencySymbol] : null);
  if (!currency) return null;
  const lpa = text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*lpa/i);
  if (lpa) {
    return { min: Number(lpa[1]) * 100000, max: Number(lpa[2]) * 100000, currency: 'INR', period: 'year', source: 'published', rawText: text };
  }
  const range = text.match(/([$€£₹]\s?)?(\d[\d,.]*)\s?([kKmM])?\s*(?:-|–|to)\s*([$€£₹]\s?)?(\d[\d,.]*)\s?([kKmM])?/);
  if (!range) return null;
  const amount = (num, suffix) => {
    let value = Number.parseFloat(num.replace(/,/g, ''));
    if (!Number.isFinite(value)) return null;
    if (suffix?.toLowerCase() === 'k') value *= 1000;
    if (suffix?.toLowerCase() === 'm') value *= 1000000;
    return value;
  };
  const min = amount(range[2], range[3]);
  const max = amount(range[5], range[6]);
  if (!min || !max || max < min) return null;
  const period = /hour|hr|hourly/i.test(text)
    ? 'hour'
    : /month|monthly|per month|\/mo/i.test(text)
      ? 'month'
      : 'year';
  return { min, max, currency, period, source: 'description-extracted', rawText: text.slice(0, 500) };
}

function extractSalary(description) {
  const patterns = [
    /(?:salary|compensation|pay range|base pay|hourly rate|annual salary)[^.]{0,100}?([$€£₹]\s?\d[\d,.]*\s?(?:[kKmM])?\s*(?:-|–|to)\s*[$€£₹]?\s?\d[\d,.]*\s?(?:[kKmM])?[^.]{0,30})/i,
    /([$€£₹]\s?\d[\d,.]*\s?(?:[kKmM])?\s*(?:-|–|to)\s*[$€£₹]?\s?\d[\d,.]*\s?(?:[kKmM])?\s*(?:per year|per month|annually|hourly|\/hour|\/hr))/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(description);
    if (!match) continue;
    const parsed = parseSalary(match[1] || match[0]);
    if (parsed) return parsed;
  }
  return null;
}

function extractSkills(text) {
  return SKILLS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, 'i');
    return re.test(text);
  }).slice(0, 18);
}

function inferExperience(text) {
  const patterns = [/(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*\+?\s*years?/i, /(\d{1,2})\s*\+\s*years?/i, /(?:minimum|at least)\s*(?:of\s*)?(\d{1,2})\s*years?/i];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const min = Number(match[1]);
    const max = match[2] ? Number(match[2]) : null;
    if (min >= 0 && min <= 30) return { min, max: max && max <= 40 ? max : null };
  }
  return { min: null, max: null };
}

function workplace(location) {
  if (/remote|worldwide|anywhere/i.test(location)) return 'Remote';
  if (/hybrid/i.test(location)) return 'Hybrid';
  if (location.trim()) return 'On-site';
  return 'Unknown';
}

function toJob(input) {
  const description = cleanHtml(input.description || '').slice(0, 16000);
  const salary = input.salary || extractSalary(description);
  const experience = inferExperience(`${input.title} ${description.slice(0, 5000)}`);
  return {
    id: input.id,
    title: input.title.trim(),
    company: input.company,
    companyDomain: input.companyDomain || null,
    location: input.location || 'Not specified',
    workplaceType: input.workplaceType || workplace(input.location || ''),
    employmentType: /intern/i.test(input.title) ? 'Internship' : input.employmentType || 'Full-time',
    experienceMin: experience.min,
    experienceMax: experience.max,
    salary,
    skills: input.skills || extractSkills(`${input.title} ${description}`),
    description,
    applyUrl: input.applyUrl,
    normalizedApplyUrl: input.applyUrl,
    source: input.source,
    sourceJobId: input.sourceJobId,
    sourceName: input.sourceName,
    retrievedAt: NOW,
    postedAt: input.postedAt || null,
    deadline: null,
    fingerprint: `${input.source}:${input.sourceJobId}`.toLowerCase(),
  };
}

const jobs = [];
const seen = new Set();
function push(job) {
  if (!job || seen.has(job.fingerprint)) return;
  seen.add(job.fingerprint);
  jobs.push(job);
}

for (const board of BOARDS) {
  try {
    const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs?content=true`, {
      headers: { Accept: 'application/json', 'User-Agent': 'AI-Job-Hunter/2.0 (open-source job research)' },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      console.log('skip', board.token, response.status);
      continue;
    }
    const data = await response.json();
    const candidates = [];
    for (const raw of data.jobs || []) {
      if (!TITLE_OK.test(raw.title || '')) continue;
      const location = raw.location?.name || '';
      const description = cleanHtml(raw.content || raw.description || '');
      if (description.length < 200) continue;
      const salary = extractSalary(description);
      const indiaOrRemote = INDIA.test(location) || /remote|worldwide|anywhere/i.test(location);
      candidates.push({ raw, location, description, salary, indiaOrRemote });
    }
    // Keep a representative set of India/remote roles, plus real salary-bearing
    // postings so Salary Intelligence has explicit source evidence.
    const selected = [];
    for (const candidate of candidates.filter((item) => item.indiaOrRemote).slice(0, 4)) selected.push(candidate);
    for (const candidate of candidates.filter((item) => item.salary).slice(0, board.token === 'vercel' ? 14 : 6)) {
      if (!selected.includes(candidate)) selected.push(candidate);
    }
    for (const candidate of selected.slice(0, 18)) {
      const raw = candidate.raw;
      push(
        toJob({
          id: `gh-${board.token}-${raw.id}`,
          title: raw.title,
          company: board.company,
          companyDomain: board.domain,
          location: candidate.location || 'Not specified',
          workplaceType: workplace(candidate.location),
          employmentType: /intern/i.test(raw.title) ? 'Internship' : 'Full-time',
          description: candidate.description,
          salary: candidate.salary,
          applyUrl: raw.absolute_url,
          source: 'greenhouse',
          sourceJobId: String(raw.id),
          sourceName: `Greenhouse · ${board.company}`,
          postedAt: raw.updated_at ? new Date(raw.updated_at).toISOString() : null,
        }),
      );
    }
    console.log(board.token, 'candidates', candidates.length, 'selected', selected.length);
  } catch (error) {
    console.log('error', board.token, error.message);
  }
}

try {
  const response = await fetch('https://remotive.com/api/remote-jobs?limit=100', {
    headers: { Accept: 'application/json', 'User-Agent': 'AI-Job-Hunter/2.0 (open-source job research)' },
    signal: AbortSignal.timeout(20000),
  });
  if (response.ok) {
    const data = await response.json();
    for (const raw of data.jobs || []) {
      if (!TITLE_OK.test(raw.title || '')) continue;
      const salary = raw.salary ? parseSalary(raw.salary) : null;
      push(
        toJob({
          id: `remotive-${raw.id}`,
          title: raw.title,
          company: raw.company_name,
          companyDomain: null,
          location: raw.candidate_required_location || 'Remote',
          workplaceType: 'Remote',
          employmentType: /intern/i.test(raw.job_type || '') ? 'Internship' : /contract/i.test(raw.job_type || '') ? 'Contract' : 'Full-time',
          description: raw.description || '',
          salary,
          skills: (raw.tags || []).slice(0, 18),
          applyUrl: raw.url,
          source: 'remotive',
          sourceJobId: String(raw.id),
          sourceName: 'Remotive',
          postedAt: raw.publication_date ? new Date(raw.publication_date).toISOString() : null,
        }),
      );
    }
    console.log('remotive jobs', (data.jobs || []).length);
  }
} catch (error) {
  console.log('remotive error', error.message);
}

jobs.sort((a, b) => {
  const salaryRank = Number(Boolean(b.salary)) - Number(Boolean(a.salary));
  if (salaryRank !== 0) return salaryRank;
  return b.skills.length - a.skills.length;
});

fs.writeFileSync(
  'server/src/seed/jobs-snapshot.json',
  JSON.stringify(
    {
      retrievedAt: NOW,
      source: 'Greenhouse public employer boards + Remotive public API',
      note: 'Real public postings. Salary values appear only when explicitly published in the employer posting.',
      jobs,
    },
    null,
    2,
  ),
);

console.log('wrote', jobs.length, 'jobs; with salary', jobs.filter((job) => job.salary).length);
console.log(
  jobs
    .filter((job) => job.salary)
    .map((job) => `${job.title} | ${job.company} | ${job.location} | ${job.salary.currency} ${job.salary.min}-${job.salary.max}/${job.salary.period}`)
    .join('\n'),
);
