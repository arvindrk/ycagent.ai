CREATE EXTENSION IF NOT EXISTS pg_uuidv7;

CREATE TABLE IF NOT EXISTS research_runs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id         TEXT        NOT NULL,
  user_email      TEXT        NOT NULL,
  company_id      UUID        NOT NULL REFERENCES companies(id),
  company_name    TEXT        NOT NULL,
  trigger_run_id  TEXT        NOT NULL,
  sandbox_id      TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_research_runs_company_id ON research_runs(company_id);
CREATE INDEX idx_research_runs_user_id    ON research_runs(user_id);
