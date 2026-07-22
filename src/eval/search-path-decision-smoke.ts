/**
 * Smoke eval for discovery search_path decision (vector vs keyword).
 * Locks the contract used by GET /api/companies/search after extractFiltersFromQuery:
 *   resolveSearchPath(cleanedQuery) — empty trimmed residue => keyword, else vector.
 * Hermetic: zero I/O, no DB, embeddings API, network, E2B, or .env.
 * Imports production resolveSearchPath + extractFiltersFromQuery + searchPathSchema.
 *
 * Run: npm run eval:search-path-decision-smoke
 */

import { extractFiltersFromQuery } from '@/lib/semantic-search/filters/extract-from-query';
import { resolveSearchPath } from '@/lib/semantic-search/resolve-search-path';
import { searchPathSchema } from '@/lib/schemas/search.schema';
import type { SearchPath } from '@/lib/schemas/search.schema';

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

function pathFromQuery(q: string): { cleanedQuery: string; search_path: SearchPath } {
  const { cleanedQuery } = extractFiltersFromQuery(q);
  return { cleanedQuery, search_path: resolveSearchPath(cleanedQuery) };
}

// ---- Tests -------------------------------------------------------------

console.log('\nsearch-path-decision eval: smoke\n');

// Pure helper: empty / whitespace cleaned residue => keyword
test('resolveSearchPath empty string => keyword', () => {
  assert(resolveSearchPath('') === 'keyword', 'empty => keyword');
});

test('resolveSearchPath whitespace-only => keyword', () => {
  assert(resolveSearchPath('   ') === 'keyword', 'whitespace => keyword');
  assert(resolveSearchPath('\t\n') === 'keyword', 'tabs/newlines => keyword');
});

// Pure helper: semantic residue => vector
test('resolveSearchPath non-empty residue => vector', () => {
  assert(resolveSearchPath('ai') === 'vector', 'ai => vector');
  assert(resolveSearchPath(' developer tools ') === 'vector', 'padded residue => vector');
});

// Schema enum: only vector | keyword
test('searchPathSchema accepts only vector and keyword', () => {
  assert(searchPathSchema.parse('vector') === 'vector', 'vector valid');
  assert(searchPathSchema.parse('keyword') === 'keyword', 'keyword valid');
  let threw = false;
  try {
    searchPathSchema.parse('hybrid');
  } catch {
    threw = true;
  }
  assert(threw, 'hybrid must fail schema');
});

test('resolveSearchPath outputs are always schema-valid', () => {
  for (const cleaned of ['', '  ', 'ai', 'fintech saas']) {
    const path = resolveSearchPath(cleaned);
    assert(searchPathSchema.parse(path) === path, `schema reject: ${path}`);
    assert(path === 'vector' || path === 'keyword', `unexpected enum ${path}`);
  }
});

// Filter-only: batch alias fully consumed => keyword
test('filter-only batch alias (W24) => keyword', () => {
  const { cleanedQuery, search_path } = pathFromQuery('W24');
  assert(cleanedQuery.trim().length === 0, `expected empty cleaned, got '${cleanedQuery}'`);
  assert(search_path === 'keyword', `expected keyword, got ${search_path}`);
});

// Filter-only: hiring token fully consumed => keyword
test('filter-only hiring (is hiring) => keyword', () => {
  const { cleanedQuery, search_path } = pathFromQuery('is hiring');
  assert(cleanedQuery.trim().length === 0, `expected empty cleaned, got '${cleanedQuery}'`);
  assert(search_path === 'keyword', `expected keyword, got ${search_path}`);
});

// Filter-only: status token fully consumed => keyword
test('filter-only status (went public) => keyword', () => {
  const { cleanedQuery, search_path } = pathFromQuery('went public');
  assert(cleanedQuery.trim().length === 0, `expected empty cleaned, got '${cleanedQuery}'`);
  assert(search_path === 'keyword', `expected keyword, got ${search_path}`);
});

// Semantic free-text (no filters) => vector
test('free-text developer tools => vector', () => {
  const { cleanedQuery, search_path } = pathFromQuery('developer tools');
  assert(cleanedQuery.trim().length > 0, 'expected semantic residue');
  assert(search_path === 'vector', `expected vector, got ${search_path}`);
});

// Mixed filter + semantic residue => vector
test('mixed filter+text (W24 AI startups) => vector', () => {
  const { cleanedQuery, search_path } = pathFromQuery('W24 AI startups');
  assert(
    cleanedQuery.includes('ai'),
    `expected ai residue, got '${cleanedQuery}'`,
  );
  assert(search_path === 'vector', `expected vector, got ${search_path}`);
});

// skipVectorSearch contract: keyword <=> empty trimmed cleaned
test('keyword path iff cleanedQuery.trim empty (route skipVector contract)', () => {
  const cases = [
    'W24',
    'is hiring',
    'went public',
    'developer tools',
    'W24 AI startups',
    'fintech',
  ];
  for (const q of cases) {
    const { cleanedQuery, search_path } = pathFromQuery(q);
    const skipVector = cleanedQuery.trim().length === 0;
    assert(
      (search_path === 'keyword') === skipVector,
      `mismatch q='${q}' path=${search_path} cleaned='${cleanedQuery}'`,
    );
    assert(
      (search_path === 'vector') === !skipVector,
      `vector invert fail q='${q}'`,
    );
  }
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
