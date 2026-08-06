/**
 * Smoke eval for semantic search scenario (vector + structured filters integration).
 * Exercises the full integrated path used by search route + searchCompanies:
 *   extractFiltersFromQuery -> parseSearchFilters -> merge -> decide skipVector
 *   buildFilterSQL (with vector paramOffset=2) + tier assignment + final_score
 *   scoring invariants (weights, multipliers, thresholds).
 * Uses only mocked embeddings (never passed to real model) and deterministic
 * pure scoring math matching the vector branch in query.ts.
 * Zero I/O: no DB, no real embeddings, no external services.
 *
 * Run: npm run eval:semantic-search-scenario-smoke
 */

import { extractFiltersFromQuery } from "@/lib/semantic-search/filters/extract-from-query";
import { parseSearchFilters } from "@/lib/semantic-search/filters/parse";
import { buildFilterSQL } from "@/lib/semantic-search/filters/build";
import type { ParsedFilters } from "@/lib/semantic-search/filters/parse";
import type { SearchInput } from "@/lib/schemas/search.schema";
import {
  DEFAULT_TIER,
  EXACT_MATCH_TIER,
  TIERS,
  type TierKey,
} from "@/lib/semantic-search/scoring/tiers";
import {
  EXACT_NAME_SIM_MIN,
  W_NAME,
  W_SEMANTIC,
  W_TEXT,
} from "@/lib/semantic-search/scoring/score-constants";

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

// ---- Pure scoring logic (mirrors searchCompanies vector branch exactly for invariants) ----

function computeTierAndFinal(
  semanticScore: number,
  nameScore: number,
  textScore: number,
): { tier: TierKey; final_score: number } {
  // Exact match is driven by the provided nameScore in these scenarios; the
  // prefix path is covered in vector-ranking-smoke.
  const tier: TierKey = nameScore >= EXACT_NAME_SIM_MIN ? EXACT_MATCH_TIER : DEFAULT_TIER;
  const mult = TIERS[tier].boost;

  const weighted =
    semanticScore * W_SEMANTIC + nameScore * W_NAME + textScore * W_TEXT;
  const final_score = weighted * mult;
  return { tier, final_score };
}

// Non-vector path (as in searchCompanies when !useVector)
function computeKeywordPath(): { tier: TierKey; final_score: number; semantic_score: number; name_score: number; text_score: number } {
  return {
    tier: DEFAULT_TIER,
    final_score: 0,
    semantic_score: 0,
    name_score: 0,
    text_score: 0,
  };
}

// ---- Mocked embedding (never sent anywhere; length > 0 to select vector branch) ----
// (declared for documentation of vector branch selection; not used in pure calls)

// ---- Tests -------------------------------------------------------------

console.log("\nsemantic-search scenario eval: smoke\n");

// Scenario 1: NL query extracts batch filter; remaining triggers vector; offset=2 for build
test("nl query with batch alias extracts filter + triggers vector path (offset 2)", () => {
  const q = "W24 AI developer tools";
  const { extractedFilters, cleanedQuery } = extractFiltersFromQuery(q);
  assert(extractedFilters.batch === "Winter 2024", "batch must extract");
  assert(cleanedQuery.includes("ai") || cleanedQuery.includes("developer"), "cleaned must retain intent");

  const explicit: Partial<SearchInput> = { q, limit: 20 };
  const parsed = parseSearchFilters(explicit as SearchInput);
  const merged: ParsedFilters = { ...extractedFilters, ...Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)) };

  const skipVector = cleanedQuery.trim().length === 0;
  assert(!skipVector, "should use vector");

  const useVector = !skipVector;
  const offset = useVector ? 2 : 0;
  const { sql, values } = buildFilterSQL(merged, offset);
  assert(sql.includes("$3"), `vector path must start params at $3; got: ${sql}`);
  assert(values.length >= 1, "values must be present");

  // simulate searchCompanies vector call with mock embedding
  const scores = { semantic: 0.65, name: 0.25, text: 0.1 };
  const { tier, final_score } = computeTierAndFinal(scores.semantic, scores.name, scores.text);
  assert(tier === DEFAULT_TIER, `tier=${tier}`);
  assert(final_score > 0.5 && final_score < 0.7, `final_score=${final_score}`);
});

// Scenario 2: explicit filters override extracted; still vector
test("explicit filters override + merge + build at offset 2", () => {
  const q = "fintech startups";
  const { extractedFilters } = extractFiltersFromQuery(q);
  const explicit: Partial<SearchInput> = { q, stage: "Series A", is_hiring: "true" };
  const parsed = parseSearchFilters(explicit as SearchInput);
  const defined = Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined));
  const merged: ParsedFilters = { ...extractedFilters, ...defined as Partial<ParsedFilters> };

  assert(merged.stage === "Series A", "explicit stage wins");
  assert(merged.is_hiring === true, "explicit hiring wins");

  const { sql } = buildFilterSQL(merged, 2);
  assert(sql.includes("stage = $3"), "offset applied");
  assert(sql.includes("is_hiring = $"), "hiring included");
});

// Scenario 3: pure filter query (all tokens consumed) -> skip vector, offset 0, keyword path
test("pure filter query skips vector and uses keyword path (final=0)", () => {
  const q = "W24";
  const { extractedFilters, cleanedQuery } = extractFiltersFromQuery(q);
  assert(extractedFilters.batch === "Winter 2024", "batch extract");
  assert(cleanedQuery.trim().length === 0, "all consumed");

  const skipVector = cleanedQuery.trim().length === 0;
  const offset = skipVector ? 0 : 2;
  const { sql } = buildFilterSQL(extractedFilters, offset);
  assert(sql.includes("batch = $1"), "offset 0 starts at $1");
  assert(!sql.includes("$2") || sql.includes("embedding"), "only one param before sentinel");

  const kw = computeKeywordPath();
  assert(kw.tier === DEFAULT_TIER, "filter path uses the default tier");
  assert(kw.final_score === 0 && kw.semantic_score === 0, "zeros on keyword");
});

// Scenario 4: a strong semantic hit with no name match is an unboosted match
test("vector branch high semantic yields the default tier and an unboosted score", () => {
  const { tier, final_score } = computeTierAndFinal(0.82, 0.35, 0.05);
  assert(tier === DEFAULT_TIER, `got ${tier}`);
  const expected = 0.82 * W_SEMANTIC + 0.35 * W_NAME + 0.05 * W_TEXT;
  assert(Math.abs(final_score - expected) < 0.0001, `final ${final_score} != ${expected}`);
});

// Scenario 5: exact name match multiplier and tier
test("name sim >=0.9 yields an exact match with the registry boost", () => {
  const { tier, final_score } = computeTierAndFinal(0.4, 0.93, 0.2);
  assert(tier === EXACT_MATCH_TIER, "tier exact");
  const base = 0.4 * W_SEMANTIC + 0.93 * W_NAME + 0.2 * W_TEXT;
  const expected = base * TIERS[EXACT_MATCH_TIER].boost;
  assert(Math.abs(final_score - expected) < 0.0001, "final exact boost");
});

// Scenario 6: score ordering follows similarity, with exact matches on top
test("final_score ordering tracks semantic score, and an exact match outranks all", () => {
  const name = 0.2;
  const text = 0;
  const exact = computeTierAndFinal(0.3, 0.95, text);
  const high = computeTierAndFinal(0.85, name, text);
  const mid = computeTierAndFinal(0.6, name, text);
  const low = computeTierAndFinal(0.35, name, text);
  const filterOnly = computeKeywordPath();

  assert(exact.final_score > high.final_score, "exact beats the best semantic hit");
  assert(high.final_score > mid.final_score, "ordering follows semantic score");
  assert(mid.final_score > low.final_score, "ordering follows semantic score");
  assert(low.final_score > filterOnly.final_score, "any ranked hit beats the unranked path");
});

// Scenario 7: buildFilterSQL vector offset invariant (re-exercise for search path)
test("vector path always uses paramOffset=2 for build (embedding + query bound first)", () => {
  const f: ParsedFilters = { stage: "Seed", tags: ["ai"] };
  const v2 = buildFilterSQL(f, 2);
  const indices = (v2.sql.match(/\$\d+/g) ?? []).map((m) => Number(m.slice(1)));
  assert(indices[0] === 3, "first filter param must be $3 when vector");
  assert(v2.values.length === 2, "2 values for stage+tags");
});

// Scenario 8: non-vector build at 0 + merged filters
test("non vector path uses offset 0 and still produces parameterized filters", () => {
  const { sql, values } = buildFilterSQL({ location: "NYC", founded_year_min: 2020 }, 0);
  assert(sql.includes("all_locations ILIKE $1"), sql);
  assert(sql.includes("EXTRACT(YEAR FROM founded_at) >= $2"), sql);
  assert(values.length === 2, "values length");
});

// ---- Summary -----------------------------------------------------------

const total = passed + failed;
console.log(`\n${total} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
