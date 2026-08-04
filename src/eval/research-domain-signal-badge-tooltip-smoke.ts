/**
 * Smoke eval: pure ResearchViewer domain signal badge presentation SoT.
 * Production SoT: getDomainSignalBadgeModel(result) from
 * src/lib/get-domain-signal-badge-model.ts (already wired on ResearchViewer
 * domain Badge: primaryLabel, title, aria-label).
 *
 * Contracts under test:
 * (1) primaryLabel exactly `${domain} ${signalCount}sig/${sourceCount}src`
 * (2) ariaLabel exactly `Domain signals: {domain}, {N} signals, {M} sources`
 * (3) traction signalCount = tractionSignals.length (missing/null => 0)
 * (4) founder_profile signalCount = sum of founderRelationship +
 *     complementarySkills + socialPresence + trackRecord lengths (missing => 0)
 * (5) sourceCount = sources.length (missing => 0)
 * (6) title contains human-readable sig/src meaning and domain; for
 *     founder_profile includes plain-English per-bucket breakdown substrings
 *     (founder relationship, complementary skills, social presence, track record)
 *     with correct counts (substring lock, not full-string equality)
 * (7) never throws on sparse/missing optional arrays
 *
 * Distinct from run-status badge-state/aria smokes (different model).
 *
 * Hermetic: zero I/O, no DB/network/.env, no React/DOM/class strings.
 * Never evaluates systemPrompt getters. Import production helper only.
 *
 * Run: npm run eval:research-domain-signal-badge-tooltip-smoke
 */

import { getDomainSignalBadgeModel } from '@/lib/get-domain-signal-badge-model';
import type { ResearchResult } from '@/types/llm.types';

// ---- Fixtures (ResearchResult-shaped; no React/DOM) --------------------

function tractionResult(
  partial: Partial<{
    tractionSignals: string[] | null;
    sources: string[] | null;
    summary: string;
  }> = {},
): ResearchResult {
  return {
    domain: 'traction',
    summary: partial.summary ?? 'traction summary',
    sources: (partial.sources ?? []) as string[],
    tractionSignals: (partial.tractionSignals ?? []) as string[],
  };
}

function founderResult(
  partial: Partial<{
    founderRelationship: string[] | null;
    complementarySkills: string[] | null;
    socialPresence: string[] | null;
    trackRecord: string[] | null;
    sources: string[] | null;
    summary: string;
    executiveSummary: string;
  }> = {},
): ResearchResult {
  return {
    domain: 'founder_profile',
    summary: partial.summary ?? 'founder summary',
    executiveSummary: partial.executiveSummary ?? 'exec summary',
    sources: (partial.sources ?? []) as string[],
    founderRelationship: (partial.founderRelationship ?? []) as string[],
    complementarySkills: (partial.complementarySkills ?? []) as string[],
    socialPresence: (partial.socialPresence ?? []) as string[],
    trackRecord: (partial.trackRecord ?? []) as string[],
    founders: [],
  };
}

/** Sparse cast fixtures for never-throws / missing-array contracts. */
function sparseTraction(overrides: Record<string, unknown> = {}): ResearchResult {
  return {
    domain: 'traction',
    summary: 'sparse',
    ...overrides,
  } as ResearchResult;
}

function sparseFounder(overrides: Record<string, unknown> = {}): ResearchResult {
  return {
    domain: 'founder_profile',
    summary: 'sparse',
    executiveSummary: 'sparse',
    founders: [],
    ...overrides,
  } as ResearchResult;
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

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert(
    haystack.includes(needle),
    `${label}: expected title to include "${needle}", got "${haystack}"`,
  );
}

// ---- Tests -------------------------------------------------------------

console.log('\nresearch-domain-signal-badge-tooltip eval: smoke\n');

test('traction: primaryLabel exact shape with non-empty signals/sources', () => {
  const result = tractionResult({
    tractionSignals: ['a', 'b', 'c'],
    sources: ['https://a.example', 'https://b.example'],
  });
  const model = getDomainSignalBadgeModel(result);
  assert(model.signalCount === 3, `expected signalCount 3, got ${model.signalCount}`);
  assert(model.sourceCount === 2, `expected sourceCount 2, got ${model.sourceCount}`);
  assert(
    model.primaryLabel === 'traction 3sig/2src',
    `expected primaryLabel "traction 3sig/2src", got "${model.primaryLabel}"`,
  );
});

test('traction: ariaLabel exact shape', () => {
  const result = tractionResult({
    tractionSignals: ['a'],
    sources: ['https://a.example', 'https://b.example', 'https://c.example'],
  });
  const model = getDomainSignalBadgeModel(result);
  assert(
    model.ariaLabel === 'Domain signals: traction, 1 signals, 3 sources',
    `expected ariaLabel "Domain signals: traction, 1 signals, 3 sources", got "${model.ariaLabel}"`,
  );
});

test('traction: signalCount = tractionSignals.length; empty => 0', () => {
  const empty = getDomainSignalBadgeModel(tractionResult({ tractionSignals: [], sources: [] }));
  assert(empty.signalCount === 0, `expected signalCount 0, got ${empty.signalCount}`);
  assert(empty.sourceCount === 0, `expected sourceCount 0, got ${empty.sourceCount}`);
  assert(
    empty.primaryLabel === 'traction 0sig/0src',
    `expected primaryLabel "traction 0sig/0src", got "${empty.primaryLabel}"`,
  );
});

test('traction: missing/null tractionSignals and sources => counts 0', () => {
  const missing = getDomainSignalBadgeModel(sparseTraction());
  assert(missing.signalCount === 0, `expected signalCount 0, got ${missing.signalCount}`);
  assert(missing.sourceCount === 0, `expected sourceCount 0, got ${missing.sourceCount}`);
  assert(
    missing.primaryLabel === 'traction 0sig/0src',
    `expected primaryLabel "traction 0sig/0src", got "${missing.primaryLabel}"`,
  );
  assert(
    missing.ariaLabel === 'Domain signals: traction, 0 signals, 0 sources',
    `expected ariaLabel for zero counts, got "${missing.ariaLabel}"`,
  );

  const nullish = getDomainSignalBadgeModel(
    sparseTraction({ tractionSignals: null, sources: null }),
  );
  assert(nullish.signalCount === 0, `expected signalCount 0 for null, got ${nullish.signalCount}`);
  assert(nullish.sourceCount === 0, `expected sourceCount 0 for null, got ${nullish.sourceCount}`);
});

test('traction: title has domain + sig/src human-readable meaning', () => {
  const model = getDomainSignalBadgeModel(
    tractionResult({
      tractionSignals: ['x', 'y'],
      sources: ['https://s.example'],
    }),
  );
  assertIncludes(model.title, 'traction', 'domain');
  assertIncludes(model.title, 'extracted research signals', 'sig meaning');
  assertIncludes(model.title, 'source URLs', 'src meaning');
  assertIncludes(model.title, '(sig)', 'sig abbreviation');
  assertIncludes(model.title, '(src)', 'src abbreviation');
  assertIncludes(model.title, '2', 'signal count in title');
  assertIncludes(model.title, '1', 'source count in title');
  // traction must not dump founder bucket labels
  assert(
    !model.title.includes('founder relationship'),
    'traction title must not include founder breakdown',
  );
});

test('founder_profile: primaryLabel + ariaLabel exact; signalCount is sum of four buckets', () => {
  const result = founderResult({
    founderRelationship: ['r1', 'r2'],
    complementarySkills: ['c1'],
    socialPresence: ['s1', 's2', 's3'],
    trackRecord: ['t1'],
    sources: ['https://a.example', 'https://b.example'],
  });
  // 2+1+3+1 = 7 signals, 2 sources
  const model = getDomainSignalBadgeModel(result);
  assert(model.signalCount === 7, `expected signalCount 7, got ${model.signalCount}`);
  assert(model.sourceCount === 2, `expected sourceCount 2, got ${model.sourceCount}`);
  assert(
    model.primaryLabel === 'founder_profile 7sig/2src',
    `expected primaryLabel "founder_profile 7sig/2src", got "${model.primaryLabel}"`,
  );
  assert(
    model.ariaLabel === 'Domain signals: founder_profile, 7 signals, 2 sources',
    `expected ariaLabel exact founder framing, got "${model.ariaLabel}"`,
  );
});

test('founder_profile: title has domain, sig/src meaning, and per-bucket breakdown counts', () => {
  const result = founderResult({
    founderRelationship: ['r1', 'r2'],
    complementarySkills: ['c1'],
    socialPresence: ['s1', 's2', 's3'],
    trackRecord: ['t1', 't2', 't3', 't4'],
    sources: ['https://a.example'],
  });
  const model = getDomainSignalBadgeModel(result);
  assertIncludes(model.title, 'founder_profile', 'domain');
  assertIncludes(model.title, 'extracted research signals', 'sig meaning');
  assertIncludes(model.title, 'source URLs', 'src meaning');
  assertIncludes(model.title, 'founder relationship 2', 'founder relationship bucket');
  assertIncludes(model.title, 'complementary skills 1', 'complementary skills bucket');
  assertIncludes(model.title, 'social presence 3', 'social presence bucket');
  assertIncludes(model.title, 'track record 4', 'track record bucket');
});

test('founder_profile: empty arrays => zero counts and zero breakdown', () => {
  const model = getDomainSignalBadgeModel(
    founderResult({
      founderRelationship: [],
      complementarySkills: [],
      socialPresence: [],
      trackRecord: [],
      sources: [],
    }),
  );
  assert(model.signalCount === 0, `expected signalCount 0, got ${model.signalCount}`);
  assert(model.sourceCount === 0, `expected sourceCount 0, got ${model.sourceCount}`);
  assert(
    model.primaryLabel === 'founder_profile 0sig/0src',
    `expected primaryLabel "founder_profile 0sig/0src", got "${model.primaryLabel}"`,
  );
  assert(
    model.ariaLabel === 'Domain signals: founder_profile, 0 signals, 0 sources',
    `expected zero ariaLabel, got "${model.ariaLabel}"`,
  );
  assertIncludes(model.title, 'founder relationship 0', 'empty founder relationship');
  assertIncludes(model.title, 'complementary skills 0', 'empty complementary skills');
  assertIncludes(model.title, 'social presence 0', 'empty social presence');
  assertIncludes(model.title, 'track record 0', 'empty track record');
});

test('founder_profile: missing/null optional arrays treated as 0', () => {
  const model = getDomainSignalBadgeModel(sparseFounder());
  assert(model.signalCount === 0, `expected signalCount 0, got ${model.signalCount}`);
  assert(model.sourceCount === 0, `expected sourceCount 0, got ${model.sourceCount}`);
  assert(
    model.primaryLabel === 'founder_profile 0sig/0src',
    `expected primaryLabel "founder_profile 0sig/0src", got "${model.primaryLabel}"`,
  );

  const nullish = getDomainSignalBadgeModel(
    sparseFounder({
      founderRelationship: null,
      complementarySkills: null,
      socialPresence: null,
      trackRecord: null,
      sources: null,
    }),
  );
  assert(nullish.signalCount === 0, `expected signalCount 0 for nulls, got ${nullish.signalCount}`);
  assert(nullish.sourceCount === 0, `expected sourceCount 0 for nulls, got ${nullish.sourceCount}`);
  assertIncludes(nullish.title, 'founder relationship 0', 'null founder relationship');
  assertIncludes(nullish.title, 'complementary skills 0', 'null complementary skills');
  assertIncludes(nullish.title, 'social presence 0', 'null social presence');
  assertIncludes(nullish.title, 'track record 0', 'null track record');
});

test('never throws on sparse/missing optional arrays (both domains)', () => {
  const cases: ResearchResult[] = [
    sparseTraction(),
    sparseTraction({ tractionSignals: null, sources: null }),
    sparseTraction({ tractionSignals: undefined, sources: undefined }),
    sparseTraction({ tractionSignals: [], sources: [] }),
    sparseFounder(),
    sparseFounder({
      founderRelationship: null,
      complementarySkills: null,
      socialPresence: null,
      trackRecord: null,
      sources: null,
    }),
    sparseFounder({
      founderRelationship: undefined,
      complementarySkills: undefined,
      socialPresence: undefined,
      trackRecord: undefined,
      sources: undefined,
    }),
    founderResult({
      founderRelationship: ['only-one'],
      complementarySkills: [],
      socialPresence: [],
      trackRecord: [],
      sources: ['https://one.example'],
    }),
    tractionResult({ tractionSignals: ['one'], sources: [] }),
  ];

  for (const input of cases) {
    let model: ReturnType<typeof getDomainSignalBadgeModel> | undefined;
    try {
      model = getDomainSignalBadgeModel(input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`threw on domain=${input.domain}: ${msg}`);
    }
    assert(typeof model.primaryLabel === 'string', 'primaryLabel must be string');
    assert(typeof model.ariaLabel === 'string', 'ariaLabel must be string');
    assert(typeof model.title === 'string', 'title must be string');
    assert(typeof model.signalCount === 'number', 'signalCount must be number');
    assert(typeof model.sourceCount === 'number', 'sourceCount must be number');
    assert(
      model.primaryLabel === `${input.domain} ${model.signalCount}sig/${model.sourceCount}src`,
      `primaryLabel must match domain/counts formula: "${model.primaryLabel}"`,
    );
    assert(
      model.ariaLabel
        === `Domain signals: ${input.domain}, ${model.signalCount} signals, ${model.sourceCount} sources`,
      `ariaLabel must match exact framing: "${model.ariaLabel}"`,
    );
  }
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
