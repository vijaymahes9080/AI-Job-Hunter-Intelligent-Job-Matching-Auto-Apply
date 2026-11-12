import type { AtsCheck, CandidateProfile, JobPosting, ResumeAnalysis } from '../../../shared/types.js';
import { AppError } from '../errors.js';
import { extractSkillsFromText } from './matchEngine.js';
import { skillMatches } from '../utils/normalize.js';

const ACTION_VERBS =
  /\b(built|designed|implemented|developed|led|improved|reduced|increased|automated|deployed|migrated|optimised|optimized|launched|tested|documented|analysed|analyzed|debugged|integrated|maintained)\b/i;

export async function extractResumeText(file: {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}): Promise<{ text: string; warnings: string[] }> {
  const name = file.originalname.toLowerCase();
  const warnings: string[] = [];
  let text = '';
  try {
    if (name.endsWith('.pdf') || file.mimetype === 'application/pdf') {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
      try {
        const result = await parser.getText();
        text = result.text || '';
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    } else if (name.endsWith('.docx') || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = (await import('mammoth')) as unknown as {
        extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string; messages: Array<{ message: string }> }>;
      };
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
      for (const message of result.messages.slice(0, 3)) warnings.push(message.message);
    } else if (name.endsWith('.txt') || file.mimetype === 'text/plain') {
      text = file.buffer.toString('utf8');
    } else {
      throw new AppError(400, 'unsupported_resume_type', 'Upload a PDF, DOCX or plain-text resume.');
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      400,
      'resume_parse_failed',
      `The resume could not be parsed: ${error instanceof Error ? error.message : 'unknown error'}. Try a text-based PDF or paste the text directly.`,
    );
  }
  const cleaned = text.replace(/\r/g, '').replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').trim();
  if (cleaned.length < 80) {
    throw new AppError(
      400,
      'resume_text_too_short',
      'Less than 80 characters of text were extracted. Scanned image PDFs are not supported; paste the resume text instead.',
    );
  }
  return { text: cleaned.slice(0, 50_000), warnings };
}

function findEvidence(text: string, keyword: string): string | null {
  const lower = text.toLowerCase();
  const normalized = keyword.toLowerCase();
  const index = lower.indexOf(normalized);
  if (index === -1) return null;
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + normalized.length + 60);
  return `…${text.slice(start, end).replace(/\s+/g, ' ').trim()}…`;
}

export function analyzeResume(
  profile: CandidateProfile,
  resumeText: string,
  job: JobPosting | null,
): ResumeAnalysis {
  const text = (resumeText || profile.resumeText || '').trim();
  if (!text) {
    throw new AppError(400, 'resume_text_required', 'Upload a resume or paste resume text before running the ATS analysis.');
  }
  const words = text.split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  const keywordSource = job?.skills || [];
  const matchedKeywords: Array<{ keyword: string; evidence: string }> = [];
  const missingKeywords: string[] = [];

  for (const keyword of keywordSource) {
    const evidence =
      findEvidence(text, keyword) ||
      extractSkillsFromText(text)
        .filter((skill) => skillMatches(keyword, skill))
        .map((skill) => findEvidence(text, skill))
        .find(Boolean) ||
      null;
    if (evidence) matchedKeywords.push({ keyword, evidence });
    else missingKeywords.push(keyword);
  }

  const resumeSkills = extractSkillsFromText(text);
  const additionalSkills = resumeSkills.filter(
    (skill) => !keywordSource.some((keyword) => skillMatches(keyword, skill)),
  );

  const checks: AtsCheck[] = [
    {
      key: 'contact',
      label: 'Contact details are present',
      passed: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text) || Boolean(profile.email && lower.includes(profile.email.toLowerCase())),
      weight: 10,
      evidence: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)
        ? 'An email address was found in the resume text.'
        : 'No email address was detected in the resume text.',
      suggestion: 'Add a professional email address and phone number at the top of the resume.',
    },
    {
      key: 'summary',
      label: 'Professional summary is present',
      passed: /(professional summary|summary|profile|about me)\s*[:\n]/i.test(text) || words.slice(0, 80).join(' ').length >= 220,
      weight: 10,
      evidence: /(professional summary|summary|profile|about me)\s*[:\n]/i.test(text)
        ? 'A summary/profile section heading was detected.'
        : 'No summary section heading was detected; the opening text is used for a fallback check.',
      suggestion: 'Add a 2–4 line summary that states your target role and strongest verifiable evidence.',
    },
    {
      key: 'experience',
      label: 'Experience or internship section is present',
      passed: /(experience|employment|work history|internship)\s*[:\n]/i.test(text),
      weight: 15,
      evidence: /(experience|employment|work history|internship)\s*[:\n]/i.test(text)
        ? 'An experience/internship section heading was detected.'
        : 'No experience/internship section heading was detected.',
      suggestion: 'Add an Experience or Internship section with employer, title, dates and evidence of work.',
    },
    {
      key: 'education',
      label: 'Education section is present',
      passed: /(education|academic|qualifications)\s*[:\n]/i.test(text),
      weight: 8,
      evidence: /(education|academic|qualifications)\s*[:\n]/i.test(text)
        ? 'An education section heading was detected.'
        : 'No education section heading was detected.',
      suggestion: 'Add an Education section with degree, institution and year.',
    },
    {
      key: 'skills',
      label: 'Skills section is present',
      passed: /(technical skills|skills|technologies|tech stack)\s*[:\n]/i.test(text),
      weight: 10,
      evidence: /(technical skills|skills|technologies|tech stack)\s*[:\n]/i.test(text)
        ? 'A skills/technologies section heading was detected.'
        : 'No skills section heading was detected.',
      suggestion: 'Add a concise skills section; list only technologies you can discuss and demonstrate.',
    },
    {
      key: 'projects',
      label: 'Projects or portfolio evidence is present',
      passed: /(projects?|portfolio)\s*[:\n]/i.test(text),
      weight: 10,
      evidence: /(projects?|portfolio)\s*[:\n]/i.test(text)
        ? 'A projects/portfolio section heading was detected.'
        : 'No projects/portfolio section heading was detected.',
      suggestion: 'Add 1–2 projects with the problem, your implementation, technologies and a repository link.',
    },
    {
      key: 'metrics',
      label: 'At least one measurable result is stated',
      passed: /\b\d+(?:\.\d+)?\s*(?:%|percent|ms|seconds?|minutes?|hours?|users?|requests?|records?|tests?|x)\b/i.test(text),
      weight: 12,
      evidence: /\b\d+(?:\.\d+)?\s*(?:%|percent|ms|seconds?|minutes?|hours?|users?|requests?|records?|tests?|x)\b/i.test(text)
        ? 'A quantified result was found in the resume text.'
        : 'No quantified result was found. Do not invent numbers — add one only if you can support it.',
      suggestion: 'Where genuine, quantify an outcome (latency, test coverage, users, time saved). Never fabricate metrics.',
    },
    {
      key: 'action_verbs',
      label: 'Action-oriented writing is used',
      passed: ACTION_VERBS.test(text),
      weight: 8,
      evidence: ACTION_VERBS.test(text)
        ? 'Action verbs such as built, designed or implemented were found.'
        : 'No strong action verbs were detected.',
      suggestion: 'Start bullets with action verbs and describe what you personally did.',
    },
    {
      key: 'length',
      label: 'Resume length is reasonable',
      passed: words.length >= 180 && words.length <= 1200,
      weight: 7,
      evidence: `${words.length} words were parsed.`,
      suggestion:
        words.length < 180
          ? 'The resume is very short. Add relevant projects and experience detail.'
          : words.length > 1200
            ? 'The resume is long. Tighten it to the most relevant evidence for the target role.'
            : null,
    },
  ];

  if (job) {
    const coverage = keywordSource.length === 0 ? 100 : (matchedKeywords.length / keywordSource.length) * 100;
    checks.push({
      key: 'keyword_coverage',
      label: 'Target-role keyword coverage',
      passed: coverage >= 60,
      weight: 10,
      evidence: `${matchedKeywords.length}/${keywordSource.length} published requirements have textual evidence in the resume (${Math.round(coverage)}%).`,
      suggestion:
        coverage >= 60
          ? null
          : `Add truthful evidence for relevant missing requirements: ${missingKeywords.slice(0, 5).join(', ')}.`,
    });
  }

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earnedWeight = checks.filter((check) => check.passed).reduce((sum, check) => sum + check.weight, 0);
  const score = Math.round((earnedWeight / Math.max(1, totalWeight)) * 100);
  const suggestions = checks
    .filter((check) => !check.passed && check.suggestion)
    .map((check) => check.suggestion as string);
  if (job && missingKeywords.length > 0) {
    suggestions.push(
      `Review these target requirements and add evidence only where it is true: ${missingKeywords.slice(0, 8).join(', ')}.`,
    );
  }
  if (suggestions.length === 0) suggestions.push('The resume passes the structural checks. Tailor the top third to each target role and keep every claim verifiable.');

  return {
    score,
    wordCount: words.length,
    characterCount: text.length,
    targetJobId: job?.id || null,
    targetJobTitle: job?.title || null,
    matchedKeywords,
    missingKeywords,
    additionalSkills,
    checks,
    suggestions: [...new Set(suggestions)].slice(0, 10),
    disclaimer:
      'This is a transparent rule-based ATS readiness check, not a simulation of any specific employer ATS. Keyword presence is not proof of relevance, and missing keywords indicate only textual absence from the parsed resume.',
    generatedAt: new Date().toISOString(),
  };
}
