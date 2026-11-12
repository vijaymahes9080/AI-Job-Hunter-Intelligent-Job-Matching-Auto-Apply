import type {
  CandidateProfile,
  GitHubPortfolioAnalysis,
  GitHubRepoEvidence,
  JobPosting,
} from '../../../shared/types.js';
import { config } from '../config.js';
import type { Database } from '../db/index.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import { unique } from '../utils/normalize.js';
import { extractSkillsFromText } from './matchEngine.js';

interface GitHubRepoApi {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  pushed_at: string;
  updated_at: string;
  homepage: string | null;
  fork: boolean;
  archived: boolean;
  license: { spdx_id?: string } | null;
  default_branch: string;
}

async function githubFetch(path: string, accept = 'application/vnd.github+json'): Promise<Response> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'AI-Job-Hunter/2.0',
      ...(config.githubToken ? { Authorization: `Bearer ${config.githubToken}` } : {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    throw new AppError(
      429,
      'github_rate_limited',
      remaining === '0'
        ? 'GitHub API rate limit reached. Configure GITHUB_TOKEN on the server or try again later.'
        : 'GitHub temporarily refused the request. Try again shortly.',
    );
  }
  return response;
}

async function readGitHubText(path: string): Promise<string | null> {
  const response = await githubFetch(path, 'application/vnd.github.raw+json');
  if (!response.ok) return null;
  const text = await response.text();
  return text.length > 200_000 ? text.slice(0, 200_000) : text;
}

function packageDependencies(raw: string, filename: string): Array<{ name: string; evidence: string }> {
  const evidence: Array<{ name: string; evidence: string }> = [];
  const lower = raw.toLowerCase();
  const rules: Array<{ pattern: RegExp; skill: string }> = [
    { pattern: /"react"\s*:/, skill: 'React' },
    { pattern: /"next"\s*:/, skill: 'Next.js' },
    { pattern: /"typescript"\s*:/, skill: 'TypeScript' },
    { pattern: /"express"\s*:/, skill: 'Express' },
    { pattern: /"mongoose"\s*:/, skill: 'MongoDB' },
    { pattern: /"pg"\s*:|"prisma"\s*:/, skill: 'PostgreSQL' },
    { pattern: /"jest"\s*:|"vitest"\s*:/, skill: 'Testing' },
    { pattern: /"tailwindcss"\s*:/, skill: 'Tailwind CSS' },
    { pattern: /fastapi/, skill: 'FastAPI' },
    { pattern: /django/, skill: 'Django' },
    { pattern: /flask/, skill: 'Flask' },
    { pattern: /sqlalchemy|psycopg/, skill: 'PostgreSQL' },
    { pattern: /pandas/, skill: 'Pandas' },
    { pattern: /numpy/, skill: 'NumPy' },
    { pattern: /torch/, skill: 'PyTorch' },
    { pattern: /tensorflow/, skill: 'TensorFlow' },
    { pattern: /langchain/, skill: 'LangChain' },
    { pattern: /scikit-learn|sklearn/, skill: 'Machine Learning' },
  ];
  for (const rule of rules) if (rule.pattern.test(lower)) evidence.push({ name: rule.skill, evidence: `Dependency declared in ${filename}` });
  return evidence;
}

async function analyzeRepo(repo: GitHubRepoApi): Promise<GitHubRepoEvidence> {
  const [owner, name] = repo.full_name.split('/');
  const [languagesResponse, readme, rootContents, workflows] = await Promise.all([
    githubFetch(`/repos/${owner}/${name}/languages`),
    readGitHubText(`/repos/${owner}/${name}/readme`),
    githubFetch(`/repos/${owner}/${name}/contents/`),
    githubFetch(`/repos/${owner}/${name}/contents/.github/workflows`),
  ]);

  const languages = languagesResponse.ok ? ((await languagesResponse.json()) as Record<string, number>) : {};
  const root = rootContents.ok ? ((await rootContents.json()) as Array<{ name: string; type: string }>) : [];
  let hasWorkflows = false;
  if (workflows.ok) {
    const parsed = (await workflows.json().catch(() => [])) as unknown;
    hasWorkflows = Array.isArray(parsed) && parsed.length > 0;
  }

  const evidence = new Map<string, string[]>();
  const addEvidence = (technology: string, source: string) => {
    const current = evidence.get(technology) || [];
    if (!current.includes(source)) current.push(source);
    evidence.set(technology, current);
  };
  for (const language of Object.keys(languages)) addEvidence(language, 'GitHub language statistics');
  for (const topic of repo.topics || []) {
    const skills = extractSkillsFromText(topic.replace(/-/g, ' '));
    for (const skill of skills) addEvidence(skill, `Repository topic “${topic}”`);
  }
  if (repo.description) {
    for (const skill of extractSkillsFromText(repo.description)) addEvidence(skill, 'Repository description');
  }
  if (readme) {
    for (const skill of extractSkillsFromText(readme.slice(0, 30_000))) addEvidence(skill, 'README content');
  }
  const rootNames = root.map((entry) => entry.name.toLowerCase());
  if (rootNames.includes('dockerfile')) addEvidence('Docker', 'Dockerfile present in repository root');
  if (rootNames.includes('package.json')) {
    const packageJson = await readGitHubText(`/repos/${owner}/${name}/contents/package.json`);
    if (packageJson) for (const dep of packageDependencies(packageJson, 'package.json')) addEvidence(dep.name, dep.evidence);
  }
  if (rootNames.includes('requirements.txt')) {
    const requirements = await readGitHubText(`/repos/${owner}/${name}/contents/requirements.txt`);
    if (requirements) for (const dep of packageDependencies(requirements, 'requirements.txt')) addEvidence(dep.name, dep.evidence);
  }
  if (rootNames.includes('pyproject.toml')) {
    const pyproject = await readGitHubText(`/repos/${owner}/${name}/contents/pyproject.toml`);
    if (pyproject) for (const dep of packageDependencies(pyproject, 'pyproject.toml')) addEvidence(dep.name, dep.evidence);
  }
  if (rootNames.some((entry) => /docker-compose/.test(entry))) addEvidence('Docker', 'docker-compose file present');

  const hasTests = rootNames.some((entry) => /^(test|tests|__tests__|spec)$/.test(entry)) || Boolean(readme && /\b(pytest|vitest|jest|unittest|go test|cargo test)\b/i.test(readme));
  if (hasTests) addEvidence('Testing', hasTests && rootNames.some((entry) => /^(test|tests|__tests__|spec)$/.test(entry)) ? 'Test directory present' : 'README documents a test command');

  const hasReadme = Boolean(readme && readme.length > 50);
  const hasDescription = Boolean(repo.description && repo.description.length > 20);
  const hasLicense = Boolean(repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION');
  const recentlyUpdated = Date.now() - new Date(repo.pushed_at).getTime() < 180 * 86_400_000;
  const documentationScore = Math.round(
    [hasDescription, hasReadme, (readme?.length || 0) >= 500, repo.homepage, hasLicense, hasTests, hasWorkflows].filter(Boolean).length * 100 / 7,
  );

  return {
    name: repo.name,
    url: repo.html_url,
    description: repo.description,
    stars: repo.stargazers_count,
    language: repo.language,
    topics: repo.topics || [],
    updatedAt: repo.pushed_at,
    homepage: repo.homepage,
    readmeLength: readme?.length || 0,
    technologies: [...evidence.entries()].map(([technology, sources]) => ({ name: technology, evidence: sources })),
    quality: {
      hasDescription,
      hasReadme,
      hasLicense,
      hasTests,
      hasCI: hasWorkflows,
      recentlyUpdated,
      documentationScore,
    },
  };
}

export async function analyzeGitHubPortfolio(
  db: Database,
  candidateId: string,
  profile: CandidateProfile,
  username: string,
  jobs: JobPosting[],
): Promise<GitHubPortfolioAnalysis> {
  const login = username.trim().replace(/^@/, '');
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(login)) {
    throw new AppError(400, 'invalid_github_username', 'Enter a valid GitHub username (letters, numbers and single hyphens only).');
  }
  const profileResponse = await githubFetch(`/users/${login}`);
  if (profileResponse.status === 404) throw new AppError(404, 'github_user_not_found', `GitHub user “${login}” was not found.`);
  if (!profileResponse.ok) throw new AppError(502, 'github_unavailable', `GitHub returned HTTP ${profileResponse.status}.`);
  const githubProfile = (await profileResponse.json()) as {
    login: string;
    name: string | null;
    avatar_url: string;
    public_repos: number;
    html_url: string;
  };

  const reposResponse = await githubFetch(`/users/${login}/repos?per_page=100&sort=pushed&type=owner`);
  if (!reposResponse.ok) throw new AppError(502, 'github_unavailable', `GitHub repositories could not be loaded (HTTP ${reposResponse.status}).`);
  const allRepos = (await reposResponse.json()) as GitHubRepoApi[];
  const reposToAnalyze = allRepos
    .filter((repo) => !repo.fork && !repo.archived)
    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    .slice(0, 8);

  const repos: GitHubRepoEvidence[] = [];
  for (const repo of reposToAnalyze) {
    try {
      repos.push(await analyzeRepo(repo));
    } catch (error) {
      if (error instanceof AppError && error.code === 'github_rate_limited') throw error;
      logger.warn('github_repo_analysis_failed', { repo: repo.full_name, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const technologyMap = new Map<string, string[]>();
  for (const repo of repos) {
    for (const technology of repo.technologies) {
      const evidence = technologyMap.get(technology.name) || [];
      const summary = `${repo.name}: ${technology.evidence[0]}`;
      if (!evidence.includes(summary)) evidence.push(summary);
      technologyMap.set(technology.name, evidence);
    }
  }
  const technologyCoverage = [...technologyMap.entries()]
    .map(([skill, evidence]) => ({ skill, evidence: evidence.slice(0, 4) }))
    .sort((a, b) => b.evidence.length - a.evidence.length);

  const selectedJobs = jobs.slice(0, 8);
  const matches = selectedJobs.map((job) => {
    const matched: Array<{ skill: string; evidence: string[] }> = [];
    const missing: string[] = [];
    for (const skill of unique(job.skills)) {
      const entry = technologyCoverage.find(
        (item) =>
          item.skill.toLowerCase() === skill.toLowerCase() ||
          item.skill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(item.skill.toLowerCase()),
      );
      if (entry) matched.push({ skill, evidence: entry.evidence });
      else missing.push(skill);
    }
    return {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      coverage: job.skills.length ? Math.round((matched.length / job.skills.length) * 100) : 0,
      matched,
      missing,
    };
  });

  const requestedSkills = unique(selectedJobs.flatMap((job) => job.skills));
  const missingPortfolioEvidence = requestedSkills.filter(
    (skill) => !technologyCoverage.some((item) => item.skill.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(item.skill.toLowerCase())),
  );

  const recommendations: string[] = [];
  if (repos.length === 0) recommendations.push('Publish at least two repositories with real code and a README explaining the problem and evidence.');
  if (repos.some((repo) => !repo.quality.hasReadme)) recommendations.push('Add README files to repositories without one: problem, architecture, setup, tests and limitations.');
  if (repos.some((repo) => !repo.quality.hasTests)) recommendations.push('Add a test suite to the projects you list; a test folder and a documented command are verifiable evidence.');
  if (repos.some((repo) => !repo.quality.hasCI)) recommendations.push('Add a CI workflow that runs tests and type checks on each push.');
  if (repos.some((repo) => !repo.homepage)) recommendations.push('Deploy at least one project and add the demo URL to the repository homepage and README.');
  if (missingPortfolioEvidence.length > 0) {
    recommendations.push(
      `Build evidence for ${missingPortfolioEvidence.slice(0, 4).join(', ')}. Add only genuine implementations; do not list a technology based on a tutorial or generated stub.`,
    );
  }
  if (recommendations.length === 0) recommendations.push('Portfolio coverage is strong. Focus on README clarity, tests and a short architecture note for your top project.');

  const result: GitHubPortfolioAnalysis = {
    username: githubProfile.login,
    profile: {
      name: githubProfile.name,
      avatarUrl: githubProfile.avatar_url,
      publicRepos: githubProfile.public_repos,
      htmlUrl: githubProfile.html_url,
    },
    repos,
    matches,
    technologyCoverage,
    missingPortfolioEvidence,
    recommendations,
    analyzedAt: new Date().toISOString(),
    limitations: [
      'Only public repositories are accessed. Private repositories are never read without explicit OAuth authorisation, which is not enabled in this build.',
      'Technology detection is based on language statistics, topics, README text, root manifests, Dockerfiles and workflow files. Absence of evidence is not proof of absence.',
      'Stars and commit dates are indicators, not measures of engineer quality.',
      `Analysed the ${reposToAnalyze.length} most recently updated non-fork repositories to respect GitHub API rate limits.`,
    ],
  };

  await db.query(
    'INSERT INTO github_analyses (id, candidate_id, username, job_ids, result, analyzed_at) VALUES ($1,$2,$3,$4,$5,$6)',
    [
      `gh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      candidateId,
      result.username,
      JSON.stringify(selectedJobs.map((job) => job.id)),
      JSON.stringify(result),
      result.analyzedAt,
    ],
  );
  return result;
}
