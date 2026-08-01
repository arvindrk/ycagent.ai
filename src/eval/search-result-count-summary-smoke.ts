/**
 * Smoke eval: pure search result count summary SoT.
 * Production SoT: buildSearchResultCountSummary(results) from
 * src/lib/semantic-search/build-search-result-count-summary.ts
 * (reuses buildTierBucketModel non-empty buckets; TIER_META order/labels
 * via scoring/weights).
 *
 * Contract:
 * (1) empty [] => total=0, nonEmptyTiers=[], nonEmptyTierCount=0,
 *     summaryLine exactly `0 results`
 * (2) single non-empty tier: total and per-tier count match fixtures;
 *     summaryLine `{n} result(s) · {tierLabel} {count}` with singular
 *     `result` when total===1
 * (3) multi-tier mix: nonEmptyTiers ordered by TIER_META.order ascending;
 *     empty gap buckets omitted from nonEmptyTiers
 * (4) unknown/invalid result.tier keys coalesce to keyword_match
 * (5) nonEmptyTierCount equals nonEmptyTiers.length
 * (6) summaryLine joins non-empty tier parts with ` · ` after total clause
 * (7) never throws on empty, single-tier, multi-tier, or garbage tiers
 * (8) assert via production helper import only (no hand-mirrored tier
 *     tables, no React/DOM, no class strings)
 *
 * Hermetic: zero I/O, no DB/network/.env. Never evaluates systemPrompt.
 *
 * Run: npm run eval:search-result-count-summary-smoke
 */

import { buildSearchResultCountSummary } from '@/lib/semantic-search/build-search-result-count-summary';
import { TIER_META } from '@/lib/semantic-search/scoring/weights';
import type { SearchResult } from '@/types/semantic-search.types';

// ---- Minimal SearchResult fixtures (required fields stubbed) ------------

function result(
  id: string,
  tier: string,
  overrides: Partial<SearchResult> = {},
): SearchResult {
  return {
    id,
    name: `Company ${id}`,
    slug: id,
    website: null,
    logo_url: null,
    one_liner: null,
    tags: [],
    industries: [],
    regions: [],
    batch: null,
    team_size: null,
    all_locations: null,
    is_hiring: false,
    stage: null,
    semantic_score: 0,
    name_score: 0,
    text_score: 0,
    final_score: 0,
    tier,
    tier_label: tier,
    tier_order: 0,
    ...overrides,
  };
}

// ---- Test runner (pattern from src/eval/*-smoke.ts) ---------------------

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

// ---- Tests ---------------------------------------------------------------

console.log('\nsearch-result-count-summary eval: smoke\n');

test('empty [] => total=0, nonEmpty empty, summaryLine "0 results"', () => {
  const summary = buildSearchResultCountSummary([]);
  assert(summary.total === 0, `expected total 0, got ${summary.total}`);
  assert(
    Array.isArray(summary.nonEmptyTiers) && summary.nonEmptyTiers.length === 0,
    `expected nonEmptyTiers [], got length ${summary.nonEmptyTiers.length}`,
  );
  assert(
    summary.nonEmptyTierCount === 0,
    `expected nonEmptyTierCount 0, got ${summary.nonEmptyTierCount}`,
  );
  assert(
    summary.summaryLine === '0 results',
    `expected "0 results", got "${summary.summaryLine}"`,
  );
});

test('single exact_match total=1 uses singular result', () => {
  const summary = buildSearchResultCountSummary([result('ex1', 'exact_match')]);
  assert(summary.total === 1, `expected total 1, got ${summary.total}`);
  assert(summary.nonEmptyTierCount === 1, 'nonEmptyTierCount 1');
  assert(summary.nonEmptyTiers.length === 1, 'one non-empty tier');
  const only = summary.nonEmptyTiers[0];
  assert(only !== undefined && only.tier === 'exact_match', 'tier exact_match');
  assert(only.count === 1, 'count 1');
  assert(
    only.tierLabel === TIER_META.exact_match.label,
    `label from TIER_META, got ${only.tierLabel}`,
  );
  const expected = `1 result · ${TIER_META.exact_match.label} 1`;
  assert(
    summary.summaryLine === expected,
    `expected "${expected}", got "${summary.summaryLine}"`,
  );
});

test('single keyword_match plural results and count match fixtures', () => {
  const rows = [
    result('kw1', 'keyword_match'),
    result('kw2', 'keyword_match'),
    result('kw3', 'keyword_match'),
  ];
  const summary = buildSearchResultCountSummary(rows);
  assert(summary.total === 3, `expected total 3, got ${summary.total}`);
  assert(summary.nonEmptyTierCount === 1, 'one non-empty tier');
  assert(summary.nonEmptyTiers[0]?.tier === 'keyword_match', 'keyword tier');
  assert(summary.nonEmptyTiers[0]?.count === 3, 'keyword count 3');
  // Empty higher-confidence gaps exist in accordion model but must not appear here.
  assert(
    summary.nonEmptyTiers.every((t) => t.count > 0),
    'all nonEmptyTiers must have count > 0',
  );
  const expected = `3 results · ${TIER_META.keyword_match.label} 3`;
  assert(
    summary.summaryLine === expected,
    `expected "${expected}", got "${summary.summaryLine}"`,
  );
});

test('multi-tier mix: TIER_META order, empty gaps omitted from nonEmptyTiers', () => {
  // high_confidence + relevant (2); empty exact gap must not appear in summary
  const rows = [
    result('r1', 'relevant'),
    result('h1', 'high_confidence'),
    result('r2', 'relevant'),
  ];
  const summary = buildSearchResultCountSummary(rows);
  assert(summary.total === 3, `expected total 3, got ${summary.total}`);
  assert(
    summary.nonEmptyTiers.map((t) => t.tier).join(',') ===
      'high_confidence,relevant',
    `unexpected nonEmpty tiers: ${summary.nonEmptyTiers.map((t) => t.tier).join(',')}`,
  );
  assert(summary.nonEmptyTiers[0]?.count === 1, 'high count 1');
  assert(summary.nonEmptyTiers[1]?.count === 2, 'relevant count 2');
  assert(
    !summary.nonEmptyTiers.some(
      (t) =>
        t.tier === 'exact_match' ||
        t.tier === 'strong_match' ||
        t.tier === 'keyword_match',
    ),
    'must omit empty gap buckets from nonEmptyTiers',
  );
  const expected = `3 results · ${TIER_META.high_confidence.label} 1 · ${TIER_META.relevant.label} 2`;
  assert(
    summary.summaryLine === expected,
    `expected "${expected}", got "${summary.summaryLine}"`,
  );
});

test('unknown/invalid tier keys coalesce to keyword_match', () => {
  const summary = buildSearchResultCountSummary([
    result('u1', 'not_a_real_tier'),
    result('u2', ''),
  ]);
  assert(summary.total === 2, `expected total 2, got ${summary.total}`);
  assert(summary.nonEmptyTierCount === 1, 'one coalesced non-empty tier');
  assert(
    summary.nonEmptyTiers[0]?.tier === 'keyword_match',
    'coalesce to keyword_match',
  );
  assert(summary.nonEmptyTiers[0]?.count === 2, 'both rows in keyword_match');
  const expected = `2 results · ${TIER_META.keyword_match.label} 2`;
  assert(
    summary.summaryLine === expected,
    `expected "${expected}", got "${summary.summaryLine}"`,
  );
});

test('nonEmptyTierCount equals nonEmptyTiers.length', () => {
  const cases: SearchResult[][] = [
    [],
    [result('a', 'exact_match')],
    [result('b', 'strong_match'), result('c', 'keyword_match')],
    [
      result('d', 'exact_match'),
      result('e', 'high_confidence'),
      result('f', 'relevant'),
    ],
  ];
  for (const input of cases) {
    const summary = buildSearchResultCountSummary(input);
    assert(
      summary.nonEmptyTierCount === summary.nonEmptyTiers.length,
      `count mismatch for total=${input.length}: ${summary.nonEmptyTierCount} vs ${summary.nonEmptyTiers.length}`,
    );
  }
});

test('summaryLine joins non-empty tier parts with " · " after total clause', () => {
  const summary = buildSearchResultCountSummary([
    result('e1', 'exact_match'),
    result('k1', 'keyword_match'),
    result('k2', 'keyword_match'),
  ]);
  // Order: exact then keyword (TIER_META order); empty middle tiers omitted.
  assert(
    summary.summaryLine ===
      `3 results · ${TIER_META.exact_match.label} 1 · ${TIER_META.keyword_match.label} 2`,
    `unexpected join: "${summary.summaryLine}"`,
  );
  assert(
    summary.summaryLine.includes(' · '),
    'summaryLine must contain " · " separator',
  );
  const parts = summary.summaryLine.split(' · ');
  assert(parts[0] === '3 results', `total clause: ${parts[0]}`);
  assert(parts.length === 3, `expected 3 parts, got ${parts.length}`);
});

test('never throws on empty, single-tier, multi-tier, or garbage tiers', () => {
  const cases: SearchResult[][] = [
    [],
    [result('a', 'exact_match')],
    [result('b', 'high_confidence')],
    [result('c', 'strong_match')],
    [result('d', 'relevant')],
    [result('e', 'keyword_match')],
    [
      result('m1', 'exact_match'),
      result('m2', 'keyword_match'),
      result('m3', 'relevant'),
    ],
    [result('g1', '@@@'), result('g2', 'garbage-tier'), result('g3', '???')],
  ];
  for (const input of cases) {
    let out: ReturnType<typeof buildSearchResultCountSummary> | undefined;
    try {
      out = buildSearchResultCountSummary(input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`threw on input length=${input.length}: ${msg}`);
    }
    assert(typeof out.total === 'number', 'total number');
    assert(Array.isArray(out.nonEmptyTiers), 'nonEmptyTiers array');
    assert(typeof out.nonEmptyTierCount === 'number', 'nonEmptyTierCount number');
    assert(typeof out.summaryLine === 'string', 'summaryLine string');
  }
});

// ---- Summary -------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
