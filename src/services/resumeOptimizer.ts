import { CandidateProfile, Job, ResumeVersion } from '../types';

export function generateTailoredResumes(candidate: CandidateProfile, job: Job): ResumeVersion[] {
  const matchingSkills = job.skillsRequired.slice(0, 5).join(', ');
  const missingSkills = job.skillsRequired.filter(s => !candidate.skills.includes(s)).join(', ');

  const now = new Date().toISOString().split('T')[0];

  const v1: ResumeVersion = {
    id: `res-v1-${job.id}`,
    name: 'Version 1: ATS Keyword-Optimized',
    targetRole: job.title,
    targetCompany: job.company,
    atsScore: 98,
    highlightedKeywords: job.skillsRequired,
    diffs: [
      {
        original: 'Architected automated AI workflows and managed vector database indexes.',
        optimized: `Architected high-throughput AI workflows specializing in ${matchingSkills}. Synchronized vector database indexes to boost retrieval speed by 42%.`,
        reason: 'Injected exact ATS job keywords for high parser match score.'
      },
      {
        original: 'Built distributed Node.js microservices with Redis caching.',
        optimized: `Engineered scalable ${job.title}-focused microservices using Node.js, Python, and Redis, matching ${job.company}'s technology stack standards.`,
        reason: 'Aligned technology keywords directly with target company requirements.'
      }
    ],
    fullContent: `${candidate.name} — ATS OPTIMIZED RESUME FOR ${job.company.toUpperCase()}
Target Role: ${job.title} | ${job.location}
Email: ${candidate.email} | Phone: ${candidate.phone}

CORE COMPETENCIES & ATS KEYWORDS:
${job.skillsRequired.join(' • ')} • System Design • Semantic Search

PROFESSIONAL EXPERIENCE:
Apex AI Labs — Senior AI Software Engineer
- Led technical execution for ${job.title} initiatives, implementing ${matchingSkills}.
- Increased ATS resume-to-interview conversion rate by tailoring LLM prompts and vector similarity thresholds.
- Spearheaded cross-functional engineering sprints with Product & DevOps teams.

CloudSphere Systems — Full Stack Engineer
- Built resilient React & Node.js architectures serving high concurrent traffic.
- Optimized database indexing in PostgreSQL and Redis, reducing P99 latency by 65%.

EDUCATION & CERTIFICATIONS:
${candidate.education.map(e => `${e.degree} — ${e.institution} (${e.year})`).join('\n')}
${candidate.certifications.map(c => `${c.name} — ${c.issuer}`).join('\n')}`,
    createdAt: now
  };

  const v2: ResumeVersion = {
    id: `res-v2-${job.id}`,
    name: 'Version 2: Technical Deep-Dive Focus',
    targetRole: job.title,
    targetCompany: job.company,
    atsScore: 94,
    highlightedKeywords: ['Architecture', 'Latency', 'FastAPI', 'FAISS', ...job.skillsRequired.slice(0, 3)],
    diffs: [
      {
        original: 'Improved frontend render performance by 40%.',
        optimized: 'Engineered Web Workers & Canvas virtualization in React/TypeScript, cutting main thread blocking time from 120ms to 8ms during live LLM streaming.',
        reason: 'Added specific technical metrics and engineering terminology.'
      }
    ],
    fullContent: `${candidate.name} — TECHNICAL DEEP-DIVE RESUME
Role: ${job.title} | Focus: High Scale Systems & AI Infrastructure

TECHNICAL STACK ARCHITECTURE:
Languages & Frameworks: ${job.skillsRequired.join(', ')}
Databases & Cloud: PostgreSQL, MongoDB, Redis, Docker, AWS S3

KEY PROJECTS & ARCHITECTURAL HIGHLIGHTS:
- ${job.title} Prototype: Implemented cosine similarity search using FAISS & Sentence Transformers with sub-50ms query latency.
- LLM Pipeline Security: Enforced strict prompt validation and sanitized schema responses across microservices.

PROFESSIONAL EXPERIENCE:
Senior AI Software Engineer — Apex AI Labs
- Designed backend microservices using FastAPI & Python, handling 15,000 requests/sec.
- Automated CI/CD deployment pipelines using Docker & Kubernetes on AWS.`,
    createdAt: now
  };

  const v3: ResumeVersion = {
    id: `res-v3-${job.id}`,
    name: 'Version 3: Business Impact & Leadership',
    targetRole: job.title,
    targetCompany: job.company,
    atsScore: 91,
    highlightedKeywords: ['ROI', 'Product Growth', 'Team Leadership', 'Scale'],
    diffs: [
      {
        original: 'Mentored junior engineers and conducted code reviews.',
        optimized: 'Led cross-functional team of 6 engineers, scaling platform DAU by 220% and maintaining 99.9% uptime SLA.',
        reason: 'Framed engineering achievements in terms of business revenue and team growth.'
      }
    ],
    fullContent: `${candidate.name} — BUSINESS IMPACT & LEADERSHIP RESUME
Target Role: ${job.title} at ${job.company}

EXECUTIVE SUMMARY:
Engineering Leader with 5+ years driving high-growth tech products. Proven track record of aligning engineering roadmaps with business KPIs.

LEADERSHIP & PRODUCT IMPACT:
- Scaled user acquisition by 3x through rapid iteration of core web application features.
- Reduced cloud infrastructure operational costs by $45,000/yr by optimizing database query performance and serverless function allocation.
- Championed engineering quality, reducing customer-reported bugs by 70%.`,
    createdAt: now
  };

  return [v1, v2, v3];
}
