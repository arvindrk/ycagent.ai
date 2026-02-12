import type { SearchProvider, SearchConfig } from './types';
import { SerperSearchProvider } from './providers/serper';

export function getSearchProvider(config: SearchConfig): SearchProvider {
  switch (config.provider) {
    case 'serper':
      return new SerperSearchProvider(config);
    default:
      throw new Error(`Unknown search provider: ${config.provider}`);
  }
}
