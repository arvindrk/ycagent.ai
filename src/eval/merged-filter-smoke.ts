/**
 * Smoke eval for merged filter pipeline (extract + parse + override merge + build).
 * Covers the composition performed by /api/companies/search/route.ts at the
 * boundary between extractFiltersFromQuery (from q), parseSearchFilters (from
 * explicit params), explicit-override merge, cleanedQuery skip logic, and
 * buildFilterSQL. Zero I/O, no env vars, no DB, no embeddings.
 *
 * Run: npm run eval:merged-filter-smoke
 */

import { extractFiltersFromQuery } from '@/lib/semantic-search/filters/extract-from-query';
import { parseSearchFilters } from '@/lib/semantic-search/filters/parse';
import { buildFilterSQL } from '@/lib/semantic-search/filters/build';
import type { SearchInput } from '@/lib/schemas/search.schema';
import type { ParsedFilters } from '@/lib/semantic-search/filters/parse';

// ---- Test runner -------------------------------------------------------

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

// ---- Helpers mirroring route merge ------------------------------------

function mergeForRoute(q: string, explicitInput: Partial<SearchInput>): { merged: ParsedFilters; cleanedQuery: string } {
  const { extractedFilters, cleanedQuery } = extractFiltersFromQuery(q);
  const explicitFilters = parseSearchFilters(explicitInput as SearchInput);
  const definedExplicitFilters = Object.fromEntries(
    Object.entries(explicitFilters).filter(([, v]) => v !== undefined)
  ) as Partial<ParsedFilters>;
  const merged: ParsedFilters = { ...extractedFilters, ...definedExplicitFilters };
  return { merged, cleanedQuery };
}

// ---- Tests -------------------------------------------------------------

console.log('\nmerged-filter eval: smoke\n');

// Pure extract path (no explicit)
test("extract only populates merged and cleanedQuery", () => {
  const { merged, cleanedQuery } = mergeForRoute("W24 AI startups", { q: "W24 AI startups" });
  assert(merged.batch === "Winter 2024", `batch expected Winter 2024 got ${merged.batch}`);
  assert(cleanedQuery.trim().length > 0, "cleaned should retain AI startups");
  assert(merged.is_hiring === undefined, "no hiring from this query");
});

// Pure explicit (no extract match)
test("explicit only populates merged (undefineds stripped)", () => {
  const { merged, cleanedQuery } = mergeForRoute("fintech tools", { q: "fintech tools", is_hiring: "true", tags: "ai,b2b" });
  assert(merged.is_hiring === true, `expected true got ${merged.is_hiring}`);
  assert(merged.tags?.length === 2 && merged.tags[0] === "ai", `tags ${JSON.stringify(merged.tags)}`);
  assert(merged.batch === undefined, "no batch extracted");
  assert(cleanedQuery.includes("fintech"), "cleaned keeps original tokens");
});

// Union of keys from extract + explicit
test("union of distinct keys from extract and explicit", () => {
  const { merged } = mergeForRoute("W24 startups", { q: "W24 startups", is_nonprofit: "true", location: "SF" });
  assert(merged.batch === "Winter 2024", "extract batch");
  assert(merged.is_nonprofit === true, "explicit nonprofit");
  assert(merged.location === "SF", "explicit location");
  assert(merged.stage === undefined, "no stage");
});

// Explicit overrides extract on conflict
test("explicit overrides extracted value for same key", () => {
  // query triggers is_hiring true via extract
  const { merged } = mergeForRoute("B2B SaaS startups is hiring", {
    q: "B2B SaaS startups is hiring",
    is_hiring: "false",
  });
  assert(merged.is_hiring === false, `override should make is_hiring=false, got ${merged.is_hiring}`);
  assert(merged.batch === undefined, "no batch here");
});

// cleanedQuery empty when only filter tokens (skip vector)
test("cleanedQuery empty after full filter extraction sets skip condition", () => {
  const { cleanedQuery } = mergeForRoute("W24", { q: "W24" });
  assert(cleanedQuery.trim().length === 0, `expected empty cleaned for pure batch, got '${cleanedQuery}'`);
});

// buildFilterSQL receives merged and produces correct SQL/values
test("buildFilterSQL on merged union produces sequential params and matching values", () => {
  const { merged } = mergeForRoute("S24 health", { q: "S24 health", is_hiring: "true", team_size_min: 10 });
  const { sql, values } = buildFilterSQL(merged);
  // check sequential $N by counting distinct
  const placeholders = (sql.match(/\$(\d+)/g) || []).map(p => parseInt(p.slice(1), 10));
  const distinct = Array.from(new Set(placeholders)).sort((a, b) => a - b);
  assert(distinct.length > 0, "has placeholders");
  for (let i = 1; i < distinct.length; i++) {
    assert(distinct[i] === distinct[i-1] + 1, `non-sequential $N: ${distinct}`);
  }
  assert(values.length === distinct.length, `values len ${values.length} != param count ${distinct.length}`);
  assert(sql.includes("batch ="), "has batch clause");
  assert(sql.includes("is_hiring"), "has hiring");
});

// build at offset (as used when vector search)
test("buildFilterSQL(merged, 2) starts placeholders at $3", () => {
  const { merged } = mergeForRoute("F24", { q: "F24", stage: "Seed" });
  const { sql } = buildFilterSQL(merged, 2);
  assert(sql.includes("$3"), "should start at $3 for first filter");
  assert(!sql.includes("$1") && !sql.includes("$2"), "no low placeholders");
});

// Multiple array + scalar merged
test("merged arrays and scalars roundtrip to build", () => {
  const { merged } = mergeForRoute("W24", { q: "W24", tags: "fintech,ai", regions: "US", founded_year_min: 2020 });
  const { sql, values } = buildFilterSQL(merged);
  assert(merged.tags?.length === 2, "tags");
  assert(merged.regions?.[0] === "US", "regions");
  assert(merged.founded_year_min === 2020, "year");
  assert(values.length >= 4, "at least batch + tags + regions + year");
  assert(sql.includes("? |") || sql.includes("?|"), "array op present");
});

// Explicit empty arrays after strip do not pollute
test("explicit all-comma array becomes [] and does not override", () => {
  const { merged } = mergeForRoute("dev tools", { q: "dev tools", tags: ",, " });
  assert(Array.isArray(merged.tags) && merged.tags.length === 0, `tags should be [] got ${JSON.stringify(merged.tags)}`);
});

// No spurious overrides from absent explicit
test("absent explicit fields leave extracted values untouched", () => {
  const { merged } = mergeForRoute("after 2019 startups", { q: "after 2019 startups" });
  assert(merged.founded_year_min === 2020 || merged.founded_year_min === 2019, `year from extract, got ${merged.founded_year_min}`);
  assert(merged.is_hiring === undefined, "no hiring bleed");
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
