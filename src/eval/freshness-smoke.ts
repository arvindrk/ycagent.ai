/**
 * Smoke eval for data freshness (last_synced_at, updated_at, created_at on Company per company.schema.ts;
 * research run started_at/completed_at). Lightweight schema-level + mock temporal checks.
 * Hermetic: zero I/O, no DB, no E2B, no network, no keys, no .env. Exercises dateSchema variants
 * and direct field access for freshness signals. Supports measurable research quality and coverage
 * + fresh evidence-backed intelligence (vision outcome 4 + 1).
 *
 * Run: npm run eval:freshness-smoke
 */

import { companySchema } from '@/lib/schemas/company.schema';
import type { Company } from '@/types/company.types';

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

// ---- Minimal valid company base (fields required by schema for parse) ----

const base: Record<string, unknown> = {
  id: '00000000-0000-0000-0000-000000000000',
  source: 'yc',
  source_id: 'test-1',
  source_url: null,
  name: 'FreshCo',
  slug: 'freshco',
  website: 'https://fresh.example',
  logo_url: null,
  one_liner: null,
  long_description: null,
  tags: [],
  industries: [],
  regions: [],
  batch: null,
  team_size: null,
  founded_at: null,
  stage: null,
  status: 'Active',
  is_hiring: false,
  is_nonprofit: false,
  all_locations: null,
};

// ---- Tests -------------------------------------------------------------

console.log('\nfreshness eval: smoke\n');

// Company schema date fields (ISO strings)
test('companySchema parses ISO strings for created_at/updated_at/last_synced_at', () => {
  const input = {
    ...base,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-06-01T00:00:00.000Z',
    last_synced_at: '2024-06-20T12:00:00.000Z',
  };
  const parsed = companySchema.parse(input) as Company;
  assert(parsed.created_at === '2024-01-01T00:00:00.000Z', 'created_at');
  assert(parsed.updated_at === '2024-06-01T00:00:00.000Z', 'updated_at');
  assert(parsed.last_synced_at === '2024-06-20T12:00:00.000Z', 'last_synced_at');
});

// Date transform path
test('companySchema transforms Date inputs to ISO for freshness fields', () => {
  const d1 = new Date('2024-02-01T00:00:00.000Z');
  const d2 = new Date('2024-06-02T00:00:00.000Z');
  const d3 = new Date('2024-06-21T00:00:00.000Z');
  const input = { ...base, created_at: d1, updated_at: d2, last_synced_at: d3 };
  const parsed = companySchema.parse(input) as Company;
  assert(parsed.last_synced_at === '2024-06-21T00:00:00.000Z', 'last_synced transform');
  assert(typeof parsed.updated_at === 'string' && parsed.updated_at.includes('2024-06-02'), 'updated transform');
});

// Direct field access for freshness derivation (no helper)
test('last_synced_at is directly accessible and newer than created for mock fresh case', () => {
  const input = {
    ...base,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-06-01T00:00:00.000Z',
    last_synced_at: '2024-06-25T00:00:00.000Z',
  };
  const p = companySchema.parse(input) as Company;
  const createdTs = Date.parse(p.created_at as string);
  const syncedTs = Date.parse(p.last_synced_at as string);
  assert(syncedTs > createdTs, 'last_synced after created');
  assert(syncedTs > Date.parse('2024-06-01T00:00:00.000Z'), 'last_synced indicates post-update sync');
});

// Stale vs recent via direct comparison (inline, hermetic fixed now)
test('can distinguish stale last_synced via direct timestamp compare on parsed', () => {
  const stale = companySchema.parse({ ...base, created_at: '2023-01-01T00:00:00.000Z', updated_at: '2023-06-01T00:00:00.000Z', last_synced_at: '2023-06-01T00:00:00.000Z' }) as Company;
  const fresh = companySchema.parse({ ...base, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-06-25T00:00:00.000Z', last_synced_at: '2024-06-25T00:00:00.000Z' }) as Company;
  const fixedNow = Date.parse('2024-06-26T00:00:00.000Z');
  const staleAge = fixedNow - Date.parse(stale.last_synced_at as string);
  const freshAge = fixedNow - Date.parse(fresh.last_synced_at as string);
  assert(staleAge > freshAge, 'stale age > fresh age');
  assert(staleAge > 300 * 24 * 60 * 60 * 1000, 'stale > ~10mo');
});

// Research run timestamps (started/completed) - direct field on mock
test('research run mock has started_at and optional completed_at with started <= completed', () => {
  const run1: { started_at: string; completed_at?: string } = {
    started_at: '2024-06-20T10:00:00.000Z',
    completed_at: '2024-06-20T10:04:30.000Z',
  };
  assert(run1.started_at.length > 0, 'started_at present');
  if (run1.completed_at) {
    assert(run1.completed_at >= run1.started_at, 'completed after start');
  }
});

test('research run mock in-progress (no completed_at) still has valid started_at', () => {
  const run: { started_at: string; completed_at?: string } = {
    started_at: '2024-06-26T16:00:00.000Z',
  };
  const started = Date.parse(run.started_at);
  assert(!isNaN(started), 'started_at parses');
  assert(run.completed_at === undefined, 'in flight has no completed');
});

// Schema accepts any string for date fields (per dateSchema); defensive check that bad data yields NaN downstream (covers sparse/uniform ingest case)
test('companySchema accepts bad date string for last_synced_at (loose); Date.parse yields NaN (defensive freshness guard)', () => {
  const p = companySchema.parse({
    ...base,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_synced_at: 'not-a-date',
  }) as Company;
  assert(p.last_synced_at === 'not-a-date', 'string accepted');
  assert(isNaN(Date.parse(p.last_synced_at as string)), 'bad date string not usable as date');
});

// All three freshness fields roundtrip through schema for a uniform mock (sparse-data coverage)
test('all freshness timestamp fields present and strings after parse on minimal recent company', () => {
  const input = {
    ...base,
    created_at: '2024-05-01T00:00:00.000Z',
    updated_at: '2024-06-26T17:00:00.000Z',
    last_synced_at: '2024-06-26T17:30:00.000Z',
  };
  const p = companySchema.parse(input) as Company;
  assert(typeof p.created_at === 'string', 'created string');
  assert(typeof p.updated_at === 'string', 'updated string');
  assert(typeof p.last_synced_at === 'string', 'last_synced string');
  assert(p.last_synced_at.includes('2024-06-26'), 'last_synced recent day');
});

// ---- Summary -----------------------------------------------------------

const total = passed + failed;
console.log(`\n${total} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
