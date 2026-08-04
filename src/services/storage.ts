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
  try {
    const data = localStorage.getItem(KEYS.PROFILE);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.name === 'Vijay Kumar' || parsed.email === 'vijay.k@example.com') {
        localStorage.removeItem(KEYS.PROFILE);
        localStorage.removeItem(KEYS.APPLICATIONS);
        localStorage.removeItem(KEYS.NOTIFICATIONS);
        return INITIAL_CANDIDATE_PROFILE;
      }
      return parsed;
    }
    return INITIAL_CANDIDATE_PROFILE;
  } catch (e) {
    console.warn('Failed to parse profile from localStorage, using initial profile fallback', e);
    return INITIAL_CANDIDATE_PROFILE;
  }
}

export function saveProfile(profile: CandidateProfile): void {
  try {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile to localStorage', e);
  }
}

export function loadJobs(): Job[] {
  try {
    const data = localStorage.getItem(KEYS.JOBS);
    return data ? JSON.parse(data) : INITIAL_JOBS;
  } catch (e) {
    console.warn('Failed to parse jobs from localStorage, using initial jobs fallback', e);
    return INITIAL_JOBS;
  }
}

export function saveJobs(jobs: Job[]): void {
  try {
    localStorage.setItem(KEYS.JOBS, JSON.stringify(jobs));
  } catch (e) {
    console.error('Failed to save jobs to localStorage', e);
  }
}

export function loadApplications(): ApplicationItem[] {
  try {
    const data = localStorage.getItem(KEYS.APPLICATIONS);
    return data ? JSON.parse(data) : INITIAL_APPLICATIONS;
  } catch (e) {
    console.warn('Failed to parse applications from localStorage, using initial apps fallback', e);
    return INITIAL_APPLICATIONS;
  }
}

export function saveApplications(apps: ApplicationItem[]): void {
  try {
    localStorage.setItem(KEYS.APPLICATIONS, JSON.stringify(apps));
  } catch (e) {
    console.error('Failed to save applications to localStorage', e);
  }
}

export function loadNotifications(): NotificationItem[] {
  try {
    const data = localStorage.getItem(KEYS.NOTIFICATIONS);
    return data ? JSON.parse(data) : INITIAL_NOTIFICATIONS;
  } catch (e) {
    console.warn('Failed to parse notifications from localStorage, using initial notifs fallback', e);
    return INITIAL_NOTIFICATIONS;
  }
}

export function saveNotifications(notifs: NotificationItem[]): void {
  try {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifs));
  } catch (e) {
    console.error('Failed to save notifications to localStorage', e);
  }
}

export function loadAIConfig(): AIModelConfig {
  try {
    const data = localStorage.getItem(KEYS.CONFIG);
    return data ? JSON.parse(data) : INITIAL_AI_CONFIG;
  } catch (e) {
    console.warn('Failed to parse AI config from localStorage, using initial config fallback', e);
    return INITIAL_AI_CONFIG;
  }
}

export function saveAIConfig(config: AIModelConfig): void {
  try {
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save AI config to localStorage', e);
  }
}

export function purgeAllData(): CandidateProfile {
  try {
    localStorage.removeItem(KEYS.PROFILE);
    localStorage.removeItem(KEYS.APPLICATIONS);
    localStorage.removeItem(KEYS.NOTIFICATIONS);
    localStorage.removeItem(KEYS.JOBS);
  } catch (e) {
    console.error('Failed to clear localStorage during purge', e);
  }
  const cleanProfile: CandidateProfile = {
    ...INITIAL_CANDIDATE_PROFILE,
    isPurged: true
  };
  saveProfile(cleanProfile);
  return cleanProfile;
}
