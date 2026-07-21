/**
 * Pure numeric ranking constants for searchCompanies vector SQL and hermetic evals.
 * Single source of truth so production SQL and smoke mirrors cannot drift.
 * No UI/icons (those stay in weights.ts TIER_META).
 */

/** final_score base: semantic * W + name * W + text * W */
export const W_SEMANTIC = 0.8;
export const W_NAME = 0.15;
export const W_TEXT = 0.05;

/** WHERE prefilter: semantic >= min OR name >= min */
export const PREFILTER_SEMANTIC_MIN = 0.25;
export const PREFILTER_NAME_MIN = 0.7;

/** exact_match: name sim threshold; prefix path LENGTH(query) >= min */
export const EXACT_NAME_SIM_MIN = 0.9;
export const EXACT_PREFIX_MIN_LEN = 3;

/** Semantic tier cutoffs (after exact_match check) */
export const TIER_HIGH_SEM = 0.7;
export const TIER_STRONG_SEM = 0.5;
export const TIER_RELEVANT_SEM = 0.3;

/** Tier multipliers applied to weighted sum */
export const MULT_EXACT = 2.5;
export const MULT_HIGH = 1.5;
export const MULT_STRONG = 1.0;
export const MULT_RELEVANT = 0.8;
export const MULT_KEYWORD = 0.5;
