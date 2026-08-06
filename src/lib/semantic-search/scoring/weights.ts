/**
 * Tier identity for a search result. Ordering drives ranking and the top-match
 * decision; nothing renders a tier directly. Icons, colours and per-tier
 * descriptions lived here to feed an accordion that grouped results by
 * relevance band, which described our scoring rather than the companies.
 */
export const TIER_META = {
  exact_match: { label: 'Exact Match', order: 1 },
  high_confidence: { label: 'Highly Relevant', order: 2 },
  strong_match: { label: 'Strong Match', order: 3 },
  relevant: { label: 'Relevant', order: 4 },
  keyword_match: { label: 'Keyword Match', order: 5 },
} as const;

export type TierKey = keyof typeof TIER_META;
