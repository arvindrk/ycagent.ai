import { getEnv } from '@/lib/env';
import type { SearchClient, RawSearchResult } from '../types';

interface SerperSearchRequest {
  q: string;
  num?: number;
}

interface SerperSearchResponse {
  organic?: Array<{
    title: string;
    link: string;
    snippet?: string;
    position?: number;
    [key: string]: unknown;
  }>;
  searchParameters?: {
    q: string;
    type?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export class SerperClient implements SearchClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://google.serper.dev/search';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getEnv().SERPER_API_KEY;
  }

  async search(query: string, maxResults: number): Promise<RawSearchResult[]> {
    const requestBody: SerperSearchRequest = {
      q: query,
      num: maxResults,
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(
        `Serper API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data: SerperSearchResponse = await response.json();

    if (!data.organic || data.organic.length === 0) {
      return [];
    }

    return data.organic.map((result) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      position: result.position,
      metadata: {
        searchParameters: data.searchParameters,
      },
    }));
  }
}
