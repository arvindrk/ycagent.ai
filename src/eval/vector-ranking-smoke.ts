/**
 * Hermetic smoke for vector ranking + score composition invariants used by
 * searchCompanies in src/lib/semantic-search/query.ts (vector branch SQL).
 *
 * Imports shared pure score-constants (same source as production SQL). Distinct
 * from semantic-search-scenario-smoke (filter integration + partial ranking).
 *
 * Zero I/O: no DB, embeddings API, network, or env.
 *
 * Run: npm run eval:vector-ranking-smoke
 */

import { TIER_META, type TierKey } from "@/lib/semantic-search/scoring/weights";
import {
  EXACT_NAME_SIM_MIN,
  EXACT_PREFIX_MIN_LEN,
  MULT_EXACT,
  MULT_HIGH,
  MULT_KEYWORD,
  MULT_RELEVANT,
  MULT_STRONG,
  PREFILTER_NAME_MIN,
  PREFILTER_SEMANTIC_MIN,
  TIER_HIGH_SEM,
  TIER_RELEVANT_SEM,
  TIER_STRONG_SEM,
  W_NAME,
  W_SEMANTIC,
  W_TEXT,
} from "@/lib/semantic-search/scoring/score-constants";

// ---- Pure ranking mirror (no SQL / no I/O) --------------------------------

type ScoreInput = {
  semantic: number;
  name: number;
  text: number;
  /** When true, models prefix path: LOWER(name) LIKE LOWER(query)||'%' AND LENGTH(query) >= 3 */
  namePrefixMatch?: boolean;
  queryLength?: number;
};

function passesPrefilter(semantic: number, name: number): boolean {
  return semantic >= PREFILTER_SEMANTIC_MIN || name >= PREFILTER_NAME_MIN;
}

function isExactMatch(input: ScoreInput): boolean {
  if (input.name >= EXACT_NAME_SIM_MIN) return true;
  if (
    input.namePrefixMatch === true &&
    (input.queryLength ?? 0) >= EXACT_PREFIX_MIN_LEN
  ) {
    return true;
  }
  return false;
}

function assignTierAndMult(input: ScoreInput): {
  tier: TierKey;
  mult: number;
} {
  if (isExactMatch(input)) {
    return { tier: "exact_match", mult: MULT_EXACT };
  }
  if (input.semantic >= TIER_HIGH_SEM) {
    return { tier: "high_confidence", mult: MULT_HIGH };
  }
  if (input.semantic >= TIER_STRONG_SEM) {
    return { tier: "strong_match", mult: MULT_STRONG };
  }
  if (input.semantic >= TIER_RELEVANT_SEM) {
    return { tier: "relevant", mult: MULT_RELEVANT };
  }
  return { tier: "keyword_match", mult: MULT_KEYWORD };
}

function weightedSum(semantic: number, name: number, text: number): number {
  return semantic * W_SEMANTIC + name * W_NAME + text * W_TEXT;
}

function computeFinal(input: ScoreInput): {
  tier: TierKey;
  mult: number;
  weighted: number;
  final_score: number;
} {
  const { tier, mult } = assignTierAndMult(input);
  const weighted = weightedSum(input.semantic, input.name, input.text);
  return { tier, mult, weighted, final_score: weighted * mult };
}

// ---- Test runner (pattern from src/eval/*-smoke.ts) ----------------------

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

function assertClose(actual: number, expected: number, label: string): void {
  assert(
    Math.abs(actual - expected) < 1e-9,
    `${label}: got ${actual}, expected ${expected}`,
  );
}

// ---- Tests ---------------------------------------------------------------

console.log("\nvector-ranking eval: smoke\n");

test("component weights are 0.8 / 0.15 / 0.05 (query.ts literals)", () => {
  assert(W_SEMANTIC === 0.8, "W_SEMANTIC");
  assert(W_NAME === 0.15, "W_NAME");
  assert(W_TEXT === 0.05, "W_TEXT");
  assertClose(weightedSum(1, 1, 1), 1.0, "weights sum to 1.0");
  assertClose(weightedSum(0.5, 0.2, 0.1), 0.5 * 0.8 + 0.2 * 0.15 + 0.1 * 0.05, "weighted sample");
});

test("prefilter: semantic >= 0.25 OR name >= 0.7 (query.ts WHERE)", () => {
  assert(passesPrefilter(0.25, 0) === true, "semantic at 0.25 passes");
  assert(passesPrefilter(0.249, 0) === false, "semantic below 0.25 fails alone");
  assert(passesPrefilter(0, 0.7) === true, "name at 0.7 passes");
  assert(passesPrefilter(0, 0.699) === false, "name below 0.7 fails alone");
  assert(passesPrefilter(0.1, 0.7) === true, "low semantic + high name passes");
  assert(passesPrefilter(0.3, 0.1) === true, "high enough semantic alone");
  assert(passesPrefilter(0.24, 0.69) === false, "both below fail");
});

test("tier: name sim >= 0.9 => exact_match * 2.5", () => {
  const r = computeFinal({ semantic: 0.1, name: 0.9, text: 0 });
  assert(r.tier === "exact_match", `tier=${r.tier}`);
  assert(r.mult === MULT_EXACT, `mult=${r.mult}`);
  assertClose(r.final_score, weightedSum(0.1, 0.9, 0) * 2.5, "final at name=0.9");
});

test("tier: name sim just below 0.9 is not exact_match (boundary)", () => {
  const r = computeFinal({ semantic: 0.1, name: 0.899, text: 0 });
  assert(r.tier !== "exact_match", `tier should not be exact, got ${r.tier}`);
  assert(r.tier === "keyword_match", `low semantic => keyword, got ${r.tier}`);
});

test("tier: prefix path (namePrefixMatch + queryLength >= 3) => exact_match * 2.5", () => {
  const r = computeFinal({
    semantic: 0.2,
    name: 0.1,
    text: 0,
    namePrefixMatch: true,
    queryLength: 3,
  });
  assert(r.tier === "exact_match", `tier=${r.tier}`);
  assertClose(r.final_score, weightedSum(0.2, 0.1, 0) * 2.5, "prefix exact mult");
});

test("tier: prefix path requires queryLength >= 3", () => {
  const short = computeFinal({
    semantic: 0.2,
    name: 0.1,
    text: 0,
    namePrefixMatch: true,
    queryLength: 2,
  });
  assert(short.tier !== "exact_match", "len 2 must not exact");
});

test("tier boundaries: high_confidence at semantic 0.7 * 1.5", () => {
  const at = computeFinal({ semantic: 0.7, name: 0.1, text: 0.05 });
  assert(at.tier === "high_confidence", `at 0.7 got ${at.tier}`);
  assert(at.mult === MULT_HIGH, "mult 1.5");
  assertClose(
    at.final_score,
    weightedSum(0.7, 0.1, 0.05) * 1.5,
    "high final",
  );
  const below = computeFinal({ semantic: 0.699, name: 0.1, text: 0.05 });
  assert(below.tier === "strong_match", `0.699 => strong, got ${below.tier}`);
});

test("tier boundaries: strong_match at semantic 0.5 * 1.0", () => {
  const at = computeFinal({ semantic: 0.5, name: 0.2, text: 0 });
  assert(at.tier === "strong_match", `at 0.5 got ${at.tier}`);
  assert(at.mult === MULT_STRONG, "mult 1.0");
  assertClose(at.final_score, weightedSum(0.5, 0.2, 0) * 1.0, "strong final");
  const below = computeFinal({ semantic: 0.499, name: 0.2, text: 0 });
  assert(below.tier === "relevant", `0.499 => relevant, got ${below.tier}`);
});

test("tier boundaries: relevant at semantic 0.3 * 0.8", () => {
  const at = computeFinal({ semantic: 0.3, name: 0.1, text: 0.1 });
  assert(at.tier === "relevant", `at 0.3 got ${at.tier}`);
  assert(at.mult === MULT_RELEVANT, "mult 0.8");
  assertClose(at.final_score, weightedSum(0.3, 0.1, 0.1) * 0.8, "relevant final");
  const below = computeFinal({ semantic: 0.299, name: 0.1, text: 0.1 });
  assert(below.tier === "keyword_match", `0.299 => keyword, got ${below.tier}`);
  assert(below.mult === MULT_KEYWORD, "mult 0.5");
});

test("final_score = weighted sum * mult for each tier mult", () => {
  const cases: Array<{ input: ScoreInput; mult: number }> = [
    { input: { semantic: 0.4, name: 0.95, text: 0.1 }, mult: 2.5 },
    { input: { semantic: 0.8, name: 0.2, text: 0.05 }, mult: 1.5 },
    { input: { semantic: 0.55, name: 0.2, text: 0.05 }, mult: 1.0 },
    { input: { semantic: 0.35, name: 0.2, text: 0.05 }, mult: 0.8 },
    { input: { semantic: 0.2, name: 0.2, text: 0.05 }, mult: 0.5 },
  ];
  for (const c of cases) {
    const r = computeFinal(c.input);
    assert(r.mult === c.mult, `expected mult ${c.mult}, got ${r.mult}`);
    const expected =
      weightedSum(c.input.semantic, c.input.name, c.input.text) * c.mult;
    assertClose(r.final_score, expected, `mult ${c.mult}`);
  }
});

test("exact_match wins over high semantic (CASE order)", () => {
  const r = computeFinal({ semantic: 0.95, name: 0.92, text: 0 });
  assert(r.tier === "exact_match", "name >= 0.9 takes exact before high_confidence");
  assert(r.mult === 2.5, "exact mult");
});

test("TIER_META label and order for every TierKey", () => {
  const expected: Record<TierKey, { label: string; order: number }> = {
    exact_match: { label: "Exact Match", order: 1 },
    high_confidence: { label: "Highly Relevant", order: 2 },
    strong_match: { label: "Strong Match", order: 3 },
    relevant: { label: "Relevant", order: 4 },
    keyword_match: { label: "Keyword Match", order: 5 },
  };
  const keys = Object.keys(expected) as TierKey[];
  assert(keys.length === 5, "five tiers");
  for (const key of keys) {
    const meta = TIER_META[key];
    assert(meta.label === expected[key].label, `${key} label`);
    assert(meta.order === expected[key].order, `${key} order`);
  }
  const orders = keys.map((k) => TIER_META[k].order).sort((a, b) => a - b);
  assert(
    orders.join(",") === "1,2,3,4,5",
    `orders must be 1..5 contiguous, got ${orders.join(",")}`,
  );
});

test("assignTierAndMult covers all five TierKeys with documented mults", () => {
  const samples: Array<{ input: ScoreInput; tier: TierKey; mult: number }> = [
    { input: { semantic: 0, name: 0.91, text: 0 }, tier: "exact_match", mult: 2.5 },
    { input: { semantic: 0.75, name: 0.1, text: 0 }, tier: "high_confidence", mult: 1.5 },
    { input: { semantic: 0.55, name: 0.1, text: 0 }, tier: "strong_match", mult: 1.0 },
    { input: { semantic: 0.4, name: 0.1, text: 0 }, tier: "relevant", mult: 0.8 },
    { input: { semantic: 0.1, name: 0.1, text: 0 }, tier: "keyword_match", mult: 0.5 },
  ];
  const seen = new Set<TierKey>();
  for (const s of samples) {
    const r = assignTierAndMult(s.input);
    assert(r.tier === s.tier, `expected ${s.tier}, got ${r.tier}`);
    assert(r.mult === s.mult, `expected mult ${s.mult}, got ${r.mult}`);
    seen.add(r.tier);
  }
  assert(seen.size === 5, "all tiers exercised");
});

// ---- Summary -------------------------------------------------------------

const total = passed + failed;
console.log(`\n${total} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
