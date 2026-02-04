import Firecrawl from '@mendable/firecrawl-js';
import { getEnv } from '@/lib/env';
import type { ScraperProvider, ScrapedContent, ScrapeOptions } from '../types';

export class FirecrawlProvider implements ScraperProvider {
  readonly name = 'firecrawl';
  private client: Firecrawl;

  constructor(apiKey?: string) {
    this.client = new Firecrawl({
      apiKey: apiKey || getEnv().FIRE_CRAWL_API_KEY,
    });
  }

  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapedContent> {
    const startTime = Date.now();

    try {
      const format = options?.format || 'markdown';

      if (format === 'json' && options?.jsonSchema) {
        return await this.scrapeAsJson(url, options.jsonSchema, options.prompt);
      }

      return await this.scrapeAsMarkdown(url);

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

  private async scrapeAsJson(
    url: string,
    schema: object,
    prompt?: string
  ): Promise<ScrapedContent> {
    const startTime = Date.now();

    const result = await this.client.scrape(url, {
      formats: [{
        type: 'json',
        schema,
        prompt,
      }],
      onlyMainContent: true,
      timeout: 60000,
    });

    const structuredData = result.json;
    const content = JSON.stringify(structuredData, null, 2);
    const durationMs = Date.now() - startTime;

    return {
      url,
      content,
      contentLength: content.length,
      scrapedAt: new Date(),
      durationMs,
      metadata: {
        format: 'json',
        structuredData,
        title: result.metadata?.title,
        statusCode: result.metadata?.statusCode,
      },
    };
  }

  private async scrapeAsMarkdown(url: string): Promise<ScrapedContent> {
    const startTime = Date.now();

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
        format: 'markdown',
        title: result.metadata?.title,
        description: result.metadata?.description,
        statusCode: result.metadata?.statusCode,
      },
    };
  }

  async extract(
    url: string,
    schema: object,
    prompt?: string
  ): Promise<ScrapedContent> {
    const startTime = Date.now();

    console.log(`[FirecrawlProvider] Starting extraction for ${url}`);

    try {
      const result = await this.client.extract({
        urls: [url],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema: schema as any,
        prompt,
        allowExternalLinks: false,
        enableWebSearch: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractedData = (result as any).data?.[0];
      const content = JSON.stringify(extractedData, null, 2);
      const durationMs = Date.now() - startTime;

      console.log(`[FirecrawlProvider] Extraction completed in ${durationMs}ms`);

      return {
        url,
        content,
        contentLength: content.length,
        scrapedAt: new Date(),
        durationMs,
        metadata: {
          format: 'json',
          structuredData: extractedData,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const isRetryable = this.classifyError(error);

      const enhancedError = Object.assign(
        new Error(
          `FireCrawl extract failed for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
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
