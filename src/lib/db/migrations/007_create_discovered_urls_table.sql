-- Migration: Create discovered_urls table for URL discovery and scraping
-- Description: Tracks URLs discovered from search queries with scraping lifecycle
-- Uses UUIDv7 for time-ordered primary keys (better index performance)

-- Note: pg_uuidv7 extension already enabled in migration 006

-- ============================================================================
-- discovered_urls: URLs discovered from search results with scraping state
-- ============================================================================
CREATE TABLE discovered_urls (
  -- Identity (UUIDv7 for time-ordered IDs)
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  run_id UUID NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
  query_id UUID NOT NULL REFERENCES search_queries(id) ON DELETE CASCADE,
  
  -- URL identity
  url TEXT NOT NULL,
  url_hash VARCHAR(64) NOT NULL,
  -- SHA256(url) for fast per-run deduplication
  
  -- Discovery metadata (from search results)
  title TEXT,
  snippet TEXT,
  rank INTEGER,
  -- Position in search results (1-10)
  
  discovered_at TIMESTAMP DEFAULT NOW(),
  
  -- Scraping lifecycle
  scrape_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Values: pending, scraping, scraped, failed, blocked, timeout
  
  scrape_attempt INTEGER DEFAULT 0,
  scraped_at TIMESTAMP,
  scrape_duration_ms INTEGER,
  
  -- Scraped content
  content TEXT,
  -- Cleaned markdown
  
  content_length INTEGER,
  
  -- Provider tracking (tool-agnostic design)
  scraper_provider VARCHAR(50),
  -- Values: 'firecrawl', 'puppeteer', 'playwright', etc.
  
  -- Error handling
  error_message TEXT,
  is_retryable BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Per-run deduplication (prevents scraping same URL twice in same run)
  CONSTRAINT unique_url_per_run UNIQUE(run_id, url_hash),
  
  -- Status validation
  CONSTRAINT check_scrape_status CHECK (
    scrape_status IN ('pending', 'scraping', 'scraped', 'failed', 'blocked', 'timeout')
  )
);

-- ============================================================================
-- Indexes for efficient queries
-- ============================================================================

-- Core foreign key indexes
CREATE INDEX idx_discovered_urls_run_id ON discovered_urls(run_id);
CREATE INDEX idx_discovered_urls_query_id ON discovered_urls(query_id);

-- URL hash for deduplication checks
CREATE INDEX idx_discovered_urls_url_hash ON discovered_urls(url_hash);

-- Status-based queries (fetch pending scrapes)
CREATE INDEX idx_discovered_urls_pending 
  ON discovered_urls(run_id, scrape_status, rank NULLS LAST)
  WHERE scrape_status = 'pending';

-- Status distribution queries
CREATE INDEX idx_discovered_urls_status 
  ON discovered_urls(run_id, scrape_status);

-- Time-range queries (UUIDv7 enables efficient time-based queries)
CREATE INDEX idx_discovered_urls_created_at ON discovered_urls(created_at);

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE discovered_urls IS 'URLs discovered from search queries with scraping lifecycle tracking (MVP: per-run deduplication only)';
COMMENT ON COLUMN discovered_urls.id IS 'UUIDv7: time-ordered UUID for better index performance';
COMMENT ON COLUMN discovered_urls.url_hash IS 'SHA256 hash of URL for fast deduplication within run';
COMMENT ON COLUMN discovered_urls.scraper_provider IS 'Tool-agnostic provider name (firecrawl, puppeteer, etc.) for swappable scrapers';
COMMENT ON CONSTRAINT unique_url_per_run ON discovered_urls IS 'Per-run deduplication: prevents scraping same URL twice in same run (no global cache for MVP)';
COMMENT ON CONSTRAINT check_scrape_status ON discovered_urls IS 'Valid scrape statuses: pending (not started), scraping (in progress), scraped (success), failed (error), blocked (403/bot detection), timeout (took too long)';
