/**
 * Single registry for result tiers: the SQL CASE, the ranking boost and the
 * label all derive from here.
 *
 * There were five tiers keyed off semantic-score thresholds of 0.7, 0.5 and
 * 0.3. Measured over ten queries against the live corpus, semantic score spans
 * 0.26 to 0.65, so "high_confidence" (>= 0.7) was unreachable and
 * "keyword_match" (< 0.3) fired almost never. Three of the five were dead.
 *
 * The per-tier multipliers also put step discontinuities in the ranking: a
 * result at 0.70 was multiplied by 1.5 and one at 0.69 by 1.0, so a hundredth
 * of a point in similarity swung the final score by 50%. Ranking is now
 * continuous in the underlying scores, with a boost only for an unambiguous
 * name match, which is a genuinely different kind of hit rather than a point
 * further along the same scale.
 *
 * Rerun `npm run measure:score-distribution` before changing these.
 */
export const TIERS = {
  exact_match: { label: 'Exact match', boost: 2.5 },
  match: { label: 'Match', boost: 1 },
} as const;

export type TierKey = keyof typeof TIERS;

export const EXACT_MATCH_TIER: TierKey = 'exact_match';
export const DEFAULT_TIER: TierKey = 'match';
