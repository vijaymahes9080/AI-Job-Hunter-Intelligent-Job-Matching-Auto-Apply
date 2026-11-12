import type { CandidateProfile, UserSettings } from '../../shared/types.js';
import type { Database } from '../db/index.js';

export const EMPTY_PROFILE: Omit<CandidateProfile, 'name' | 'email'> = {
  phone: '',
  location: '',
  headline: '',
  summary: '',
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  preferredRoles: [],
  preferredLocations: [],
  workplacePreferences: ['Remote', 'Hybrid', 'On-site'],
  salaryExpectation: { min: 0, currency: 'INR', period: 'year' },
  noticePeriodDays: 30,
  resumeText: '',
  resumeFileName: null,
  resumeUpdatedAt: null,
  githubUsername: null,
  linkedinUrl: null,
  portfolioUrl: null,
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  notifyDeadlines: true,
  notifyMatches: true,
  matchThreshold: 60,
  weeklyDigest: true,
};

export function newProfile(name: string, email: string): CandidateProfile {
  return { name, email, ...EMPTY_PROFILE };
}

export async function getProfile(db: Database, userId: string): Promise<CandidateProfile> {
  const result = await db.query<{ data: string }>('SELECT data FROM profiles WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) {
    return newProfile('', '');
  }
  return JSON.parse(result.rows[0].data) as CandidateProfile;
}

export async function saveProfile(db: Database, userId: string, profile: CandidateProfile): Promise<CandidateProfile> {
  const now = new Date().toISOString();
  await db.query(
    `INSERT INTO profiles (user_id, data, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = $3`,
    [userId, JSON.stringify(profile), now],
  );
  return profile;
}

export async function getSettings(db: Database, userId: string): Promise<UserSettings> {
  const result = await db.query<{ data: string }>('SELECT data FROM settings WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(JSON.parse(result.rows[0].data) as Partial<UserSettings>) };
}

export async function saveSettings(db: Database, userId: string, settings: UserSettings): Promise<UserSettings> {
  const now = new Date().toISOString();
  await db.query(
    `INSERT INTO settings (user_id, data, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = $3`,
    [userId, JSON.stringify(settings), now],
  );
  return settings;
}

export function profileCompleteness(profile: CandidateProfile): number {
  const checks = [
    Boolean(profile.name && profile.email),
    Boolean(profile.headline),
    Boolean(profile.summary && profile.summary.length >= 40),
    profile.skills.length >= 5,
    profile.experience.length >= 1,
    profile.education.length >= 1,
    Boolean(profile.resumeText && profile.resumeText.length >= 100),
    profile.preferredRoles.length >= 1,
    Boolean(profile.location),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
