/**
 * Smoke eval for resolveSearchMode, the ranking-strategy decision in searchCompanies.
 * Locks the contract that a request with neither text nor filters matches every row
 * and must resolve to null instead of returning the whole table ordered by team_size.
 * Hermetic: zero I/O, no DB, embeddings API, network, or .env.
 *
 * Run: npm run eval:search-mode-resolution-smoke
 */

import { resolveSearchMode, type SearchMode } from '@/lib/semantic-search/query';

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

function mode(
  hasEmbedding: boolean,
  hasText: boolean,
  hasFilters: boolean,
): SearchMode | null {
  return resolveSearchMode({ hasEmbedding, hasText, hasFilters });
}

console.log('\nsearch-mode-resolution eval: smoke\n');

test('embedding present => vector regardless of text or filters', () => {
  for (const hasText of [true, false]) {
    for (const hasFilters of [true, false]) {
      assert(
        mode(true, hasText, hasFilters) === 'vector',
        `embedding + text=${hasText} filters=${hasFilters} should be vector`,
      );
    }
  }
});

test('no embedding but text present => lexical', () => {
  assert(mode(false, true, false) === 'lexical', 'text only => lexical');
  assert(mode(false, true, true) === 'lexical', 'text + filters => lexical');
});

test('no embedding and no text but filters present => filter', () => {
  assert(mode(false, false, true) === 'filter', 'filters only => filter');
});

test('no embedding, no text, no filters => null (never dump the table)', () => {
  assert(
    mode(false, false, false) === null,
    'an unconstrained request must not resolve to a searchable mode',
  );
});

test('lexical outranks filter whenever there is text to rank on', () => {
  assert(
    mode(false, true, true) !== 'filter',
    'text must be ranked, not discarded in favour of a team_size sort',
  );
});

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
