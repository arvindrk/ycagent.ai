import { CrawlerProvider, type BaseCrawlerProvider, type CrawlerConfig } from '@/types/crawler.types';
import { FirecrawlCrawlerProvider } from './providers/firecrawl';

export function getCrawlerProvider(config?: CrawlerConfig): BaseCrawlerProvider {
  const provider = config?.provider || CrawlerProvider.FIRECRAWL;

  switch (provider) {
    case CrawlerProvider.FIRECRAWL:
      return new FirecrawlCrawlerProvider(config);
    default:
      throw new Error(`Unknown crawler provider: ${provider}`);
  }
}
