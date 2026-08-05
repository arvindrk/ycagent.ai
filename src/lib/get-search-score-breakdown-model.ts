/**
 * Pure presentation SoT for CompanyPreviewCard final_score badge chrome.
 *
 * ariaLabel contract (stable for next hermetic):
 * `Search score: {primaryLabel}. {title}`
 * primaryLabel freezes visible chrome as final_score.toFixed(2).
 * title freezes prior field order/wording: optional tier, then semantic/name/text/final.
 * Missing optional component scores render as 'n/a'; missing tier omits the tier clause.
 * Returns null when final_score is not a finite number (no badge).
 * Never throws on missing optionals.
 */

export interface SearchScoreBreakdownInput {
  final_score?: number | null;
  semantic_score?: number | null;
  name_score?: number | null;
  text_score?: number | null;
  /** Pre-resolved tier label; preferred when already computed at the call site. */
  tierDisplay?: string | null;
  tier_label?: string | null;
  tier?: string | null;
}

export interface SearchScoreBreakdownModel {
  /** Visible badge text: final_score.toFixed(2). */
  primaryLabel: string;
  /**
   * Tooltip breakdown (space-joined), prior field order:
   * optional `tier: {tierDisplay}`, then semantic/name/text/final with toFixed(2) or 'n/a'.
   */
  title: string;
  /**
   * Assistive framing (stable exact shape for hermetics):
   * `Search score: {primaryLabel}. {title}`
   */
  ariaLabel: string;
}

function formatOptionalScore(score: number | null | undefined): string {
  return typeof score === 'number' ? score.toFixed(2) : 'n/a';
}

/**
 * Pure presentation model for search result final_score badge.
 * Null when final_score is not a finite number (match prior gate: no badge).
 */
export function getSearchScoreBreakdownModel(
  input: SearchScoreBreakdownInput,
): SearchScoreBreakdownModel | null {
  const final = input.final_score;
  if (typeof final !== 'number' || !Number.isFinite(final)) {
    return null;
  }

  const tierDisplay =
    input.tierDisplay || input.tier_label || input.tier || null;

  const title = [
    tierDisplay ? `tier: ${tierDisplay}` : null,
    `semantic: ${formatOptionalScore(input.semantic_score)}`,
    `name: ${formatOptionalScore(input.name_score)}`,
    `text: ${formatOptionalScore(input.text_score)}`,
    `final: ${final.toFixed(2)}`,
  ]
    .filter(Boolean)
    .join(' ');

  const primaryLabel = final.toFixed(2);

  return {
    primaryLabel,
    title,
    ariaLabel: `Search score: ${primaryLabel}. ${title}`,
  };
}
