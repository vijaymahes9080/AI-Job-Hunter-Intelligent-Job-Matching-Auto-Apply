import { CandidateProfile, Job, ApplicationItem, NotificationItem, AIModelConfig } from '../types';
import { INITIAL_CANDIDATE_PROFILE, INITIAL_JOBS, INITIAL_APPLICATIONS, INITIAL_NOTIFICATIONS, INITIAL_AI_CONFIG } from '../data/mockData';

const KEYS = {
  PROFILE: 'ai_job_hunter_profile',
  JOBS: 'ai_job_hunter_jobs',
  APPLICATIONS: 'ai_job_hunter_applications',
  NOTIFICATIONS: 'ai_job_hunter_notifications',
  CONFIG: 'ai_job_hunter_config',
};

export function loadProfile(): CandidateProfile {
  const data = localStorage.getItem(KEYS.PROFILE);
  return data ? JSON.parse(data) : INITIAL_CANDIDATE_PROFILE;
}

export function saveProfile(profile: CandidateProfile): void {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export function loadJobs(): Job[] {
  const data = localStorage.getItem(KEYS.JOBS);
  return data ? JSON.parse(data) : INITIAL_JOBS;
}

export function saveJobs(jobs: Job[]): void {
  localStorage.setItem(KEYS.JOBS, JSON.stringify(jobs));
}

export function loadApplications(): ApplicationItem[] {
  const data = localStorage.getItem(KEYS.APPLICATIONS);
  return data ? JSON.parse(data) : INITIAL_APPLICATIONS;
}

export function saveApplications(apps: ApplicationItem[]): void {
  localStorage.setItem(KEYS.APPLICATIONS, JSON.stringify(apps));
}

export function loadNotifications(): NotificationItem[] {
  const data = localStorage.getItem(KEYS.NOTIFICATIONS);
  return data ? JSON.parse(data) : INITIAL_NOTIFICATIONS;
}

export function saveNotifications(notifs: NotificationItem[]): void {
  localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifs));
}

export function loadAIConfig(): AIModelConfig {
  const data = localStorage.getItem(KEYS.CONFIG);
  return data ? JSON.parse(data) : INITIAL_AI_CONFIG;
}

export function saveAIConfig(config: AIModelConfig): void {
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
}
