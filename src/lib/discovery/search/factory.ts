import type { SearchProvider } from './types';
import type { SearchPlatform } from '@/lib/validations/research.schema';
import { GoogleSearchProvider } from './providers/google-search-provider';

const providerRegistry = new Map<SearchPlatform, SearchProvider>();

export function registerSearchProvider(
  platform: SearchPlatform,
  provider: SearchProvider
): void {
  providerRegistry.set(platform, provider);
}

export function getSearchProvider(platform: SearchPlatform): SearchProvider {
  let provider = providerRegistry.get(platform);

  if (!provider) {
    provider = createDefaultProvider(platform);
    providerRegistry.set(platform, provider);
  }

  return provider;
}

function createDefaultProvider(platform: SearchPlatform): SearchProvider {
  switch (platform) {
    case 'google':
      return new GoogleSearchProvider();
    case 'github':
    case 'linkedin':
    case 'twitter':
    case 'perplexity':
    case 'llm':
      throw new Error(`Provider for platform "${platform}" not implemented yet`);
    default:
      throw new Error(`Unknown search platform: ${platform}`);
  }
}

export function clearProviderCache(): void {
  providerRegistry.clear();
}
