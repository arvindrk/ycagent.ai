-- Add domain tracking to discovery system
-- Migration: 005_add_domain_support

-- Add domain column to search queries
ALTER TABLE search_queries 
  ADD COLUMN domain VARCHAR(50);

-- Add domain column to research runs
ALTER TABLE research_runs
  ADD COLUMN domain VARCHAR(50);

-- Index for domain-filtered queries
CREATE INDEX idx_search_queries_domain 
  ON search_queries(run_id, domain);

-- Index for research run domain queries
CREATE INDEX idx_research_runs_domain 
  ON research_runs(company_id, domain);
