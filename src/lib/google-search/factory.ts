import { SearchProvider, type BaseSearchProvider, type SearchConfig } from '@/types/google-search.types';
import { SerperSearchProvider } from './providers/serper';

export function getSearchProvider(config: SearchConfig): BaseSearchProvider {
  const { provider = SearchProvider.SERPER } = config;

  switch (provider) {
    case SearchProvider.SERPER:
      return new SerperSearchProvider(config);
    default:
      throw new Error(`Unknown search provider: ${provider}`);
  }
}
