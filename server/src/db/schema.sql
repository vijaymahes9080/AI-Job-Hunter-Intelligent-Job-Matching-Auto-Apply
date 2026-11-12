-- AI Job Hunter 2.0 relational schema
-- Timestamps are stored as ISO-8601 UTC text for deterministic behaviour across
-- PostgreSQL and the in-memory test adapter. All business keys are app-generated.
-- PostgreSQL is the production datastore, set DATABASE_URL.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'candidate',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_domain TEXT,
  location TEXT NOT NULL,
  workplace_type TEXT NOT NULL,
  employment_type TEXT NOT NULL,
  experience_min INTEGER,
  experience_max INTEGER,
  salary TEXT,
  skills TEXT NOT NULL,
  description TEXT NOT NULL,
  apply_url TEXT NOT NULL,
  normalized_apply_url TEXT NOT NULL,
  source TEXT NOT NULL,
  source_job_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  posted_at TEXT,
  deadline TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (source, source_job_id)
);

CREATE TABLE IF NOT EXISTS saved_jobs (
  candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at TEXT NOT NULL,
  PRIMARY KEY (candidate_id, job_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  match_score INTEGER NOT NULL,
  resume_label TEXT,
  resume_content TEXT,
  cover_letter TEXT,
  screening_answers TEXT NOT NULL,
  duplicate_override_reason TEXT,
  submission_evidence TEXT,
  notes TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  normalized_apply_url TEXT NOT NULL,
  company_key TEXT NOT NULL,
  title_key TEXT NOT NULL,
  submitted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (candidate_id, job_id),
  UNIQUE (candidate_id, normalized_apply_url)
);

CREATE TABLE IF NOT EXISTS application_events (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  note TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  job_id TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  dedupe_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, dedupe_key)
);

CREATE TABLE IF NOT EXISTS skill_gap_analyses (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_role TEXT NOT NULL,
  job_ids TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name_key TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS authenticity_checks (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL,
  classification TEXT NOT NULL,
  result TEXT NOT NULL,
  checked_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  company TEXT,
  difficulty TEXT NOT NULL,
  questions TEXT NOT NULL,
  answers TEXT NOT NULL,
  status TEXT NOT NULL,
  score INTEGER,
  confidence_average REAL,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS roadmaps (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_role TEXT NOT NULL,
  plan TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roadmap_progress (
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (roadmap_id, milestone_key)
);

CREATE TABLE IF NOT EXISTS github_analyses (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  job_ids TEXT NOT NULL,
  result TEXT NOT NULL,
  analyzed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS discovery_runs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  discovered INTEGER NOT NULL,
  inserted INTEGER NOT NULL,
  message TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_retrieved ON jobs(retrieved_at);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_authenticity_job ON authenticity_checks(job_id, checked_at);
