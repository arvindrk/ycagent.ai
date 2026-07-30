import { TIER_META, type TierKey } from '@/lib/semantic-search/scoring/weights';
import type { SearchResult } from '@/types/semantic-search.types';

export interface TierBucket {
  tier: TierKey;
  tierLabel: string;
  tierOrder: number;
  results: SearchResult[];
  isEmpty: boolean;
  emptyMessage?: string;
}

/**
 * Ordered tier buckets for search results display.
 * Pure: includes non-empty tiers plus empty higher-confidence gaps
 * (order strictly less than the best non-empty tier). Empty total is out of scope.
 */
export function buildTierBucketModel(
  results: readonly SearchResult[],
): TierBucket[] {
  const byTier = new Map<TierKey, SearchResult[]>();

  for (const result of results) {
    const key =
      result.tier in TIER_META
        ? (result.tier as TierKey)
        : ('keyword_match' as const);
    const existing = byTier.get(key);
    if (existing) {
      existing.push(result);
    } else {
      byTier.set(key, [result]);
    }
  }

  let bestNonEmptyOrder = Infinity;
  for (const [key, list] of byTier) {
    if (list.length > 0) {
      bestNonEmptyOrder = Math.min(bestNonEmptyOrder, TIER_META[key].order);
    }
  }

  const orderedKeys = (Object.keys(TIER_META) as TierKey[]).sort(
    (a, b) => TIER_META[a].order - TIER_META[b].order,
  );

  const buckets: TierBucket[] = [];
  for (const tier of orderedKeys) {
    const meta = TIER_META[tier];
    const tierResults = byTier.get(tier) ?? [];
    const isEmpty = tierResults.length === 0;

    // Skip empty lower tiers at or below the best present hit (minimal noise).
    if (isEmpty && !(meta.order < bestNonEmptyOrder)) {
      continue;
    }

    buckets.push({
      tier,
      tierLabel: meta.label,
      tierOrder: meta.order,
      results: tierResults,
      isEmpty,
      ...(isEmpty ? { emptyMessage: `No ${meta.label} results` } : {}),
    });
  }

  return buckets;
}
