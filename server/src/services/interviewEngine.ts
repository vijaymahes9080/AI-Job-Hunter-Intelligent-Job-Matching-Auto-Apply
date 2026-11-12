import type {
  CandidateProfile,
  Difficulty,
  InterviewAnswerEvaluation,
  InterviewQuestion,
  InterviewSession,
  JobPosting,
} from '../../../shared/types.js';
import { clamp, normalizeSkill } from '../utils/normalize.js';

interface Template {
  category: InterviewQuestion['category'];
  difficulty: Difficulty;
  prompt: string;
  keyPoints: string[];
  outline: string;
  followUp: string;
  skill: string;
}

const DIFFICULTY_ORDER: Record<Difficulty, number> = { Beginner: 0, Intermediate: 1, Advanced: 2, Expert: 3 };

const PYTHON: Template[] = [
  {
    category: 'Python',
    difficulty: 'Beginner',
    skill: 'python',
    prompt: 'What is the difference between a list and a tuple in Python, and when would you choose each?',
    keyPoints: ['mutable', 'immutable', 'hashable', 'performance', 'dictionary keys'],
    outline: 'State mutability first, then hashability, use cases, and a concrete example such as using tuples for fixed records or dict keys.',
    followUp: 'How does mutability affect whether an object can be used as a dictionary key?',
  },
  {
    category: 'Python',
    difficulty: 'Intermediate',
    skill: 'python',
    prompt: 'Explain how Python generators work and why they help with large data processing.',
    keyPoints: ['yield', 'lazy evaluation', 'memory', 'iterator', 'state'],
    outline: 'Describe the iterator protocol, yield suspension/resumption, lazy evaluation and memory benefits, with a pipeline example.',
    followUp: 'What breaks if you iterate the same generator twice?',
  },
  {
    category: 'Python',
    difficulty: 'Advanced',
    skill: 'python',
    prompt: 'How would you diagnose and improve a slow FastAPI endpoint backed by PostgreSQL?',
    keyPoints: ['query plan', 'index', 'N+1', 'connection pool', 'profiling', 'caching', 'async'],
    outline: 'Measure first, inspect SQL and query plans, remove N+1 queries, add indexes, tune pooling, then consider caching/async.',
    followUp: 'When would caching be the wrong first fix?',
  },
];

const JAVA: Template[] = [
  {
    category: 'Java',
    difficulty: 'Beginner',
    skill: 'java',
    prompt: 'What is the difference between an interface and an abstract class in Java?',
    keyPoints: ['multiple inheritance', 'default methods', 'state', 'contract', 'constructor'],
    outline: 'Compare contract vs shared state, multiple interface implementation, constructors, and default methods.',
    followUp: 'When would an abstract class be a better design choice?',
  },
  {
    category: 'Java',
    difficulty: 'Advanced',
    skill: 'java',
    prompt: 'How do you prevent race conditions in a multithreaded Java service?',
    keyPoints: ['synchronization', 'locks', 'atomic', 'immutability', 'thread safety', 'deadlock'],
    outline: 'Discuss shared mutable state, synchronization, concurrent collections, immutability, and deadlock avoidance.',
    followUp: 'Why is immutability often safer than adding more locks?',
  },
];

const SQL: Template[] = [
  {
    category: 'SQL',
    difficulty: 'Intermediate',
    skill: 'sql',
    prompt: 'A query joining three tables is slow. Walk through how you would investigate and optimise it.',
    keyPoints: ['execution plan', 'index', 'join order', 'selectivity', 'N+1', 'cardinality', 'statistics'],
    outline: 'Start with EXPLAIN/ANALYZE, inspect indexes and row estimates, avoid functions on indexed columns, reduce scanned data.',
    followUp: 'What is the difference between a clustered and a non-clustered index?',
  },
  {
    category: 'SQL',
    difficulty: 'Advanced',
    skill: 'sql',
    prompt: 'Explain transaction isolation levels and a race condition that can occur in a job-application system.',
    keyPoints: ['isolation', 'read committed', 'repeatable read', 'phantom', 'unique constraint', 'transaction'],
    outline: 'Discuss read anomalies, race conditions during duplicate submission, and why a unique constraint plus transaction is the final guard.',
    followUp: 'Why is application-level checking alone insufficient to prevent duplicate applications?',
  },
];

const REACT: Template[] = [
  {
    category: 'Technical',
    difficulty: 'Beginner',
    skill: 'react',
    prompt: 'When does a React component re-render, and how would you reduce unnecessary renders?',
    keyPoints: ['state', 'props', 're-render', 'memoization', 'React.memo', 'useMemo', 'keys'],
    outline: 'Explain render triggers, profiling, memoization trade-offs and stable references.',
    followUp: 'Why can useMemo make performance worse if used everywhere?',
  },
  {
    category: 'Technical',
    difficulty: 'Advanced',
    skill: 'react',
    prompt: 'Design a job-search screen that handles filters, pagination and server errors without confusing the user.',
    keyPoints: ['URL state', 'debounce', 'pagination', 'loading', 'error boundary', 'accessibility', 'empty state'],
    outline: 'Discuss state ownership, URL-synced filters, race conditions in requests, cancellation, accessible feedback and recovery.',
    followUp: 'How do you prevent an older request from overwriting newer search results?',
  },
];

const JS: Template[] = [
  {
    category: 'Programming',
    difficulty: 'Intermediate',
    skill: 'javascript',
    prompt: 'Explain the JavaScript event loop with promises, timers and blocking work.',
    keyPoints: ['call stack', 'microtask', 'macrotask', 'event loop', 'promise', 'blocking'],
    outline: 'Differentiate call stack, task queue, microtask queue and starvation caused by blocking CPU work.',
    followUp: 'Why does a resolved promise callback run before setTimeout(0)?',
  },
];

const NODE: Template[] = [
  {
    category: 'Technical',
    difficulty: 'Advanced',
    skill: 'node.js',
    prompt: 'How would you design a Node.js background worker that calls external job APIs safely?',
    keyPoints: ['queue', 'retry', 'backoff', 'idempotency', 'rate limit', 'timeout', 'observability'],
    outline: 'Use a durable queue, bounded concurrency, timeouts, exponential backoff with jitter, idempotency keys, and structured logs.',
    followUp: 'How do you prevent duplicate deliveries from creating duplicate applications?',
  },
];

const SYSTEM_DESIGN: Template[] = [
  {
    category: 'System Design',
    difficulty: 'Advanced',
    skill: 'system design',
    prompt: 'Design a job discovery and application-tracking system for 100,000 candidates. Focus on data flow, storage and duplicate prevention.',
    keyPoints: ['ingestion', 'deduplication', 'queue', 'database', 'indexes', 'idempotency', 'observability'],
    outline: 'Clarify requirements, sketch ingestion adapters, canonical job identity, candidate state, duplicate constraints, scale-out and monitoring.',
    followUp: 'Where would you place a unique constraint, and how do you handle retries?',
  },
  {
    category: 'System Design',
    difficulty: 'Expert',
    skill: 'system design',
    prompt: 'Design a rate-limited interview-practice API that can evaluate answers with both deterministic and open-model evaluators.',
    keyPoints: ['rate limiting', 'queue', 'idempotency', 'fallback', 'caching', 'observability', 'privacy'],
    outline: 'Separate synchronous validation from asynchronous inference, add quotas, fallback, privacy controls and evaluation metrics.',
    followUp: 'How would you measure whether feedback is actually useful?',
  },
];

const AI_ML: Template[] = [
  {
    category: 'AI/ML',
    difficulty: 'Intermediate',
    skill: 'machine learning',
    prompt: 'How would you evaluate whether a resume-to-job matching system is useful, beyond a single accuracy number?',
    keyPoints: ['precision', 'recall', 'ranking', 'offline evaluation', 'human review', 'bias', 'feedback'],
    outline: 'Define relevance, use ranking metrics, measure downstream application/interview outcomes, inspect slices and human feedback.',
    followUp: 'What could go wrong if you optimise only for click-through on job cards?',
  },
  {
    category: 'AI/ML',
    difficulty: 'Advanced',
    skill: 'rag',
    prompt: 'Explain how a retrieval-augmented generation pipeline works and how you would reduce hallucinations.',
    keyPoints: ['retrieval', 'embedding', 'chunking', 'grounding', 'citations', 'evaluation', 'guardrails'],
    outline: 'Describe ingestion, chunking, retrieval, grounding constraints, citations, offline evaluation, and refusal/fallback behaviour.',
    followUp: 'Why is adding a larger language model not a reliable fix for hallucinated evidence?',
  },
];

const SECURITY: Template[] = [
  {
    category: 'Technical',
    difficulty: 'Advanced',
    skill: 'cybersecurity',
    prompt: 'Walk through the OWASP risks most relevant to a candidate-facing job platform and how you would mitigate them.',
    keyPoints: ['authentication', 'authorization', 'injection', 'XSS', 'CSRF', 'SSRF', 'rate limiting', 'secrets'],
    outline: 'Cover broken access control, injection, XSS/CSRF, SSRF on URL verification, credential storage, rate limiting and logging.',
    followUp: 'How would you test that one candidate cannot read another candidate’s applications?',
  },
];

const DEVOPS: Template[] = [
  {
    category: 'Technical',
    difficulty: 'Intermediate',
    skill: 'devops',
    prompt: 'What would a safe CI/CD pipeline look like for this application?',
    keyPoints: ['tests', 'build', 'migrations', 'secrets', 'staging', 'rollback', 'health check'],
    outline: 'Describe automated tests, build, migration ordering, secrets management, staging verification, progressive release and rollback.',
    followUp: 'How do you make a database migration safe to roll back?',
  },
];

const DATA: Template[] = [
  {
    category: 'AI/ML',
    difficulty: 'Intermediate',
    skill: 'data engineering',
    prompt: 'How would you design a reproducible salary analytics pipeline from job postings?',
    keyPoints: ['ingestion', 'normalization', 'currency', 'period', 'deduplication', 'data quality', 'lineage'],
    outline: 'Discuss source provenance, currency and period normalization, outlier handling, dedupe, lineage and tests.',
    followUp: 'Why is converting every currency without observed exchange-rate evidence dangerous?',
  },
];

const HR: Template[] = [
  {
    category: 'HR',
    difficulty: 'Beginner',
    skill: 'communication',
    prompt: 'Tell me about yourself and why this role is a good fit, using only evidence from your real experience.',
    keyPoints: ['current role', 'relevant skills', 'evidence', 'motivation', 'role fit', 'concise'],
    outline: 'Use a 60–90 second structure: present, relevant evidence, why this role/company, close with what you want to learn.',
    followUp: 'Which part of your background is the strongest evidence for this role?',
  },
  {
    category: 'HR',
    difficulty: 'Beginner',
    skill: 'communication',
    prompt: 'What are your salary expectations and notice period? Explain how you arrived at them.',
    keyPoints: ['range', 'research', 'flexibility', 'notice period', 'total compensation'],
    outline: 'Give a researched range, clarify fixed vs variable pay, state notice period and flexibility.',
    followUp: 'How would you respond if the offer is below your range?',
  },
  {
    category: 'HR',
    difficulty: 'Intermediate',
    skill: 'communication',
    prompt: 'Why do you want to work at this company, and what have you verified about it?',
    keyPoints: ['research', 'product', 'role', 'evidence', 'values', 'questions'],
    outline: 'Reference verified company/products/role facts, not generic praise, and connect them to your evidence.',
    followUp: 'What would you want to verify before accepting an offer?',
  },
  {
    category: 'Behavioral',
    difficulty: 'Intermediate',
    skill: 'communication',
    prompt: 'Describe a time you missed a deadline or made a mistake. What did you do next?',
    keyPoints: ['situation', 'responsibility', 'action', 'impact', 'learning', 'follow-up'],
    outline: 'Use STAR, take responsibility without blame, describe the recovery and the concrete process change.',
    followUp: 'What early-warning signal would you set up next time?',
  },
  {
    category: 'Behavioral',
    difficulty: 'Intermediate',
    skill: 'communication',
    prompt: 'Tell me about a disagreement with a teammate and how you resolved it.',
    keyPoints: ['situation', 'perspective', 'listening', 'data', 'resolution', 'outcome'],
    outline: 'Use STAR; show curiosity about the other view, evidence-based resolution, and a preserved relationship.',
    followUp: 'What would you do differently if the disagreement were with your manager?',
  },
  {
    category: 'Behavioral',
    difficulty: 'Advanced',
    skill: 'communication',
    prompt: 'Describe a project where requirements were ambiguous. How did you create clarity?',
    keyPoints: ['ambiguity', 'questions', 'assumptions', 'trade-offs', 'stakeholders', 'validation'],
    outline: 'Explain how you surfaced assumptions, wrote acceptance criteria, validated with stakeholders and managed trade-offs.',
    followUp: 'How do you decide when to stop asking questions and start building?',
  },
];

const PROJECT: Template[] = [
  {
    category: 'Project',
    difficulty: 'Intermediate',
    skill: 'project',
    prompt: 'Walk me through your most relevant project. What problem did it solve, what did you build, and what evidence shows it worked?',
    keyPoints: ['problem', 'architecture', 'trade-offs', 'testing', 'impact', 'limitations'],
    outline: 'Use a structured walkthrough: problem, constraints, design, what you personally built, measurement, and limitations.',
    followUp: 'If you rebuilt it today, what would you change and why?',
  },
];

const GENERAL_ENGINEERING: Template[] = [
  {
    category: 'Programming',
    difficulty: 'Intermediate',
    skill: 'problem solving',
    prompt: 'Given a list of job applications, how would you find duplicate applications by normalised URL and near-identical titles?',
    keyPoints: ['normalization', 'hash', 'similarity', 'index', 'complexity', 'edge cases'],
    outline: 'Canonicalise URLs, fingerprint exact duplicates, use token similarity for titles, store indexes/constraints, discuss edge cases.',
    followUp: 'How does your approach behave with tracking parameters and trailing slashes?',
  },
  {
    category: 'Technical',
    difficulty: 'Advanced',
    skill: 'system design',
    prompt: 'How would you keep AI-generated career recommendations honest and evidence-based?',
    keyPoints: ['provenance', 'grounding', 'separate facts', 'uncertainty', 'evaluation', 'human review'],
    outline: 'Separate verified facts from suggestions, cite source artifacts, label uncertainty, constrain retrieval and test for unsupported claims.',
    followUp: 'What would you log to audit a generated recommendation later?',
  },
];

const BANK: Template[] = [
  ...PYTHON,
  ...JAVA,
  ...SQL,
  ...REACT,
  ...JS,
  ...NODE,
  ...SYSTEM_DESIGN,
  ...AI_ML,
  ...SECURITY,
  ...DEVOPS,
  ...DATA,
  ...HR,
  ...PROJECT,
  ...GENERAL_ENGINEERING,
];

const SKILL_BANK_MAP: Record<string, Template[]> = {
  python: PYTHON,
  java: JAVA,
  sql: SQL,
  postgresql: SQL,
  react: REACT,
  javascript: JS,
  typescript: REACT,
  'node.js': NODE,
  'system design': SYSTEM_DESIGN,
  'machine learning': AI_ML,
  'artificial intelligence': AI_ML,
  rag: AI_ML,
  cybersecurity: SECURITY,
  devops: DEVOPS,
  docker: DEVOPS,
  kubernetes: DEVOPS,
  'data engineering': DATA,
  'data science': DATA,
};

function selectTemplates(job: JobPosting | null, targetRole: string, difficulty: Difficulty): Template[] {
  const selected: Template[] = [];
  const seen = new Set<string>();
  const add = (template: Template) => {
    if (seen.has(template.prompt)) return;
    seen.add(template.prompt);
    selected.push(template);
  };
  if (job) {
    for (const skill of job.skills) {
      const templates = SKILL_BANK_MAP[normalizeSkill(skill)];
      if (templates) for (const template of templates) if (DIFFICULTY_ORDER[template.difficulty] <= DIFFICULTY_ORDER[difficulty] + 1) add(template);
    }
  } else {
    const role = targetRole.toLowerCase();
    for (const [skill, templates] of Object.entries(SKILL_BANK_MAP)) {
      if (role.includes(skill.split(' ')[0])) for (const template of templates) add(template);
    }
  }
  for (const template of [...HR, ...PROJECT, ...GENERAL_ENGINEERING]) add(template);
  for (const template of BANK) {
    if (selected.length >= 10) break;
    if (DIFFICULTY_ORDER[template.difficulty] <= DIFFICULTY_ORDER[difficulty] + 1) add(template);
  }
  return selected.slice(0, 10);
}

function toQuestion(template: Template, index: number, job: JobPosting | null, difficulty: Difficulty): InterviewQuestion {
  const adjustedPrompt = job
    ? template.prompt
        .replace(/this application/g, `${job.company}'s ${job.title} role`)
        .replace(/a job-search screen/g, 'the job discovery workflow')
        .replace(/this role/g, `the ${job.title} role`)
    : template.prompt;
  return {
    id: `q-${index}-${normalizeSkill(template.skill).replace(/\s+/g, '-')}`,
    category: template.category,
    difficulty,
    prompt: adjustedPrompt,
    keyPoints: template.keyPoints,
    modelOutline: template.outline,
    followUp: template.followUp,
    skill: template.skill,
  };
}

export function generateInterviewSession(
  profile: CandidateProfile,
  job: JobPosting | null,
  targetRole: string,
  difficulty: Difficulty,
): InterviewSession {
  const templates = selectTemplates(job, targetRole, difficulty);
  const questions = templates.map((template, index) => toQuestion(template, index, job, difficulty));
  return {
    id: `interview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: targetRole,
    company: job?.company || null,
    difficulty,
    questions,
    answers: {},
    status: 'In Progress',
    score: null,
    confidenceAverage: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    disclaimer:
      'Questions are generated from generic engineering topics and the selected job’s published requirements. They are practice questions, not actual or confidential company interview questions.',
  };
}

const FILLERS = ['um', 'uh', 'like', 'basically', 'actually', 'you know', 'sort of', 'kind of'];

export function evaluateInterviewAnswer(question: InterviewQuestion, answer: string, confidence: number): InterviewAnswerEvaluation {
  const normalizedAnswer = ` ${answer.toLowerCase().replace(/[^a-z0-9+#. ]/g, ' ').replace(/\s+/g, ' ')} `;
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const matchedPoints: string[] = [];
  const missingPoints: string[] = [];

  for (const point of question.keyPoints) {
    const tokens = point
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((token) => token.length >= 3);
    const matched = tokens.length > 0 && tokens.some((token) => normalizedAnswer.includes(` ${token}`) || normalizedAnswer.includes(`${token} `));
    if (matched) matchedPoints.push(point);
    else missingPoints.push(point);
  }

  const technicalCorrectness =
    question.keyPoints.length === 0 ? 60 : clamp(Math.round((matchedPoints.length / question.keyPoints.length) * 100), 0, 100);

  const structureSignals = [
    /(situation|context|problem|task)/i.test(answer),
    /(action|I did|I built|I implemented|approach)/i.test(answer),
    /(result|impact|outcome|measured|improved|reduced|increased)/i.test(answer),
    /(trade.?off|because|therefore|however|constraint)/i.test(answer),
  ].filter(Boolean).length;
  const structure = clamp(30 + structureSignals * 18, 0, 100);

  const specificitySignals = [
    /\b\d+(?:\.\d+)?%?\b/.test(answer),
    /\b(?:React|Python|FastAPI|PostgreSQL|Docker|Kubernetes|SQL|Java|Redis|AWS|CI\/CD)\b/i.test(answer),
    /(for example|in my project|at my internship|I measured|the result was)/i.test(answer),
    words.length >= 60,
  ].filter(Boolean).length;
  const specificity = clamp(specificitySignals * 25, 0, 100);

  const lengthScore = words.length < 25 ? 35 : words.length < 50 ? 65 : words.length <= 450 ? 100 : 80;
  const fillerCount = FILLERS.reduce(
    (sum, filler) => sum + (normalizedAnswer.match(new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'g'))?.length || 0),
    0,
  );
  const score = clamp(
    Math.round(technicalCorrectness * 0.5 + structure * 0.2 + specificity * 0.2 + lengthScore * 0.1 - fillerCount * 2),
    0,
    100,
  );

  const suggestions: string[] = [];
  if (missingPoints.length > 0) suggestions.push(`Cover these expected concepts: ${missingPoints.slice(0, 4).join(', ')}.`);
  if (structure < 65) suggestions.push('Add an explicit situation → action → measurable result structure.');
  if (specificity < 50) suggestions.push('Use a concrete example, name the tools used, and include a measurable outcome where you have one.');
  if (words.length < 25) suggestions.push('Expand the answer with reasoning and a real example; aim for 60–180 words.');
  if (words.length > 450) suggestions.push('Tighten the answer; lead with the decision and evidence, then add detail only if asked.');
  if (fillerCount > 3) suggestions.push('Reduce filler words; pause instead of saying “um”, “like” or “basically”.');
  if (suggestions.length === 0) suggestions.push('Strong answer. Prepare one concise follow-up example that shows a trade-off.');

  return {
    score,
    technicalCorrectness,
    structure,
    specificity,
    matchedPoints,
    missingPoints,
    suggestions,
    followUp: question.followUp,
    confidence: clamp(Math.round(confidence), 1, 5),
    evaluatedAt: new Date().toISOString(),
    evaluator: 'deterministic',
  };
}

export function summarizeInterview(session: InterviewSession): {
  score: number;
  confidenceAverage: number;
  strengths: string[];
  improvements: string[];
  byCategory: Array<{ category: string; average: number; answered: number }>;
} {
  const evaluations = Object.values(session.answers).map((entry) => entry.evaluation);
  const score = evaluations.length
    ? Math.round(evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / evaluations.length)
    : 0;
  const confidenceAverage = evaluations.length
    ? Math.round((evaluations.reduce((sum, evaluation) => sum + evaluation.confidence, 0) / evaluations.length) * 10) / 10
    : 0;

  const strengths: string[] = [];
  const improvements: string[] = [];
  if (evaluations.length === 0) {
    improvements.push('Answer at least one question to generate a report.');
  } else {
    const avgTechnical = Math.round(evaluations.reduce((sum, evaluation) => sum + evaluation.technicalCorrectness, 0) / evaluations.length);
    const avgStructure = Math.round(evaluations.reduce((sum, evaluation) => sum + evaluation.structure, 0) / evaluations.length);
    const avgSpecificity = Math.round(evaluations.reduce((sum, evaluation) => sum + evaluation.specificity, 0) / evaluations.length);
    if (avgTechnical >= 70) strengths.push('Technical concept coverage is strong across the answers.');
    else improvements.push('Revise the core concepts that appear in the missing-points feedback.');
    if (avgStructure >= 70) strengths.push('Answers follow a clear, logical structure.');
    else improvements.push('Use STAR or decision → trade-off → evidence structure.');
    if (avgSpecificity >= 60) strengths.push('Answers include concrete tools and examples.');
    else improvements.push('Replace generic statements with project-specific evidence and measurable outcomes.');
    if (confidenceAverage >= 4) strengths.push('Self-rated confidence is high; validate it with a mock interview partner.');
    else improvements.push('Practice out loud and review each answer within 24 hours to build confidence.');
  }

  const byCategory = new Map<string, number[]>();
  for (const question of session.questions) {
    const answer = session.answers[question.id];
    if (!answer) continue;
    const list = byCategory.get(question.category) || [];
    list.push(answer.evaluation.score);
    byCategory.set(question.category, list);
  }

  return {
    score,
    confidenceAverage,
    strengths,
    improvements,
    byCategory: [...byCategory.entries()].map(([category, scores]) => ({
      category,
      average: Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length),
      answered: scores.length,
    })),
  };
}
