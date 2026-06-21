/**
 * Smoke eval for parseSearchFilters.
 * Validates passthrough, array comma splitting, boolean string coercion to true/false/undefined,
 * and numeric fields. Zero I/O, no env vars required. Exercises explicit URL param parsing path.
 *
 * Run: npm run eval:parse-search-filters-smoke
 */

import { parseSearchFilters } from '@/lib/semantic-search/filters/parse';
import type { SearchInput } from '@/lib/schemas/search.schema';

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

// ---- Tests -------------------------------------------------------------

console.log('\nparse-search-filters eval: smoke\n');

// String passthrough
test("batch passthrough", () => {
  const input: Partial<SearchInput> = { q: 'x', batch: 'W24' };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.batch === 'W24', `expected W24, got ${out.batch}`);
});

test("stage passthrough", () => {
  const input: Partial<SearchInput> = { q: 'x', stage: 'Series A' };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.stage === 'Series A', `expected Series A, got ${out.stage}`);
});

test("status passthrough", () => {
  const input: Partial<SearchInput> = { q: 'x', status: 'active' };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.status === 'active', `expected active, got ${out.status}`);
});

test("location passthrough", () => {
  const input: Partial<SearchInput> = { q: 'x', location: 'San Francisco' };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.location === 'San Francisco', `expected San Francisco, got ${out.location}`);
});

// Array parsing
test("tags comma split", () => {
  const input: Partial<SearchInput> = { q: 'x', tags: 'fintech,b2b' };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.tags?.length === 2 && out.tags[0] === 'fintech' && out.tags[1] === 'b2b', `got ${JSON.stringify(out.tags)}`);
});

test("industries trims and filters empties", () => {
  const input: Partial<SearchInput> = { q: 'x', industries: ' healthcare , , ai ' };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.industries?.length === 2 && out.industries[0] === 'healthcare' && out.industries[1] === 'ai', `got ${JSON.stringify(out.industries)}`);
});

test("regions empty after split returns [] not undefined", () => {
  const input: Partial<SearchInput> = { q: 'x', regions: ',,  ,' };
  const out = parseSearchFilters(input as SearchInput);
  assert(Array.isArray(out.regions) && out.regions.length === 0, `expected [], got ${JSON.stringify(out.regions)}`);
});

test("absent array field is undefined", () => {
  const input: Partial<SearchInput> = { q: 'x' };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.tags === undefined, `expected tags=undefined, got ${out.tags}`);
});

// Boolean
test("is_hiring true from 'true'", () => {
  const input: Partial<SearchInput> = { q: 'x', is_hiring: 'true' };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.is_hiring === true, `expected true, got ${out.is_hiring}`);
});

test("is_nonprofit false from 'false'", () => {
  const input: Partial<SearchInput> = { q: 'x', is_nonprofit: 'false' };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.is_nonprofit === false, `expected false, got ${out.is_nonprofit}`);
});

test("bool absent is undefined", () => {
  const input: Partial<SearchInput> = { q: 'x' };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.is_hiring === undefined && out.is_nonprofit === undefined, `bools should be undefined`);
});

// Numeric passthrough (already coerced by schema)
test("team_size_min/max passthrough", () => {
  const input: Partial<SearchInput> = { q: 'x', team_size_min: 5, team_size_max: 50 };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.team_size_min === 5 && out.team_size_max === 50, `got min=${out.team_size_min} max=${out.team_size_max}`);
});

test("founded_year passthrough", () => {
  const input: Partial<SearchInput> = { q: 'x', founded_year_min: 2020, founded_year_max: 2023 };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.founded_year_min === 2020 && out.founded_year_max === 2023, `got ${out.founded_year_min}-${out.founded_year_max}`);
});

test("numeric absent is undefined", () => {
  const input: Partial<SearchInput> = { q: 'x' };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.team_size_min === undefined && out.founded_year_min === undefined, `numerics should be undefined`);
});

// Mixed and empty
test("mixed filters roundtrip", () => {
  const input: Partial<SearchInput> = {
    q: 'test',
    batch: 'W24',
    tags: 'ai,fintech',
    is_hiring: 'true',
    team_size_min: 10,
    founded_year_max: 2024,
  };
  const out = parseSearchFilters(input as SearchInput);
  assert(out.batch === 'W24' && out.tags?.[0] === 'ai' && out.is_hiring === true && out.team_size_min === 10 && out.founded_year_max === 2024, `mixed failed`);
});

test("empty input yields no defined filters", () => {
  const input: Partial<SearchInput> = { q: 'foo' };
  const out = parseSearchFilters(input as SearchInput);
  const defined = Object.values(out).filter((v) => v !== undefined);
  assert(defined.length === 0, `expected no defined, got ${JSON.stringify(out)}`);
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
