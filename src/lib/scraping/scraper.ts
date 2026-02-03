import type { ScraperProvider, ScrapeResult } from './types';
import {
  createDiscoveredUrls,
  batchUpdateScrapeStatus,
  getPendingUrls,
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

  async scrapePendingUrls(runId: string): Promise<{ results: ScrapeResult[], stats: ScrapeStats }> {
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
      pending.map((discoveredUrl) =>
        this.scrapeUrl(discoveredUrl.id, discoveredUrl.url)
      )
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
    url: string
  ): Promise<ScrapeResult> {
    const startTime = Date.now();

    try {
      const scraped = await this.provider.scrape(url);

      logger.info('url_scraped', {
        discoveredUrlId,
        url,
        contentLength: scraped.contentLength,
        durationMs: Date.now() - startTime,
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
