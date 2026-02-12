import Firecrawl from '@mendable/firecrawl-js';
import type {
  CrawlerProvider,
  CrawlerConfig,
  ScrapeOptions,
  ScrapeResult,
  MapOptions,
  MapResult
} from '../types';
import {
  CrawlerError,
  RateLimitError,
  AuthenticationError
} from '../errors';

export class FirecrawlCrawlerProvider implements CrawlerProvider {
  name = 'firecrawl';
  private client: Firecrawl;

  constructor(config?: CrawlerConfig) {
    const apiKey = config?.apiKey || process.env.FIRE_CRAWL_API_KEY;
    if (!apiKey) {
      throw new AuthenticationError(this.name);
    }
    this.client = new Firecrawl({ apiKey });
  }

  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult> {
    try {
      const formats = options?.formats || ['markdown'];
      const response = await this.client.scrape(url, {
        formats,
        onlyMainContent: options?.onlyMainContent ?? true,
        includeTags: options?.includeTags,
        excludeTags: options?.excludeTags,
      });

      return {
        url,
        provider: this.name,
        markdown: response.markdown,
        html: response.html,
        rawHtml: response.rawHtml,
        links: response.links,
        screenshot: response.screenshot,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async map(url: string, options?: MapOptions): Promise<MapResult> {
    try {
      const response = await this.client.map(url, {
        limit: options?.limit,
        search: options?.search,
        includeSubdomains: options?.includeSubdomains,
        ignoreQueryParameters: options?.ignoreQueryParameters,
        sitemap: options?.sitemap || 'include',
      });

      const urls = response.links?.map((link) => link.url) || [];
      
      return {
        url,
        provider: this.name,
        urls,
        totalFound: urls.length,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    
    if (message.includes('rate limit')) {
      return new RateLimitError(this.name);
    }
    if (message.includes('auth') || message.includes('API key')) {
      return new AuthenticationError(this.name);
    }
    return new CrawlerError(message || 'Unknown error', this.name);
  }
}
