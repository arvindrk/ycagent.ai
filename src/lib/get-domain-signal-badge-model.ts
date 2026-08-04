import type { ResearchResult } from '@/types/llm.types';

export interface DomainSignalBadgeModel {
  /** Visible chrome: `{domain} {signalCount}sig/{sourceCount}src` */
  primaryLabel: string;
  signalCount: number;
  sourceCount: number;
  /**
   * Human-readable tooltip.
   * Explains sig = extracted research signals, src = source URLs;
   * includes domain and counts; founder domains get plain-English per-bucket breakdown.
   */
  title: string;
  /**
   * Assistive framing (stable exact shape for hermetics):
   * `Domain signals: {domain}, {N} signals, {M} sources`
   */
  ariaLabel: string;
}

function arrayLen(value: string[] | null | undefined): number {
  return Array.isArray(value) ? value.length : 0;
}

function signalCountForResult(result: ResearchResult): number {
  if (result.domain === 'traction') {
    return arrayLen(result.tractionSignals);
  }
  return (
    arrayLen(result.founderRelationship)
    + arrayLen(result.complementarySkills)
    + arrayLen(result.socialPresence)
    + arrayLen(result.trackRecord)
  );
}

function buildTitle(
  result: ResearchResult,
  signalCount: number,
  sourceCount: number,
): string {
  const base =
    `Domain ${result.domain}: ${signalCount} extracted research signals (sig) `
    + `and ${sourceCount} source URLs (src).`;

  if (result.domain === 'traction') {
    return base;
  }

  const fr = arrayLen(result.founderRelationship);
  const cs = arrayLen(result.complementarySkills);
  const sp = arrayLen(result.socialPresence);
  const tr = arrayLen(result.trackRecord);
  return (
    `${base} Breakdown: founder relationship ${fr}, complementary skills ${cs}, `
    + `social presence ${sp}, track record ${tr}.`
  );
}

/**
 * Pure presentation model for ResearchViewer header domain signal badge.
 * Count math matches prior signalCountForResult + sources.length.
 * Never throws on missing optional arrays (treat as 0).
 */
export function getDomainSignalBadgeModel(
  result: ResearchResult,
): DomainSignalBadgeModel {
  const signalCount = signalCountForResult(result);
  const sourceCount = arrayLen(result.sources);
  const domain = result.domain;
  return {
    primaryLabel: `${domain} ${signalCount}sig/${sourceCount}src`,
    signalCount,
    sourceCount,
    title: buildTitle(result, signalCount, sourceCount),
    ariaLabel: `Domain signals: ${domain}, ${signalCount} signals, ${sourceCount} sources`,
  };
}
