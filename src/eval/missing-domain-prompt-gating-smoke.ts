/**
 * Smoke eval: ResearchViewer missing-domain prompt gating (pure SoT).
 * Contract:
 * (1) missing labels = getDomainCoverage present=false labels in DOMAIN_REGISTRY order
 * (2) show when labels.length > 0 && (isResearching || eventCount > 0 || present ids)
 * (3) copy: live gathering vs not-produced, labels joined with ", "
 * Hermetic: zero I/O. Never evaluates systemPrompt getters.
 *
 * Run: npm run eval:missing-domain-prompt-gating-smoke
 */

import {
  getDomainCoverage,
  getMissingDomainLabels,
  getMissingDomainPromptState,
} from '@/lib/research/domain-coverage';
import { getResearchDomains } from '@/lib/research/domain-registry';

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

console.log('\nmissing-domain-prompt-gating eval: smoke\n');

const registry = getResearchDomains();
const allRegistryLabels = getDomainCoverage([]).map((item) => item.label);

test('idle empty: no events, not researching, no present => no prompt', () => {
  const state = getMissingDomainPromptState({
    presentDomainIds: [],
    isResearching: false,
    eventCount: 0,
  });
  assert(!state.show, 'show must be false when idle empty');
  assert(state.text === null, 'text null when hidden');
  assertArraysEqual(state.labels, allRegistryLabels, 'labels still all missing');
});

test('isResearching with all registry missing => live gathering prompt', () => {
  const state = getMissingDomainPromptState({
    presentDomainIds: [],
    isResearching: true,
    eventCount: 0,
  });
  assert(state.show, 'show while researching with missing domains');
  assertArraysEqual(state.labels, allRegistryLabels, 'all registry labels missing');
  assert(
    state.text ===
      `Research may still be gathering: ${allRegistryLabels.join(', ')}.`,
    `text=${state.text}`,
  );
  assert(
    !state.labels.includes('Investor Profile') &&
      !state.labels.includes('Hiring') &&
      !state.labels.some((l) => /investor|hiring/i.test(l)),
    'Coming Soon labels must not leak',
  );
});

test('completed partial present (one present, other missing) => not-produced copy', () => {
  assert(registry.includes('founder_profile'), 'registry has founder_profile');
  const present = ['founder_profile'] as const;
  const expectedMissing = getDomainCoverage(present)
    .filter((item) => !item.present)
    .map((item) => item.label);
  assert(expectedMissing.length > 0, 'at least one domain missing');

  const state = getMissingDomainPromptState({
    presentDomainIds: present,
    isResearching: false,
    eventCount: 2,
  });
  assert(state.show, 'show for completed partial run');
  assertArraysEqual(state.labels, expectedMissing, 'missing labels only');
  assert(
    state.text === `Not produced in this run: ${expectedMissing.join(', ')}.`,
    `text=${state.text}`,
  );
  assert(!state.labels.includes('Founder Profile'), 'present domain not in missing');
});

test('eventCount > 0 with empty presentDomainIds (not researching) => not-produced', () => {
  const state = getMissingDomainPromptState({
    presentDomainIds: [],
    isResearching: false,
    eventCount: 3,
  });
  assert(state.show, 'events alone gate the prompt open');
  assertArraysEqual(state.labels, allRegistryLabels, 'all missing');
  assert(
    state.text ===
      `Not produced in this run: ${allRegistryLabels.join(', ')}.`,
    `text=${state.text}`,
  );
});

test('presentDomainIds non-empty without events (not researching) => not-produced', () => {
  const present = ['traction'] as const;
  const expectedMissing = getMissingDomainLabels(present);
  const state = getMissingDomainPromptState({
    presentDomainIds: present,
    isResearching: false,
    eventCount: 0,
  });
  assert(state.show, 'present ids alone gate the prompt open');
  assertArraysEqual(state.labels, expectedMissing, 'missing labels');
  assert(
    state.text === `Not produced in this run: ${expectedMissing.join(', ')}.`,
    `text=${state.text}`,
  );
});

test('all registry domains present => no prompt even if researching/events', () => {
  const state = getMissingDomainPromptState({
    presentDomainIds: registry,
    isResearching: true,
    eventCount: 10,
  });
  assert(state.labels.length === 0, 'no missing labels');
  assert(!state.show, 'no prompt when fully covered');
  assert(state.text === null, 'text null');
});

test('getMissingDomainLabels matches coverage filter map in registry order', () => {
  const samples: string[][] = [[], ['founder_profile'], ['traction'], registry];
  for (const present of samples) {
    const viaHelper = getMissingDomainLabels(present);
    const viaCoverage = getDomainCoverage(present)
      .filter((item) => !item.present)
      .map((item) => item.label);
    assertArraysEqual(viaHelper, viaCoverage, `labels for [${present.join(',')}]`);
  }
});

test('labels never invent Coming Soon investor_profile/hiring', () => {
  const labels = getMissingDomainLabels(['investor_profile', 'hiring']);
  // Coming Soon ids are not registry present marks; both registry domains still missing
  assertArraysEqual(labels, allRegistryLabels, 'spoofed Coming Soon ignored as present');
  for (const label of labels) {
    assert(
      !/investor_profile|hiring/i.test(label),
      `label must not be Coming Soon raw id: ${label}`,
    );
  }
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
