import type { SearchPath } from '@/lib/schemas/search.schema';

/**
 * Discovery path for GET /api/companies/search.
 * Empty cleanedQuery (all tokens consumed by filters, or whitespace only) => keyword;
 * any semantic residue => vector.
 */
export function resolveSearchPath(cleanedQuery: string): SearchPath {
  return cleanedQuery.trim().length === 0 ? 'keyword' : 'vector';
}
