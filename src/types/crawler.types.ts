export interface BaseCrawlerProvider {
  name: string;
  scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult>;
  map(url: string, options?: MapOptions): Promise<MapResult>;
}

export enum CrawlerProvider {
  FIRECRAWL = 'firecrawl'
}

export interface CrawlerConfig {
  provider?: CrawlerProvider;
  apiKey?: string;
}

export type ScrapeFormat = 'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot';

export interface ScrapeOptions {
  formats?: ScrapeFormat[];
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
}

export interface ScrapeResult {
  url: string;
  provider: string;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  screenshot?: string;
}

export type SitemapMode = 'include' | 'skip' | 'only';

export interface MapOptions {
  limit?: number;
  search?: string;
  includeSubdomains?: boolean;
  ignoreQueryParameters?: boolean;
  sitemap?: SitemapMode;
}

export interface MapResult {
  url: string;
  provider: string;
  urls: string[];
  totalFound: number;
}
