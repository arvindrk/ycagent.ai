/**
 * Hermetic smoke for vector ranking and score composition in searchCompanies
 * (src/lib/semantic-search/query.ts, vector branch SQL).
 *
 * Imports the same pure constants and tier registry the production SQL is
 * generated from, so the mirror cannot drift silently.
 *
 * Zero I/O: no DB, embeddings API, network, or env.
 *
 * Run: npm run eval:vector-ranking-smoke
 */

import { DEFAULT_TIER, EXACT_MATCH_TIER, TIERS, type TierKey } from '@/lib/semantic-search/scoring/tiers';
import {
  EXACT_NAME_SIM_MIN,
  EXACT_PREFIX_MIN_LEN,
  PREFILTER_NAME_MIN,
  PREFILTER_SEMANTIC_MIN,
  W_NAME,
  W_SEMANTIC,
  W_TEXT,
} from '@/lib/semantic-search/scoring/score-constants';

// ---- Pure ranking mirror (no SQL / no I/O) --------------------------------

type ScoreInput = {
  semantic: number;
  name: number;
  text: number;
  /** Models the prefix path: LOWER(name) LIKE LOWER(query)||'%' AND LENGTH(query) >= 3 */
  namePrefixMatch?: boolean;
  queryLength?: number;
};

function passesPrefilter(semantic: number, name: number): boolean {
  return semantic >= PREFILTER_SEMANTIC_MIN || name >= PREFILTER_NAME_MIN;
}

function isExactMatch(input: ScoreInput): boolean {
  if (input.name >= EXACT_NAME_SIM_MIN) return true;
  return (
    input.namePrefixMatch === true && (input.queryLength ?? 0) >= EXACT_PREFIX_MIN_LEN
  );
}

function score(input: ScoreInput): { tier: TierKey; boost: number; weighted: number; final_score: number } {
  const tier: TierKey = isExactMatch(input) ? EXACT_MATCH_TIER : DEFAULT_TIER;
  const boost = TIERS[tier].boost;
  const weighted = input.semantic * W_SEMANTIC + input.name * W_NAME + input.text * W_TEXT;
  return { tier, boost, weighted, final_score: weighted * boost };
}

// ---- Test runner ----------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  pass  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}: ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function close(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) < epsilon;
}

console.log('\nvector-ranking eval: smoke\n');

test('component weights are 0.8 / 0.15 / 0.05', () => {
  assert(close(W_SEMANTIC, 0.8), `W_SEMANTIC=${W_SEMANTIC}`);
  assert(close(W_NAME, 0.15), `W_NAME=${W_NAME}`);
  assert(close(W_TEXT, 0.05), `W_TEXT=${W_TEXT}`);
  assert(close(W_SEMANTIC + W_NAME + W_TEXT, 1), 'weights must sum to 1');
});

test('prefilter: semantic >= 0.25 OR name >= 0.7', () => {
  assert(passesPrefilter(0.25, 0), 'semantic at the floor passes');
  assert(!passesPrefilter(0.24, 0.69), 'below both floors is excluded');
  assert(passesPrefilter(0, 0.7), 'name at the floor passes');
});

test('exact match: name similarity >= 0.9', () => {
  assert(score({ semantic: 0.3, name: 0.9, text: 0 }).tier === EXACT_MATCH_TIER, 'at threshold');
  assert(score({ semantic: 0.3, name: 0.89, text: 0 }).tier === DEFAULT_TIER, 'just below');
});

test('exact match: prefix path requires a query of at least 3 characters', () => {
  const long = score({ semantic: 0.1, name: 0.2, text: 0, namePrefixMatch: true, queryLength: 3 });
  const short = score({ semantic: 0.1, name: 0.2, text: 0, namePrefixMatch: true, queryLength: 2 });
  assert(long.tier === EXACT_MATCH_TIER, 'length 3 qualifies');
  assert(short.tier === DEFAULT_TIER, 'length 2 must not qualify');
});

test('final_score is the weighted sum times the tier boost', () => {
  const r = score({ semantic: 0.5, name: 0.2, text: 0.4 });
  assert(close(r.weighted, 0.5 * 0.8 + 0.2 * 0.15 + 0.4 * 0.05), `weighted=${r.weighted}`);
  assert(close(r.final_score, r.weighted * TIERS[DEFAULT_TIER].boost), `final=${r.final_score}`);
});

test('an exact match outranks a stronger semantic match', () => {
  const exact = score({ semantic: 0.36, name: 1, text: 0.58 });
  const semantic = score({ semantic: 0.65, name: 0, text: 0.2 });
  assert(exact.tier === EXACT_MATCH_TIER, 'name match is exact');
  assert(
    exact.final_score > semantic.final_score,
    `exact ${exact.final_score} should beat semantic ${semantic.final_score}`,
  );
});

test('ranking is continuous: no boost cliff between neighbouring scores', () => {
  // The five-tier model multiplied 0.70 by 1.5 and 0.69 by 1.0, so a hundredth
  // of a point in similarity swung the final score by roughly half.
  const steps = [0.29, 0.3, 0.31, 0.49, 0.5, 0.51, 0.69, 0.7, 0.71];
  const scores = steps.map(semantic => score({ semantic, name: 0, text: 0 }).final_score);

  for (let i = 1; i < scores.length; i++) {
    const jump = scores[i] - scores[i - 1];
    const gap = steps[i] - steps[i - 1];
    assert(jump > 0, `score must increase across ${steps[i - 1]} -> ${steps[i]}`);
    assert(
      close(jump, gap * W_SEMANTIC, 1e-9),
      `score should move proportionally to similarity at ${steps[i]}, moved ${jump}`,
    );
  }
});

test('every tier has a label and a boost, and only exact match is boosted', () => {
  const keys = Object.keys(TIERS) as TierKey[];
  assert(keys.length === 2, `expected 2 tiers, got ${keys.length}: ${keys.join(', ')}`);
  for (const key of keys) {
    assert(TIERS[key].label.length > 0, `${key} needs a label`);
    assert(TIERS[key].boost > 0, `${key} needs a positive boost`);
  }
  assert(TIERS[DEFAULT_TIER].boost === 1, 'the default tier must not scale the score');
  assert(TIERS[EXACT_MATCH_TIER].boost > 1, 'an exact match must be boosted');
});

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
