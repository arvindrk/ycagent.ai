-- Migration: Create discovery module tables
-- Description: Core tables for recursive web research and discovery system

-- ============================================================================
-- research_runs: Top-level orchestration state for discovery runs
-- ============================================================================
CREATE TABLE research_runs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  
  -- Configuration (immutable after creation)
  config JSONB NOT NULL,
  -- Example: {
  --   "max_depth": 2,
  --   "max_breadth": 3,
  --   "max_queries": 50,
  --   "platforms": ["google", "github"]
  -- }
  
  seed_data JSONB NOT NULL,
  -- Example: {
  --   "name": "Neon",
  --   "website": "https://neon.tech",
  --   "description": "Serverless Postgres",
  --   "batch": "W21",
  --   "tags": ["developer-tools", "database"]
  -- }
  
  -- Trigger.dev integration
  trigger_run_id TEXT UNIQUE,
  trigger_idempotency_key TEXT UNIQUE,
  
  -- Execution state
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Values: pending, running, completed, failed, cancelled
  
  current_depth INTEGER DEFAULT 0,
  -- Resume point for crash recovery
  
  -- Budget tracking
  queries_executed INTEGER DEFAULT 0,
  sources_discovered INTEGER DEFAULT 0,
  
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

-- ============================================================================
-- search_queries: Recursive tree of search queries
-- ============================================================================
CREATE TABLE search_queries (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
  
  -- Tree structure (adjacency list)
  parent_id UUID REFERENCES search_queries(id) ON DELETE CASCADE,
  -- NULL = root query (depth 0)
  
  depth INTEGER NOT NULL DEFAULT 0,
  -- 0 = initial query, 1 = first followup, etc.
  
  -- Query details
  query_text TEXT NOT NULL,
  -- Example: "Neon database funding round"
  
  platform VARCHAR(50) NOT NULL,
  -- Values: google, linkedin, github, twitter
  
  -- Execution state
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Values: pending, executing, completed, failed, skipped
  
  execution_attempt INTEGER DEFAULT 0,
  
  -- Results metadata
  results_count INTEGER DEFAULT 0,
  -- How many raw results returned from platform
  
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
