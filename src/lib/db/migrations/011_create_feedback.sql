CREATE EXTENSION IF NOT EXISTS pg_uuidv7;

CREATE TABLE IF NOT EXISTS feedback (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  sentiment   TEXT NOT NULL CHECK (sentiment IN ('love', 'okay', 'hate')),
  message     TEXT,
  page_url    TEXT NOT NULL,
  company_id  TEXT,
  user_id     TEXT,
  user_email  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
