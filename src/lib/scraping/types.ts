export type ScrapeStatus =
  | 'pending'
  | 'scraping'
  | 'scraped'
  | 'failed'
  | 'blocked'
  | 'timeout';

export interface ScraperProvider {
  readonly name: string;
  scrape(url: string): Promise<ScrapedContent>;
}

export interface ScrapedContent {
  url: string;
  content: string;
  contentLength: number;
  scrapedAt: Date;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export interface ScrapeResult {
  url: string;
  urlHash: string;
  status: ScrapeStatus;
  content?: string;
  contentLength?: number;
  error?: string;
  durationMs?: number;
}

export interface DiscoveredUrl {
  id: string;
  runId: string;
  queryId: string;
  url: string;
  urlHash: string;
  title?: string;
  snippet?: string;
  rank?: number;
  scrapeStatus: ScrapeStatus;
  content?: string;
  contentLength?: number;
  scraperProvider?: string;
  errorMessage?: string;
  isRetryable?: boolean;
  scrapeAttempt: number;
  discoveredAt: Date;
  scrapedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScrapeStats {
  total: number;
  scraped: number;
  pending: number;
  failed: number;
  avgDurationMs?: number;
  totalContentLength?: number;
}
