import Firecrawl from '@mendable/firecrawl-js';
import { getEnv } from '@/lib/env';
import type { ScraperProvider, ScrapedContent } from '../types';

export class FirecrawlProvider implements ScraperProvider {
  readonly name = 'firecrawl';
  private client: Firecrawl;

  constructor(apiKey?: string) {
    this.client = new Firecrawl({
      apiKey: apiKey || getEnv().FIRE_CRAWL_API_KEY,
    });
  }

  async scrape(url: string): Promise<ScrapedContent> {
    const startTime = Date.now();

    try {
      const result = await this.client.scrape(url, {
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 30000,
      });

      const content = result.markdown || '';
      const durationMs = Date.now() - startTime;

      return {
        url,
        content,
        contentLength: content.length,
        scrapedAt: new Date(),
        durationMs,
        metadata: {
          title: result.metadata?.title,
          description: result.metadata?.description,
          statusCode: result.metadata?.statusCode,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const isRetryable = this.classifyError(error);

      const enhancedError = Object.assign(
        new Error(
          `FireCrawl scrape failed for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
        ),
        {
          isRetryable,
          originalError: error,
          durationMs,
        }
      );

      throw enhancedError;
    }
  }

  private classifyError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (
        message.includes('not found') ||
        message.includes('404') ||
        message.includes('forbidden') ||
        message.includes('403') ||
        message.includes('unauthorized') ||
        message.includes('401') ||
        message.includes('invalid url') ||
        message.includes('invalid format')
      ) {
        return false;
      }

      if (
        message.includes('timeout') ||
        message.includes('rate limit') ||
        message.includes('429') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('500') ||
        message.includes('connection') ||
        message.includes('network') ||
        message.includes('econnrefused')
      ) {
        return true;
      }
    }

    return true;
  }
}
