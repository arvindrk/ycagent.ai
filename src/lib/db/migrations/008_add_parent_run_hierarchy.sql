-- Add parent-child hierarchy to research_runs
-- Migration: 008_add_parent_run_hierarchy
-- Description: Enables orchestrator pattern where parent runs coordinate child research runs

-- Add parent_run_id for self-referencing hierarchy
ALTER TABLE research_runs
  ADD COLUMN parent_run_id UUID REFERENCES research_runs(id) ON DELETE CASCADE;

-- Make domain nullable (orchestrator runs don't have a domain)
ALTER TABLE research_runs
  ALTER COLUMN domain DROP NOT NULL;

-- Add constraint with more flexible logic:
-- If parent_run_id IS NULL:
--   - domain can be NULL (orchestrator) OR NOT NULL (legacy/standalone research)
-- If parent_run_id IS NOT NULL:
--   - domain must be NOT NULL (child research run)
ALTER TABLE research_runs
  ADD CONSTRAINT check_orchestrator_or_research
  CHECK (
    (parent_run_id IS NULL) OR
    (parent_run_id IS NOT NULL AND domain IS NOT NULL)
  );

-- Index for querying child runs
CREATE INDEX idx_research_runs_parent_id 
  ON research_runs(parent_run_id);

-- Index for finding orchestrator runs by company
CREATE INDEX idx_research_runs_orchestrator
  ON research_runs(company_id, parent_run_id) 
  WHERE parent_run_id IS NULL;

-- Comments for documentation
COMMENT ON COLUMN research_runs.parent_run_id IS 
  'NULL for orchestrator runs (top-level), UUID for child research runs';

COMMENT ON CONSTRAINT check_orchestrator_or_research ON research_runs IS
  'Orchestrators have NULL parent and NULL domain; research runs have parent and domain';
