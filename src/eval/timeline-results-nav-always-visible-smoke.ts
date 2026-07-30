/**
 * Smoke eval: ResearchViewer always-visible Timeline Results jump nav chrome.
 * Contract (after research-timeline-results-nav-always-visible-ux hoist):
 * (1) Results nav chrome is present iff getPresentDomainTabs(presentDomainIds).length > 0
 *     (equivalently getPresentDomainTabIds non-empty); empty present => no jump ids
 *     and no Results nav model rows
 * (2) when present, jump targets equal getPresentDomainTabIds / getPresentDomainTabs
 *     order (registry order); exclude timeline, Coming Soon (investor_profile /
 *     hiring), and unknown non-registry ids
 * (3) for each present jump id, active visual/aria state is
 *     getCoverageBadgeActiveState(id, true, activeTab) so when activeTab === id
 *     the jump is active with ariaCurrent 'true' and activeClassName tokens
 *     including bg-blue/20, font-semibold, ring-1, ring-blue/60
 *     (COVERAGE_BADGE_ACTIVE_CLASS_TOKENS); when activeTab is timeline or a
 *     non-matching present domain, non-matching jumps are not active
 * (4) only present registry domains from getDomainCoverage present items can
 *     appear as jump actives; unknown / Coming Soon / timeline never appear
 * Hermetic pure model only (presence + targets + active). Placement/React mount
 * is out of scope. Zero I/O. Production pure SoT only. Never evaluates
 * systemPrompt getters.
 *
 * Run: npm run eval:timeline-results-nav-always-visible-smoke
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
 * Always-visible Results nav chrome model (independent of which TabsContent is
 * mounted). Mirrors ResearchViewer: show when presentDomainTabs.length > 0;
 * each row uses getCoverageBadgeActiveState(id, true, activeTab).
 */
function alwaysVisibleResultsNavModel(
  presentDomainIds: readonly string[],
  activeTab: string,
): {
  showNav: boolean;
  jumpIds: string[];
  rows: Array<{
    id: string;
    label: string;
    active: boolean;
    ariaCurrent: 'true' | undefined;
    activeClassName: string;
  }>;
} {
  const tabs = getPresentDomainTabs(presentDomainIds);
  const jumpIds = getPresentDomainTabIds(presentDomainIds);
  const showNav = tabs.length > 0;
  const rows = showNav
    ? tabs.map(({ id, label }) => {
        const state = getCoverageBadgeActiveState(id, true, activeTab);
        return {
          id,
          label,
          active: state.active,
          ariaCurrent: state.ariaCurrent,
          activeClassName: state.activeClassName,
        };
      })
    : [];
  return { showNav, jumpIds, rows };
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

function assertRowActive(
  row: {
    id: string;
    active: boolean;
    ariaCurrent: 'true' | undefined;
    activeClassName: string;
  },
  label: string,
): void {
  assert(row.active, `${label}: expected active`);
  assert(row.ariaCurrent === 'true', `${label}: aria-current true`);
  assertActiveTokens(row.activeClassName, label);
  assert(
    isCoverageBadgeActive(row.id, true, row.id),
    `${label}: isCoverageBadgeActive true when activeTab matches`,
  );
}

function assertRowNotActive(
  row: {
    id: string;
    active: boolean;
    ariaCurrent: 'true' | undefined;
    activeClassName: string;
  },
  activeTab: string,
  label: string,
): void {
  assert(!row.active, `${label}: expected not active`);
  assert(row.ariaCurrent === undefined, `${label}: no aria-current`);
  assert(row.activeClassName === '', `${label}: no active class tokens`);
  for (const token of REQUIRED_ACTIVE_TOKENS) {
    assert(
      !row.activeClassName.split(/\s+/).filter(Boolean).includes(token),
      `${label}: must not include ${token}`,
    );
  }
  assert(
    !isCoverageBadgeActive(row.id, true, activeTab),
    `${label}: isCoverageBadgeActive false`,
  );
}

// ---- Tests -------------------------------------------------------------

console.log('\ntimeline-results-nav-always-visible eval: smoke\n');

test('empty present + activeTab timeline => no nav rows', () => {
  const present: string[] = [];
  const model = alwaysVisibleResultsNavModel(present, 'timeline');
  assert(!model.showNav, 'chrome absent when empty present');
  assertArraysEqual(model.jumpIds, [], 'no jump ids');
  assert(model.rows.length === 0, 'no Results nav model rows');
  assertArraysEqual(
    getPresentDomainTabs(present).map((t) => t.id),
    [],
    'getPresentDomainTabs empty',
  );
  assert(
    getPresentDomainTabs(present).length === 0,
    'presence iff getPresentDomainTabs length > 0',
  );
  assertNoForbiddenJumpIds(model.jumpIds, 'empty');
});

test('presence iff getPresentDomainTabs non-empty (activeTab independent)', () => {
  // Always-visible chrome: presence depends only on present domains, not mount tab
  for (const activeTab of ['timeline', 'founder_profile', 'traction', 'missing_domain']) {
    const empty = alwaysVisibleResultsNavModel([], activeTab);
    assert(!empty.showNav, `empty + ${activeTab}: no chrome`);
    assert(empty.rows.length === 0, `empty + ${activeTab}: no rows`);

    const present = alwaysVisibleResultsNavModel(['founder_profile'], activeTab);
    assert(present.showNav, `present + ${activeTab}: chrome shown`);
    assert(present.rows.length === 1, `present + ${activeTab}: one row`);
    assertArraysEqual(present.jumpIds, ['founder_profile'], `jump ids + ${activeTab}`);
  }
});

test('single present founder_profile + activeTab founder_profile => one row founder active', () => {
  const present = ['founder_profile'] as const;
  const activeTab = 'founder_profile';
  const model = alwaysVisibleResultsNavModel(present, activeTab);
  assert(model.showNav, 'chrome present');
  assertArraysEqual(
    model.jumpIds,
    getPresentDomainTabIds(present),
    'jump ids === getPresentDomainTabIds',
  );
  assertArraysEqual(model.jumpIds, ['founder_profile'], 'single jump target');
  assert(model.rows.length === 1, 'one row');
  assert(model.rows[0]!.id === 'founder_profile', 'founder id');
  assertRowActive(model.rows[0]!, 'founder jump active');
  assertNoForbiddenJumpIds(model.jumpIds, 'single founder');
});

test('both registry domains + activeTab traction => traction active, founder not', () => {
  const present = ['founder_profile', 'traction'] as const;
  const activeTab = 'traction';
  const model = alwaysVisibleResultsNavModel(present, activeTab);
  assert(model.showNav, 'chrome present');
  assertArraysEqual(
    model.jumpIds,
    ['founder_profile', 'traction'],
    'registry order targets',
  );
  assertArraysEqual(
    model.jumpIds,
    getPresentDomainTabIds(present),
    'jump ids SoT',
  );
  assertArraysEqual(
    model.rows.map((r) => r.id),
    getPresentDomainTabs(present).map((t) => t.id),
    'row order === getPresentDomainTabs',
  );
  const founder = model.rows.find((r) => r.id === 'founder_profile');
  const traction = model.rows.find((r) => r.id === 'traction');
  assert(founder !== undefined && traction !== undefined, 'both rows present');
  assertRowNotActive(founder!, activeTab, 'founder sibling inactive');
  assertRowActive(traction!, 'traction jump active');
  assertNoForbiddenJumpIds(model.jumpIds, 'both domains');
});

test('both present + activeTab timeline => rows present, none active', () => {
  const present = ['founder_profile', 'traction'] as const;
  const activeTab = 'timeline';
  const model = alwaysVisibleResultsNavModel(present, activeTab);
  assert(model.showNav, 'chrome still present off-timeline (always-visible)');
  assert(model.rows.length === 2, 'two present rows');
  assertArraysEqual(model.jumpIds, getResearchDomains(), 'full registry when both present');
  for (const row of model.rows) {
    assertRowNotActive(row, activeTab, `${row.id} with timeline tab`);
  }
});

test('activeTab matches missing domain id => present rows not active for missing', () => {
  // Only traction present; activeTab is founder_profile (missing from stream)
  const present = ['traction'] as const;
  const activeTab = 'founder_profile';
  const model = alwaysVisibleResultsNavModel(present, activeTab);
  assert(model.showNav, 'chrome for present traction');
  assertArraysEqual(model.jumpIds, ['traction'], 'only present registry domain');
  assert(
    !model.jumpIds.includes('founder_profile'),
    'missing domain not a jump target',
  );
  assert(model.rows.length === 1, 'one present row');
  assertRowNotActive(model.rows[0]!, activeTab, 'traction not active for missing founder tab');
  // Matching activeTab that is present still activates that row
  const whenTraction = alwaysVisibleResultsNavModel(present, 'traction');
  assertRowActive(whenTraction.rows[0]!, 'traction active when tab matches');
});

test('jump targets exclude timeline, Coming Soon, and unknown non-registry ids', () => {
  const spoofed = [
    'timeline',
    'investor_profile',
    'hiring',
    'founder_profile',
    'not_a_registry_domain',
  ] as const;
  const model = alwaysVisibleResultsNavModel(spoofed, 'founder_profile');
  assert(model.showNav, 'chrome for valid present');
  assertArraysEqual(model.jumpIds, ['founder_profile'], 'only present registry domain');
  assertNoForbiddenJumpIds(model.jumpIds, 'spoofed present list');
  assert(
    model.rows.every((r) => r.id === 'founder_profile'),
    'only founder row',
  );
  assertRowActive(model.rows[0]!, 'founder active');
  assert(
    !model.rows.some((r) =>
      ['timeline', 'investor_profile', 'hiring', 'not_a_registry_domain'].includes(
        r.id,
      ),
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
  const active = getCoverageBadgeActiveState(
    'founder_profile',
    true,
    'founder_profile',
  );
  assert(active.active, 'active');
  assert(active.ariaCurrent === 'true', 'aria-current');
  assertActiveTokens(active.activeClassName, 'active jump class');
  const inactive = getCoverageBadgeActiveState('founder_profile', true, 'timeline');
  assert(!inactive.active, 'inactive on timeline');
  assert(inactive.ariaCurrent === undefined, 'no aria-current inactive');
  assert(inactive.activeClassName === '', 'empty class inactive');
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
