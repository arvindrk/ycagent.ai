export interface BaseSearchProvider {
  name: string;
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
}

export enum SearchProvider {
  SERPER = 'serper',
}

export interface SearchConfig {
  provider: SearchProvider;
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
