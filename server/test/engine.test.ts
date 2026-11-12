import { describe, expect, it } from 'vitest';
import type { CandidateProfile, JobPosting } from '../../shared/types.js';
import { aggregateSkillGap, evaluateJobMatch, extractSkillsFromText } from '../src/services/matchEngine.js';
import { analyzeJobAuthenticity } from '../src/services/authenticity.js';
import { evaluateInterviewAnswer, generateInterviewSession } from '../src/services/interviewEngine.js';
import { annualize, classifyDeadline, extractDeadlineFromText, parseSalaryText } from '../src/utils/dates.js';
import { normalizeSkill, normalizeUrl, titleSimilarity } from '../src/utils/normalize.js';
import { analyzeResume } from '../src/services/resume.js';

function profile(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    name: 'Test Candidate',
    email: 'test@example.com',
    phone: '',
    location: 'Chennai',
    headline: 'Full Stack Developer',
    summary: 'Builds web applications with React, TypeScript, FastAPI and PostgreSQL.',
    skills: ['React', 'TypeScript', 'FastAPI', 'PostgreSQL'],
    experience: [
      {
        id: 'e1',
        title: 'Software Engineering Intern',
        company: 'Example',
        duration: 'Jan 2025 - Jun 2025',
        description: 'Built React dashboards and FastAPI endpoints with PostgreSQL and Docker.',
      },
    ],
    education: [{ id: 'ed1', degree: 'B.E. CSE', institution: 'Example College', year: '2025' }],
    projects: [
      {
        id: 'p1',
        title: 'Tracker',
        description: 'Job application tracker',
        technologies: ['React', 'FastAPI', 'PostgreSQL'],
      },
    ],
    certifications: [],
    preferredRoles: ['Full Stack Developer'],
    preferredLocations: ['Chennai', 'Remote India'],
    workplacePreferences: ['Remote', 'Hybrid', 'On-site'],
    salaryExpectation: { min: 600000, currency: 'INR', period: 'year' },
    noticePeriodDays: 30,
    resumeText: 'Experience\nBuilt React dashboards and FastAPI endpoints with PostgreSQL and Docker.\nSkills\nReact TypeScript FastAPI PostgreSQL',
    resumeFileName: 'resume.txt',
    resumeUpdatedAt: new Date().toISOString(),
    githubUsername: null,
    linkedinUrl: null,
    portfolioUrl: null,
    ...overrides,
  };
}

function job(overrides: Partial<JobPosting> = {}): JobPosting {
  const now = new Date().toISOString();
  return {
    id: 'job-1',
    title: 'Full Stack Developer',
    company: 'Example Technologies',
    companyDomain: 'example.com',
    location: 'Chennai',
    workplaceType: 'Hybrid',
    employmentType: 'Full-time',
    experienceMin: 1,
    experienceMax: 3,
    salary: { min: 900000, max: 1400000, currency: 'INR', period: 'year', source: 'published', rawText: '₹9–14 LPA' },
    skills: ['React', 'TypeScript', 'PostgreSQL', 'Docker', 'GraphQL'],
    description:
      'We are hiring a full-stack developer. Salary ₹9-14 LPA. Apply by 2026-12-31. Build APIs with Python and React. This is a substantive description of the role, responsibilities and requirements for the candidate.',
    applyUrl: 'https://boards.greenhouse.io/example/jobs/1',
    normalizedApplyUrl: 'https://boards.greenhouse.io/example/jobs/1',
    source: 'greenhouse',
    sourceJobId: '1',
    sourceName: 'Greenhouse · Example',
    retrievedAt: now,
    postedAt: now,
    deadline: classifyDeadline('2026-12-31', 'extracted', 'Apply by 2026-12-31'),
    fingerprint: 'greenhouse:1',
    ...overrides,
  };
}

describe('normalisation and dates', () => {
  it('normalises URLs without tracking parameters', () => {
    expect(normalizeUrl('https://www.Example.com/jobs/1/?utm_source=x&b=2&a=1#apply')).toBe(
      'https://example.com/jobs/1?a=1&b=2',
    );
  });

  it('detects title similarity conservatively', () => {
    expect(titleSimilarity('Senior Software Engineer', 'Software Engineer II')).toBe(1);
    expect(titleSimilarity('Frontend Engineer', 'Backend Engineer')).toBeGreaterThan(0);
    expect(titleSimilarity('Data Engineer', 'Payroll Manager')).toBe(0);
  });

  it('normalises known skill aliases', () => {
    expect(normalizeSkill('ReactJS')).toBe('react');
    expect(normalizeSkill('NodeJS')).toBe('node.js');
  });

  it('parses salary text with currency and period', () => {
    const parsed = parseSalaryText('$3.5k–$5k/month');
    expect(parsed).toMatchObject({ min: 3500, max: 5000, currency: 'USD', period: 'month', source: 'published' });
    expect(annualize(5000, 'month')).toBe(60000);
    expect(parseSalaryText('12-18 LPA')).toMatchObject({ min: 1200000, max: 1800000, currency: 'INR', period: 'year' });
    expect(parseSalaryText('competitive salary')).toBeNull();
  });

  it('extracts explicit deadlines and classifies passed dates', () => {
    expect(extractDeadlineFromText('Applications close on 31 December 2026.')).toMatchObject({
      date: '2026-12-31',
      confidence: 'extracted',
    });
    const passed = classifyDeadline('2020-01-01', 'verified');
    expect(passed.status).toBe('Deadline Passed');
    expect(passed.daysRemaining).toBeLessThan(0);
  });
});

describe('evidence-based matching', () => {
  it('does not claim a missing skill as present', () => {
    const result = evaluateJobMatch(profile(), job());
    expect(result.overall).toBeGreaterThan(0);
    expect(result.matchingSkills.map((skill) => skill.skill)).toContain('React');
    expect(result.missingSkills.map((skill) => skill.skill)).toContain('GraphQL');
    expect(result.formula).toContain('Weighted evidence score');
  });

  it('marks related skills as partial rather than matched', () => {
    // Docker is evidenced in the profile's experience; Kubernetes is related but
    // never claimed directly by the candidate.
    const result = evaluateJobMatch(profile(), job({ skills: ['Kubernetes'] }));
    expect(result.partialSkills.map((skill) => skill.skill)).toContain('Kubernetes');
    expect(result.matchingSkills).toHaveLength(0);
  });

  it('computes a transparent weighted gap report', () => {
    const gap = aggregateSkillGap(profile(), [job(), job({ id: 'job-2', sourceJobId: '2' })], 'Full Stack Developer');
    expect(gap.gapPercentage).toBeGreaterThan(0);
    expect(gap.gapPercentage).toBeLessThanOrEqual(100);
    expect(gap.missingSkills.map((skill) => skill.skill)).toContain('GraphQL');
    expect(gap.recommendations.length).toBeGreaterThan(0);
    expect(gap.formula).toContain('weighted');
  });

  it('extracts skills from text with boundaries', () => {
    expect(extractSkillsFromText('We use React, Node.js and PostgreSQL.')).toEqual(
      expect.arrayContaining(['react', 'node.js', 'postgresql']),
    );
  });
});

describe('job authenticity', () => {
  it('flags payment requests and short descriptions', () => {
    const result = analyzeJobAuthenticity(
      job({
        description: 'Pay a registration fee by WhatsApp. Send your bank account and OTP.',
        applyUrl: 'http://bit.ly/abc',
        companyDomain: null,
        skills: [],
      }),
    );
    expect(['Suspicious', 'High Risk']).toContain(result.classification);
    expect(result.indicators.some((indicator) => indicator.code === 'payment_request')).toBe(true);
    expect(result.disclaimer).toContain('not a determination');
  });

  it('keeps a public ATS record in the low-risk indicator band', () => {
    const result = analyzeJobAuthenticity(job({ companyDomain: null }), { duplicateCount: 0 });
    expect(result.riskScore).toBeLessThanOrEqual(45);
  });
});

describe('interview and resume engines', () => {
  it('generates evidence-labelled practice questions and evaluates structure', () => {
    const session = generateInterviewSession(profile(), job(), 'Full Stack Developer', 'Intermediate');
    expect(session.questions.length).toBeGreaterThanOrEqual(8);
    const question = session.questions[0];
    const evaluation = evaluateInterviewAnswer(
      question,
      'In my project I built a React dashboard with FastAPI and PostgreSQL. The result reduced load time by 30%. I chose this approach because of the trade-off between latency and complexity.',
      4,
    );
    expect(evaluation.score).toBeGreaterThan(20);
    expect(evaluation.evaluator).toBe('deterministic');
    expect(session.disclaimer).toContain('not actual');
  });

  it('analyses resume structure without inventing keywords', () => {
    const analysis = analyzeResume(profile(), profile().resumeText, job());
    expect(analysis.score).toBeGreaterThan(0);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(analysis.matchedKeywords.map((item) => item.keyword)).toContain('React');
    expect(analysis.missingKeywords).toContain('GraphQL');
    expect(analysis.disclaimer).toContain('not a simulation');
  });
});
