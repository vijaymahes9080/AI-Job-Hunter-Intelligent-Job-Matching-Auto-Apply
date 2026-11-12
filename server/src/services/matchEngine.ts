import type {
  CandidateProfile,
  JobPosting,
  MatchFactor,
  MatchResult,
  SkillEvidence,
  SkillGapResult,
  SkillGapRecommendation,
} from '../../../shared/types.js';
import { clamp, normalizeSkill, skillMatches, unique } from '../utils/normalize.js';

const CORE_SKILLS = new Set(
  [
    'python',
    'java',
    'javascript',
    'typescript',
    'react',
    'node.js',
    'sql',
    'postgresql',
    'machine learning',
    'artificial intelligence',
    'large language models',
    'system design',
    'cybersecurity',
    'data engineering',
    'data science',
    'html',
    'css',
    'fastapi',
    'django',
    'spring boot',
    'c++',
    'c#',
    'go',
    'rust',
    'aws',
    'docker',
    'kubernetes',
  ].map(normalizeSkill),
);

const RELATED_GROUPS: string[][] = [
  ['react', 'react native', 'next.js'],
  ['node.js', 'express', 'javascript', 'typescript'],
  ['postgresql', 'mysql', 'sql', 'mongodb'],
  ['aws', 'gcp', 'azure', 'cloud'],
  ['docker', 'kubernetes', 'containers'],
  ['machine learning', 'deep learning', 'artificial intelligence', 'pytorch', 'tensorflow'],
  ['large language models', 'rag', 'langchain', 'nlp'],
  ['fastapi', 'django', 'flask'],
  ['system design', 'microservices', 'distributed systems'],
  ['cybersecurity', 'security', 'penetration testing'],
  ['data engineering', 'etl', 'spark', 'airflow', 'kafka'],
  ['java', 'spring boot'],
];

const RESOURCE_MAP: Record<string, { label: string; url: string }[]> = {
  react: [{ label: 'React official documentation', url: 'https://react.dev/learn' }],
  typescript: [{ label: 'TypeScript handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html' }],
  javascript: [{ label: 'MDN JavaScript guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide' }],
  python: [{ label: 'Python tutorial', url: 'https://docs.python.org/3/tutorial/' }],
  java: [{ label: 'Java tutorials', url: 'https://dev.java/learn/' }],
  fastapi: [{ label: 'FastAPI tutorial', url: 'https://fastapi.tiangolo.com/tutorial/' }],
  django: [{ label: 'Django tutorial', url: 'https://docs.djangoproject.com/en/stable/intro/tutorial01/' }],
  'spring boot': [{ label: 'Spring Boot guides', url: 'https://spring.io/guides' }],
  postgresql: [{ label: 'PostgreSQL tutorial', url: 'https://www.postgresql.org/docs/current/tutorial.html' }],
  sql: [{ label: 'SQLBolt interactive SQL', url: 'https://sqlbolt.com/' }],
  docker: [{ label: 'Docker get started', url: 'https://docs.docker.com/get-started/' }],
  kubernetes: [{ label: 'Kubernetes tutorials', url: 'https://kubernetes.io/docs/tutorials/' }],
  aws: [{ label: 'AWS skill builder', url: 'https://skillbuilder.aws/' }],
  'machine learning': [{ label: 'scikit-learn user guide', url: 'https://scikit-learn.org/stable/user_guide.html' }],
  pytorch: [{ label: 'PyTorch tutorials', url: 'https://pytorch.org/tutorials/' }],
  tensorflow: [{ label: 'TensorFlow tutorials', url: 'https://www.tensorflow.org/tutorials' }],
  rag: [{ label: 'LangChain RAG tutorial', url: 'https://python.langchain.com/docs/tutorials/rag/' }],
  langchain: [{ label: 'LangChain documentation', url: 'https://python.langchain.com/docs/' }],
  'system design': [{ label: 'System design primer (open source)', url: 'https://github.com/donnemartin/system-design-primer' }],
  cybersecurity: [{ label: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/' }],
  'penetration testing': [{ label: 'OWASP Web Security Testing Guide', url: 'https://owasp.org/www-project-web-security-testing-guide/' }],
  'data engineering': [{ label: 'Data engineering zoomcamp (open source)', url: 'https://github.com/DataTalksClub/data-engineering-zoomcamp' }],
  spark: [{ label: 'Apache Spark documentation', url: 'https://spark.apache.org/docs/latest/' }],
  kafka: [{ label: 'Apache Kafka documentation', url: 'https://kafka.apache.org/documentation/' }],
  airflow: [{ label: 'Apache Airflow documentation', url: 'https://airflow.apache.org/docs/' }],
  'node.js': [{ label: 'Node.js learn', url: 'https://nodejs.org/en/learn' }],
  graphql: [{ label: 'GraphQL learn', url: 'https://graphql.org/learn/' }],
  'ci/cd': [{ label: 'GitHub Actions documentation', url: 'https://docs.github.com/en/actions' }],
  'rest apis': [{ label: 'MDN HTTP overview', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview' }],
};

const SKILL_DICTIONARY = [
  ...CORE_SKILLS,
  'react',
  'next.js',
  'vue',
  'angular',
  'node.js',
  'express',
  'tailwind css',
  'html',
  'css',
  'fastapi',
  'flask',
  'django',
  'spring boot',
  'postgresql',
  'mysql',
  'mongodb',
  'redis',
  'graphql',
  'rest apis',
  'docker',
  'kubernetes',
  'aws',
  'azure',
  'gcp',
  'terraform',
  'ci/cd',
  'git',
  'linux',
  'go',
  'rust',
  'c++',
  'c#',
  'ruby',
  'kotlin',
  'swift',
  'sql',
  'machine learning',
  'deep learning',
  'artificial intelligence',
  'large language models',
  'rag',
  'langchain',
  'pytorch',
  'tensorflow',
  'pandas',
  'numpy',
  'data science',
  'spark',
  'kafka',
  'airflow',
  'snowflake',
  'dbt',
  'tableau',
  'power bi',
  'cybersecurity',
  'penetration testing',
  'devops',
  'sre',
  'microservices',
  'system design',
  'nlp',
  'computer vision',
  'mlops',
  'etl',
  'data engineering',
  'salesforce',
  'android',
  'ios',
  'react native',
  'flutter',
  'embedded',
  'iot',
];

const NORMALIZED_DICTIONARY = unique(SKILL_DICTIONARY.map(normalizeSkill)).sort((a, b) => b.length - a.length);

export function extractSkillsFromText(text: string): string[] {
  if (!text) return [];
  const haystack = ` ${text.toLowerCase().replace(/[()[\]{},;/\\|]/g, ' ').replace(/\s+/g, ' ')} `;
  const found = new Set<string>();
  for (const skill of NORMALIZED_DICTIONARY) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, 'i');
    if (pattern.test(haystack)) found.add(skill);
  }
  return [...found];
}

export function candidateSkillEvidence(profile: CandidateProfile): Map<string, string[]> {
  const evidence = new Map<string, string[]>();
  const add = (skill: string, source: string) => {
    const key = normalizeSkill(skill);
    if (!key) return;
    const list = evidence.get(key) || [];
    if (!list.includes(source)) list.push(source);
    evidence.set(key, list);
  };

  for (const skill of profile.skills) add(skill, 'Listed in the candidate profile skills');
  for (const project of profile.projects) {
    for (const tech of project.technologies) add(tech, `Project “${project.title}” uses ${tech}`);
  }
  for (const exp of profile.experience) {
    for (const skill of extractSkillsFromText(`${exp.title} ${exp.description}`)) {
      add(skill, `Work experience at ${exp.company || 'employer'}: ${exp.title}`);
    }
  }
  for (const cert of profile.certifications) {
    for (const skill of extractSkillsFromText(cert.name)) add(skill, `Certification: ${cert.name}`);
  }
  for (const skill of extractSkillsFromText(profile.resumeText)) add(skill, 'Mentioned in the uploaded resume text');
  for (const skill of extractSkillsFromText(`${profile.summary} ${profile.headline}`)) add(skill, 'Mentioned in headline/summary');
  return evidence;
}

function relatedSkills(skill: string): string[] {
  const normalized = normalizeSkill(skill);
  const group = RELATED_GROUPS.find((items) => items.map(normalizeSkill).includes(normalized));
  return group ? group.map(normalizeSkill).filter((item) => item !== normalized) : [];
}

function skillImportance(skill: string, frequency: number, totalJobs: number): 'High' | 'Medium' | 'Low' {
  const normalized = normalizeSkill(skill);
  if (CORE_SKILLS.has(normalized) || frequency / Math.max(1, totalJobs) >= 0.5) return 'High';
  if (frequency >= 2 || ['docker', 'aws', 'kubernetes', 'graphql', 'linux', 'git'].includes(normalized)) return 'Medium';
  return 'Low';
}

function evaluateSkill(
  skill: string,
  evidence: Map<string, string[]>,
  frequency: number,
  totalJobs: number,
): SkillEvidence {
  const normalized = normalizeSkill(skill);
  const direct = evidence.get(normalized);
  if (direct && direct.length > 0) {
    return {
      skill,
      importance: skillImportance(skill, frequency, totalJobs),
      requiredByJobs: frequency,
      evidence: direct,
      partial: false,
    };
  }
  // Also accept alias matches (e.g. candidate "Postgres" for required "PostgreSQL").
  for (const [candidateSkill, candidateEvidence] of evidence.entries()) {
    if (skillMatches(skill, candidateSkill)) {
      return {
        skill,
        importance: skillImportance(skill, frequency, totalJobs),
        requiredByJobs: frequency,
        evidence: candidateEvidence,
        partial: false,
      };
    }
  }
  const related = relatedSkills(skill);
  for (const [candidateSkill, candidateEvidence] of evidence.entries()) {
    if (related.includes(candidateSkill)) {
      return {
        skill,
        importance: skillImportance(skill, frequency, totalJobs),
        requiredByJobs: frequency,
        evidence: [`Related evidence only: ${candidateSkill} — ${candidateEvidence[0]}`],
        partial: true,
      };
    }
  }
  return {
    skill,
    importance: skillImportance(skill, frequency, totalJobs),
    requiredByJobs: frequency,
    evidence: [],
    partial: false,
  };
}

export function estimateCandidateExperienceYears(profile: CandidateProfile): number {
  let years = 0;
  for (const item of profile.experience) {
    const duration = item.duration || '';
    const yearsMatch = duration.match(/(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)/i);
    if (yearsMatch) {
      years += Number(yearsMatch[1]);
      continue;
    }
    const dates = duration.match(/(20\d{2})\D+(?:(20\d{2})|present|current)/i);
    if (dates) {
      const start = Number(dates[1]);
      const end = dates[2] ? Number(dates[2]) : new Date().getUTCFullYear();
      years += Math.max(0, end - start);
      continue;
    }
    if (duration.trim()) years += 0.5;
  }
  return Math.min(40, years);
}

function candidateLocationScore(profile: CandidateProfile, job: JobPosting): { score: number; explanation: string } {
  if (job.workplaceType === 'Remote') {
    return { score: 100, explanation: 'The role is listed as remote.' };
  }
  const jobLocation = job.location.toLowerCase();
  const preferred = profile.preferredLocations.map((item) => item.toLowerCase());
  if (preferred.some((place) => place && (jobLocation.includes(place) || place.includes(jobLocation)))) {
    return { score: 100, explanation: `Location matches a preferred location (${job.location}).` };
  }
  if (/india|chennai|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|noida|gurugram/i.test(jobLocation)) {
    return { score: 75, explanation: 'The role is in India but not in a listed preferred city.' };
  }
  return {
    score: 45,
    explanation: profile.location
      ? `The role is in ${job.location}; candidate is in ${profile.location}. Relocation or visa considerations may apply.`
      : 'Candidate location is not set, so location fit is uncertain.',
  };
}

function salaryScore(profile: CandidateProfile, job: JobPosting): { score: number; explanation: string } | null {
  if (!job.salary?.min || !job.salary?.max) return null;
  const expected = profile.salaryExpectation;
  if (!expected?.min) return null;
  if (job.salary.currency !== expected.currency) return null;
  let jobMin = job.salary.min;
  let jobMax = job.salary.max;
  if (job.salary.period === 'month' && expected.period === 'year') {
    jobMin *= 12;
    jobMax *= 12;
  } else if (job.salary.period === 'year' && expected.period === 'month') {
    jobMin /= 12;
    jobMax /= 12;
  } else if (job.salary.period === 'hour') {
    return null;
  }
  if (expected.min <= jobMin) return { score: 100, explanation: 'The published range starts at or above the expected minimum.' };
  if (expected.min <= jobMax) return { score: 80, explanation: 'The expected minimum falls inside the published range.' };
  return { score: 40, explanation: 'The published maximum is below the stated salary expectation.' };
}

function recencyScore(job: JobPosting): { score: number; explanation: string } {
  const reference = job.postedAt || job.retrievedAt;
  const timestamp = new Date(reference).getTime();
  if (!Number.isFinite(timestamp)) return { score: 50, explanation: 'Posting date is not available.' };
  const days = Math.max(0, (Date.now() - timestamp) / 86_400_000);
  if (days <= 7) return { score: 100, explanation: 'Posted or retrieved within the last 7 days.' };
  if (days <= 30) return { score: 80, explanation: 'Posted or retrieved within the last 30 days.' };
  if (days <= 90) return { score: 60, explanation: 'Posted or retrieved 31–90 days ago.' };
  return { score: 35, explanation: 'The source record is more than 90 days old; verify it is still open.' };
}

export function evaluateJobMatch(profile: CandidateProfile, job: JobPosting): MatchResult {
  const evidence = candidateSkillEvidence(profile);
  const required = unique(job.skills || []);
  const skills = required.map((skill) => evaluateSkill(skill, evidence, 1, 1));
  const matchingSkills = skills.filter((skill) => !skill.partial && skill.evidence.length > 0);
  const partialSkills = skills.filter((skill) => skill.partial);
  const missingSkills = skills.filter((skill) => !skill.partial && skill.evidence.length === 0);
  const skillCoverage =
    required.length === 0
      ? 0
      : clamp(Math.round(((matchingSkills.length + partialSkills.length * 0.5) / required.length) * 100), 0, 100);

  const factors: MatchFactor[] = [
    {
      key: 'skills',
      label: 'Required skills coverage',
      score: skillCoverage,
      weight: 0.55,
      explanation:
        required.length === 0
          ? 'The source did not provide explicit skill requirements.'
          : `${matchingSkills.length} matched, ${partialSkills.length} partial, ${missingSkills.length} missing of ${required.length} listed skills.`,
    },
  ];

  const candidateYears = estimateCandidateExperienceYears(profile);
  if (job.experienceMin !== null) {
    let expScore = 100;
    let expNote = `JDs asks for ${job.experienceMin}${job.experienceMax ? `–${job.experienceMax}` : '+'} years; profile evidence indicates about ${candidateYears} year(s).`;
    if (candidateYears + 1 < job.experienceMin) {
      expScore = clamp(100 - (job.experienceMin - candidateYears) * 18, 20, 100);
      expNote += ' This is a gap; highlight relevant projects or internships.';
    } else if (job.experienceMax !== null && candidateYears > job.experienceMax + 3) {
      expScore = 75;
      expNote += ' The candidate may be above the stated range.';
    }
    factors.push({ key: 'experience', label: 'Experience fit', score: Math.round(expScore), weight: 0.2, explanation: expNote });
  } else {
    factors.push({
      key: 'experience',
      label: 'Experience fit',
      score: 50,
      weight: 0.05,
      explanation: 'The job source did not publish an experience range; this factor has low weight and is treated as unknown.',
    });
  }

  const location = candidateLocationScore(profile, job);
  factors.push({ key: 'location', label: 'Location fit', score: location.score, weight: 0.1, explanation: location.explanation });

  const salary = salaryScore(profile, job);
  if (salary) factors.push({ key: 'salary', label: 'Salary fit', score: salary.score, weight: 0.1, explanation: salary.explanation });

  const recency = recencyScore(job);
  factors.push({ key: 'recency', label: 'Posting freshness', score: recency.score, weight: 0.05, explanation: recency.explanation });

  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const overall = clamp(
    Math.round(factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0) / totalWeight),
    0,
    100,
  );

  const topMissing = missingSkills
    .sort((a, b) => (a.importance === b.importance ? 0 : a.importance === 'High' ? -1 : 1))
    .slice(0, 3)
    .map((skill) => skill.skill);

  const summary =
    overall >= 80
      ? `Strong evidence match. ${matchingSkills.length}/${required.length} listed skills are supported by profile or resume evidence.`
      : overall >= 60
        ? `Moderate evidence match. ${missingSkills.length} listed skill(s) are not evidenced${topMissing.length ? `, including ${topMissing.join(', ')}` : ''}.`
        : `Limited evidence match. Add resume evidence or close skill gaps${topMissing.length ? ` in ${topMissing.join(', ')}` : ''} before applying.`;

  return {
    overall,
    matchingSkills,
    missingSkills,
    partialSkills,
    factors,
    formula:
      'Weighted evidence score. Skills 55%, experience 20% (5% and marked unknown when the JD omits experience), location 10%, salary 10% only when both ranges share a currency, posting freshness 5%. Weights are re-normalised if a factor is unavailable.',
    experienceAssessment: factors.find((factor) => factor.key === 'experience')?.explanation || '',
    summary,
    targetRole: job.title,
    jobId: job.id,
    computedAt: new Date().toISOString(),
  };
}

export function aggregateSkillGap(profile: CandidateProfile, jobs: JobPosting[], targetRole: string): SkillGapResult {
  const evidence = candidateSkillEvidence(profile);
  const frequencies = new Map<string, { skill: string; count: number }>();
  for (const job of jobs) {
    for (const skill of unique(job.skills || [])) {
      const key = normalizeSkill(skill);
      const current = frequencies.get(key) || { skill, count: 0 };
      current.count += 1;
      frequencies.set(key, current);
    }
  }

  const evaluated = [...frequencies.values()].map(({ skill, count }) =>
    evaluateSkill(skill, evidence, count, jobs.length),
  );

  const matchingSkills = evaluated.filter((skill) => !skill.partial && skill.evidence.length > 0);
  const partialSkills = evaluated.filter((skill) => skill.partial);
  const missingSkills = evaluated.filter((skill) => !skill.partial && skill.evidence.length === 0);

  // Transparent weighted occurrence formula over every (job, required skill) pair.
  let totalWeight = 0;
  let missingWeight = 0;
  for (const job of jobs) {
    for (const skill of unique(job.skills || [])) {
      const found = evaluated.find((item) => normalizeSkill(item.skill) === normalizeSkill(skill));
      if (!found) continue;
      const weight = found.importance === 'High' ? 3 : found.importance === 'Medium' ? 2 : 1;
      totalWeight += weight;
      if (!found.partial && found.evidence.length === 0) missingWeight += weight;
      else if (found.partial) missingWeight += weight * 0.5;
    }
  }
  const gapPercentage = totalWeight === 0 ? 0 : Math.round((missingWeight / totalWeight) * 100);

  const highPriority = missingSkills
    .filter((skill) => skill.importance === 'High')
    .sort((a, b) => b.requiredByJobs - a.requiredByJobs)
    .map((skill) => skill.skill);

  const prioritySkills = [...highPriority, ...missingSkills.filter((s) => s.importance === 'Medium').map((s) => s.skill)];
  const recommendations: SkillGapRecommendation[] = prioritySkills.slice(0, 8).map((skill) => {
    const normalized = normalizeSkill(skill);
    const related = relatedSkills(skill);
    const frequency = frequencies.get(normalized)?.count || 1;
    const resources = RESOURCE_MAP[normalized] || [
      { label: `${skill} — official documentation search`, url: `https://www.google.com/search?q=${encodeURIComponent(`${skill} official documentation`)}` },
    ];
    return {
      skill,
      priority: CORE_SKILLS.has(normalized) || frequency >= Math.max(2, jobs.length / 2) ? 'High' : 'Medium',
      why: `Required in ${frequency} of ${jobs.length} analysed postings${related.length ? `; related evidence exists for ${related.join(', ')} but not for ${skill}` : ''}.`,
      concept: `Learn the core concepts, terminology and trade-offs of ${skill}.`,
      practice: `Build two small exercises using ${skill} and write down what you measured.`,
      project: `Add a verifiable ${skill} feature to an existing project and document the implementation in the README.`,
      resources,
    };
  });

  const existingSkills = unique([
    ...profile.skills,
    ...profile.projects.flatMap((project) => project.technologies),
    ...extractSkillsFromText(profile.resumeText),
  ]);

  return {
    targetRole,
    jobIds: jobs.map((job) => job.id),
    jobCount: jobs.length,
    existingSkills,
    matchingSkills,
    missingSkills,
    partialSkills,
    highPrioritySkills: highPriority,
    recommendations,
    gapPercentage,
    formula:
      'Each required skill in each analysed job is weighted High=3, Medium=2, Low=1. Missing skills contribute their full weight; partially demonstrated skills contribute half. Gap % = weighted missing occurrences ÷ total weighted required occurrences × 100. Importance is High for core role skills or skills requested by at least half of the selected jobs.',
    evidenceNotes: [
      'Evidence is drawn only from the persisted candidate profile, resume text, projects, certifications and experience descriptions.',
      'A related skill is marked partial, never as proven experience with the required skill.',
      'No employer requirement or candidate skill is inferred from an LLM.',
    ],
    generatedAt: new Date().toISOString(),
  };
}
