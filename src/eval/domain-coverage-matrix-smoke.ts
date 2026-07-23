/**
 * Smoke eval for getDomainCoverage (coverage matrix used by checklist + multi-domain tabs).
 * Locks: registry length/order, present flags, unknown-id ignore, nullish/empty skip, labels.
 * Hermetic: zero I/O, no network, DB, E2B, or .env. Never evaluates systemPrompt getters.
 * Imports production getDomainCoverage + DOMAIN_REGISTRY / getResearchDomains only.
 *
 * Run: npm run eval:domain-coverage-matrix-smoke
 */

import { getDomainCoverage } from '@/lib/research/domain-coverage';
import {
  DOMAIN_REGISTRY,
  getResearchDomains,
} from '@/lib/research/domain-registry';

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

console.log('\ndomain-coverage-matrix eval: smoke\n');

const registryKeys = Object.keys(DOMAIN_REGISTRY);

test('getResearchDomains matches Object.keys(DOMAIN_REGISTRY)', () => {
  const domains = getResearchDomains();
  assert(
    domains.length === registryKeys.length,
    `length mismatch: domains=${domains.length} keys=${registryKeys.length}`,
  );
  for (let i = 0; i < registryKeys.length; i++) {
    assert(
      domains[i] === registryKeys[i],
      `order mismatch at ${i}: domain=${domains[i]} key=${registryKeys[i]}`,
    );
  }
});

test('empty input yields all present=false and full registry length', () => {
  const coverage = getDomainCoverage([]);
  assert(
    coverage.length === registryKeys.length,
    `length ${coverage.length} !== ${registryKeys.length}`,
  );
  for (let i = 0; i < registryKeys.length; i++) {
    assert(coverage[i].domain === registryKeys[i], `order at ${i}`);
    assert(coverage[i].present === false, `${coverage[i].domain} should be false`);
  }
});

test('length always equals Object.keys(DOMAIN_REGISTRY)', () => {
  for (const input of [
    [],
    ['founder_profile'],
    ['traction'],
    ['founder_profile', 'traction'],
    ['unknown_domain', 'investor_profile'],
    [null, undefined, '', 'founder_profile'] as (string | null | undefined)[],
  ]) {
    const coverage = getDomainCoverage(input);
    assert(
      coverage.length === registryKeys.length,
      `input=${JSON.stringify(input)} length=${coverage.length}`,
    );
  }
});

test('order matches registry key order', () => {
  const coverage = getDomainCoverage(['traction', 'founder_profile']);
  for (let i = 0; i < registryKeys.length; i++) {
    assert(
      coverage[i].domain === registryKeys[i],
      `expected ${registryKeys[i]} at ${i}, got ${coverage[i].domain}`,
    );
  }
});

test('present=true only for registry keys in the input set', () => {
  const coverage = getDomainCoverage(['founder_profile']);
  const byDomain = Object.fromEntries(coverage.map((c) => [c.domain, c.present]));
  for (const key of registryKeys) {
    const expected = key === 'founder_profile';
    assert(
      byDomain[key] === expected,
      `${key}: present=${byDomain[key]} expected=${expected}`,
    );
  }
});

test('unknown/non-registry present ids are ignored (no extra rows)', () => {
  const coverage = getDomainCoverage([
    'investor_profile',
    'hiring',
    'not_a_domain',
    'founder_profile',
  ]);
  assert(
    coverage.length === registryKeys.length,
    `extra rows: length=${coverage.length}`,
  );
  const domains = coverage.map((c) => c.domain);
  assert(!domains.includes('investor_profile'), 'investor_profile must not appear');
  assert(!domains.includes('hiring'), 'hiring must not appear');
  assert(!domains.includes('not_a_domain'), 'not_a_domain must not appear');
  const founder = coverage.find((c) => c.domain === 'founder_profile');
  assert(founder?.present === true, 'founder_profile should be present');
  const traction = coverage.find((c) => c.domain === 'traction');
  assert(traction?.present === false, 'traction should be absent');
});

test('null/undefined/empty-string inputs skipped', () => {
  const coverage = getDomainCoverage([
    null,
    undefined,
    '',
    'traction',
    null,
    '',
  ]);
  const byDomain = Object.fromEntries(coverage.map((c) => [c.domain, c.present]));
  assert(byDomain.traction === true, 'traction should be present');
  assert(byDomain.founder_profile === false, 'founder_profile should be false');
  assert(coverage.length === registryKeys.length, 'length stable after nullish skip');
});

test('founder_profile and traction labels are human labels', () => {
  const coverage = getDomainCoverage(registryKeys);
  const founder = coverage.find((c) => c.domain === 'founder_profile');
  const traction = coverage.find((c) => c.domain === 'traction');
  assert(founder != null, 'founder_profile row required');
  assert(traction != null, 'traction row required');
  assert(
    founder.label === 'Founder Profile',
    `founder label: ${founder.label}`,
  );
  assert(traction.label === 'Traction', `traction label: ${traction.label}`);
});

test('all registry domains absent from input have present=false', () => {
  const coverage = getDomainCoverage(['not_in_registry']);
  for (const item of coverage) {
    assert(
      item.present === false,
      `${item.domain} should be false when input has no registry keys`,
    );
  }
});

test('partial present: traction only', () => {
  const coverage = getDomainCoverage(['traction']);
  for (const item of coverage) {
    const expected = item.domain === 'traction';
    assert(
      item.present === expected,
      `${item.domain}: present=${item.present} expected=${expected}`,
    );
  }
});

test('full present: all registry keys', () => {
  const coverage = getDomainCoverage(registryKeys);
  assert(coverage.every((c) => c.present), 'all registry keys should be present');
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
