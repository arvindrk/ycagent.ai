import type { SearchPath } from '@/lib/schemas/search.schema';

/**
 * Discovery path for GET /api/companies/search.
 * Empty cleanedQuery (all tokens consumed by filters, or whitespace only) => keyword;
 * any semantic residue => vector.
 */
export function resolveSearchPath(cleanedQuery: string): SearchPath {
  return cleanedQuery.trim().length === 0 ? 'keyword' : 'vector';
}

/**
 * Ranking the response was actually built with, as opposed to the one
 * resolveSearchPath asked for. A vector attempt with no embedding fell back to
 * full-text ranking and must not be reported as semantic.
 */
export function resolveAchievedSearchPath(input: {
  skipVectorSearch: boolean;
  hasEmbedding: boolean;
}): SearchPath {
  if (input.skipVectorSearch) return 'keyword';
  return input.hasEmbedding ? 'vector' : 'lexical';
}
