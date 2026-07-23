import type { ResearchResult, StreamChunk } from '@/types/llm.types';
import { SSEEvent } from '@/types/llm.types';
import { getResearchDomains } from '@/lib/research/domain-registry';

/**
 * Last-wins map of domain id -> ResearchResult from RESULT stream events.
 * Accepts only SSEEvent.RESULT with a non-empty result.domain.
 */
export function buildResearchResultsByDomain(
  events: readonly StreamChunk[],
): Record<string, ResearchResult> {
  const map: Record<string, ResearchResult> = {};
  for (const event of events) {
    if (event.type === SSEEvent.RESULT && event.result?.domain) {
      map[event.result.domain] = event.result;
    }
  }
  return map;
}

/**
 * Registry domains that have a result, in DOMAIN_REGISTRY key order.
 * Unknown/non-registry keys in the map are excluded.
 */
export function getPresentDomainIds(
  researchResultsByDomain: Readonly<Record<string, ResearchResult>>,
): string[] {
  return getResearchDomains().filter(
    (domain) => researchResultsByDomain[domain] != null,
  );
}

/**
 * Default active tab when the user has not selected one:
 * first present registry domain, else timeline.
 */
export function getDefaultActiveTab(presentDomainIds: readonly string[]): string {
  return presentDomainIds[0] ?? 'timeline';
}
