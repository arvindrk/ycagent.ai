import { LLMProvider } from '@/types/llm.types';

export const RESEARCH_PROVIDER_ENV = 'RESEARCH_LLM_PROVIDER';

const DEFAULT_PROVIDER = LLMProvider.ANTHROPIC;

/**
 * Provider for the deep research agent, from RESEARCH_LLM_PROVIDER.
 *
 * The agent hardcoded LLMProvider.OPENAI, so when the OpenAI account went
 * inactive both search and research died from one cause with no way to switch
 * without a deploy. Anthropic and Google streamers already existed and were
 * unreachable.
 *
 * An unrecognised value falls back to the default rather than throwing: a typo
 * in an env var should not take research down, and the resolved provider is
 * logged by the caller.
 */
export function resolveResearchProvider(
  raw: string | undefined = process.env[RESEARCH_PROVIDER_ENV],
): { provider: LLMProvider; usedFallback: boolean } {
  if (!raw) return { provider: DEFAULT_PROVIDER, usedFallback: false };

  const normalized = raw.trim().toLowerCase();
  const match = Object.values(LLMProvider).find(p => p === normalized);

  return match
    ? { provider: match, usedFallback: false }
    : { provider: DEFAULT_PROVIDER, usedFallback: true };
}
