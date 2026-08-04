import type { Job, CandidateProfile, AIModelConfig, ApplicationItem, NotificationItem, RecruiterCandidate } from '../types';

export const INITIAL_CANDIDATE_PROFILE: CandidateProfile = {
  name: '',
  email: '',
  phone: '',
  location: '',
  headline: 'Upload your resume or connect your profile to personalize job matching',
  summary: '',
  profilePhoto: undefined,
  skills: [],
  experience: [],
  education: [],
  certifications: [],
  projects: [],
  languages: [],
  preferredRoles: [],
  preferredLocations: [],
  preferredSalaryMin: 0,
  noticePeriodDays: 30,
  workplacePreference: ['Remote', 'Hybrid'],
  companyTypePreference: ['Startup', 'MNC', 'Enterprise'],
  linkedinSynced: false,
  githubSynced: false,
  resumeFileName: undefined,
  resumeFileText: undefined
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
    benefits: ['Equity Options', 'Health Insurance', 'Remote Work Budget', 'Learning Allowance'],
    applyUrl: 'https://linkedin.com/jobs/view/39102931',
    sourcePortal: 'LinkedIn',
    postedTime: '2 hours ago',
    deadline: '2026-08-30'
  },
  {
    id: 'job-102',
    title: 'Senior Frontend Developer - AI Products',
    company: 'Neural Labs Inc',
    companyRating: 4.7,
    companyLogo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=120&q=80',
    location: 'Remote',
    workplaceType: 'Remote',
    jobType: 'Full-Time',
    companyType: 'MNC',
    salaryMin: 2800000,
    salaryMax: 3800000,
    salaryCurrency: 'INR',
    experienceMin: 3,
    experienceMax: 6,
    skillsRequired: ['React', 'TypeScript', 'Tailwind CSS', 'Redux', 'REST API', 'GraphQL'],
    educationRequired: 'Bachelor Degree in Engineering or Computer Applications',
    description: 'Join Neural Labs to build intuitive user interfaces for enterprise AI assistants and real-time streaming LLM applications.',
    benefits: ['100% Remote', 'Flexible Hours', 'Annual Retreat', 'Wellness Stipend'],
    applyUrl: 'https://greenhouse.io/neurallabs/jobs/89201',
    sourcePortal: 'Greenhouse',
    postedTime: '4 hours ago',
    deadline: '2026-08-25'
  },
  {
    id: 'job-103',
    title: 'AI Solutions & Fullstack Architect',
    company: 'Cognitive Flow AI',
    companyRating: 4.8,
    companyLogo: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=120&q=80',
    location: 'Hyderabad, India',
    workplaceType: 'Hybrid',
    jobType: 'Full-Time',
    companyType: 'Enterprise',
    salaryMin: 3500000,
    salaryMax: 5000000,
    salaryCurrency: 'INR',
    experienceMin: 5,
    experienceMax: 9,
    skillsRequired: ['Python', 'FastAPI', 'React', 'TypeScript', 'FAISS', 'OpenAI API', 'Docker', 'PostgreSQL'],
    educationRequired: 'B.Tech/M.Tech in CS or AI/ML',
    description: 'Designing end-to-end RAG architecture, vector search indexes, and microservice backend serving large language model API endpoints.',
    benefits: ['Relocation Allowance', 'Bonus Structure', 'Top Tier Health Cover'],
    applyUrl: 'https://lever.co/cognitiveflow/jobs/77321',
    sourcePortal: 'Lever',
    postedTime: '1 day ago',
    deadline: '2026-09-05'
  }
];

export const INITIAL_APPLICATIONS: ApplicationItem[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-welcome',
    title: '👋 Welcome to AI Job Hunter',
    message: 'Upload your resume or click 1-Click Quick Setup to personalize your profile and start auto-applying to top jobs!',
    type: 'system',
    timestamp: 'Just now',
    read: false
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
