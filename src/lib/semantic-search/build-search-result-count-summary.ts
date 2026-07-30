import { buildTierBucketModel } from '@/lib/semantic-search/build-tier-bucket-model';
import type { TierKey } from '@/lib/semantic-search/scoring/weights';
import type { SearchResult } from '@/types/semantic-search.types';

export interface SearchResultCountTier {
  tier: TierKey;
  tierLabel: string;
  count: number;
}

export interface SearchResultCountSummary {
  total: number;
  nonEmptyTiers: SearchResultCountTier[];
  nonEmptyTierCount: number;
  summaryLine: string;
}

/**
 * Compact total + non-empty tier distribution for TieredResultsDisplay.
 * Pure: reuses buildTierBucketModel so labels/order come from TIER_META;
 * omits empty gap buckets (those stay in the accordion rows only).
 */
export function buildSearchResultCountSummary(
  results: readonly SearchResult[],
): SearchResultCountSummary {
  const total = results.length;
  const nonEmptyTiers = buildTierBucketModel(results)
    .filter((bucket) => !bucket.isEmpty)
    .map((bucket) => ({
      tier: bucket.tier,
      tierLabel: bucket.tierLabel,
      count: bucket.results.length,
    }));
  const nonEmptyTierCount = nonEmptyTiers.length;

  const resultWord = total === 1 ? 'result' : 'results';
  const tierPart = nonEmptyTiers
    .map((tier) => `${tier.tierLabel} ${tier.count}`)
    .join(' · ');
  const summaryLine =
    nonEmptyTierCount === 0
      ? `${total} ${resultWord}`
      : `${total} ${resultWord} · ${tierPart}`;

  return {
    total,
    nonEmptyTiers,
    nonEmptyTierCount,
    summaryLine,
  };
}
