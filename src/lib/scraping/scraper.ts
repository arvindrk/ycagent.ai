import type { ScraperProvider, ScrapeResult, ScrapeStrategy, DiscoveredUrl, ScrapedContent } from './types';
import {
  createDiscoveredUrls,
  batchUpdateScrapeStatus,
  getPendingUrls,
  createScrapedUrl,
} from '../db/queries/discovered-urls.queries';
import { logger } from '@trigger.dev/sdk/v3';
import type { ScrapeStats } from './types';

export class ScraperModule {
  constructor(private provider: ScraperProvider) { }

  async discoverUrls(
    runId: string,
    queryId: string,
    urls: Array<{
      url: string;
      title?: string;
      snippet?: string;
      rank?: number;
    }>
  ): Promise<void> {
    if (urls.length === 0) {
      console.log(`   [Scraper] No URLs to discover`);
      logger.info('no_urls_to_discover', { runId, queryId });
      return;
    }

    const discovered = await createDiscoveredUrls(
      urls.map((item) => ({
        runId,
        queryId,
        url: item.url,
        title: item.title,
        snippet: item.snippet,
        rank: item.rank,
      }))
    );

    console.log(`   [Scraper] Discovered ${discovered.length} URLs for scraping`);
    logger.info('urls_discovered', {
      runId,
      queryId,
      count: discovered.length,
      urls: discovered.map(d => d.url),
    });
  }

  async scrapePendingUrls(
    runId: string,
    strategySelector: (url: DiscoveredUrl) => ScrapeStrategy
  ): Promise<{ results: ScrapeResult[], stats: ScrapeStats }> {
    const pending = await getPendingUrls(runId);

    if (pending.length === 0) {
      console.log(`   [Scraper] No pending URLs to scrape`);
      logger.info('no_pending_urls', { runId });
      return {
        results: [],
        stats: { total: 0, scraped: 0, pending: 0, failed: 0 }
      };
    }

    console.log(`   [Scraper] Starting scrape of ${pending.length} URLs with ${this.provider.name}`);
    logger.info('scraping_urls_started', {
      runId,
      count: pending.length,
      provider: this.provider.name,
    });

    const results = await Promise.allSettled(
      pending.map((discoveredUrl) => {
        const strategy = strategySelector(discoveredUrl);
        return this.scrapeUrl(discoveredUrl.id, discoveredUrl.url, strategy);
      })
    );

    const scrapeResults: ScrapeResult[] = results.map((result, index) => {
      const discoveredUrl = pending[index];

      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: discoveredUrl.url,
          urlHash: discoveredUrl.urlHash,
          status: 'failed',
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    await batchUpdateScrapeStatus(
      scrapeResults.map((r) => ({
        id: pending.find(p => p.url === r.url)!.id,
        status: r.status,
        content: r.content,
        contentLength: r.contentLength,
        scraperProvider: r.status === 'scraped' ? this.provider.name : undefined,
        scrapeDurationMs: r.durationMs,
        errorMessage: r.error,
        isRetryable: r.error ? !r.error.includes('blocked') : undefined,
      }))
    );

    const stats = this.calculateStats(scrapeResults);

    console.log(`   [Scraper] Completed: ${stats.scraped} succeeded, ${stats.failed} failed`);
    if (stats.avgDurationMs) {
      console.log(`   [Scraper] Avg scrape time: ${stats.avgDurationMs.toFixed(0)}ms`);
    }

    logger.info('scraping_urls_completed', {
      runId,
      total: pending.length,
      succeeded: stats.scraped,
      failed: stats.failed,
      avgDurationMs: stats.avgDurationMs,
      totalContentLength: stats.totalContentLength,
    });

    return { results: scrapeResults, stats };
  }

  private async scrapeUrl(
    discoveredUrlId: string,
    url: string,
    strategy: ScrapeStrategy
  ): Promise<ScrapeResult> {
    const startTime = Date.now();

    try {
      let scraped: ScrapedContent;

      if (strategy.type === 'extract') {
        scraped = await this.provider.extract(url, strategy.schema, strategy.prompt);
      } else if (strategy.type === 'json') {
        scraped = await this.provider.scrape(url, {
          format: 'json',
          jsonSchema: strategy.schema,
          prompt: strategy.prompt,
        });
      } else {
        scraped = await this.provider.scrape(url, { format: 'markdown' });
      }

      logger.info('url_scraped', {
        discoveredUrlId,
        url,
        contentLength: scraped.contentLength,
        durationMs: Date.now() - startTime,
        strategy: strategy.type,
      });

      return {
        url,
        urlHash: '',
        status: 'scraped',
        content: scraped.content,
        contentLength: scraped.contentLength,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      let scrapeStatus: 'failed' | 'blocked' | 'timeout' = 'failed';
      if (errorMessage.includes('timeout')) {
        scrapeStatus = 'timeout';
      } else if (errorMessage.includes('blocked') || errorMessage.includes('403')) {
        scrapeStatus = 'blocked';
      }

      logger.error('url_scrape_failed', {
        discoveredUrlId,
        url,
        error: errorMessage,
        durationMs: Date.now() - startTime,
        strategy: strategy.type,
      });

      return {
        url,
        urlHash: '',
        status: scrapeStatus,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      };
    }
  }

  async scrapeAndRecordUrl(
    runId: string,
    queryId: string | null,
    url: string,
    strategy: ScrapeStrategy
  ): Promise<ScrapedContent> {
    const startTime = Date.now();

    console.log(`   [Scraper] Scraping URL: ${url} with strategy: ${strategy.type}`);
    logger.info('scraping_url', {
      runId,
      queryId: queryId || 'direct',
      url,
      strategy: strategy.type,
      provider: this.provider.name,
    });

    try {
      let scraped: ScrapedContent;

      if (strategy.type === 'extract') {
        scraped = await this.provider.extract(url, strategy.schema, strategy.prompt);
      } else if (strategy.type === 'json') {
        scraped = await this.provider.scrape(url, {
          format: 'json',
          jsonSchema: strategy.schema,
          prompt: strategy.prompt,
        });
      } else {
        scraped = await this.provider.scrape(url, { format: 'markdown' });
      }

      await createScrapedUrl({
        runId,
        queryId,
        url: scraped.url,
        content: scraped.content,
        contentLength: scraped.contentLength,
        scraperProvider: this.provider.name,
        scrapeDurationMs: scraped.durationMs,
        title: scraped.metadata?.title,
      });

      const totalDuration = Date.now() - startTime;
      console.log(`   [Scraper] Successfully scraped and recorded: ${url} (${totalDuration}ms)`);
      logger.info('url_scraped_and_recorded', {
        runId,
        queryId: queryId || 'direct',
        url,
        contentLength: scraped.contentLength,
        durationMs: totalDuration,
        strategy: strategy.type,
        provider: this.provider.name,
      });

      return scraped;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.log(`   [Scraper] Failed to scrape: ${url} - ${errorMessage}`);
      logger.error('scrape_and_record_failed', {
        runId,
        queryId: queryId || 'direct',
        url,
        error: errorMessage,
        durationMs,
        strategy: strategy.type,
      });

      throw error;
    }
  }

  private calculateStats(results: ScrapeResult[]): ScrapeStats {
    const scraped = results.filter(r => r.status === 'scraped');
    const failed = results.filter(r => r.status !== 'scraped');

    const totalDuration = scraped.reduce((sum, r) => sum + (r.durationMs || 0), 0);
    const totalContent = scraped.reduce((sum, r) => sum + (r.contentLength || 0), 0);

    return {
      total: results.length,
      scraped: scraped.length,
      pending: 0,
      failed: failed.length,
      avgDurationMs: scraped.length > 0 ? totalDuration / scraped.length : undefined,
      totalContentLength: totalContent > 0 ? totalContent : undefined,
    };
  }
}
