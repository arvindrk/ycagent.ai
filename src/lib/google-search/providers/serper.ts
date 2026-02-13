import { SearchProvider, type BaseSearchProvider, type SearchConfig, type SearchOptions, type SearchResult, type SearchResultItem } from '@/types/google-search.types';

export class SerperSearchProvider implements BaseSearchProvider {
  name = SearchProvider.SERPER;
  private apiKey: string;

  constructor(config: SearchConfig) {
    this.apiKey = config.apiKey || process.env.SERPER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Serper API key is required');
    }
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: options?.numResults || 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      query,
      provider: this.name,
      results: (data.organic || []).map((item: SearchResultItem) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        position: item.position,
      })),
    };
  }
}
