import type { SearchResult } from '@/types/semantic-search.types';

/** Results shown before the tail is revealed. Two full rows on a 4-up grid. */
export const VISIBLE_RESULT_COUNT = 8;

export interface GroupedSearchResults {
  /** A single unambiguous name match, pinned above the ranked list. */
  topMatch: SearchResult | null;
  visible: SearchResult[];
  hidden: SearchResult[];
  total: number;
}

/**
 * Ranking is the breakdown. Results arrive ordered by final_score, so the only
 * grouping that carries information the user did not already get from the order
 * is pinning an unambiguous name match, the way a "top hit" works elsewhere.
 *
 * The previous model grouped into five relevance tiers and rendered a section
 * per tier including empty ones, which described our scoring thresholds rather
 * than the companies.
 */
export function groupSearchResults(
  results: readonly SearchResult[],
  visibleCount: number = VISIBLE_RESULT_COUNT,
): GroupedSearchResults {
  const total = results.length;

  // Only pin a top match when it leads the ranking; an exact match buried mid
  // list means the query was not really about that name.
  const topMatch = results[0]?.tier === 'exact_match' ? results[0] : null;
  const rest = topMatch ? results.slice(1) : [...results];

  return {
    topMatch,
    visible: rest.slice(0, visibleCount),
    hidden: rest.slice(visibleCount),
    total,
  };
}
