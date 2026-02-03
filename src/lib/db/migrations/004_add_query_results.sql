-- Migration: Add results storage to search queries
-- Description: Store search results as JSONB in query records

ALTER TABLE search_queries 
ADD COLUMN results_json JSONB;

CREATE INDEX idx_search_queries_results 
ON search_queries USING GIN(results_json jsonb_path_ops);
