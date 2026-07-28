/**
 * Smoke eval: ResearchViewer Timeline Results jump active visual/aria contract.
 * Contract (after research-timeline-jump-active-state-ux):
 * (1) jump targets are present-only registry domains from getPresentDomainTabs /
 *     getPresentDomainTabIds(presentDomainIds) in registry order (exclude
 *     timeline and Coming Soon)
 * (2) for each present jump id, ResearchViewer applies
 *     getCoverageBadgeActiveState(id, true, activeTab) so when activeTab === id
 *     the jump is active with ariaCurrent 'true' and activeClassName tokens
 *     including bg-blue/20, font-semibold, ring-1, ring-blue/60
 *     (COVERAGE_BADGE_ACTIVE_CLASS_TOKENS)
 * (3) when activeTab is timeline or a non-matching present domain, non-matching
 *     jumps are not active (no aria-current, empty activeClassName / no
 *     required tokens)
 * (4) empty presentDomainIds => no jump ids (nothing to activate)
 * (5) unknown / Coming Soon / timeline never appear as jump actives
 * Hermetic: zero I/O. Production pure SoT only. Never evaluates systemPrompt getters.
 *
 * Run: npm run eval:timeline-jump-active-state-smoke
 */

import {
  COVERAGE_BADGE_ACTIVE_CLASS_TOKENS,
  getCoverageBadgeActiveState,
  getPresentDomainTabIds,
  getPresentDomainTabs,
  isCoverageBadgeActive,
} from '@/lib/research/domain-coverage';
import { getResearchDomains } from '@/lib/research/domain-registry';

const REQUIRED_ACTIVE_TOKENS = [
  'bg-blue/20',
  'font-semibold',
  'ring-1',
  'ring-blue/60',
] as const;

/**
 * ResearchViewer Timeline Results jumps: presentDomainTabs ids, each with
 * getCoverageBadgeActiveState(id, true, activeTab) for activeClassName + aria-current.
 */
function timelineJumpActiveStates(
  presentDomainIds: readonly string[],
  activeTab: string,
): Array<{
  id: string;
  label: string;
  active: boolean;
  ariaCurrent: 'true' | undefined;
  activeClassName: string;
}> {
  const tabs = getPresentDomainTabs(presentDomainIds);
  return tabs.map(({ id, label }) => {
    const state = getCoverageBadgeActiveState(id, true, activeTab);
    return {
      id,
      label,
      active: state.active,
      ariaCurrent: state.ariaCurrent,
      activeClassName: state.activeClassName,
    };
  });
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
  assert(
    !ids.includes('not_a_registry_domain'),
    `${label}: jump ids must not include unknown domain`,
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

function assertActiveTokens(activeClassName: string, label: string): void {
  for (const token of REQUIRED_ACTIVE_TOKENS) {
    assert(
      activeClassName.split(/\s+/).includes(token),
      `${label}: missing active token ${token} in "${activeClassName}"`,
    );
  }
  assertArraysEqual(
    [...COVERAGE_BADGE_ACTIVE_CLASS_TOKENS],
    [...REQUIRED_ACTIVE_TOKENS],
    `${label}: SoT tokens vs required contract`,
  );
}

function assertJumpActive(
  jump: {
    id: string;
    active: boolean;
    ariaCurrent: 'true' | undefined;
    activeClassName: string;
  },
  label: string,
): void {
  assert(jump.active, `${label}: expected active`);
  assert(jump.ariaCurrent === 'true', `${label}: aria-current true`);
  assertActiveTokens(jump.activeClassName, label);
  assert(
    isCoverageBadgeActive(jump.id, true, jump.id),
    `${label}: isCoverageBadgeActive true when activeTab matches`,
  );
}

function assertJumpNotActive(
  jump: {
    id: string;
    active: boolean;
    ariaCurrent: 'true' | undefined;
    activeClassName: string;
  },
  activeTab: string,
  label: string,
): void {
  assert(!jump.active, `${label}: expected not active`);
  assert(jump.ariaCurrent === undefined, `${label}: no aria-current`);
  assert(jump.activeClassName === '', `${label}: no active class tokens`);
  for (const token of REQUIRED_ACTIVE_TOKENS) {
    assert(
      !jump.activeClassName.split(/\s+/).filter(Boolean).includes(token),
      `${label}: must not include ${token}`,
    );
  }
  assert(
    !isCoverageBadgeActive(jump.id, true, activeTab),
    `${label}: isCoverageBadgeActive false`,
  );
}

// ---- Tests -------------------------------------------------------------

console.log('\ntimeline-jump-active-state eval: smoke\n');

test('empty presentDomainIds => no jump ids (nothing to activate)', () => {
  const present: string[] = [];
  const jumpIds = getPresentDomainTabIds(present);
  assertArraysEqual(jumpIds, [], 'jump ids empty');
  assertArraysEqual(
    getPresentDomainTabs(present).map((t) => t.id),
    [],
    'jump tabs empty',
  );
  const jumps = timelineJumpActiveStates(present, 'timeline');
  assert(jumps.length === 0, 'no jump actives when empty present');
  assertNoForbiddenJumpIds(jumpIds, 'empty');
});

test('jump target ids === getPresentDomainTabIds in registry order', () => {
  const present = ['traction', 'founder_profile'] as const;
  const jumpIds = getPresentDomainTabIds(present);
  const tabs = getPresentDomainTabs(present);
  assertArraysEqual(
    jumpIds,
    ['founder_profile', 'traction'],
    'registry order ignores input order',
  );
  assertArraysEqual(
    jumpIds,
    tabs.map((t) => t.id),
    'ids match getPresentDomainTabs',
  );
  assertArraysEqual(jumpIds, getResearchDomains(), 'full registry when both present');
  assertNoForbiddenJumpIds(jumpIds, 'both present');
});

test('single present founder_profile + activeTab founder_profile => founder jump active only', () => {
  const present = ['founder_profile'] as const;
  const activeTab = 'founder_profile';
  const jumps = timelineJumpActiveStates(present, activeTab);
  assertArraysEqual(
    jumps.map((j) => j.id),
    getPresentDomainTabIds(present),
    'jump set === present tab ids',
  );
  assert(jumps.length === 1, 'one jump');
  assertJumpActive(jumps[0]!, 'founder jump active');
});

test('both present + activeTab traction => traction jump active, founder not', () => {
  const present = ['founder_profile', 'traction'] as const;
  const activeTab = 'traction';
  const jumps = timelineJumpActiveStates(present, activeTab);
  assertArraysEqual(
    jumps.map((j) => j.id),
    ['founder_profile', 'traction'],
    'jump ids',
  );
  const founder = jumps.find((j) => j.id === 'founder_profile');
  const traction = jumps.find((j) => j.id === 'traction');
  assert(founder !== undefined && traction !== undefined, 'both jumps present');
  assertJumpNotActive(founder!, activeTab, 'founder sibling inactive');
  assertJumpActive(traction!, 'traction jump active');
});

test('both present + activeTab timeline => all jumps inactive', () => {
  const present = ['founder_profile', 'traction'] as const;
  const activeTab = 'timeline';
  const jumps = timelineJumpActiveStates(present, activeTab);
  assert(jumps.length === 2, 'two present jumps');
  for (const jump of jumps) {
    assertJumpNotActive(jump, activeTab, `${jump.id} with timeline tab`);
  }
});

test('sibling present: only matching activeTab jump is active', () => {
  const present = ['founder_profile', 'traction'] as const;
  for (const domain of getResearchDomains()) {
    const jumps = timelineJumpActiveStates(present, domain);
    for (const jump of jumps) {
      if (jump.id === domain) {
        assertJumpActive(jump, `${jump.id} active when tab matches`);
      } else {
        assertJumpNotActive(jump, domain, `${jump.id} inactive when tab is ${domain}`);
      }
    }
  }
});

test('unknown / Coming Soon / timeline never appear as jump actives', () => {
  const spoofed = [
    'timeline',
    'investor_profile',
    'hiring',
    'founder_profile',
    'not_a_registry_domain',
  ] as const;
  const jumpIds = getPresentDomainTabIds(spoofed);
  assertArraysEqual(jumpIds, ['founder_profile'], 'only present registry domain');
  assertNoForbiddenJumpIds(jumpIds, 'spoofed present list');

  for (const spoofTab of [
    'timeline',
    'investor_profile',
    'hiring',
    'not_a_registry_domain',
  ]) {
    const jumps = timelineJumpActiveStates(spoofed, spoofTab);
    assertArraysEqual(
      jumps.map((j) => j.id),
      ['founder_profile'],
      `jump set for activeTab=${spoofTab}`,
    );
    for (const jump of jumps) {
      assertJumpNotActive(jump, spoofTab, `${jump.id} inactive for ${spoofTab}`);
    }
  }

  // Even when activeTab is founder_profile, only that present jump activates
  // (Coming Soon / unknown never in jump set)
  const activeJumps = timelineJumpActiveStates(spoofed, 'founder_profile');
  assert(activeJumps.every((j) => j.id === 'founder_profile'), 'only founder in set');
  assertJumpActive(activeJumps[0]!, 'founder active');
  assert(
    !activeJumps.some((j) =>
      ['timeline', 'investor_profile', 'hiring', 'not_a_registry_domain'].includes(j.id),
    ),
    'forbidden ids never jump actives',
  );
});

test('SoT active tokens match locked contract (semantic, not full className)', () => {
  assertArraysEqual(
    [...COVERAGE_BADGE_ACTIVE_CLASS_TOKENS],
    [...REQUIRED_ACTIVE_TOKENS],
    'token contract',
  );
  // Mirrors ResearchViewer: present-only jumps call with present=true
  const active = getCoverageBadgeActiveState('founder_profile', true, 'founder_profile');
  assert(active.active, 'active');
  assert(active.ariaCurrent === 'true', 'aria-current');
  assertActiveTokens(active.activeClassName, 'active jump class');
  const inactive = getCoverageBadgeActiveState('founder_profile', true, 'timeline');
  assert(!inactive.active, 'inactive on timeline');
  assert(inactive.ariaCurrent === undefined, 'no aria-current inactive');
  assert(inactive.activeClassName === '', 'empty class inactive');
  for (const token of REQUIRED_ACTIVE_TOKENS) {
    assert(
      !inactive.activeClassName.split(/\s+/).filter(Boolean).includes(token),
      `inactive must not include ${token}`,
    );
  }
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
