/**
 * Smoke eval: ResearchViewer timeline ↔ domain-result crosslink affordance targets.
 * Contract (after research-timeline-domain-result-crosslink-ux):
 * (1) Timeline Results jump target ids === getPresentDomainTabIds(presentDomainIds)
 *     (same order as getPresentDomainTabs used by Timeline TabsContent)
 * (2) Jump targets exclude timeline and Coming Soon (investor_profile / hiring)
 * (3) empty presentDomainIds => empty jump targets (no Results row data)
 * (4) domain → timeline back target is the literal tab id 'timeline'
 * Hermetic: zero I/O. Production pure SoT only. Never evaluates systemPrompt getters.
 *
 * Run: npm run eval:timeline-domain-crosslink-affordance-smoke
 */

import type {
  FounderProfileResult,
  ResearchResult,
  StreamChunk,
  TractionResult,
} from '@/types/llm.types';
import { SSEEvent } from '@/types/llm.types';
import {
  getPresentDomainTabIds,
  getPresentDomainTabs,
} from '@/lib/research/domain-coverage';
import {
  buildResearchResultsByDomain,
  getPresentDomainIds,
} from '@/lib/research/multi-domain-stream';
import { getResearchDomains } from '@/lib/research/domain-registry';

/** Domain TabsContent back control always setActiveTab('timeline'). Not a registry domain. */
const TIMELINE_BACK_TAB_ID = 'timeline' as const;

// ---- Minimal fixtures ----------------------------------------------------

const founder: FounderProfileResult = {
  domain: 'founder_profile',
  summary: 'Founder summary',
  sources: ['https://example.com/founder'],
  executiveSummary: 'A',
  founderRelationship: [],
  complementarySkills: [],
  socialPresence: [],
  trackRecord: [],
  founders: [{ name: 'A', title: 'CEO' }],
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

/**
 * ResearchViewer Timeline Results jump targets: presentDomainTabs from
 * getPresentDomainTabs(presentDomainIds). Ids are getPresentDomainTabIds.
 */
function timelineResultsJumpTargets(presentDomainIds: readonly string[]): {
  ids: string[];
  labels: string[];
  tabs: Array<{ id: string; label: string }>;
} {
  const tabs = getPresentDomainTabs(presentDomainIds);
  const ids = getPresentDomainTabIds(presentDomainIds);
  return {
    ids,
    labels: tabs.map((t) => t.label),
    tabs,
  };
}

function presentFromEvents(events: readonly StreamChunk[]): string[] {
  return getPresentDomainIds(buildResearchResultsByDomain(events));
}

function assertNoForbiddenJumpIds(ids: readonly string[], label: string): void {
  assert(!ids.includes('timeline'), `${label}: jump ids must not include timeline`);
  assert(
    !ids.includes('investor_profile'),
    `${label}: jump ids must not include investor_profile (Coming Soon)`,
  );
  assert(
    !ids.includes('hiring'),
    `${label}: jump ids must not include hiring (Coming Soon)`,
  );
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

// ---- Tests -------------------------------------------------------------

console.log('\ntimeline-domain-crosslink-affordance eval: smoke\n');

test('empty presentDomainIds => empty jump targets (no Results row data)', () => {
  const jump = timelineResultsJumpTargets([]);
  assertArraysEqual(jump.ids, [], 'jump ids empty');
  assertArraysEqual(jump.labels, [], 'jump labels empty');
  assert(jump.tabs.length === 0, 'no Results row tabs');
  assertNoForbiddenJumpIds(jump.ids, 'empty');
});

test('single founder_profile => jump target [founder_profile] only', () => {
  const present = presentFromEvents([resultEvent(founder)]);
  const jump = timelineResultsJumpTargets(present);
  assertArraysEqual(present, ['founder_profile'], 'present');
  assertArraysEqual(jump.ids, ['founder_profile'], 'jump ids');
  assertArraysEqual(
    jump.ids,
    getPresentDomainTabIds(present),
    'jump ids === getPresentDomainTabIds',
  );
  assertNoForbiddenJumpIds(jump.ids, 'single founder');
});

test('both registry domains in registry order (founder_profile then traction)', () => {
  const registry = getResearchDomains();
  const present = presentFromEvents([
    resultEvent(traction),
    resultEvent(founder),
  ]);
  const jump = timelineResultsJumpTargets(present);
  assertArraysEqual(present, registry, 'present = full registry order');
  assertArraysEqual(
    jump.ids,
    ['founder_profile', 'traction'],
    'jump ids registry order ignores event order',
  );
  assertArraysEqual(
    jump.ids,
    getPresentDomainTabIds(present),
    'jump ids === getPresentDomainTabIds',
  );
  assert(
    jump.ids[0] === 'founder_profile' && jump.ids[1] === 'traction',
    `order=${jump.ids.join(',')}`,
  );
  assertNoForbiddenJumpIds(jump.ids, 'both domains');
});

test('unknown non-registry ids ignored for jump targets', () => {
  const present = presentFromEvents([
    resultEvent(unknownDomainResult),
    resultEvent(traction),
  ]);
  const jump = timelineResultsJumpTargets(present);
  assert(!present.includes('not_a_registry_domain'), 'unknown not present');
  assert(
    !jump.ids.includes('not_a_registry_domain'),
    'unknown not a jump target',
  );
  assertArraysEqual(jump.ids, ['traction'], 'jump ids');
  assertNoForbiddenJumpIds(jump.ids, 'unknown ignored');
});

test('label parity: jump labels match getPresentDomainTabs labels', () => {
  const present = ['founder_profile', 'traction'] as const;
  const tabs = getPresentDomainTabs(present);
  const jump = timelineResultsJumpTargets(present);
  assertArraysEqual(
    jump.labels,
    tabs.map((t) => t.label),
    'labels match getPresentDomainTabs',
  );
  assertArraysEqual(
    jump.ids,
    tabs.map((t) => t.id),
    'ids match getPresentDomainTabs',
  );
  // ResearchViewer renders {label} on each jump button
  assert(
    jump.tabs.every((t, i) => t.id === tabs[i]?.id && t.label === tabs[i]?.label),
    'tab objects parity with getPresentDomainTabs',
  );
});

test('jump target ids never include timeline or Coming Soon', () => {
  const spoofed = [
    'timeline',
    'investor_profile',
    'hiring',
    'founder_profile',
    'not_a_registry_domain',
  ];
  const jump = timelineResultsJumpTargets(spoofed);
  assertArraysEqual(jump.ids, ['founder_profile'], 'only present registry domain');
  assertNoForbiddenJumpIds(jump.ids, 'spoofed present list');
  assert(
    !jump.ids.includes('not_a_registry_domain'),
    'unknown stripped from jump targets',
  );
});

test('domain → timeline back target is always literal tab id timeline', () => {
  // ResearchViewer domain TabsContent: setActiveTab('timeline')
  assert(TIMELINE_BACK_TAB_ID === 'timeline', 'back target is timeline');
  assert(
    !getResearchDomains().includes(TIMELINE_BACK_TAB_ID),
    'timeline is not a registry domain',
  );
  // Back target is independent of which domain tab is open (not a domain id)
  for (const domainId of getResearchDomains()) {
    const backTarget: string = TIMELINE_BACK_TAB_ID;
    assert(backTarget === 'timeline', `back from ${domainId} is timeline`);
    assert(backTarget !== domainId, `back is not domain ${domainId}`);
  }
  // Jump targets must not conflate with back target
  const jump = timelineResultsJumpTargets(['founder_profile', 'traction']);
  assert(!jump.ids.includes(TIMELINE_BACK_TAB_ID), 'jump ids exclude back target');
});

test('jump ids stay equal to getPresentDomainTabIds across present shapes', () => {
  const cases: readonly (readonly string[])[] = [
    [],
    ['founder_profile'],
    ['traction'],
    ['founder_profile', 'traction'],
    ['traction', 'founder_profile'],
    ['investor_profile', 'hiring', 'timeline'],
  ];
  for (const present of cases) {
    const jump = timelineResultsJumpTargets(present);
    assertArraysEqual(
      jump.ids,
      getPresentDomainTabIds(present),
      `ids SoT parity for present=[${present.join(',')}]`,
    );
    assertNoForbiddenJumpIds(jump.ids, `shapes present=[${present.join(',')}]`);
  }
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
