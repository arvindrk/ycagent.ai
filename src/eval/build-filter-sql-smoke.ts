/**
 * Smoke eval for buildFilterSQL.
 * Validates that parameterized SQL conditions have correct $N indices and that
 * the values array maintains strict 1-to-1 alignment with those placeholders.
 * Zero I/O, no env vars required.
 *
 * Run: npm run eval:build-filter-sql-smoke
 */

import { buildFilterSQL } from '@/lib/semantic-search/filters/build';
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

// Count how many distinct $N placeholders appear in the SQL string.
function countParams(sql: string): number {
  const matches = sql.match(/\$\d+/g) ?? [];
  return new Set(matches).size;
}

// Extract the sorted list of $N indices from the SQL string.
function paramIndices(sql: string): number[] {
  const matches = sql.match(/\$\d+/g) ?? [];
  return [...new Set(matches)].map((m) => Number(m.slice(1))).sort((a, b) => a - b);
}

// ---- Tests -------------------------------------------------------------

console.log('\nbuild-filter-sql eval: smoke\n');

// Empty filters
test('empty filters: sql is just embedding IS NOT NULL', () => {
  const { sql, values } = buildFilterSQL({});
  assert(sql === 'embedding IS NOT NULL', `expected bare sentinel; got: ${sql}`);
  assert(values.length === 0, `expected no values; got ${values.length}`);
});

// Single filter at default offset (0)
test('batch filter offset=0 produces $1', () => {
  const { sql, values } = buildFilterSQL({ batch: 'W24' });
  assert(sql.includes('batch = $1'), `expected 'batch = $1'; got: ${sql}`);
  assert(values.length === 1, `expected 1 value; got ${values.length}`);
  assert(values[0] === 'W24', `expected 'W24'; got ${String(values[0])}`);
});

// Single filter at vector-search offset (2) -- embedding=$1, query=$2 already bound
test('batch filter offset=2 produces $3', () => {
  const { sql, values } = buildFilterSQL({ batch: 'S24' }, 2);
  assert(sql.includes('batch = $3'), `expected 'batch = $3'; got: ${sql}`);
  assert(values.length === 1, `expected 1 value; got ${values.length}`);
});

// Values length always matches $N count
test('values.length equals number of distinct $N params in sql', () => {
  const filters: ParsedFilters = {
    batch: 'W25',
    stage: 'Series A',
    is_hiring: true,
    team_size_min: 5,
    team_size_max: 50,
  };
  const { sql, values } = buildFilterSQL(filters);
  const paramCount = countParams(sql);
  assert(
    values.length === paramCount,
    `values.length (${values.length}) != param count (${paramCount}); sql: ${sql}`,
  );
});

// Param indices are sequential with no gaps
test('multiple filters produce sequential $N with no gaps', () => {
  const filters: ParsedFilters = { batch: 'W25', stage: 'Series A', is_hiring: true };
  const { sql } = buildFilterSQL(filters);
  const indices = paramIndices(sql);
  for (let i = 0; i < indices.length; i++) {
    assert(
      indices[i] === i + 1,
      `gap in param indices at position ${i}: expected ${i + 1}, got ${indices[i]}; sql: ${sql}`,
    );
  }
});

// stage filter
test('stage filter produces correct clause', () => {
  const { sql, values } = buildFilterSQL({ stage: 'Series B' });
  assert(sql.includes('stage = $1'), `expected 'stage = $1'; got: ${sql}`);
  assert(values[0] === 'Series B', `wrong value: ${String(values[0])}`);
});

// status filter
test('status filter produces correct clause', () => {
  const { sql, values } = buildFilterSQL({ status: 'active' });
  assert(sql.includes('status = $1'), `expected 'status = $1'; got: ${sql}`);
  assert(values[0] === 'active', `wrong value: ${String(values[0])}`);
});

// Array filter: tags uses ?| operator
test('tags filter uses ?| operator', () => {
  const { sql, values } = buildFilterSQL({ tags: ['fintech', 'b2b'] });
  assert(sql.includes('tags ?| $1'), `expected 'tags ?| $1'; got: ${sql}`);
  assert(Array.isArray(values[0]), 'expected values[0] to be array');
  assert(
    JSON.stringify(values[0]) === JSON.stringify(['fintech', 'b2b']),
    `wrong tags value: ${JSON.stringify(values[0])}`,
  );
});

// Array filter: industries uses ?| operator
test('industries filter uses ?| operator', () => {
  const { sql } = buildFilterSQL({ industries: ['healthcare'] });
  assert(sql.includes('industries ?| $1'), `expected 'industries ?| $1'; got: ${sql}`);
});

// Array filter: regions uses ?| operator
test('regions filter uses ?| operator', () => {
  const { sql } = buildFilterSQL({ regions: ['US'] });
  assert(sql.includes('regions ?| $1'), `expected 'regions ?| $1'; got: ${sql}`);
});

// team_size range: two params, sequential
test('team_size_min and team_size_max produce two sequential params', () => {
  const { sql, values } = buildFilterSQL({ team_size_min: 10, team_size_max: 100 });
  assert(sql.includes('team_size >= $1'), `expected 'team_size >= $1'; got: ${sql}`);
  assert(sql.includes('team_size <= $2'), `expected 'team_size <= $2'; got: ${sql}`);
  assert(values.length === 2, `expected 2 values; got ${values.length}`);
  assert(values[0] === 10, `expected 10; got ${String(values[0])}`);
  assert(values[1] === 100, `expected 100; got ${String(values[1])}`);
});

// is_nonprofit boolean
test('is_nonprofit filter produces correct clause', () => {
  const { sql, values } = buildFilterSQL({ is_nonprofit: true });
  assert(sql.includes('is_nonprofit = $1'), `expected 'is_nonprofit = $1'; got: ${sql}`);
  assert(values[0] === true, `expected true; got ${String(values[0])}`);
});

// location wraps value in % wildcards for ILIKE
test('location filter uses ILIKE and wraps value in % wildcards', () => {
  const { sql, values } = buildFilterSQL({ location: 'San Francisco' });
  assert(
    sql.includes('all_locations ILIKE $1'),
    `expected 'all_locations ILIKE $1'; got: ${sql}`,
  );
  assert(values[0] === '%San Francisco%', `expected '%San Francisco%'; got ${String(values[0])}`);
});

// founded_year range: two params, sequential
test('founded_year_min and founded_year_max produce two sequential params', () => {
  const { sql, values } = buildFilterSQL({ founded_year_min: 2020, founded_year_max: 2023 });
  assert(
    sql.includes("EXTRACT(YEAR FROM founded_at) >= $1"),
    `expected 'EXTRACT(YEAR FROM founded_at) >= $1'; got: ${sql}`,
  );
  assert(
    sql.includes("EXTRACT(YEAR FROM founded_at) <= $2"),
    `expected 'EXTRACT(YEAR FROM founded_at) <= $2'; got: ${sql}`,
  );
  assert(values.length === 2, `expected 2 values; got ${values.length}`);
});

// All 13 filter types combined: values count matches param count
test('all filters combined: values.length === distinct $N count', () => {
  const all: ParsedFilters = {
    batch: 'W24',
    stage: 'Seed',
    status: 'active',
    tags: ['ai'],
    industries: ['healthcare'],
    regions: ['EU'],
    team_size_min: 1,
    team_size_max: 200,
    is_hiring: true,
    is_nonprofit: false,
    location: 'NYC',
    founded_year_min: 2018,
    founded_year_max: 2024,
  };
  const { sql, values } = buildFilterSQL(all);
  const paramCount = countParams(sql);
  assert(
    values.length === paramCount,
    `values.length (${values.length}) != param count (${paramCount})`,
  );
  assert(values.length === 13, `expected 13 values for all filters; got ${values.length}`);
});

// All filters combined at offset=2: first param is $3, indices are sequential
test('all filters at offset=2: params start at $3 with no gaps', () => {
  const all: ParsedFilters = { batch: 'W24', stage: 'Seed', is_hiring: true };
  const { sql } = buildFilterSQL(all, 2);
  const indices = paramIndices(sql);
  assert(indices[0] === 3, `expected first param to be $3; got $${indices[0]}`);
  for (let i = 1; i < indices.length; i++) {
    assert(
      indices[i] === indices[i - 1]! + 1,
      `gap between $${indices[i - 1]} and $${indices[i]}`,
    );
  }
});

// sql always ends with AND embedding IS NOT NULL when conditions exist
test('non-empty filters: sql ends with AND embedding IS NOT NULL', () => {
  const { sql } = buildFilterSQL({ batch: 'W24' });
  assert(
    sql.endsWith('AND embedding IS NOT NULL'),
    `expected sql to end with sentinel; got: ${sql}`,
  );
});

// ---- Summary -----------------------------------------------------------

const total = passed + failed;
console.log(`\n${total} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
