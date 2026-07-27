/**
 * Smoke eval: ResearchViewer coverage badge active visual/aria contract.
 * Contract (after research-coverage-active-tab-highlight-ux):
 * (1) present registry domain + activeTab === domain => active:
 *     ariaCurrent 'true' and active class tokens include
 *     bg-blue/20, font-semibold, ring-1, ring-blue/60
 * (2) present badge not matching activeTab => not active
 * (3) missing badges (present=false) never interactive-active
 * (4) only getDomainCoverage present items can be active;
 *     unknown / Coming Soon never appear as coverage actives
 * Hermetic: zero I/O. Production pure SoT only. Never evaluates systemPrompt getters.
 *
 * Run: npm run eval:coverage-active-tab-highlight-smoke
 */

import {
  COVERAGE_BADGE_ACTIVE_CLASS_TOKENS,
  getActiveCoverageDomainIds,
  getCoverageBadgeActiveState,
  getDomainCoverage,
  isCoverageBadgeActive,
} from '@/lib/research/domain-coverage';
import { getResearchDomains } from '@/lib/research/domain-registry';

const REQUIRED_ACTIVE_TOKENS = [
  'bg-blue/20',
  'font-semibold',
  'ring-1',
  'ring-blue/60',
] as const;

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
  // SoT tokens match the locked contract (semantic, not full className equality)
  assertArraysEqual(
    [...COVERAGE_BADGE_ACTIVE_CLASS_TOKENS],
    [...REQUIRED_ACTIVE_TOKENS],
    `${label}: SoT tokens vs required contract`,
  );
}

function assertNotActive(
  domain: string,
  present: boolean,
  activeTab: string,
  label: string,
): void {
  const state = getCoverageBadgeActiveState(domain, present, activeTab);
  assert(!state.active, `${label}: expected not active`);
  assert(state.ariaCurrent === undefined, `${label}: no aria-current`);
  assert(state.activeClassName === '', `${label}: no active class tokens`);
  assert(
    !isCoverageBadgeActive(domain, present, activeTab),
    `${label}: isCoverageBadgeActive false`,
  );
}

function assertActive(
  domain: string,
  present: boolean,
  activeTab: string,
  label: string,
): void {
  const state = getCoverageBadgeActiveState(domain, present, activeTab);
  assert(state.active, `${label}: expected active`);
  assert(state.ariaCurrent === 'true', `${label}: aria-current true`);
  assertActiveTokens(state.activeClassName, label);
  assert(
    isCoverageBadgeActive(domain, present, activeTab),
    `${label}: isCoverageBadgeActive true`,
  );
}

// ---- Tests -------------------------------------------------------------

console.log('\ncoverage-active-tab-highlight eval: smoke\n');

test('empty present + activeTab timeline => no actives', () => {
  const present: string[] = [];
  const activeTab = 'timeline';
  const actives = getActiveCoverageDomainIds(present, activeTab);
  assertArraysEqual(actives, [], 'no active coverage domains');
  for (const item of getDomainCoverage(present)) {
    assert(!item.present, `${item.domain} missing when empty present`);
    assertNotActive(item.domain, item.present, activeTab, item.domain);
  }
});

test('single present founder_profile + activeTab founder_profile => founder active only', () => {
  const present = ['founder_profile'] as const;
  const activeTab = 'founder_profile';
  const coverage = getDomainCoverage(present);
  const founder = coverage.find((c) => c.domain === 'founder_profile');
  const traction = coverage.find((c) => c.domain === 'traction');
  assert(founder?.present === true, 'founder present');
  assert(traction?.present === false, 'traction missing');
  assertActive('founder_profile', true, activeTab, 'founder present active');
  assertNotActive('traction', false, activeTab, 'traction missing not active');
  assertArraysEqual(
    getActiveCoverageDomainIds(present, activeTab),
    ['founder_profile'],
    'actives',
  );
});

test('both present + activeTab traction => traction active, founder not', () => {
  const present = ['founder_profile', 'traction'] as const;
  const activeTab = 'traction';
  assertActive('traction', true, activeTab, 'traction active');
  assertNotActive('founder_profile', true, activeTab, 'founder inactive sibling');
  assertArraysEqual(
    getActiveCoverageDomainIds(present, activeTab),
    ['traction'],
    'actives',
  );
});

test('both present + activeTab timeline => none active', () => {
  const present = ['founder_profile', 'traction'] as const;
  const activeTab = 'timeline';
  for (const domain of getResearchDomains()) {
    assertNotActive(domain, true, activeTab, `${domain} with timeline tab`);
  }
  assertArraysEqual(
    getActiveCoverageDomainIds(present, activeTab),
    [],
    'no actives on timeline',
  );
});

test('activeTab matches missing domain id => no active on missing badge', () => {
  const present = ['founder_profile'] as const;
  // traction is missing; activeTab still traction must not activate missing badge
  const activeTab = 'traction';
  const coverage = getDomainCoverage(present);
  const traction = coverage.find((c) => c.domain === 'traction');
  assert(traction?.present === false, 'traction is missing');
  assertNotActive('traction', false, activeTab, 'missing traction never active');
  assertNotActive('founder_profile', true, activeTab, 'founder not matching tab');
  assertArraysEqual(
    getActiveCoverageDomainIds(present, activeTab),
    [],
    'no actives when only missing matches tab',
  );
});

test('only present registry domains can be active; Coming Soon never coverage actives', () => {
  const present = [
    'founder_profile',
    'traction',
    'investor_profile',
    'hiring',
    'timeline',
    'not_a_registry_domain',
  ] as const;
  const coverage = getDomainCoverage(present);
  // Coverage row is registry-only
  assertArraysEqual(
    coverage.map((c) => c.domain),
    getResearchDomains(),
    'coverage domains === registry',
  );
  assert(
    !coverage.some((c) => c.domain === 'investor_profile' || c.domain === 'hiring'),
    'Coming Soon never in getDomainCoverage',
  );
  assert(
    !coverage.some((c) => c.domain === 'not_a_registry_domain' || c.domain === 'timeline'),
    'unknown/timeline never in getDomainCoverage',
  );

  for (const spoof of ['investor_profile', 'hiring', 'timeline', 'not_a_registry_domain']) {
    // Even if somehow treated as present, only registry domains appear in actives list
    const actives = getActiveCoverageDomainIds(present, spoof);
    assertArraysEqual(actives, [], `no coverage active for activeTab=${spoof}`);
  }

  assertArraysEqual(
    getActiveCoverageDomainIds(present, 'founder_profile'),
    ['founder_profile'],
    'only founder when activeTab founder',
  );
  // present=false path cannot become active even when domain id matches
  assertNotActive('traction', false, 'traction', 'explicit missing never active');
});

test('sibling present domains: only matching activeTab is active', () => {
  const present = ['founder_profile', 'traction'] as const;
  for (const domain of getResearchDomains()) {
    const actives = getActiveCoverageDomainIds(present, domain);
    assertArraysEqual(actives, [domain], `active only ${domain}`);
    for (const item of getDomainCoverage(present)) {
      if (item.domain === domain) {
        assertActive(item.domain, item.present, domain, `${item.domain} active`);
      } else {
        assertNotActive(item.domain, item.present, domain, `${item.domain} inactive`);
      }
    }
  }
});

test('SoT active tokens match locked contract (semantic, not full className)', () => {
  assertArraysEqual(
    [...COVERAGE_BADGE_ACTIVE_CLASS_TOKENS],
    [...REQUIRED_ACTIVE_TOKENS],
    'token contract',
  );
  const state = getCoverageBadgeActiveState('founder_profile', true, 'founder_profile');
  assertActiveTokens(state.activeClassName, 'active state class');
  const inactive = getCoverageBadgeActiveState('founder_profile', true, 'timeline');
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
