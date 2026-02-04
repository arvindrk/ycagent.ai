export type ScrapeStatus =
  | 'pending'
  | 'scraping'
  | 'scraped'
  | 'failed'
  | 'blocked'
  | 'timeout';

export interface ScrapeOptions {
  format?: 'markdown' | 'json';
  jsonSchema?: object;
  prompt?: string;
}

export interface ScraperProvider {
  readonly name: string;
  scrape(url: string, options?: ScrapeOptions): Promise<ScrapedContent>;
  extract(url: string, schema: object, prompt?: string): Promise<ScrapedContent>;
}

export interface ScrapedContent {
  url: string;
  content: string;
  contentLength: number;
  scrapedAt: Date;
  durationMs: number;
  metadata?: {
    format?: 'markdown' | 'json';
    structuredData?: unknown;
    title?: string;
    description?: string;
    statusCode?: number;
    [key: string]: unknown;
  };
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
