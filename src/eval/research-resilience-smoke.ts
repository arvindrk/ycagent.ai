/**
 * Smoke eval for the two ways a research run used to die outright:
 *   1. The agent hardcoded LLMProvider.OPENAI, so a dead OpenAI account took
 *      research down with no way to switch without a deploy.
 *   2. The orchestrator threw on the first domain failure, discarding every
 *      domain that had already succeeded.
 * Hermetic: pure resolvers, no DB, LLM, E2B, Trigger, network, or .env.
 *
 * Run: npm run eval:research-resilience-smoke
 */

import { resolveResearchProvider } from '@/lib/research/resolve-research-provider';
import { resolveResearchRunStatus } from '@/lib/research/resolve-research-run-status';
import { LLMProvider } from '@/types/llm.types';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  pass  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}: ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

console.log('\nresearch-resilience eval: smoke\n');

test('every LLMProvider value is selectable by name', () => {
  for (const provider of Object.values(LLMProvider)) {
    const resolved = resolveResearchProvider(provider);
    assert(resolved.provider === provider, `${provider} resolved to ${resolved.provider}`);
    assert(!resolved.usedFallback, `${provider} should not be a fallback`);
  }
});

test('provider name is case and whitespace insensitive', () => {
  const resolved = resolveResearchProvider('  ANTHROPIC  ');
  assert(resolved.provider === LLMProvider.ANTHROPIC, `got ${resolved.provider}`);
  assert(!resolved.usedFallback, 'a valid name is not a fallback');
});

test('unset provider uses the default without flagging a fallback', () => {
  const resolved = resolveResearchProvider(undefined);
  assert(Object.values(LLMProvider).includes(resolved.provider), 'default must be a real provider');
  assert(!resolved.usedFallback, 'unset is the documented default, not a mistake');
});

test('a typo falls back rather than throwing, and says so', () => {
  const resolved = resolveResearchProvider('opeani');
  assert(Object.values(LLMProvider).includes(resolved.provider), 'must still yield a provider');
  assert(resolved.usedFallback, 'an unrecognised value must be reported as a fallback');
});

test('the default provider is not the one that took the system down', () => {
  // Not a correctness constraint, but the hardcoded OpenAI path is exactly how
  // one dead account killed both search and research.
  assert(
    resolveResearchProvider(undefined).provider !== LLMProvider.OPENAI,
    'default should not silently re-pin OpenAI',
  );
});

test('all domains succeeding is a completed run', () => {
  assert(resolveResearchRunStatus({ succeeded: 2, failed: 0 }) === 'completed', 'two of two');
});

test('some domains succeeding is partial, never a discarded run', () => {
  assert(resolveResearchRunStatus({ succeeded: 1, failed: 1 }) === 'partial', 'one of two');
  assert(resolveResearchRunStatus({ succeeded: 3, failed: 2 }) === 'partial', 'three of five');
});

test('only a total loss is a failure', () => {
  assert(resolveResearchRunStatus({ succeeded: 0, failed: 2 }) === 'failed', 'none of two');
  assert(resolveResearchRunStatus({ succeeded: 0, failed: 0 }) === 'failed', 'nothing ran');
});

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
