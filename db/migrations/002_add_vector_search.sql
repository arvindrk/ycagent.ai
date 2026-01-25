-- Migration: Add vector search capabilities
-- Description: Adds pgvector support, embedding column, HNSW index, and full-text search

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add vector column for embeddings (768 dimensions for text-embedding-3-small)
ALTER TABLE companies ADD COLUMN embedding vector(768);

-- 3. Add full-text search support (lightweight fallback)
-- Generated column that combines multiple text fields with different weights
ALTER TABLE companies ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', name), 'A') ||
    setweight(to_tsvector('english', COALESCE(one_liner, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(long_description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(all_locations, '')), 'D')
  ) STORED;

-- 4. Create HNSW index for vector similarity search
-- Configuration optimized for accuracy over speed:
-- - m=16: Number of connections per layer (higher = better recall)
-- - ef_construction=64: Size of dynamic candidate list during construction
CREATE INDEX idx_companies_embedding_hnsw
  ON companies USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 5. Create GIN index for full-text search fallback
CREATE INDEX idx_companies_search_vector
  ON companies USING GIN(search_vector);

-- 6. Add filter index for batch queries
-- Partial index to save space (only indexes non-null values)
CREATE INDEX idx_companies_batch
  ON companies(batch) WHERE batch IS NOT NULL;

-- 7. Add indexes for other common filters
CREATE INDEX idx_companies_stage ON companies(stage) WHERE stage IS NOT NULL;
CREATE INDEX idx_companies_team_size ON companies(team_size) WHERE team_size IS NOT NULL;

-- Note: JSONB array indexes already exist from migration 001:
-- - idx_companies_tags (GIN index on tags)
-- These work efficiently with the ?| operator for array containment queries
