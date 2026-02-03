import type { SearchProvider } from '../types';
import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
} from '@/lib/validations/research.schema';
import { SerperClient } from '../clients/serper-client';

export class GoogleSearchProvider implements SearchProvider {
  readonly platform = 'google' as const;
  private client: SerperClient;

  constructor(client?: SerperClient) {
    this.client = client || new SerperClient();
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();

    const rawResults = await this.client.search(
      request.query,
      request.maxResults
    );

    const results: SearchResult[] = rawResults.map((raw, index) => ({
      title: raw.title,
      url: raw.url,
      snippet: raw.snippet,
      rank: raw.position || index + 1,
      metadata: raw.metadata,
    }));

    const executionTimeMs = Date.now() - startTime;

    return {
      query: request.query,
      platform: this.platform,
      results,
      totalResults: results.length,
      executionTimeMs,
      metadata: request.metadata,
    };
  }
}
