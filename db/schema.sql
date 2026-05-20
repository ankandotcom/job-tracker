-- ─────────────────────────────────────────
--  Job Tracker — full schema
--  Run once:  psql -d job_tracker -f schema.sql
-- ─────────────────────────────────────────

-- Enum for application status
CREATE TYPE app_status AS ENUM (
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn'
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            VARCHAR(255) NOT NULL UNIQUE,
  password_hash    TEXT         NOT NULL,
  name             VARCHAR(255) NOT NULL,
  resume_text      TEXT,
  refresh_token    TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company          VARCHAR(255) NOT NULL,
  role             VARCHAR(255) NOT NULL,
  status           app_status   NOT NULL DEFAULT 'applied',
  applied_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  notes            TEXT,
  salary_range     VARCHAR(100),
  url              TEXT,

  -- AI columns
  ai_score         SMALLINT     CHECK (ai_score BETWEEN 1 AND 10),
  ai_score_reason  TEXT,
  ai_scored_at     TIMESTAMPTZ,

  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Status history (timeline)
CREATE TABLE IF NOT EXISTS status_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   UUID         NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status      app_status,
  to_status        app_status   NOT NULL,
  changed_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_applications_user_id   ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status     ON applications(status);
CREATE INDEX IF NOT EXISTS idx_status_history_app_id   ON status_history(application_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
