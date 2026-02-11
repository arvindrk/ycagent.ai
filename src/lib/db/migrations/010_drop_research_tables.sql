-- Migration: Remove deep research tables
-- Description: Clean up research_runs, search_queries, discovered_urls tables (no longer needed)

-- Drop in reverse order of dependencies
DROP TABLE IF EXISTS discovered_urls CASCADE;
DROP TABLE IF EXISTS search_queries CASCADE;
DROP TABLE IF EXISTS research_runs CASCADE;

-- Drop any remaining indexes (safety check)
DROP INDEX IF EXISTS idx_research_runs_company_id;
DROP INDEX IF EXISTS idx_research_runs_status;
DROP INDEX IF EXISTS idx_research_runs_trigger_run;
DROP INDEX IF EXISTS idx_research_runs_parent_id;
DROP INDEX IF EXISTS idx_research_runs_orchestrator;
DROP INDEX IF EXISTS idx_research_runs_domain;

DROP INDEX IF EXISTS idx_search_queries_run_id;
DROP INDEX IF EXISTS idx_search_queries_parent_id;
DROP INDEX IF EXISTS idx_search_queries_status;
DROP INDEX IF EXISTS idx_search_queries_depth;
DROP INDEX IF EXISTS idx_search_queries_domain;
DROP INDEX IF EXISTS idx_search_queries_results;

DROP INDEX IF EXISTS idx_discovered_urls_run_id;
DROP INDEX IF EXISTS idx_discovered_urls_query_id;
DROP INDEX IF EXISTS idx_discovered_urls_url_hash;
DROP INDEX IF EXISTS idx_discovered_urls_pending;
DROP INDEX IF EXISTS idx_discovered_urls_status;
DROP INDEX IF EXISTS idx_discovered_urls_created_at;
