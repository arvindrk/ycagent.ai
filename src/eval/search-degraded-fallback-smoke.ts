/**
 * Smoke eval for graceful degradation in GET /api/companies/search.
 * Locks two contracts:
 *   1. resolveAchievedSearchPath never reports 'vector' when no embedding was
 *      produced, so the UI cannot claim semantic ranking on a lexical response.
 *   2. generateEmbeddingBestEffort rethrows a caller abort instead of
 *      swallowing it into a degraded response.
 * Hermetic: the abort case short-circuits before any provider call, so this
 * runs with no DB, embeddings API, network, or .env.
 *
 * Run: npm run eval:search-degraded-fallback-smoke
 */

import {
  EmbeddingAbortedError,
  generateEmbeddingBestEffort,
} from '@/lib/semantic-search/embeddings/generate';
import { resolveAchievedSearchPath } from '@/lib/semantic-search/resolve-search-path';
import { searchPathSchema } from '@/lib/schemas/search.schema';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
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

async function main(): Promise<void> {
  console.log('\nsearch-degraded-fallback eval: smoke\n');

  await test('embedding present on a vector attempt => vector', () => {
    assert(
      resolveAchievedSearchPath({ skipVectorSearch: false, hasEmbedding: true }) === 'vector',
      'a successful embedding should report vector',
    );
  });

  await test('embedding missing on a vector attempt => lexical, never vector', () => {
    const path = resolveAchievedSearchPath({ skipVectorSearch: false, hasEmbedding: false });
    assert(path === 'lexical', `expected lexical, got ${path}`);
  });

  await test('filter-only request => keyword regardless of embedding', () => {
    for (const hasEmbedding of [true, false]) {
      assert(
        resolveAchievedSearchPath({ skipVectorSearch: true, hasEmbedding }) === 'keyword',
        `skipVectorSearch with hasEmbedding=${hasEmbedding} should report keyword`,
      );
    }
  });

  await test('every achieved path is a valid search_path value', () => {
    for (const skipVectorSearch of [true, false]) {
      for (const hasEmbedding of [true, false]) {
        const path = resolveAchievedSearchPath({ skipVectorSearch, hasEmbedding });
        assert(searchPathSchema.safeParse(path).success, `${path} is not in searchPathSchema`);
      }
    }
  });

  await test('an already-aborted caller signal throws rather than degrading', async () => {
    const controller = new AbortController();
    controller.abort();

    let thrown: unknown;
    try {
      await generateEmbeddingBestEffort('ai agents', controller.signal);
    } catch (err) {
      thrown = err;
    }

    assert(
      thrown instanceof EmbeddingAbortedError,
      `expected EmbeddingAbortedError, got ${thrown === undefined ? 'no throw' : String(thrown)}`,
    );
  });

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

void main();
