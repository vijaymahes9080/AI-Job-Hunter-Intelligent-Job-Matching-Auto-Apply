import type { Job, CandidateProfile, AIModelConfig, ApplicationItem, NotificationItem, RecruiterCandidate } from '../types';

export const INITIAL_CANDIDATE_PROFILE: CandidateProfile = {
  name: 'Vijay Kumar',
  email: 'vijay.k@example.com',
  phone: '+91 98765 43210',
  location: 'Bengaluru, India',
  headline: 'Senior Full Stack AI Engineer | React, Node.js, Python, OpenAI & LLM Systems',
  summary: 'Passionate AI & Full Stack Engineer with 5+ years of experience building high-concurrency web platforms, LLM agents, and semantic search systems. Adept in React, TypeScript, Python FastAPI, PostgreSQL, and modern cloud deployment.',
  profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  skills: [
    'React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 
    'OpenAI API', 'Tailwind CSS', 'PostgreSQL', 'MongoDB', 
    'Docker', 'GraphQL', 'Next.js', 'Redis', 'Git', 'REST API'
  ],
  experience: [
    {
      id: 'exp-1',
      title: 'Senior AI Software Engineer',
      company: 'Apex AI Labs',
      duration: '2023 - Present (2 yrs)',
      description: 'Architected automated AI workflows, integrated OpenAI & LangChain pipelines, improved frontend render performance by 40%, and managed vector database indexes for semantic matching.'
    },
    {
      id: 'exp-2',
      title: 'Full Stack Engineer',
      company: 'CloudSphere Systems',
      duration: '2021 - 2023 (2 yrs)',
      description: 'Developed scalable React & Node.js microservices serving 500k monthly active users. Integrated payment gateways, Redis caching, and automated deployment pipelines.'
    }
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'B.Tech in Computer Science & Engineering',
      institution: 'Indian Institute of Technology (IIT), Madras',
      year: '2017 - 2021'
    }
  ],
  certifications: [
    {
      id: 'cert-1',
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      year: '2023'
    },
    {
      id: 'cert-2',
      name: 'Deep Learning Specialization',
      issuer: 'DeepLearning.AI / Coursera',
      year: '2022'
    }
  ],
  projects: [
    {
      id: 'proj-1',
      title: 'AI Job Hunter Agent',
      description: 'Autonomous job matching and application assistant using BERT sentence transformers and automated ATS keyword tailoring.',
      technologies: ['React', 'TypeScript', 'FastAPI', 'FAISS', 'Tailwind CSS']
    },
    {
      id: 'proj-2',
      title: 'Enterprise Code Review Bot',
      description: 'GitHub bot that parses pull requests and generates security vulnerability reports using fine-tuned Llama models.',
      technologies: ['Python', 'Docker', 'OpenAI', 'Node.js']
    }
  ],
  languages: ['English (Native/Fluent)', 'Hindi (Fluent)', 'Tamil (Conversational)'],
  preferredRoles: ['Senior Frontend Engineer', 'Full Stack AI Developer', 'AI Solutions Engineer', 'Lead React Developer'],
  preferredLocations: ['Bengaluru', 'Remote', 'Hyderabad', 'Mumbai'],
  preferredSalaryMin: 2800000, // ₹28 LPA
  noticePeriodDays: 30,
  workplacePreference: ['Remote', 'Hybrid'],
  companyTypePreference: ['Startup', 'MNC', 'Enterprise'],
  linkedinSynced: true,
  githubSynced: true,
  resumeFileName: 'Vijay_Kumar_Resume_AI_Engineer.pdf',
  resumeFileText: `Vijay Kumar - Senior Full Stack AI Engineer
Email: vijay.k@example.com | Phone: +91 98765 43210 | Bengaluru, India`
};

export const INITIAL_JOBS: Job[] = [
  {
    id: 'job-101',
    title: 'Lead AI & Full Stack React Engineer',
    company: 'Anthropic Systems',
    companyRating: 4.9,
    companyLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
    location: 'Bengaluru (Remote Available)',
    workplaceType: 'Remote',
    jobType: 'Full-Time',
    companyType: 'Startup',
    salaryMin: 3200000,
    salaryMax: 4500000,
    salaryCurrency: 'INR',
    experienceMin: 4,
    experienceMax: 7,
    skillsRequired: ['React', 'TypeScript', 'Node.js', 'Python', 'OpenAI API', 'FastAPI', 'Tailwind CSS'],
    educationRequired: 'B.Tech / B.E. in Computer Science or equivalent',
    description: 'We are seeking an exceptional Lead AI & Full Stack Engineer to spearhead our next-generation generative AI workforce platform.',
    benefits: ['100% Remote Work', 'Stock Options (ESOPs)', 'Unlimited PTO', 'Comprehensive Health Insurance'],
    applyUrl: 'https://linkedin.com/jobs/view/3920191',
    sourcePortal: 'LinkedIn',
    postedTime: '2 hours ago',
    deadline: '2026-08-25',
  },
  {
    id: 'job-102',
    title: 'Senior Frontend Developer - AI Products',
    company: 'MindTickle / Tech Mahindra',
    companyRating: 4.5,
    companyLogo: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=120&q=80',
    location: 'Bengaluru, Karnataka',
    workplaceType: 'Hybrid',
    jobType: 'Full-Time',
    companyType: 'MNC',
    salaryMin: 2800000,
    salaryMax: 3800000,
    salaryCurrency: 'INR',
    experienceMin: 3,
    experienceMax: 6,
    skillsRequired: ['React', 'TypeScript', 'Next.js', 'Redux Toolkit', 'Tailwind CSS', 'GraphQL'],
    educationRequired: 'Bachelor degree in Engineering',
    description: 'Looking for a Senior Frontend Developer to lead UI engineering for our sales enablement AI platform.',
    benefits: ['Hybrid Work Model', 'Performance Bonus', 'Wellness Allowance'],
    applyUrl: 'https://naukri.com/job/senior-frontend-developer-ai',
    sourcePortal: 'Naukri',
    postedTime: '5 hours ago',
    deadline: '2026-08-30',
  },
  {
    id: 'job-103',
    title: 'Senior Full Stack Software Engineer',
    company: 'Zomato AI Technologies',
    companyRating: 4.3,
    companyLogo: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=120&q=80',
    location: 'Gurugram / Remote',
    workplaceType: 'Remote',
    jobType: 'Full-Time',
    companyType: 'Enterprise',
    salaryMin: 3000000,
    salaryMax: 4200000,
    salaryCurrency: 'INR',
    experienceMin: 4,
    experienceMax: 8,
    skillsRequired: ['React', 'Node.js', 'Python', 'PostgreSQL', 'Docker', 'Redis', 'TypeScript'],
    educationRequired: 'BS/MS in Computer Science',
    description: 'Zomato is hiring Senior Engineers for our Core Logistics & Intelligence Team.',
    benefits: ['Food Allowance & Coupons', 'Flexible Working Hours', 'Insurance'],
    applyUrl: 'https://indeed.com/viewjob?jk=89230192',
    sourcePortal: 'Indeed',
    postedTime: '1 day ago',
    deadline: '2026-09-01',
  }
];

export const INITIAL_APPLICATIONS: ApplicationItem[] = [
  {
    id: 'app-1',
    jobId: 'job-101',
    jobTitle: 'Lead AI & Full Stack React Engineer',
    company: 'Anthropic Systems',
    sourcePortal: 'LinkedIn',
    status: 'Submitted',
    matchScore: 96,
    tailoredResumeId: 'res-v1',
    coverLetterId: 'cl-1',
    appliedAt: '2026-08-02 14:30',
    screeningAnswers: {
      'Years of Experience with React': '5',
      'Expected CTC': '₹36,000,000 / year',
      'Notice Period': '30 Days'
    },
    notes: 'Submitted via OAuth direct integration.'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: '🎉 Interview Invitation!',
    message: 'Cognitive Flow AI scheduled an interview for Founding AI Engineer.',
    type: 'interview',
    timestamp: '10 minutes ago',
    read: false,
    jobId: 'job-105'
  }
];

export const INITIAL_AI_CONFIG: AIModelConfig = {
  provider: 'OpenAI GPT-4o',
  embeddingDimension: 1536,
  similarityMetric: 'Cosine',
  autoApplyApprovalRequired: true,
  dailyMaxApplications: 15,
  enableLinkedInSync: true
};

export const RECRUITER_CANDIDATES: RecruiterCandidate[] = [
  {
    id: 'cand-1',
    name: 'Vijay Kumar',
    title: 'Senior Full Stack AI Developer',
    skills: ['React', 'TypeScript', 'Python', 'FastAPI', 'OpenAI API', 'Tailwind CSS'],
    experienceYears: 5,
    matchScore: 96,
    location: 'Bengaluru, India',
    salaryExpectation: '₹32 LPA',
    noticePeriod: '30 Days',
    resumeFileName: 'Vijay_Kumar_Resume_AI.pdf',
    appliedJobTitle: 'Lead AI & Full Stack React Engineer'
  },
  {
    id: 'cand-2',
    name: 'Ananya Sharma',
    title: 'Frontend Systems Architect',
    skills: ['React', 'Next.js', 'Redux', 'TypeScript', 'GraphQL', 'Tailwind CSS'],
    experienceYears: 6,
    matchScore: 92,
    location: 'Remote India',
    salaryExpectation: '₹35 LPA',
    noticePeriod: '15 Days',
    resumeFileName: 'Ananya_Sharma_CV.pdf',
    appliedJobTitle: 'Senior Frontend Developer - AI Products'
  },
  {
    id: 'cand-3',
    name: 'Rohan Mehta',
    title: 'Python AI Infrastructure Specialist',
    skills: ['Python', 'FastAPI', 'PyTorch', 'LangChain', 'FAISS', 'Docker'],
    experienceYears: 4,
    matchScore: 89,
    location: 'Hyderabad, India',
    salaryExpectation: '₹30 LPA',
    noticePeriod: 'Immediate',
    resumeFileName: 'Rohan_Mehta_Resume.pdf',
    appliedJobTitle: 'AI Solutions & Fullstack Architect'
  }
];

export const RECOMMENDED_COURSES = [
  { title: 'Advanced LLM Architecture & LangChain Masterclass', provider: 'DeepLearning.AI', matchRelevance: 'High' },
  { title: 'System Design for High Scale Web Platforms', provider: 'Educative.io', matchRelevance: 'High' }
];

export const RECOMMENDED_CERTIFICATIONS = [
  { name: 'OpenAI Certified Generative AI Developer', provider: 'OpenAI', difficulty: 'Advanced' }
];

export const SAMPLE_INTERVIEW_QUESTIONS = [
  {
    question: 'How do you optimize React render loops when displaying streaming datasets from LLM APIs?',
    category: 'React & Performance',
    hint: 'Discuss memoization, virtualization, custom hooks, and chunking responses.'
  }
];
