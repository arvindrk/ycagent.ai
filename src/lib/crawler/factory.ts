import type { CrawlerProvider, CrawlerConfig } from '@/types/crawler.types';
import { FirecrawlCrawlerProvider } from './providers/firecrawl';

export function getCrawlerProvider(config?: CrawlerConfig): CrawlerProvider {
  const provider = config?.provider || 'firecrawl';

  switch (provider) {
    case 'firecrawl':
      return new FirecrawlCrawlerProvider(config);
    default:
      throw new Error(`Unknown crawler provider: ${provider}`);
  }
}
