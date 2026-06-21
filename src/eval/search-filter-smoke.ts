/**
 * Smoke eval for extractFiltersFromQuery.
 * Covers batch aliases, team size patterns, founded year patterns, hiring/nonprofit
 * flags, and cleanedQuery output. Zero I/O: pure function, no env vars needed.
 *
 * Run: npm run eval:search-filter-smoke
 */

import { extractFiltersFromQuery } from "@/lib/semantic-search/filters/extract-from-query";

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

console.log("\nsearch-filter eval: smoke\n");

// Batch short-form aliases
test("W24 alias resolves to Winter 2024", () => {
  const { extractedFilters } = extractFiltersFromQuery("W24 AI startups");
  assert(
    extractedFilters.batch === "Winter 2024",
    `expected 'Winter 2024', got '${extractedFilters.batch}'`,
  );
});

test("S24 alias resolves to Summer 2024", () => {
  const { extractedFilters } = extractFiltersFromQuery("S24 fintech companies");
  assert(
    extractedFilters.batch === "Summer 2024",
    `expected 'Summer 2024', got '${extractedFilters.batch}'`,
  );
});

test("F24 alias resolves to Fall 2024", () => {
  const { extractedFilters } = extractFiltersFromQuery("F24 health startups");
  assert(
    extractedFilters.batch === "Fall 2024",
    `expected 'Fall 2024', got '${extractedFilters.batch}'`,
  );
});

// Team size: range pattern
test("team size range '10-50 employees' sets min and max", () => {
  const { extractedFilters } = extractFiltersFromQuery("startups with 10-50 employees");
  assert(
    extractedFilters.team_size_min === 10,
    `expected team_size_min=10, got ${extractedFilters.team_size_min}`,
  );
  assert(
    extractedFilters.team_size_max === 50,
    `expected team_size_max=50, got ${extractedFilters.team_size_max}`,
  );
});

// Team size: under pattern
test("'under 10 people' sets team_size_max only", () => {
  const { extractedFilters } = extractFiltersFromQuery("under 10 people AI company");
  assert(
    extractedFilters.team_size_max === 10,
    `expected team_size_max=10, got ${extractedFilters.team_size_max}`,
  );
  assert(
    extractedFilters.team_size_min === undefined,
    `expected team_size_min=undefined, got ${extractedFilters.team_size_min}`,
  );
});

// Team size: N+ pattern
test("'50+ employees' sets team_size_min only", () => {
  const { extractedFilters } = extractFiltersFromQuery("50+ employees startup");
  assert(
    extractedFilters.team_size_min === 50,
    `expected team_size_min=50, got ${extractedFilters.team_size_min}`,
  );
  assert(
    extractedFilters.team_size_max === undefined,
    `expected team_size_max=undefined, got ${extractedFilters.team_size_max}`,
  );
});

// Team size: phrase
test("'small startup' sets team_size_max=20", () => {
  const { extractedFilters } = extractFiltersFromQuery("small startup in fintech");
  assert(
    extractedFilters.team_size_max === 20,
    `expected team_size_max=20, got ${extractedFilters.team_size_max}`,
  );
});

// Founded year: exact
test("'founded in 2020' sets both min and max to 2020", () => {
  const { extractedFilters } = extractFiltersFromQuery("companies founded in 2020");
  assert(
    extractedFilters.founded_year_min === 2020,
    `expected founded_year_min=2020, got ${extractedFilters.founded_year_min}`,
  );
  assert(
    extractedFilters.founded_year_max === 2020,
    `expected founded_year_max=2020, got ${extractedFilters.founded_year_max}`,
  );
});

// Founded year: after
test("'after 2018' sets founded_year_min to 2019", () => {
  const { extractedFilters } = extractFiltersFromQuery("after 2018 startups");
  assert(
    extractedFilters.founded_year_min === 2019,
    `expected founded_year_min=2019, got ${extractedFilters.founded_year_min}`,
  );
  assert(
    extractedFilters.founded_year_max === undefined,
    `expected founded_year_max=undefined, got ${extractedFilters.founded_year_max}`,
  );
});

// Founded year: before
test("'before 2020' sets founded_year_max to 2019", () => {
  const { extractedFilters } = extractFiltersFromQuery("before 2020 enterprise company");
  assert(
    extractedFilters.founded_year_max === 2019,
    `expected founded_year_max=2019, got ${extractedFilters.founded_year_max}`,
  );
  assert(
    extractedFilters.founded_year_min === undefined,
    `expected founded_year_min=undefined, got ${extractedFilters.founded_year_min}`,
  );
});

// Hiring flag
test("'is hiring' sets is_hiring=true", () => {
  const { extractedFilters } = extractFiltersFromQuery("B2B SaaS startups is hiring");
  assert(
    extractedFilters.is_hiring === true,
    `expected is_hiring=true, got ${extractedFilters.is_hiring}`,
  );
});

test("'not hiring' sets is_hiring=false", () => {
  const { extractedFilters } = extractFiltersFromQuery("not hiring companies");
  assert(
    extractedFilters.is_hiring === false,
    `expected is_hiring=false, got ${extractedFilters.is_hiring}`,
  );
});

// Nonprofit flag
test("'nonprofit' sets is_nonprofit=true", () => {
  const { extractedFilters } = extractFiltersFromQuery("nonprofit healthcare startups");
  assert(
    extractedFilters.is_nonprofit === true,
    `expected is_nonprofit=true, got ${extractedFilters.is_nonprofit}`,
  );
});

// cleanedQuery: batch token removed, stopword removed
test("cleanedQuery excludes consumed batch token and stopwords", () => {
  const { extractedFilters, cleanedQuery } = extractFiltersFromQuery("W24 AI startups");
  assert(
    extractedFilters.batch === "Winter 2024",
    `batch not extracted: ${extractedFilters.batch}`,
  );
  assert(
    !cleanedQuery.includes("w24"),
    `cleanedQuery should not contain 'w24': '${cleanedQuery}'`,
  );
  assert(
    !cleanedQuery.includes("startups"),
    `cleanedQuery should not contain stopword 'startups': '${cleanedQuery}'`,
  );
  assert(
    cleanedQuery.includes("ai"),
    `cleanedQuery should contain 'ai': '${cleanedQuery}'`,
  );
});

// cleanedQuery: query with no filters returns non-filter tokens
test("cleanedQuery returns meaningful tokens when no filters match", () => {
  const { extractedFilters, cleanedQuery } = extractFiltersFromQuery("developer tools");
  assert(
    Object.keys(extractedFilters).length === 0,
    `expected no filters, got ${JSON.stringify(extractedFilters)}`,
  );
  assert(
    cleanedQuery.includes("developer"),
    `expected 'developer' in cleanedQuery, got '${cleanedQuery}'`,
  );
});

// No cross-contamination: only the right fields are set
test("hiring query sets only is_hiring, no other filters", () => {
  const { extractedFilters } = extractFiltersFromQuery("actively hiring");
  assert(
    extractedFilters.is_hiring === true,
    `expected is_hiring=true, got ${extractedFilters.is_hiring}`,
  );
  assert(
    extractedFilters.batch === undefined,
    `expected no batch, got '${extractedFilters.batch}'`,
  );
  assert(
    extractedFilters.stage === undefined,
    `expected no stage, got '${extractedFilters.stage}'`,
  );
  assert(
    extractedFilters.team_size_min === undefined && extractedFilters.team_size_max === undefined,
    `expected no team_size, got min=${extractedFilters.team_size_min} max=${extractedFilters.team_size_max}`,
  );
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
