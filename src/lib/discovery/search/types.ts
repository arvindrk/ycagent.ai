import type {
  SearchRequest,
  SearchResponse,
  SearchPlatform,
} from '@/lib/validations/research.schema';

export interface SearchProvider {
  readonly platform: SearchPlatform;
  search(request: SearchRequest): Promise<SearchResponse>;
}

export interface SearchClient {
  search(query: string, maxResults: number): Promise<RawSearchResult[]>;
}

export interface RawSearchResult {
  title: string;
  url: string;
  snippet?: string;
  position?: number;
  metadata?: Record<string, unknown>;
}
