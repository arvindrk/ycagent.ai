/**
 * Smoke eval for multi-RESULT stream aggregation (useResearchTabs contract).
 * Locks: last-wins domain map, presentDomainIds registry order, defaultActiveTab.
 * Hermetic: zero I/O, no network, DB, E2B, or .env. Never evaluates systemPrompt getters.
 * Imports production helpers from multi-domain-stream.ts only (no brittle mirror).
 *
 * Run: npm run eval:research-multi-domain-stream-contract-smoke
 */

import type {
  FounderProfileResult,
  ResearchResult,
  StreamChunk,
  TractionResult,
} from '@/types/llm.types';
import { SSEEvent } from '@/types/llm.types';
import {
  buildResearchResultsByDomain,
  getDefaultActiveTab,
  getPresentDomainIds,
} from '@/lib/research/multi-domain-stream';
import { getResearchDomains } from '@/lib/research/domain-registry';

// ---- Minimal fixtures (domain/summary/sources + required domain fields) --

const founderA: FounderProfileResult = {
  domain: 'founder_profile',
  summary: 'Founder A summary',
  sources: ['https://example.com/founder-a'],
  executiveSummary: 'A',
  founderRelationship: [],
  complementarySkills: [],
  socialPresence: [],
  trackRecord: [],
  founders: [{ name: 'A', title: 'CEO' }],
};

const founderB: FounderProfileResult = {
  domain: 'founder_profile',
  summary: 'Founder B summary (last-wins)',
  sources: ['https://example.com/founder-b'],
  executiveSummary: 'B',
  founderRelationship: [],
  complementarySkills: [],
  socialPresence: [],
  trackRecord: [],
  founders: [{ name: 'B', title: 'CEO' }],
};

const traction: TractionResult = {
  domain: 'traction',
  summary: 'Traction summary',
  sources: ['https://example.com/traction'],
  tractionSignals: ['growth'],
};

/** Unknown domain: may appear in map, never in presentDomainIds. */
const unknownDomainResult = {
  domain: 'not_a_registry_domain',
  summary: 'Unknown domain summary',
  sources: ['https://example.com/unknown'],
} as unknown as ResearchResult;

function resultEvent(result: ResearchResult): StreamChunk {
  return { type: SSEEvent.RESULT, result };
}

// ---- Test runner (exact pattern from src/eval/*-smoke.ts) --------------

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  pass  ${name}`);
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL  ${name}: ${msg}`);
    failed++;
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// ---- Tests -------------------------------------------------------------

console.log('\nresearch-multi-domain-stream-contract eval: smoke\n');

test('empty events => empty map, empty presentDomainIds, defaultActiveTab timeline', () => {
  const map = buildResearchResultsByDomain([]);
  const present = getPresentDomainIds(map);
  assert(Object.keys(map).length === 0, `map should be empty, keys=${Object.keys(map)}`);
  assert(present.length === 0, `present should be empty, got=${present.join(',')}`);
  assert(
    getDefaultActiveTab(present) === 'timeline',
    `default=${getDefaultActiveTab(present)}`,
  );
});

test('single founder_profile RESULT => map has founder only, present=[founder_profile], default=founder_profile', () => {
  const map = buildResearchResultsByDomain([resultEvent(founderA)]);
  assert(Object.keys(map).length === 1, `keys=${Object.keys(map).join(',')}`);
  assert(map.founder_profile === founderA, 'map.founder_profile must be founderA');
  assert(map.traction == null, 'traction must be absent');
  const present = getPresentDomainIds(map);
  assert(
    present.length === 1 && present[0] === 'founder_profile',
    `present=${present.join(',')}`,
  );
  assert(
    getDefaultActiveTab(present) === 'founder_profile',
    `default=${getDefaultActiveTab(present)}`,
  );
});

test('founder then traction => presentDomainIds registry order [founder_profile, traction]', () => {
  const map = buildResearchResultsByDomain([
    resultEvent(founderA),
    resultEvent(traction),
  ]);
  const present = getPresentDomainIds(map);
  assert(
    present.length === 2 &&
      present[0] === 'founder_profile' &&
      present[1] === 'traction',
    `present=${present.join(',')}`,
  );
  assert(getDefaultActiveTab(present) === 'founder_profile', 'default first registry present');
});

test('traction then founder (reverse event order) => present still registry order', () => {
  const map = buildResearchResultsByDomain([
    resultEvent(traction),
    resultEvent(founderA),
  ]);
  const present = getPresentDomainIds(map);
  assert(
    present.length === 2 &&
      present[0] === 'founder_profile' &&
      present[1] === 'traction',
    `present=${present.join(',')} (must match getResearchDomains order, not event order)`,
  );
  const registry = getResearchDomains();
  assert(
    present[0] === registry[0] && present[1] === registry[1],
    'present must match registry key order',
  );
});

test('two RESULT events same domain => last-wins overwrite', () => {
  const map = buildResearchResultsByDomain([
    resultEvent(founderA),
    resultEvent(founderB),
  ]);
  assert(Object.keys(map).length === 1, `keys=${Object.keys(map).join(',')}`);
  assert(map.founder_profile === founderB, 'last founder RESULT must win');
  assert(map.founder_profile?.summary === founderB.summary, 'summary must be last-wins');
});

test('RESULT missing domain or empty domain ignored for map', () => {
  const missingDomain = {
    type: SSEEvent.RESULT,
    result: { summary: 'no domain', sources: [] } as unknown as ResearchResult,
  } as StreamChunk;
  const emptyDomain = {
    type: SSEEvent.RESULT,
    result: {
      domain: '',
      summary: 'empty domain',
      sources: [],
    } as unknown as ResearchResult,
  } as StreamChunk;
  const map = buildResearchResultsByDomain([
    missingDomain,
    emptyDomain,
    resultEvent(traction),
  ]);
  assert(Object.keys(map).length === 1, `keys=${Object.keys(map).join(',')}`);
  assert(map.traction === traction, 'only traction with non-empty domain');
  assert(!('' in map), 'empty string domain must not be a map key');
});

test('non-RESULT events ignored for map', () => {
  const events: StreamChunk[] = [
    { type: SSEEvent.THINKING, content: 'thinking' },
    { type: SSEEvent.ACTION, toolName: 'google_search' },
    { type: SSEEvent.ACTION_COMPLETED },
    { type: SSEEvent.DONE },
    resultEvent(founderA),
    { type: SSEEvent.ERROR, error: 'ignored for map' },
  ];
  const map = buildResearchResultsByDomain(events);
  assert(Object.keys(map).length === 1, `keys=${Object.keys(map).join(',')}`);
  assert(map.founder_profile === founderA, 'only RESULT contributes');
});

test('unknown non-registry domain may appear in map but not in presentDomainIds', () => {
  const map = buildResearchResultsByDomain([
    resultEvent(unknownDomainResult),
    resultEvent(traction),
  ]);
  assert(
    map.not_a_registry_domain === unknownDomainResult,
    'unknown domain may appear in map',
  );
  assert(map.traction === traction, 'registry domain still mapped');
  const present = getPresentDomainIds(map);
  assert(!present.includes('not_a_registry_domain'), 'unknown must not be present');
  assert(
    present.length === 1 && present[0] === 'traction',
    `present=${present.join(',')}`,
  );
  assert(getDefaultActiveTab(present) === 'traction', 'default first present registry');
});

test('getDefaultActiveTab([]) is timeline; single id is that id', () => {
  assert(getDefaultActiveTab([]) === 'timeline', 'empty => timeline');
  assert(getDefaultActiveTab(['traction']) === 'traction', 'single => that id');
  assert(
    getDefaultActiveTab(['founder_profile', 'traction']) === 'founder_profile',
    'first of list',
  );
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
