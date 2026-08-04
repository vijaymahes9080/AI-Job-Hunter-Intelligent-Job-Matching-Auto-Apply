export type JobSource = 
  | 'LinkedIn' 
  | 'Naukri' 
  | 'Indeed' 
  | 'Foundit' 
  | 'Wellfound' 
  | 'Glassdoor' 
  | 'Internshala' 
  | 'Greenhouse' 
  | 'Lever' 
  | 'Ashby'
  | 'Company Careers';

export type JobType = 'Full-Time' | 'Part-Time' | 'Contract' | 'Internship';
export type WorkplaceType = 'Remote' | 'Hybrid' | 'On-site';
export type CompanyType = 'Startup' | 'MNC' | 'Enterprise' | 'Government';
export type UserRole = 'JobSeeker' | 'Recruiter' | 'Admin';
export type SubscriptionTier = 'Free' | 'Pro' | 'Premium';

export interface AICreditState {
  total: number;
  used: number;
}

export interface MatchExplanation {
  overallPercentage: number;
  matchingSkills: string[];
  missingSkills: string[];
  experienceGap: string;
  salaryMatchScore: number;
  locationMatchScore: number;
  educationMatchScore: number;
  certificationsMatchScore: number;
  summary: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyRating?: number;
  companyLogo?: string;
  location: string;
  workplaceType: WorkplaceType;
  jobType: JobType;
  companyType: CompanyType;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  experienceMin: number;
  experienceMax: number;
  skillsRequired: string[];
  educationRequired: string;
  description: string;
  benefits: string[];
  applyUrl: string;
  sourcePortal: JobSource;
  postedTime: string;
  deadline: string;
  matchScore?: MatchExplanation;
}

export interface WorkExperience {
  id: string;
  title: string;
  company: string;
  duration: string;
  description: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  year: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  technologies: string[];
}

export interface CandidateProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  profilePhoto?: string;
  skills: string[];
  experience: WorkExperience[];
  education: EducationItem[];
  certifications: CertificationItem[];
  projects: ProjectItem[];
  languages: string[];
  preferredRoles: string[];
  preferredLocations: string[];
  preferredSalaryMin: number;
  noticePeriodDays: number;
  workplacePreference: WorkplaceType[];
  companyTypePreference: CompanyType[];
  linkedinSynced: boolean;
  githubSynced: boolean;
  resumeFileName?: string;
  resumeFileText?: string;
}

export interface ResumeDiff {
  original: string;
  optimized: string;
  reason: string;
}

export interface ResumeVersion {
  id: string;
  name: string;
  targetRole: string;
  targetCompany: string;
  atsScore: number;
  highlightedKeywords: string[];
  diffs: ResumeDiff[];
  fullContent: string;
  createdAt: string;
}

export type CoverLetterTone = 'Professional' | 'Friendly' | 'Formal' | 'Startup' | 'Enterprise';

export interface CoverLetter {
  id: string;
  jobId: string;
  companyName: string;
  jobTitle: string;
  tone: CoverLetterTone;
  content: string;
  createdAt: string;
}

export type ApplicationStatus = 
  | 'Saved' 
  | 'Pending Review' 
  | 'Submitted' 
  | 'Resume Viewed' 
  | 'Assessment' 
  | 'Interview Scheduled' 
  | 'Offer Extended' 
  | 'Rejected';

export interface ApplicationItem {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  sourcePortal: JobSource;
  status: ApplicationStatus;
  matchScore: number;
  tailoredResumeId: string;
  coverLetterId: string;
  appliedAt: string;
  screeningAnswers: Record<string, string>;
  interviewDate?: string;
  notes?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'job_alert' | 'high_match' | 'interview' | 'status_change' | 'system';
  timestamp: string;
  read: boolean;
  jobId?: string;
}

export interface AIModelConfig {
  provider: 'OpenAI GPT-4o' | 'Sentence Transformers (Local)' | 'HuggingFace BERT' | 'FAISS Vector Index';
  embeddingDimension: number;
  similarityMetric: 'Cosine' | 'Dot Product';
  autoApplyApprovalRequired: boolean;
  dailyMaxApplications: number;
  enableLinkedInSync: boolean;
}

export interface SearchFilters {
  query: string;
  location: string;
  sources: JobSource[];
  workplaceTypes: WorkplaceType[];
  companyTypes: CompanyType[];
  minSalary: number;
  minExperience: number;
  minMatchScore: number;
}

export interface RecruiterCandidate {
  id: string;
  name: string;
  title: string;
  skills: string[];
  experienceYears: number;
  matchScore: number;
  location: string;
  salaryExpectation: string;
  noticePeriod: string;
  resumeFileName: string;
  appliedJobTitle: string;
}

export interface InterviewQuestion {
  id: string;
  topic: string;
  question: string;
  modelAnswer: string;
  starTips: string;
  keyKeywords: string[];
}

export interface InterviewSession {
  id: string;
  targetRole: string;
  questions: InterviewQuestion[];
  currentQuestionIndex: number;
  userAnswers: Record<string, { answer: string; score: number; feedback: string; wpm: number; fillerCount: number }>;
  totalScore: number;
  status: 'In Progress' | 'Completed';
  createdAt: string;
}

export interface AgentScoutConfig {
  enabled: boolean;
  minMatchScore: number;
  autoTailorResume: boolean;
  autoApplyQueue: boolean;
  webhookUrl: string;
  webhookPlatform: 'Discord' | 'Slack' | 'Telegram' | 'Custom API';
  checkIntervalMinutes: number;
}

export interface AgentScoutLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'scan' | 'match' | 'tailor' | 'webhook';
}

export interface ATSScoreCard {
  overallScore: number;
  formattingScore: number;
  keywordScore: number;
  sectionScore: number;
  readabilityScore: number;
  detectedIssues: string[];
  missingKeywords: string[];
  overusedKeywords: string[];
  recommendations: string[];
}

export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface SalaryBenchmark {
  role: string;
  location: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  currency: string;
  suggestedEquity: string;
  suggestedBonus: string;
}

