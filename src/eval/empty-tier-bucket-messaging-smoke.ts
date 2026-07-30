/**
 * Smoke eval: pure empty higher-confidence tier gap display model.
 * Production SoT: buildTierBucketModel(results) from
 * src/lib/semantic-search/build-tier-bucket-model.ts (reads TIER_META
 * order/labels from scoring/weights.ts).
 *
 * Contract:
 * (1) empty input results => []
 * (2) non-empty tiers always appear, ordered by TIER_META.order ascending
 * (3) empty higher-confidence tiers (order < best non-empty order) included
 *     with isEmpty true and emptyMessage exactly `No ${label} results`
 * (4) empty tiers at or below best non-empty order omitted (no lower wall)
 * (5) unknown/invalid result.tier keys map to keyword_match
 * (6) non-empty buckets: isEmpty false, emptyMessage absent, preserve rows
 * (7) never throws on empty, single-tier, multi-tier, or garbage tiers
 * (8) assert via production helper only (no hand-mirrored gap policy,
 *     no React/DOM, no class strings)
 *
 * Hermetic: zero I/O, no DB/network/.env. Never evaluates systemPrompt.
 *
 * Run: npm run eval:empty-tier-bucket-messaging-smoke
 */

import { buildTierBucketModel } from '@/lib/semantic-search/build-tier-bucket-model';
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

console.log('\nempty-tier-bucket-messaging eval: smoke\n');

test('empty input results => []', () => {
  const buckets = buildTierBucketModel([]);
  assert(Array.isArray(buckets), 'expected array');
  assert(buckets.length === 0, `expected [], got length ${buckets.length}`);
});

test('keyword_match-only includes empty Exact/Highly/Strong/Relevant gaps + Keyword', () => {
  const row = result('kw1', 'keyword_match');
  const buckets = buildTierBucketModel([row]);
  assert(buckets.length === 5, `expected 5 buckets, got ${buckets.length}`);
  assert(
    buckets.map((b) => b.tier).join(',') ===
      'exact_match,high_confidence,strong_match,relevant,keyword_match',
    `unexpected tier order: ${buckets.map((b) => b.tier).join(',')}`,
  );
  const emptyMsgs = buckets.filter((b) => b.isEmpty).map((b) => b.emptyMessage);
  assert(
    emptyMsgs.join('|') ===
      'No Exact Match results|No Highly Relevant results|No Strong Match results|No Relevant results',
    `unexpected empty messages: ${emptyMsgs.join('|')}`,
  );
  const kw = buckets[4];
  assert(kw !== undefined && kw.tier === 'keyword_match', 'last bucket keyword_match');
  assert(kw.isEmpty === false, 'keyword bucket should not be empty');
  assert(kw.emptyMessage === undefined, 'non-empty must omit emptyMessage');
  assert(kw.results.length === 1 && kw.results[0]?.id === 'kw1', 'preserve keyword row');
});

test('exact_match-only has no empty gap buckets', () => {
  const buckets = buildTierBucketModel([result('ex1', 'exact_match')]);
  assert(buckets.length === 1, `expected 1 bucket, got ${buckets.length}`);
  const only = buckets[0];
  assert(only !== undefined && only.tier === 'exact_match', 'only exact_match');
  assert(only.isEmpty === false, 'exact not empty');
  assert(only.emptyMessage === undefined, 'no emptyMessage on non-empty');
  assert(only.results.length === 1, 'preserve exact row');
});

test('strong_match-only: empty Exact + Highly Relevant, omit Relevant/Keyword empty', () => {
  const buckets = buildTierBucketModel([result('st1', 'strong_match')]);
  assert(buckets.length === 3, `expected 3 buckets, got ${buckets.length}`);
  assert(
    buckets.map((b) => b.tier).join(',') ===
      'exact_match,high_confidence,strong_match',
    `unexpected tiers: ${buckets.map((b) => b.tier).join(',')}`,
  );
  assert(buckets[0]?.isEmpty === true, 'exact gap empty');
  assert(buckets[0]?.emptyMessage === 'No Exact Match results', 'exact emptyMessage');
  assert(buckets[1]?.isEmpty === true, 'high gap empty');
  assert(
    buckets[1]?.emptyMessage === 'No Highly Relevant results',
    'high emptyMessage',
  );
  assert(buckets[2]?.isEmpty === false, 'strong non-empty');
  assert(buckets[2]?.emptyMessage === undefined, 'strong no emptyMessage');
  assert(buckets[2]?.results[0]?.id === 'st1', 'preserve strong row');
  assert(
    !buckets.some((b) => b.tier === 'relevant' || b.tier === 'keyword_match'),
    'must omit empty lower tiers',
  );
});

test('multi-tier mix preserves non-empty tiers in order with higher gaps only', () => {
  const rows = [
    result('r1', 'relevant'),
    result('h1', 'high_confidence'),
    result('r2', 'relevant'),
  ];
  const buckets = buildTierBucketModel(rows);
  // best non-empty order = high_confidence (2) => empty exact only above it
  assert(
    buckets.map((b) => b.tier).join(',') ===
      'exact_match,high_confidence,relevant',
    `unexpected tiers: ${buckets.map((b) => b.tier).join(',')}`,
  );
  assert(buckets[0]?.isEmpty === true, 'exact gap');
  assert(buckets[0]?.emptyMessage === 'No Exact Match results', 'exact msg');
  assert(buckets[1]?.isEmpty === false, 'high non-empty');
  assert(buckets[1]?.results.length === 1, 'one high row');
  assert(buckets[2]?.isEmpty === false, 'relevant non-empty');
  assert(buckets[2]?.results.length === 2, 'two relevant rows');
  assert(
    buckets[2]?.results.map((r) => r.id).join(',') === 'r1,r2',
    'preserve relevant row order',
  );
  assert(
    !buckets.some((b) => b.tier === 'strong_match' || b.tier === 'keyword_match'),
    'omit empty strong + keyword (at/below best would not apply for strong; strong is between high and relevant but empty with order 3 > best 2 so omitted)',
  );
});

test('unknown/invalid tier coalesces to keyword_match', () => {
  const buckets = buildTierBucketModel([
    result('u1', 'not_a_real_tier'),
    result('u2', ''),
  ]);
  assert(
    buckets.map((b) => b.tier).join(',') ===
      'exact_match,high_confidence,strong_match,relevant,keyword_match',
    `unexpected tiers: ${buckets.map((b) => b.tier).join(',')}`,
  );
  const kw = buckets.find((b) => b.tier === 'keyword_match');
  assert(kw !== undefined, 'keyword_match bucket present');
  assert(kw.isEmpty === false, 'keyword coalesced non-empty');
  assert(kw.results.length === 2, 'both unknown rows in keyword_match');
  assert(
    kw.results.map((r) => r.id).join(',') === 'u1,u2',
    'preserve unknown rows',
  );
});

test('exact emptyMessage strings for all gap labels', () => {
  // keyword-only surfaces all four higher gaps + keyword
  const buckets = buildTierBucketModel([result('k', 'keyword_match')]);
  const byTier = Object.fromEntries(
    buckets.map((b) => [b.tier, b.emptyMessage]),
  );
  assert(byTier.exact_match === 'No Exact Match results', 'exact msg');
  assert(byTier.high_confidence === 'No Highly Relevant results', 'high msg');
  assert(byTier.strong_match === 'No Strong Match results', 'strong msg');
  assert(byTier.relevant === 'No Relevant results', 'relevant msg');
  assert(byTier.keyword_match === undefined, 'keyword no emptyMessage');
});

test('isEmpty flags and result counts on non-empty vs empty buckets', () => {
  const buckets = buildTierBucketModel([
    result('s1', 'strong_match'),
    result('s2', 'strong_match'),
  ]);
  for (const b of buckets) {
    if (b.tier === 'strong_match') {
      assert(b.isEmpty === false, 'strong isEmpty false');
      assert(b.results.length === 2, 'strong count 2');
      assert(b.emptyMessage === undefined, 'strong emptyMessage absent');
      assert(b.tierLabel === 'Strong Match', 'strong tierLabel');
      assert(b.tierOrder === 3, 'strong tierOrder');
    } else {
      assert(b.isEmpty === true, `${b.tier} isEmpty true`);
      assert(b.results.length === 0, `${b.tier} count 0`);
      assert(
        typeof b.emptyMessage === 'string' && b.emptyMessage.startsWith('No '),
        `${b.tier} emptyMessage`,
      );
    }
  }
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
    let out: ReturnType<typeof buildTierBucketModel> | undefined;
    try {
      out = buildTierBucketModel(input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`threw on input length=${input.length}: ${msg}`);
    }
    assert(Array.isArray(out), 'expected array');
  }
});

// ---- Summary -------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
