import { getDBClient } from '../client';
import type { ScrapeStatus, DiscoveredUrl, ScrapeStats } from '@/lib/scraping/types';
import { createHash } from 'crypto';

/**
 * Generate SHA256 hash of URL for deduplication
 */
export function generateUrlHash(url: string): string {
  return createHash('sha256').update(url.trim()).digest('hex');
}

interface CreateDiscoveredUrlParams {
  runId: string;
  queryId: string;
  url: string;
  title?: string;
  snippet?: string;
  rank?: number;
}

/**
 * Create discovered URL record (idempotent via ON CONFLICT)
 */
export async function createDiscoveredUrl(
  params: CreateDiscoveredUrlParams
): Promise<DiscoveredUrl> {
  const sql = getDBClient();
  const { runId, queryId, url, title, snippet, rank } = params;
  const urlHash = generateUrlHash(url);

  const rows = await sql`
    INSERT INTO discovered_urls (
      run_id, query_id, url, url_hash, title, snippet, rank, scrape_status
    ) VALUES (
      ${runId}, ${queryId}, ${url}, ${urlHash}, 
      ${title || null}, ${snippet || null}, ${rank || null}, 'pending'
    )
    ON CONFLICT (run_id, url_hash) DO UPDATE SET
      title = COALESCE(EXCLUDED.title, discovered_urls.title),
      snippet = COALESCE(EXCLUDED.snippet, discovered_urls.snippet),
      rank = COALESCE(EXCLUDED.rank, discovered_urls.rank),
      updated_at = NOW()
    RETURNING *
  `;

  return mapRowToDiscoveredUrl(rows[0]);
}

/**
 * Batch create discovered URLs (efficient bulk insert)
 * Best practice: Use batch operations for performance
 */
export async function createDiscoveredUrls(
  params: CreateDiscoveredUrlParams[]
): Promise<DiscoveredUrl[]> {
  if (params.length === 0) return [];

  const sql = getDBClient();

  const values = params.map((p) => ({
    run_id: p.runId,
    query_id: p.queryId,
    url: p.url,
    url_hash: generateUrlHash(p.url),
    title: p.title || null,
    snippet: p.snippet || null,
    rank: p.rank || null,
    scrape_status: 'pending' as const,
  }));

  const placeholders = values
    .map((_, index) => {
      const offset = index * 8;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
    })
    .join(', ');

  const flatValues = values.flatMap((v) => [
    v.run_id,
    v.query_id,
    v.url,
    v.url_hash,
    v.title,
    v.snippet,
    v.rank,
    v.scrape_status,
  ]);

  const rows = await sql.query(
    `INSERT INTO discovered_urls (run_id, query_id, url, url_hash, title, snippet, rank, scrape_status)
     VALUES ${placeholders}
     ON CONFLICT (run_id, url_hash) DO UPDATE SET
       title = COALESCE(EXCLUDED.title, discovered_urls.title),
       snippet = COALESCE(EXCLUDED.snippet, discovered_urls.snippet),
       rank = COALESCE(EXCLUDED.rank, discovered_urls.rank),
       updated_at = NOW()
     RETURNING *`,
    flatValues
  );

  return rows.map(mapRowToDiscoveredUrl);
}

interface UpdateScrapeStatusParams {
  id: string;
  status: ScrapeStatus;
  content?: string;
  contentLength?: number;
  scraperProvider?: string;
  scrapeDurationMs?: number;
  errorMessage?: string;
  isRetryable?: boolean;
}

/**
 * Update scrape status (called after scraping attempt)
 */
export async function updateScrapeStatus(
  params: UpdateScrapeStatusParams
): Promise<void> {
  const sql = getDBClient();
  const {
    id,
    status,
    content,
    contentLength,
    scraperProvider,
    scrapeDurationMs,
    errorMessage,
    isRetryable,
  } = params;

  await sql`
    UPDATE discovered_urls
    SET 
      scrape_status = ${status},
      content = ${content || null},
      content_length = ${contentLength || null},
      scraper_provider = ${scraperProvider || null},
      scrape_duration_ms = ${scrapeDurationMs || null},
      scraped_at = ${status === 'scraped' ? sql`NOW()` : sql`scraped_at`},
      error_message = ${errorMessage || null},
      is_retryable = ${isRetryable !== undefined ? isRetryable : sql`is_retryable`},
      scrape_attempt = scrape_attempt + 1,
      updated_at = NOW()
    WHERE id = ${id}
  `;
}

/**
 * Get pending URLs for scraping (ordered by rank)
 */
export async function getPendingUrls(runId: string): Promise<DiscoveredUrl[]> {
  const sql = getDBClient();

  const rows = await sql`
    SELECT * FROM discovered_urls
    WHERE run_id = ${runId} 
      AND scrape_status = 'pending'
    ORDER BY rank NULLS LAST, created_at
  `;

  return rows.map(mapRowToDiscoveredUrl);
}

/**
 * Get all discovered URLs for a run
 */
export async function getDiscoveredUrlsByRun(runId: string): Promise<DiscoveredUrl[]> {
  const sql = getDBClient();

  const rows = await sql`
    SELECT * FROM discovered_urls
    WHERE run_id = ${runId}
    ORDER BY rank NULLS LAST, created_at
  `;

  return rows.map(mapRowToDiscoveredUrl);
}

/**
 * Batch update scrape status (optimized for concurrent scraping)
 * Uses Promise.all for parallel updates over connection pool
 */
export async function batchUpdateScrapeStatus(
  updates: Array<{
    id: string;
    status: ScrapeStatus;
    content?: string;
    contentLength?: number;
    scraperProvider?: string;
    scrapeDurationMs?: number;
    errorMessage?: string;
    isRetryable?: boolean;
  }>
): Promise<void> {
  if (updates.length === 0) return;

  const sql = getDBClient();

  await Promise.all(
    updates.map(async (update) => {
      await sql`
        UPDATE discovered_urls
        SET 
          scrape_status = ${update.status},
          content = ${update.content || null},
          content_length = ${update.contentLength || null},
          scraper_provider = ${update.scraperProvider || null},
          scrape_duration_ms = ${update.scrapeDurationMs || null},
          scraped_at = ${update.status === 'scraped' ? sql`NOW()` : sql`scraped_at`},
          error_message = ${update.errorMessage || null},
          is_retryable = ${update.isRetryable !== undefined ? update.isRetryable : sql`is_retryable`},
          scrape_attempt = scrape_attempt + 1,
          updated_at = NOW()
        WHERE id = ${update.id}
      `;
    })
  );
}

/**
 * Get scrape statistics for a run
 */
export async function getScrapeStats(runId: string): Promise<ScrapeStats> {
  const sql = getDBClient();

  const rows = await sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE scrape_status = 'scraped')::int as scraped,
      COUNT(*) FILTER (WHERE scrape_status = 'pending')::int as pending,
      COUNT(*) FILTER (WHERE scrape_status = 'failed')::int as failed,
      AVG(scrape_duration_ms) FILTER (WHERE scrape_status = 'scraped') as avg_duration_ms,
      SUM(content_length) FILTER (WHERE scrape_status = 'scraped') as total_content_length
    FROM discovered_urls
    WHERE run_id = ${runId}
  `;

  const row = rows[0];
  return {
    total: row.total || 0,
    scraped: row.scraped || 0,
    pending: row.pending || 0,
    failed: row.failed || 0,
    avgDurationMs: row.avg_duration_ms ? Number(row.avg_duration_ms) : undefined,
    totalContentLength: row.total_content_length ? Number(row.total_content_length) : undefined,
  };
}

interface CreateScrapedUrlParams {
  runId: string;
  queryId?: string | null;
  url: string;
  content: string;
  contentLength: number;
  scraperProvider: string;
  scrapeDurationMs: number;
  title?: string;
}

/**
 * Create discovered URL record with scraped content (for one-off scraping)
 * Used when scraping happens outside normal discovery flow (e.g., direct extraction)
 * queryId is optional - NULL for direct scrapes, UUID for search-discovered URLs
 */
export async function createScrapedUrl(
  params: CreateScrapedUrlParams
): Promise<DiscoveredUrl> {
  const sql = getDBClient();
  const { runId, queryId, url, content, contentLength, scraperProvider, scrapeDurationMs, title } = params;
  const urlHash = generateUrlHash(url);

  const rows = await sql`
    INSERT INTO discovered_urls (
      run_id, query_id, url, url_hash, title, scrape_status, 
      content, content_length, scraper_provider, scrape_duration_ms, scraped_at
    ) VALUES (
      ${runId}, ${queryId || null}, ${url}, ${urlHash}, ${title || null}, 'scraped',
      ${content}, ${contentLength}, ${scraperProvider}, ${scrapeDurationMs}, NOW()
    )
    ON CONFLICT (run_id, url_hash) DO UPDATE SET
      title = COALESCE(EXCLUDED.title, discovered_urls.title),
      scrape_status = 'scraped',
      content = EXCLUDED.content,
      content_length = EXCLUDED.content_length,
      scraper_provider = EXCLUDED.scraper_provider,
      scrape_duration_ms = EXCLUDED.scrape_duration_ms,
      scraped_at = NOW(),
      updated_at = NOW()
    RETURNING *
  `;

  return mapRowToDiscoveredUrl(rows[0]);
}

/**
 * Map database row to DiscoveredUrl type
 */
function mapRowToDiscoveredUrl(row: Record<string, unknown>): DiscoveredUrl {
  return {
    id: row.id as string,
    runId: row.run_id as string,
    queryId: (row.query_id as string | null) || undefined,
    url: row.url as string,
    urlHash: row.url_hash as string,
    title: (row.title as string | null) || undefined,
    snippet: (row.snippet as string | null) || undefined,
    rank: (row.rank as number | null) || undefined,
    scrapeStatus: row.scrape_status as ScrapeStatus,
    content: (row.content as string | null) || undefined,
    contentLength: (row.content_length as number | null) || undefined,
    scraperProvider: (row.scraper_provider as string | null) || undefined,
    errorMessage: (row.error_message as string | null) || undefined,
    isRetryable: (row.is_retryable as boolean | null) || undefined,
    scrapeAttempt: row.scrape_attempt as number,
    discoveredAt: new Date(row.discovered_at as Date | string),
    scrapedAt: row.scraped_at ? new Date(row.scraped_at as Date | string) : undefined,
    createdAt: new Date(row.created_at as Date | string),
    updatedAt: new Date(row.updated_at as Date | string),
  };
}
