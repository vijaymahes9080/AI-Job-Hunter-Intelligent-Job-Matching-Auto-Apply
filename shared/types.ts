/**
 * Shared API contracts for the AI Job Hunter platform.
 * These types are used by both the React client and the Node API.
 */

export type SourcePortal =
  | 'remotive'
  | 'greenhouse'
  | 'lever'
  | 'adzuna'
  | 'company'
  | 'manual';

export type WorkplaceType = 'Remote' | 'Hybrid' | 'On-site' | 'Unknown';
export type EmploymentType =
  | 'Full-time'
  | 'Part-time'
  | 'Contract'
  | 'Internship'
  | 'Unknown';

export type ApplicationStatus =
  | 'Prepared'
  | 'Approved'
  | 'Submitted'
  | 'Assessment'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn';

export type DeadlineStatus =
  | 'Open'
  | 'Closing Soon'
  | 'Deadline Passed'
  | 'Not Specified'
  | 'Needs Verification';

export type RiskClassification =
  | 'Low Risk Indicators'
  | 'Needs Verification'
  | 'Suspicious'
  | 'High Risk';

export type Confidence = 'high' | 'medium' | 'low' | 'unverified';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface SalaryRange {
  min: number | null;
  max: number | null;
  currency: string | null;
  period: 'year' | 'month' | 'hour' | 'unknown';
  source: 'published' | 'description-extracted' | 'unknown';
  rawText: string | null;
}

export interface DeadlineInfo {
  date: string | null;
  status: DeadlineStatus;
  daysRemaining: number | null;
  sourceSnippet: string | null;
  confidence: 'verified' | 'extracted' | 'unknown';
  note: string;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  companyDomain: string | null;
  location: string;
  workplaceType: WorkplaceType;
  employmentType: EmploymentType;
  experienceMin: number | null;
  experienceMax: number | null;
  salary: SalaryRange | null;
  skills: string[];
  description: string;
  applyUrl: string;
  normalizedApplyUrl: string;
  source: SourcePortal;
  sourceJobId: string;
  sourceName: string;
  retrievedAt: string;
  postedAt: string | null;
  deadline: DeadlineInfo;
  fingerprint: string;
  isSaved?: boolean;
  application?: { id: string; status: ApplicationStatus } | null;
  match?: MatchResult | null;
  authenticity?: AuthenticityResult | null;
  companyId?: string | null;
}

export interface SkillEvidence {
  skill: string;
  importance: 'High' | 'Medium' | 'Low';
  requiredByJobs: number;
  evidence: string[];
  partial: boolean;
}

export interface MatchFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  explanation: string;
}

export interface MatchResult {
  overall: number;
  matchingSkills: SkillEvidence[];
  missingSkills: SkillEvidence[];
  partialSkills: SkillEvidence[];
  factors: MatchFactor[];
  formula: string;
  experienceAssessment: string;
  summary: string;
  targetRole: string;
  jobId: string;
  computedAt: string;
}

export interface SkillGapRecommendation {
  skill: string;
  priority: 'High' | 'Medium' | 'Low';
  why: string;
  concept: string;
  practice: string;
  project: string;
  resources: { label: string; url: string }[];
}

export interface SkillGapResult {
  targetRole: string;
  jobIds: string[];
  jobCount: number;
  existingSkills: string[];
  matchingSkills: SkillEvidence[];
  missingSkills: SkillEvidence[];
  partialSkills: SkillEvidence[];
  highPrioritySkills: string[];
  recommendations: SkillGapRecommendation[];
  gapPercentage: number;
  formula: string;
  evidenceNotes: string[];
  generatedAt: string;
}

export interface CompanyOpenPosition {
  title: string;
  location: string;
  url: string;
  source: string;
  retrievedAt: string;
}

export interface CompanyResearch {
  id: string;
  company: string;
  website: string | null;
  careersUrl: string | null;
  industry: string | null;
  locations: string[];
  techStack: Array<{ technology: string; postings: number; evidence: string[] }>;
  openPositions: CompanyOpenPosition[];
  postingHistory: { firstSeen: string | null; lastSeen: string | null; count: number };
  sources: Array<{ label: string; url: string; retrievedAt: string }>;
  confidence: Confidence;
  researchDate: string;
  notes: string[];
}

export interface AuthenticityIndicator {
  code: string;
  label: string;
  severity: 'info' | 'low' | 'medium' | 'high';
  evidence: string;
  verified: boolean;
}

export interface AuthenticityResult {
  jobId: string;
  riskScore: number;
  classification: RiskClassification;
  indicators: AuthenticityIndicator[];
  verifiedEvidence: string[];
  unverifiedInformation: string[];
  recommendedAction: string;
  checkedAt: string;
  disclaimer: string;
}

export interface DuplicateMatch {
  applicationId: string;
  jobId: string;
  title: string;
  company: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  applyUrl: string;
  similarity: number;
  reason: string;
}

export interface DuplicateCheckResult {
  normalizedUrl: string;
  exactDuplicates: DuplicateMatch[];
  similar: DuplicateMatch[];
  blocked: boolean;
  canOverride: boolean;
  reasons: string[];
  checkedAt: string;
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  source: SourcePortal;
  status: ApplicationStatus;
  matchScore: number;
  resumeLabel: string | null;
  coverLetter: string | null;
  screeningAnswers: Record<string, string>;
  duplicateOverrideReason: string | null;
  submissionEvidence: { url: string | null; reference: string | null; recordedAt: string } | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  outcomeUnknown: boolean;
  notes: string | null;
}

export interface ApplicationEventRecord {
  id: string;
  applicationId: string;
  type: string;
  note: string | null;
  occurredAt: string;
}

export interface AtsCheck {
  key: string;
  label: string;
  passed: boolean;
  weight: number;
  evidence: string;
  suggestion: string | null;
}

export interface ResumeAnalysis {
  score: number;
  wordCount: number;
  characterCount: number;
  targetJobId: string | null;
  targetJobTitle: string | null;
  matchedKeywords: Array<{ keyword: string; evidence: string }>;
  missingKeywords: string[];
  additionalSkills: string[];
  checks: AtsCheck[];
  suggestions: string[];
  disclaimer: string;
  generatedAt: string;
}

export interface DeadlineBoardItem {
  jobId: string;
  title: string;
  company: string;
  location: string;
  applyUrl: string;
  sourceName: string;
  isSaved: boolean;
  applicationStatus: ApplicationStatus | null;
  deadline: DeadlineInfo;
}

export interface DeadlineBoardResponse {
  items: DeadlineBoardItem[];
  summary: {
    closingSoon: number;
    open: number;
    passed: number;
    notSpecified: number;
    needsVerification: number;
    scannedJobs: number;
  };
  generatedAt: string;
}

export interface IntegrationStatusRecord extends IntegrationStatus {
  statusDetail: string;
  actionRequired: string | null;
}

export interface InterviewQuestion {
  id: string;
  category:
    | 'Technical'
    | 'Programming'
    | 'SQL'
    | 'Python'
    | 'Java'
    | 'AI/ML'
    | 'System Design'
    | 'Project'
    | 'HR'
    | 'Behavioral';
  difficulty: Difficulty;
  prompt: string;
  keyPoints: string[];
  modelOutline: string;
  followUp: string;
  skill: string;
}

export interface InterviewAnswerEvaluation {
  score: number;
  technicalCorrectness: number;
  structure: number;
  specificity: number;
  matchedPoints: string[];
  missingPoints: string[];
  suggestions: string[];
  followUp: string;
  confidence: number;
  evaluatedAt: string;
  evaluator: 'deterministic' | 'llm';
}

export interface InterviewSession {
  id: string;
  role: string;
  company: string | null;
  difficulty: Difficulty;
  questions: InterviewQuestion[];
  answers: Record<string, { answer: string; confidence: number; evaluation: InterviewAnswerEvaluation }>;
  status: 'In Progress' | 'Completed';
  score: number | null;
  confidenceAverage: number | null;
  createdAt: string;
  completedAt: string | null;
  disclaimer: string;
}

export interface RoadmapMilestone {
  key: string;
  week: number;
  title: string;
  deliverable: string;
  completed: boolean;
  completedAt: string | null;
}

export interface RoadmapStage {
  key: string;
  order: number;
  title: string;
  weeks: number;
  objectives: string[];
  activities: string[];
  project: { title: string; description: string; acceptance: string } | null;
  certification: { name: string; reason: string } | null;
  assessment: string;
}

export interface CareerRoadmap {
  id: string;
  targetRole: string;
  summary: string;
  stages: RoadmapStage[];
  milestones: RoadmapMilestone[];
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryObservation {
  jobId: string;
  title: string;
  company: string;
  location: string;
  experienceMin: number | null;
  experienceMax: number | null;
  min: number;
  max: number;
  currency: string;
  period: 'year' | 'month' | 'hour';
  annualizedMin: number | null;
  annualizedMax: number | null;
  source: string;
  sourceUrl: string;
  observedAt: string;
}

export interface SalaryIntelligence {
  observations: SalaryObservation[];
  comparisons: Array<{
    label: string;
    currency: string;
    period: string;
    count: number;
    min: number;
    median: number;
    max: number;
  }>;
  byRole: Array<{ label: string; currency: string; count: number; medianAnnual: number }>;
  byLocation: Array<{ label: string; currency: string; count: number; medianAnnual: number }>;
  byExperience: Array<{ label: string; currency: string; count: number; medianAnnual: number }>;
  methodology: string;
  caveats: string[];
}

export interface GitHubRepoEvidence {
  name: string;
  url: string;
  description: string | null;
  stars: number;
  language: string | null;
  topics: string[];
  updatedAt: string;
  homepage: string | null;
  readmeLength: number;
  technologies: Array<{ name: string; evidence: string }>;
  quality: {
    hasDescription: boolean;
    hasReadme: boolean;
    hasLicense: boolean;
    hasTests: boolean;
    hasCI: boolean;
    recentlyUpdated: boolean;
    documentationScore: number;
  };
}

export interface GitHubPortfolioAnalysis {
  username: string;
  profile: { name: string | null; avatarUrl: string | null; publicRepos: number; htmlUrl: string };
  repos: GitHubRepoEvidence[];
  matches: Array<{
    jobId: string;
    jobTitle: string;
    company: string;
    coverage: number;
    matched: Array<{ skill: string; evidence: string[] }>;
    missing: string[];
  }>;
  technologyCoverage: Array<{ skill: string; evidence: string[] }>;
  missingPortfolioEvidence: string[];
  recommendations: string[];
  analyzedAt: string;
  limitations: string[];
}

export interface AnalyticsCounts {
  discovered: number;
  relevant: number;
  shortlisted: number;
  prepared: number;
  approved: number;
  submitted: number;
  interviews: number;
  assessments: number;
  offers: number;
  rejections: number;
  withdrawals: number;
  unknownOutcomes: number;
}

export interface AnalyticsResult {
  period: { from: string; to: string };
  counts: AnalyticsCounts;
  rates: Array<{
    key: string;
    label: string;
    numerator: number;
    denominator: number;
    value: number;
    definition: string;
  }>;
  weekly: Array<{ bucket: string; prepared: number; submitted: number; interviews: number }>;
  monthly: Array<{ bucket: string; prepared: number; submitted: number; interviews: number }>;
  byCategory: Array<{ label: string; total: number; interviews: number; offers: number }>;
  bySource: Array<{ label: string; total: number; interviews: number; offers: number }>;
  byResumeVersion: Array<{ label: string; total: number; interviews: number; offers: number }>;
  recommendations: string[];
  generatedAt: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: 'deadline' | 'match' | 'application' | 'system' | 'interview';
  read: boolean;
  jobId: string | null;
  createdAt: string;
}

export interface CandidateProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  skills: string[];
  experience: Array<{
    id: string;
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{ id: string; degree: string; institution: string; year: string }>;
  projects: Array<{ id: string; title: string; description: string; technologies: string[] }>;
  certifications: Array<{ id: string; name: string; issuer: string; year: string }>;
  preferredRoles: string[];
  preferredLocations: string[];
  workplacePreferences: Array<'Remote' | 'Hybrid' | 'On-site'>;
  salaryExpectation: { min: number; currency: string; period: 'year' | 'month' };
  noticePeriodDays: number;
  resumeText: string;
  resumeFileName: string | null;
  resumeUpdatedAt: string | null;
  githubUsername: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  notifyDeadlines: boolean;
  notifyMatches: boolean;
  matchThreshold: number;
  weeklyDigest: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface IntegrationStatus {
  key: string;
  name: string;
  category: 'job-source' | 'ai' | 'portfolio' | 'notification';
  configured: boolean;
  verification: 'live' | 'optional' | 'requires-credentials' | 'not-configured';
  description: string;
  envVars: string[];
  docsUrl: string;
}

export interface DashboardResponse {
  profileCompleteness: number;
  counts: {
    discovered: number;
    saved: number;
    prepared: number;
    submitted: number;
    interviews: number;
    offers: number;
  };
  topMatches: JobPosting[];
  closingSoon: Array<{ jobId: string; title: string; company: string; deadline: string; daysRemaining: number }>;
  recentApplications: ApplicationRecord[];
  recommendedActions: string[];
  engine: { aiProvider: string; aiConfigured: boolean; jobSources: string[] };
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
