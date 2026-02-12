'use server';

import { searchCompanies as dbSearchCompanies } from '@/lib/semantic-search/query';
import { parseSearchFilters } from '@/lib/semantic-search/filters/parse';
import { generateEmbedding } from '@/lib/semantic-search/embeddings/generate';
import { searchInputSchema } from '@/lib/schemas/search.schema';
import type { SearchCompaniesParams, SearchResponse } from './types';

export async function searchCompanies(
  params: SearchCompaniesParams
): Promise<SearchResponse> {
  const startTime = Date.now();

  try {
    const validatedParams = searchInputSchema.parse(params);

    if (!validatedParams.q || validatedParams.q.trim().length === 0) {
      return {
        data: [],
        total: 0,
        limit: validatedParams.limit,
        query_time_ms: 0,
      };
    }

    const filters = parseSearchFilters(validatedParams);
    const embedding = await generateEmbedding(validatedParams.q);

    const results = await dbSearchCompanies({
      query: validatedParams.q,
      filters,
      limit: validatedParams.limit,
    }, embedding);

    const queryTime = Date.now() - startTime;

    return {
      data: results,
      total: results.length,
      limit: validatedParams.limit,
      query_time_ms: queryTime,
    };
  } catch (error) {
    console.error('Search error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Search failed'
    );
  }
}
