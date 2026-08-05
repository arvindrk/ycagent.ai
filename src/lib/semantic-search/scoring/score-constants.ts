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

/**
 * Lexical path: ranks on the tsvector + name trigram only, with no embedding.
 * Text dominates because trigram name similarity fires on incidental substrings
 * ("climate tech" -> "Techmate"); the name floor keeps those out of the prefilter.
 */
export const W_LEX_TEXT = 0.85;
export const W_LEX_NAME = 0.15;
export const PREFILTER_LEX_NAME_MIN = 0.55;

/** ts_rank_cd normalization flag 32: rank/(rank+1), bounding text_score to [0,1). */
export const TS_RANK_NORMALIZATION = 32;


