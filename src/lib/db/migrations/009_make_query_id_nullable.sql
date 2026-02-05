-- Make query_id nullable for direct scrapes
-- Migration: 009_make_query_id_nullable
-- Description: Allow discovered_urls without search queries (e.g., direct YC page extraction)

-- Make query_id nullable (some URLs are scraped directly, not discovered via search)
ALTER TABLE discovered_urls
  ALTER COLUMN query_id DROP NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN discovered_urls.query_id IS 
  'UUID of search query that discovered this URL (NULL for direct scrapes like YC extraction)';
