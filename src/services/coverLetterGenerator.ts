import { CandidateProfile, Job, CoverLetter, CoverLetterTone } from '../types';

export function generateCoverLetter(
  candidate: CandidateProfile, 
  job: Job, 
  tone: CoverLetterTone = 'Professional'
): CoverLetter {
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const topSkills = candidate.skills.slice(0, 4).join(', ');

  let intro = '';
  let body = '';
  let closing = '';

  switch (tone) {
    case 'Startup':
      intro = `Dear ${job.company} Hiring Team,\n\nI am thrilled to apply for the ${job.title} position. As someone who thrives in high-velocity startup environments, I’ve spent the last several years building scalable web tools and integrating cutting-edge AI capabilities.`;
      body = `What excites me most about ${job.company} is your vision in the tech space. With my background in ${topSkills}, I can step in from Day 1 to ship impactful code, optimize frontend user experience, and collaborate closely with your product squad.`;
      closing = `I’d love to grab a virtual coffee or join a quick call to chat about how my startup hustle and technical skills match ${job.company}’s goals!\n\nBest regards,\n${candidate.name}`;
      break;

    case 'Friendly':
      intro = `Hi ${job.company} Team!\n\nI came across the ${job.title} opening on ${job.sourcePortal} and immediately knew I had to reach out. Your work in tech is super inspiring!`;
      body = `I've been working with ${topSkills} for over 5 years. In my current role at Apex AI Labs, I love building intuitive interfaces and connecting smart backend APIs. I think my passion for great UX and robust engineering would fit right in with your team culture.`;
      closing = `Looking forward to the possibility of connecting soon!\n\nWarmly,\n${candidate.name}`;
      break;

    case 'Formal':
      intro = `To the Hiring Committee of ${job.company},\n\nPlease accept this letter and accompanying resume as my formal application for the post of ${job.title} (${job.location}).`;
      body = `Throughout my professional career, I have consistently demonstrated expertise in system design, web development, and AI technology integration. My technical competencies in ${topSkills} directly correspond with the mandatory requirements stated in your job posting. At my previous organization, I successfully led key engineering deliverables while adhering to strict compliance standards.`;
      closing = `Thank you for reviewing my application. I remain available at your convenience for a formal discussion.\n\nRespectfully,\n${candidate.name}\n${candidate.phone} | ${candidate.email}`;
      break;

    case 'Enterprise':
      intro = `Dear Talent Acquisition Leader at ${job.company},\n\nI am writing to express my strong interest in the ${job.title} role. Having worked on enterprise-grade software serving hundreds of thousands of users, I am well-prepared to contribute to ${job.company}'s mission.`;
      body = `In my previous role, I architected distributed microservices, implemented zero-downtime release pipelines, and collaborated across multi-region engineering teams. My expertise spans ${topSkills}, with a proven track record of reducing system latency and maintaining 99.9% uptime SLAs.`;
      closing = `I look forward to discussing how my experience with large-scale architecture aligns with ${job.company}'s strategic milestones.\n\nSincerely,\n${candidate.name}`;
      break;

    case 'Professional':
    default:
      intro = `Dear Hiring Manager at ${job.company},\n\nI am writing to apply for the ${job.title} position advertised on ${job.sourcePortal}. With over 5 years of full-stack software development experience and specialized expertise in ${topSkills}, I am confident in my ability to add immediate value to your team.`;
      body = `In my recent role at Apex AI Labs, I spearheaded the engineering of AI-driven semantic tools that improved workflow speed by 40%. My expertise aligns closely with your requirement for ${job.skillsRequired.slice(0, 3).join(', ')}. I take pride in writing clean, well-tested code and building intuitive user experiences.`;
      closing = `Thank you for your time and consideration. I welcome the opportunity to discuss how my technical skills and background meet the needs of ${job.company}.\n\nSincerely,\n${candidate.name}\n${candidate.email}`;
      break;
  }

  const fullContent = `${dateStr}\n\n${intro}\n\n${body}\n\n${closing}`;

  return {
    id: `cl-${job.id}-${tone.toLowerCase()}`,
    jobId: job.id,
    companyName: job.company,
    jobTitle: job.title,
    tone,
    content: fullContent,
    createdAt: dateStr
  };
}
