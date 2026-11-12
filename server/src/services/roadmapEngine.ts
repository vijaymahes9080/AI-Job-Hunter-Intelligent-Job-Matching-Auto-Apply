import type {
  CareerRoadmap,
  RoadmapMilestone,
  RoadmapStage,
  SkillGapResult,
} from '../../../shared/types.js';
import { normalizeSkill } from '../utils/normalize.js';

const CERTIFICATIONS: Record<string, { name: string; reason: string }[]> = {
  aws: [{ name: 'AWS Certified Cloud Practitioner (optional)', reason: 'Validates foundational cloud vocabulary; use free official study material first.' }],
  kubernetes: [{ name: 'Certified Kubernetes Administrator (optional)', reason: 'Hands-on validation of Kubernetes operations; expensive, only pursue if target roles require it.' }],
  cybersecurity: [{ name: 'CompTIA Security+ or eJPT (optional)', reason: 'Entry-level validation of security fundamentals; free labs and official objectives can guide study.' }],
  'machine learning': [{ name: 'freeCodeCamp Machine Learning with Python (free)', reason: 'Free, project-based reinforcement of ML fundamentals.' }],
  data: [{ name: 'freeCodeCamp Data Analysis with Python (free)', reason: 'Free practical certification covering pandas, NumPy and analysis workflows.' }],
  python: [{ name: 'PCEP – Certified Entry-Level Python Programmer (optional)', reason: 'A structured external check of Python fundamentals.' }],
  java: [{ name: 'Oracle Java SE certification (optional)', reason: 'Structured validation of Java language knowledge.' }],
  react: [{ name: 'freeCodeCamp Front End Development Libraries (free)', reason: 'Free project-based practice with React and state management.' }],
  'data engineering': [{ name: 'Data Engineering Zoomcamp (free, open source)', reason: 'Open-source curriculum covering SQL, Docker, orchestration and analytics engineering.' }],
  devops: [{ name: 'freeCodeCamp DevOps learning path (free)', reason: 'Free practical coverage of Linux, CI/CD and containers.' }],
};

function certificationsFor(skills: string[]): Array<{ name: string; reason: string }> {
  const seen = new Set<string>();
  const values: Array<{ name: string; reason: string }> = [];
  for (const skill of skills) {
    const normalized = normalizeSkill(skill);
    const key = normalized.includes('data engineering')
      ? 'data engineering'
      : normalized.includes('machine')
        ? 'machine learning'
        : normalized.includes('cyber')
          ? 'cybersecurity'
          : normalized;
    for (const cert of CERTIFICATIONS[key] || []) {
      if (seen.has(cert.name)) continue;
      seen.add(cert.name);
      values.push(cert);
    }
  }
  return values.slice(0, 3);
}

export function generateRoadmap(
  targetRole: string,
  gap: SkillGapResult,
  options: { weeklyHours: number; experienceLevel: 'student' | 'entry' | 'mid' | 'senior' },
): CareerRoadmap {
  const now = new Date().toISOString();
  const topSkills = [...gap.missingSkills]
    .sort((a, b) => (b.importance === a.importance ? b.requiredByJobs - a.requiredByJobs : b.importance === 'High' ? 1 : -1))
    .slice(0, 5)
    .map((skill) => skill.skill);
  const focus = topSkills.length > 0 ? topSkills : gap.matchingSkills.slice(0, 3).map((skill) => skill.skill);
  const weeklyHours = Math.max(2, Math.min(40, options.weeklyHours));
  const paceLabel = weeklyHours >= 15 ? 'intensive' : weeklyHours >= 8 ? 'steady' : 'part-time';
  const baseWeeks = options.experienceLevel === 'senior' ? 1 : 2;
  const projectName = `${targetRole} evidence project`;
  const capstone = {
    title: projectName,
    description:
      `Build one deployable project that demonstrates ${focus.slice(0, 4).join(', ') || 'the target role skills'}. ` +
      'Choose a problem you can explain honestly. Document the architecture, trade-offs, setup, tests and a live/demo link if available.',
    acceptance:
      'Repository has a README with problem statement, architecture diagram, setup instructions, tests, and a section listing which job requirements each feature addresses. Every technology claim must be traceable to code.',
  };
  const certifications = certificationsFor(focus);

  const stages: RoadmapStage[] = [
    {
      key: 'assessment',
      order: 1,
      title: 'Current skill assessment',
      weeks: 1,
      objectives: ['Establish an honest baseline of demonstrated skills.', 'Separate evidence from confidence.'],
      activities: [
        `Review the persisted skill-gap report (${gap.gapPercentage}% weighted gap) and verify every evidence note.`,
        'List projects, internships and coursework with links or repository paths.',
        'Mark skills as demonstrated, partial or missing without inflating experience.',
      ],
      project: null,
      certification: null,
      assessment: 'Write a one-page baseline: for each target-role skill, cite a file, project or task that proves it — or mark it missing.',
    },
    {
      key: 'missing-skills',
      order: 2,
      title: 'Missing skill identification',
      weeks: 1,
      objectives: ['Turn the gap report into a prioritized, measurable list.'],
      activities: [
        `Validate the highest-priority gaps: ${focus.slice(0, 4).join(', ') || 'no critical gaps detected'}.`,
        'Read 2–3 real job descriptions and note how each skill is used, not just named.',
        'Remove skills that are not required by your chosen target roles.',
      ],
      project: null,
      certification: null,
      assessment: 'Produce a gap table with: skill, why it matters, evidence needed, target completion date.',
    },
    {
      key: 'learning-priorities',
      order: 3,
      title: 'Learning priorities',
      weeks: 1,
      objectives: ['Sequence learning by role impact and dependency, not by hype.'],
      activities: [
        'Rank gaps by frequency in target postings and dependency between skills.',
        `Choose one primary track and at most one secondary track. Weekly time: ${weeklyHours} hours (${paceLabel} pace).`,
        'Define a weekly study block that fits your real schedule.',
      ],
      project: null,
      certification: null,
      assessment: 'Commit to a 4-week priority order with one deliverable per week.',
    },
    {
      key: 'concept-learning',
      order: 4,
      title: 'Concept learning',
      weeks: baseWeeks + 1,
      objectives: [`Build working knowledge of ${focus.slice(0, 3).join(', ') || 'the role fundamentals'}.`],
      activities: [
        'Use official documentation and one structured open-source curriculum per skill.',
        'Take notes as short explanations, diagrams and runnable snippets — not copied text.',
        'Explain each concept out loud in 2 minutes; record gaps.',
      ],
      project: null,
      certification: certifications.length > 0 ? certifications[0] : null,
      assessment: 'Pass a self-written quiz and explain the top 10 concepts without notes.',
    },
    {
      key: 'practical-implementation',
      order: 5,
      title: 'Practical implementation',
      weeks: baseWeeks,
      objectives: ['Convert concepts into tested, runnable code.'],
      activities: [
        `Complete small exercises for ${focus.slice(0, 3).join(', ') || 'the target skills'}.`,
        'Add tests, error handling and a short README to every exercise.',
        'Use Git commits that show incremental progress; do not fabricate metrics.',
      ],
      project: null,
      certification: null,
      assessment: 'Two working exercises with tests and documented trade-offs.',
    },
    {
      key: 'portfolio-project',
      order: 6,
      title: 'Portfolio project',
      weeks: baseWeeks + 1,
      objectives: ['Produce verifiable portfolio evidence that maps to target requirements.'],
      activities: [
        capstone.description,
        'Implement authentication/authorisation, input validation and error handling.',
        'Add tests and a CI workflow. Measure only what you can reproduce.',
        'Deploy to a free/open-source-friendly host or provide a reproducible local demo.',
      ],
      project: capstone,
      certification: null,
      assessment: capstone.acceptance,
    },
    {
      key: 'assessment',
      order: 7,
      title: 'Assessment',
      weeks: 1,
      objectives: ['Validate readiness with evidence, not self-rating.'],
      activities: [
        'Run the platform ATS Resume Studio against two real target job descriptions.',
        'Run a mock interview for the target role and review the structured feedback.',
        'Ask a peer or mentor to review the capstone README and one code path.',
      ],
      project: null,
      certification: null,
      assessment: 'Score at least 70% in technical mock-interview feedback and fix every high-priority ATS issue that is factually accurate.',
    },
    {
      key: 'job-readiness',
      order: 8,
      title: 'Job readiness evaluation',
      weeks: 1,
      objectives: ['Decide whether to apply now, and with which evidence.'],
      activities: [
        'Update the candidate profile, resume text and GitHub Portfolio Matcher evidence.',
        'Select 5–10 real postings and compare match evidence; do not apply to everything.',
        'Prepare honest screening answers and verify every deadline on the employer page.',
      ],
      project: null,
      certification: certifications[1] || null,
      assessment: 'Produce a readiness scorecard: at least 2 relevant projects, a reviewed resume, a mock-interview report and 5 verified target postings.',
    },
  ];

  const milestones: RoadmapMilestone[] = [];
  let week = 1;
  for (const stage of stages) {
    milestones.push({
      key: stage.key,
      week,
      title: `${stage.title} complete`,
      deliverable: stage.assessment,
      completed: false,
      completedAt: null,
    });
    week += stage.weeks;
  }

  return {
    id: `roadmap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    targetRole,
    summary:
      `A ${week - 1}-week ${paceLabel} roadmap focused on ${focus.slice(0, 3).join(', ') || 'maintaining demonstrated strengths'}. ` +
      'It is generated from the persisted skill-gap report and can be adapted to a different stack.',
    stages,
    milestones,
    progress: 0,
    createdAt: now,
    updatedAt: now,
  };
}
