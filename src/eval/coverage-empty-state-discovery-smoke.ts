/**
 * Smoke eval: ResearchViewer coverage empty-state pure SoT
 * (getCoverageBadgePresentationModel) after
 * research-coverage-empty-state-discovery-ux.
 *
 * Contract:
 * (1) idle empty (isResearching=false, eventCount=0, present=[]) =>
 *     every registry badge status pending, badgeText '{label} · not yet researched',
 *     discoveryLine non-null discovery copy
 * (2) live empty (isResearching=true, no present) => all absent status gathering,
 *     badgeText '{label} · gathering', discoveryLine null
 * (3) post-activity all-missing (eventCount>0, not researching, no present) =>
 *     status missing, badgeText '{label} · missing', discoveryLine null
 * (4) presentCount activity alone (present non-empty, absent sibling, not researching)
 *     => absent uses missing (not pending)
 * (5) partial present: present items status null, badgeText label alone,
 *     title present-switch wording; absent follow policy
 * (6) all registry present => every status null, discoveryLine null
 * (7) registry order + labels match getDomainCoverage / DOMAIN_REGISTRY;
 *     Coming Soon (investor_profile/hiring) never appear
 * (8) never throws on empty/nullish id iterables; never evaluate systemPrompt getters
 *
 * Hermetic: zero I/O. Import production SoT only (no hand-mirrored badge tables).
 *
 * Run: npm run eval:coverage-empty-state-discovery-smoke
 */

import {
  getCoverageBadgePresentationModel,
  getDomainCoverage,
} from '@/lib/research/domain-coverage';
import { DOMAIN_REGISTRY, getResearchDomains } from '@/lib/research/domain-registry';

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

// ---- Fixtures from production registry/coverage (not hand tables) ------

const registry = getResearchDomains();
const registryKeys = Object.keys(DOMAIN_REGISTRY);
const coverageBaseline = getDomainCoverage([]);
const expectedLabels = coverageBaseline.map((item) => item.label);
const expectedDomains = coverageBaseline.map((item) => item.domain);

const IDLE_DISCOVERY =
  'Coverage domains appear when research produces results for them.';

// ---- Tests -------------------------------------------------------------

console.log('\ncoverage-empty-state-discovery eval: smoke\n');

test('idle empty: all pending + discoveryLine', () => {
  const model = getCoverageBadgePresentationModel({
    presentDomainIds: [],
    isResearching: false,
    eventCount: 0,
  });
  assert(model.badges.length === coverageBaseline.length, 'badge count');
  for (const badge of model.badges) {
    assert(badge.present === false, `${badge.domain} not present`);
    assert(badge.status === 'pending', `${badge.domain} status pending`);
    assert(
      badge.badgeText === `${badge.label} · not yet researched`,
      `${badge.domain} badgeText=${badge.badgeText}`,
    );
    assert(
      badge.title === `${badge.domain}: not yet researched`,
      `${badge.domain} title=${badge.title}`,
    );
  }
  assert(
    model.discoveryLine === IDLE_DISCOVERY,
    `discoveryLine=${model.discoveryLine}`,
  );
  assert(
    model.discoveryLine !== null && model.discoveryLine.length > 0,
    'discoveryLine non-null discovery copy',
  );
});

test('live empty: all gathering, discoveryLine null', () => {
  const model = getCoverageBadgePresentationModel({
    presentDomainIds: [],
    isResearching: true,
    eventCount: 0,
  });
  assert(model.badges.length === coverageBaseline.length, 'badge count');
  for (const badge of model.badges) {
    assert(badge.present === false, `${badge.domain} not present`);
    assert(badge.status === 'gathering', `${badge.domain} status gathering`);
    assert(
      badge.badgeText === `${badge.label} · gathering`,
      `${badge.domain} badgeText=${badge.badgeText}`,
    );
    assert(
      badge.title === `${badge.domain}: research may still be gathering`,
      `${badge.domain} title=${badge.title}`,
    );
  }
  assert(model.discoveryLine === null, 'discoveryLine null while live');
});

test('post-activity all-missing: status missing, discoveryLine null', () => {
  const model = getCoverageBadgePresentationModel({
    presentDomainIds: [],
    isResearching: false,
    eventCount: 3,
  });
  assert(model.badges.length === coverageBaseline.length, 'badge count');
  for (const badge of model.badges) {
    assert(badge.present === false, `${badge.domain} not present`);
    assert(badge.status === 'missing', `${badge.domain} status missing`);
    assert(
      badge.badgeText === `${badge.label} · missing`,
      `${badge.domain} badgeText=${badge.badgeText}`,
    );
    assert(
      badge.title === `${badge.domain}: missing from research results`,
      `${badge.domain} title=${badge.title}`,
    );
  }
  assert(model.discoveryLine === null, 'discoveryLine null post-activity');
});

test('presentCount alone (partial): absent uses missing not pending', () => {
  assert(registry.includes('founder_profile'), 'registry has founder_profile');
  const present = ['founder_profile'] as const;
  const model = getCoverageBadgePresentationModel({
    presentDomainIds: present,
    isResearching: false,
    eventCount: 0,
  });
  const presentBadge = model.badges.find((b) => b.domain === 'founder_profile');
  assert(presentBadge !== undefined, 'founder present badge');
  assert(presentBadge.present === true, 'founder present');
  assert(presentBadge.status === null, 'present status null');

  const absent = model.badges.filter((b) => !b.present);
  assert(absent.length > 0, 'at least one absent sibling');
  for (const badge of absent) {
    assert(badge.status === 'missing', `${badge.domain} must be missing not pending`);
    assert(
      badge.badgeText === `${badge.label} · missing`,
      `${badge.domain} badgeText`,
    );
  }
  assert(model.discoveryLine === null, 'no idle discovery when presentCount > 0');
});

test('partial present: present label alone + switch title; absent follow policy', () => {
  const present = ['traction'] as const;
  const model = getCoverageBadgePresentationModel({
    presentDomainIds: present,
    isResearching: false,
    eventCount: 1,
  });
  const coverage = getDomainCoverage(present);
  assertArraysEqual(
    model.badges.map((b) => b.domain),
    coverage.map((c) => c.domain),
    'badge domains vs coverage',
  );

  for (const badge of model.badges) {
    const cov = coverage.find((c) => c.domain === badge.domain);
    assert(cov !== undefined, `coverage row for ${badge.domain}`);
    if (cov.present) {
      assert(badge.present === true, `${badge.domain} present`);
      assert(badge.status === null, `${badge.domain} status null`);
      assert(badge.badgeText === badge.label, `${badge.domain} label alone`);
      assert(
        badge.title === `${badge.domain}: result present (switch to tab)`,
        `${badge.domain} present-switch title`,
      );
    } else {
      assert(badge.present === false, `${badge.domain} absent`);
      assert(badge.status === 'missing', `${badge.domain} missing after activity`);
      assert(
        badge.badgeText === `${badge.label} · missing`,
        `${badge.domain} missing badgeText`,
      );
    }
  }
  assert(model.discoveryLine === null, 'discoveryLine null when partial present');
});

test('all registry present: every status null, discoveryLine null', () => {
  const model = getCoverageBadgePresentationModel({
    presentDomainIds: registry,
    isResearching: false,
    eventCount: 5,
  });
  assert(model.badges.length === registry.length, 'all registry badges');
  for (const badge of model.badges) {
    assert(badge.present === true, `${badge.domain} present`);
    assert(badge.status === null, `${badge.domain} status null`);
    assert(badge.badgeText === badge.label, `${badge.domain} label alone`);
  }
  assert(model.discoveryLine === null, 'discoveryLine null when fully covered');
});

test('registry order + labels match getDomainCoverage; no Coming Soon', () => {
  assertArraysEqual(registry, registryKeys, 'getResearchDomains vs DOMAIN_REGISTRY keys');
  assertArraysEqual(expectedDomains, registryKeys, 'coverage domains vs registry keys');

  const model = getCoverageBadgePresentationModel({
    presentDomainIds: [],
    isResearching: false,
    eventCount: 0,
  });
  assertArraysEqual(
    model.badges.map((b) => b.domain),
    expectedDomains,
    'badge domain order',
  );
  assertArraysEqual(
    model.badges.map((b) => b.label),
    expectedLabels,
    'badge labels',
  );

  for (const badge of model.badges) {
    assert(
      badge.domain !== 'investor_profile' && badge.domain !== 'hiring',
      `Coming Soon id leaked: ${badge.domain}`,
    );
    assert(
      !/investor_profile|hiring/i.test(badge.label),
      `Coming Soon label leaked: ${badge.label}`,
    );
  }
  assert(
    !expectedDomains.includes('investor_profile') &&
      !expectedDomains.includes('hiring'),
    'coverage baseline excludes Coming Soon',
  );
});

test('never throws on empty/nullish id iterables', () => {
  const cases: Array<Iterable<string | null | undefined>> = [
    [],
    [null, undefined, ''],
    [null, 'founder_profile', undefined, ''],
    registry,
    (function* () {
      yield null;
      yield undefined;
      yield 'traction';
    })(),
  ];
  for (const presentDomainIds of cases) {
    let model: ReturnType<typeof getCoverageBadgePresentationModel> | undefined;
    try {
      model = getCoverageBadgePresentationModel({
        presentDomainIds,
        isResearching: false,
        eventCount: 0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`threw on presentDomainIds: ${msg}`);
    }
    assert(Array.isArray(model.badges), 'badges array');
    assert(
      model.discoveryLine === null || typeof model.discoveryLine === 'string',
      'discoveryLine string|null',
    );
  }
  // Live + post-activity empty also never throw
  for (const opts of [
    { isResearching: true, eventCount: 0 },
    { isResearching: false, eventCount: 2 },
  ] as const) {
    const model = getCoverageBadgePresentationModel({
      presentDomainIds: [null, undefined, ''],
      ...opts,
    });
    assert(model.badges.every((b) => !b.present), 'nullish ids not treated as present');
  }
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
