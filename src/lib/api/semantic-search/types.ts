import type { SearchInput, SearchResponse } from '@/lib/validations/search.schema';

export type { SearchInput, SearchResponse };

export interface SearchResult {
  id: string;
  name: string;
  slug: string | null;
  website: string | null;
  logo_url: string | null;
  one_liner: string | null;
  tags: string[];
  industries: string[];
  regions: string[];
  batch: string | null;
  team_size: number | null;
  all_locations: string | null;
  is_hiring: boolean;
  stage: string | null;
  semantic_score: number;
  name_score: number;
  text_score: number;
  final_score: number;
  tier: string;
  tier_label: string;
  tier_order: number;
}

export interface SearchCompaniesParams {
  q: string;
  limit?: number;
}
