/**
 * Smoke eval: registry-order parity among
 * (1) presentDomainIds from getPresentDomainIds,
 * (2) present coverage domain ids from getDomainCoverage(...).filter(present),
 * (3) enabled domain tab ids from getPresentDomainTabIds (useResearchTabs SoT).
 * Hermetic: zero I/O, no network, DB, E2B, or .env. Never evaluates systemPrompt getters.
 * Production imports only (no brittle domain-list mirror).
 *
 * Run: npm run eval:present-domain-tab-parity-smoke
 */

import type {
  FounderProfileResult,
  ResearchResult,
  StreamChunk,
  TractionResult,
} from '@/types/llm.types';
import { SSEEvent } from '@/types/llm.types';
import {
  getDomainCoverage,
  getPresentDomainTabIds,
} from '@/lib/research/domain-coverage';
import {
  buildResearchResultsByDomain,
  getDefaultActiveTab,
  getPresentDomainIds,
} from '@/lib/research/multi-domain-stream';
import { getResearchDomains } from '@/lib/research/domain-registry';

// ---- Minimal fixtures ----------------------------------------------------

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

const unknownDomainResult = {
  domain: 'not_a_registry_domain',
  summary: 'Unknown domain summary',
  sources: ['https://example.com/unknown'],
} as unknown as ResearchResult;

function resultEvent(result: ResearchResult): StreamChunk {
  return { type: SSEEvent.RESULT, result };
}

function coveragePresentIds(presentDomainIds: readonly string[]): string[] {
  return getDomainCoverage(presentDomainIds)
    .filter((item) => item.present)
    .map((item) => item.domain);
}

function assertArraysEqual(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  assert(
    actual.length === expected.length &&
      actual.every((v, i) => v === expected[i]),
    `${label}: actual=[${actual.join(',')}] expected=[${expected.join(',')}]`,
  );
}

/** Triple parity: presentDomainIds, coverage present ids, enabled domain tab ids. */
function assertParity(events: readonly StreamChunk[]): {
  presentDomainIds: string[];
  coverageIds: string[];
  tabIds: string[];
  defaultActiveTab: string;
} {
  const map = buildResearchResultsByDomain(events);
  const presentDomainIds = getPresentDomainIds(map);
  const coverageIds = coveragePresentIds(presentDomainIds);
  const tabIds = getPresentDomainTabIds(presentDomainIds);

  assertArraysEqual(coverageIds, presentDomainIds, 'coverage present vs presentDomainIds');
  assertArraysEqual(tabIds, presentDomainIds, 'tab ids vs presentDomainIds');
  assertArraysEqual(tabIds, coverageIds, 'tab ids vs coverage present');

  // Coming Soon tabs must never appear as enabled domain tab ids
  assert(!tabIds.includes('investor_profile'), 'investor_profile must not be a present tab id');
  assert(!tabIds.includes('hiring'), 'hiring must not be a present tab id');
  assert(!tabIds.includes('timeline'), 'timeline is not a domain tab id');

  return {
    presentDomainIds,
    coverageIds,
    tabIds,
    defaultActiveTab: getDefaultActiveTab(presentDomainIds),
  };
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

console.log('\npresent-domain-tab-parity eval: smoke\n');

test('empty events => empty present/coverage/tabs, defaultActiveTab timeline', () => {
  const { presentDomainIds, tabIds, defaultActiveTab } = assertParity([]);
  assert(presentDomainIds.length === 0, 'present empty');
  assert(tabIds.length === 0, 'tabs empty');
  assert(defaultActiveTab === 'timeline', `default=${defaultActiveTab}`);
});

test('single founder_profile => parity [founder_profile], default=founder_profile', () => {
  const { presentDomainIds, tabIds, defaultActiveTab } = assertParity([
    resultEvent(founderA),
  ]);
  assertArraysEqual(presentDomainIds, ['founder_profile'], 'present');
  assertArraysEqual(tabIds, ['founder_profile'], 'tabs');
  assert(defaultActiveTab === 'founder_profile', `default=${defaultActiveTab}`);
});

test('single traction => parity [traction], default=traction', () => {
  const { presentDomainIds, tabIds, defaultActiveTab } = assertParity([
    resultEvent(traction),
  ]);
  assertArraysEqual(presentDomainIds, ['traction'], 'present');
  assertArraysEqual(tabIds, ['traction'], 'tabs');
  assert(defaultActiveTab === 'traction', `default=${defaultActiveTab}`);
});

test('both domains founder then traction event order => registry order founder_profile, traction', () => {
  const registry = getResearchDomains();
  const { presentDomainIds, tabIds, defaultActiveTab } = assertParity([
    resultEvent(founderA),
    resultEvent(traction),
  ]);
  assertArraysEqual(presentDomainIds, registry, 'present = full registry order');
  assertArraysEqual(tabIds, ['founder_profile', 'traction'], 'tabs registry order');
  assert(
    presentDomainIds[0] === 'founder_profile' && presentDomainIds[1] === 'traction',
    `order=${presentDomainIds.join(',')}`,
  );
  assert(defaultActiveTab === 'founder_profile', 'default first present registry');
});

test('both domains reverse event order (traction then founder) => still registry order', () => {
  const { presentDomainIds, tabIds, defaultActiveTab } = assertParity([
    resultEvent(traction),
    resultEvent(founderA),
  ]);
  assertArraysEqual(
    presentDomainIds,
    ['founder_profile', 'traction'],
    'present ignores event insertion order',
  );
  assertArraysEqual(tabIds, ['founder_profile', 'traction'], 'tabs registry order');
  assert(defaultActiveTab === 'founder_profile', 'default first present');
});

test('unknown non-registry ids ignored for present/coverage/tabs', () => {
  const { presentDomainIds, tabIds, defaultActiveTab } = assertParity([
    resultEvent(unknownDomainResult),
    resultEvent(traction),
  ]);
  assert(!presentDomainIds.includes('not_a_registry_domain'), 'unknown not present');
  assert(!tabIds.includes('not_a_registry_domain'), 'unknown not a tab');
  assertArraysEqual(presentDomainIds, ['traction'], 'present');
  assertArraysEqual(tabIds, ['traction'], 'tabs');
  assert(defaultActiveTab === 'traction', `default=${defaultActiveTab}`);
});

test('last-wins multi-RESULT same domain still parity single tab', () => {
  const map = buildResearchResultsByDomain([
    resultEvent(founderA),
    resultEvent(founderB),
  ]);
  assert(map.founder_profile === founderB, 'last-wins map value');
  const { presentDomainIds, tabIds, defaultActiveTab } = assertParity([
    resultEvent(founderA),
    resultEvent(founderB),
  ]);
  assertArraysEqual(presentDomainIds, ['founder_profile'], 'present');
  assertArraysEqual(tabIds, ['founder_profile'], 'tabs');
  assert(defaultActiveTab === 'founder_profile', `default=${defaultActiveTab}`);
});

test('last-wins with both domains still registry-order parity', () => {
  const { presentDomainIds, tabIds, defaultActiveTab } = assertParity([
    resultEvent(traction),
    resultEvent(founderA),
    resultEvent(founderB),
    resultEvent(traction),
  ]);
  assertArraysEqual(
    presentDomainIds,
    ['founder_profile', 'traction'],
    'present registry order after multi last-wins',
  );
  assertArraysEqual(tabIds, ['founder_profile', 'traction'], 'tabs');
  assert(defaultActiveTab === 'founder_profile', 'default first present');
});

test('Coming Soon ids never enter present tab list even if passed as presentDomainIds', () => {
  // Direct SoT check: coverage/tabs only admit registry domains
  const spoofed = ['investor_profile', 'hiring', 'founder_profile', 'timeline'];
  const coverageIds = coveragePresentIds(spoofed);
  const tabIds = getPresentDomainTabIds(spoofed);
  assertArraysEqual(coverageIds, ['founder_profile'], 'coverage strips Coming Soon');
  assertArraysEqual(tabIds, ['founder_profile'], 'tabs strip Coming Soon');
  assert(!tabIds.includes('investor_profile'), 'no investor_profile tab');
  assert(!tabIds.includes('hiring'), 'no hiring tab');
  assert(!tabIds.includes('timeline'), 'no timeline domain tab');
});

test('getPresentDomainTabIds([]) empty; defaultActiveTab([]) is timeline', () => {
  assertArraysEqual(getPresentDomainTabIds([]), [], 'empty tab ids');
  assert(getDefaultActiveTab([]) === 'timeline', 'empty default timeline');
  assert(
    getDefaultActiveTab(['traction']) === 'traction',
    'single default is that id',
  );
  assert(
    getDefaultActiveTab(['founder_profile', 'traction']) === 'founder_profile',
    'first of list',
  );
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
