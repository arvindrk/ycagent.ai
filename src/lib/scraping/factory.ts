import type { ScraperProvider } from './types';
import { FirecrawlProvider } from './providers/firecrawl-provider';

const providerRegistry = new Map<string, ScraperProvider>();

export function getScraperProvider(name: string = 'firecrawl'): ScraperProvider {
  let provider = providerRegistry.get(name);

  if (!provider) {
    provider = createProvider(name);
    providerRegistry.set(name, provider);
  }

  return provider;
}

function createProvider(name: string): ScraperProvider {
  switch (name) {
    case 'firecrawl':
      return new FirecrawlProvider();

    default:
      throw new Error(`Unknown scraper provider: ${name}. Available: firecrawl`);
  }
}

export function registerScraperProvider(
  name: string,
  provider: ScraperProvider
): void {
  providerRegistry.set(name, provider);
}

export function clearProviderRegistry(): void {
  providerRegistry.clear();
}
