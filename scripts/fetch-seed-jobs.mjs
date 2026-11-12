import fs from 'node:fs';
import crypto from 'node:crypto';

const strip = (html = '') =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const SKILLS = [
  'Python','Java','JavaScript','TypeScript','React','Node.js','Next.js','FastAPI','Django','Flask',
  'PostgreSQL','MySQL','MongoDB','Redis','GraphQL','REST','Docker','Kubernetes','AWS','Azure','GCP',
  'Terraform','CI/CD','Git','Linux','Go','Rust','C++','C#','Ruby','Rails','Kotlin','Swift','SQL',
  'Machine Learning','Deep Learning','AI','LLM','RAG','LangChain','PyTorch','TensorFlow','scikit-learn',
  'Data Science','Spark','Kafka','Airflow','Snowflake','dbt','Tableau','Power BI','Cybersecurity',
  'Security','Penetration Testing','SIEM','Cloud Security','DevOps','SRE','Agile','Microservices',
  'System Design','HTML','CSS','Tailwind CSS','Vue','Angular','Express','Spring Boot','.NET','PHP',
  'iOS','Android','React Native','Flutter','Embedded','IoT','Arduino','Raspberry Pi','MLOps','NLP',
  'Computer Vision','OpenAI','Pandas','NumPy','ETL','Data Engineering','Analytics','Salesforce'
];

const titleOk = /(engineer|developer|software|data|python|react|node|full.?stack|machine learning|ml|ai\b|cyber|security|devops|cloud|backend|frontend|architect|scientist|analyst|sre|platform|technical|automation|agentic)/i;

const boards = [
  ['groww', 'Groww'],
  ['elastic', 'Elastic'],
  ['gitlab', 'GitLab'],
  ['stripe', 'Stripe'],
  ['vercel', 'Vercel'],
  ['figma', 'Figma'],
  ['discord', 'Discord'],
  ['mongodb', 'MongoDB'],
  ['datadog', 'Datadog'],
  ['databricks', 'Databricks'],
];

const raw = [];
for (const [board, company] of boards) {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.log('skip', board, res.status);
      continue;
    }
    const data = await res.json();
    for (const j of data.jobs || []) {
      const loc = j.location?.name || '';
      if (!titleOk.test(j.title || '')) continue;
      const india = /india|bengaluru|bangalore|hyderabad|chennai|pune|mumbai|gurugram|gurgaon|noida/i.test(loc);
      const remote = /remote/i.test(loc);
      if (!india && !remote) continue;
      const desc = strip(j.content || j.description || '');
      if (desc.length < 120) continue;
      const skills = SKILLS.filter((s) => {
        const re = new RegExp(`(^|[^a-z0-9+#.])${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9+#.]|$)`, 'i');
        return re.test(`${j.title} ${desc}`);
      }).slice(0, 18);
      const id = `gh-${board}-${j.id}`;
      raw.push({
        id,
        title: j.title.trim(),
        company,
        companyDomain: null,
        location: loc || 'Remote',
        workplaceType: india ? (/remote|hybrid/i.test(loc) ? (/(hybrid)/i.test(loc) ? 'Hybrid' : 'Remote') : 'On-site') : 'Remote',
        employmentType: /intern/i.test(j.title) ? 'Internship' : 'Full-time',
        experienceMin: null,
        experienceMax: null,
        salary: null,
        skills,
        description: desc.slice(0, 12000),
        applyUrl: j.absolute_url,
        normalizedApplyUrl: j.absolute_url,
        source: 'greenhouse',
        sourceJobId: String(j.id),
        sourceName: `Greenhouse · ${company}`,
        retrievedAt: new Date().toISOString(),
        postedAt: j.updated_at ? new Date(j.updated_at).toISOString() : null,
        deadline: null,
        fingerprint: crypto.createHash('sha256').update(`greenhouse|${board}|${j.id}`).digest('hex'),
        _india: india,
      });
    }
  } catch (e) {
    console.log('error', board, e.message);
  }
}

// Add Remotive snapshot data for remote/international coverage.
try {
  const remotive = JSON.parse(fs.readFileSync('server/src/seed/jobs-snapshot.json', 'utf8'));
  for (const j of remotive.jobs || []) raw.push({ ...j, sourceName: 'Remotive', _india: false });
} catch {}

const seen = new Set();
const deduped = [];
for (const j of raw) {
  if (seen.has(j.fingerprint)) continue;
  seen.add(j.fingerprint);
  delete j._india;
  deduped.push(j);
}
deduped.sort((a, b) => b.skills.length - a.skills.length);
const selected = deduped.slice(0, 36);
fs.writeFileSync(
  'server/src/seed/jobs-snapshot.json',
  JSON.stringify(
    { retrievedAt: new Date().toISOString(), source: 'Greenhouse public job boards + Remotive public API', jobs: selected },
    null,
    2,
  ),
);
console.log('wrote', selected.length);
console.log(selected.map((j) => `${j.title} | ${j.company} | ${j.location}`).join('\n'));
