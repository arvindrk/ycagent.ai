export interface SearchProvider {
  name: string;
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
}

export interface SearchConfig {
  provider: 'serper';
  apiKey?: string;
}

export interface SearchOptions {
  numResults?: number;
}

export interface SearchResult {
  query: string;
  results: SearchResultItem[];
  provider: string;
}

export interface SearchResultItem {
  title: string;
  link: string;
  snippet: string;
  position: number;
}
