-- Migration: Recreate discovery tables with UUIDv7
-- Description: Drop research_runs and search_queries, recreate with time-ordered UUIDs
-- WARNING: This will delete all existing research/query data (companies table unchanged)

-- ============================================================================
-- Drop existing discovery tables (CASCADE handles foreign keys)
-- ============================================================================
DROP TABLE IF EXISTS search_queries CASCADE;
DROP TABLE IF EXISTS research_runs CASCADE;

-- ============================================================================
-- Enable UUIDv7 Extension
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_uuidv7;

-- ============================================================================
-- Research Runs Table (UUIDv7)
-- ============================================================================
CREATE TABLE research_runs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  
  -- Configuration (immutable after creation)
  config JSONB NOT NULL,
  seed_data JSONB NOT NULL,
  
  -- Trigger.dev integration
  trigger_run_id TEXT UNIQUE,
  trigger_idempotency_key TEXT UNIQUE,
  
  -- Execution state
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  current_depth INTEGER DEFAULT 0,
  
  -- Budget tracking
  queries_executed INTEGER DEFAULT 0,
  sources_discovered INTEGER DEFAULT 0,
  
  -- Domain tracking
  domain VARCHAR(50),
  
  -- Final output (only set on completion)
  output JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  CONSTRAINT check_run_status CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
  )
);

-- Indexes for research_runs
CREATE INDEX idx_research_runs_company_id ON research_runs(company_id);
CREATE INDEX idx_research_runs_status ON research_runs(status);
CREATE INDEX idx_research_runs_trigger_run ON research_runs(trigger_run_id);
CREATE INDEX idx_research_runs_domain ON research_runs(company_id, domain);

-- ============================================================================
-- Search Queries Table
-- ============================================================================
CREATE TABLE search_queries (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  run_id UUID NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
  
  -- Tree structure (adjacency list)
  parent_id UUID REFERENCES search_queries(id) ON DELETE CASCADE,
  
  depth INTEGER NOT NULL DEFAULT 0,
  
  -- Query details
  query_text TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  domain VARCHAR(50),
  
  -- Execution state
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  execution_attempt INTEGER DEFAULT 0,
  
  -- Results metadata
  results_count INTEGER DEFAULT 0,
  results_json JSONB,
  
  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  
  -- Error tracking
  error_message TEXT,
  
  CONSTRAINT check_query_status CHECK (
    status IN ('pending', 'executing', 'completed', 'failed', 'skipped')
  ),
  CONSTRAINT check_depth_non_negative CHECK (depth >= 0)
);

-- Indexes for search_queries
CREATE INDEX idx_search_queries_run_id ON search_queries(run_id);
CREATE INDEX idx_search_queries_parent_id ON search_queries(parent_id);
CREATE INDEX idx_search_queries_status ON search_queries(run_id, status);
CREATE INDEX idx_search_queries_depth ON search_queries(run_id, depth, status);
CREATE INDEX idx_search_queries_domain ON search_queries(run_id, domain);
CREATE INDEX idx_search_queries_results ON search_queries USING GIN(results_json jsonb_path_ops);

