/**
 * Smoke eval: pure relative freshness labels for company preview badges.
 * Production SoT: formatRelativeSyncedLabel(lastSyncedAt, now?) from
 * src/lib/format-relative-synced-label.ts (injectable now for determinism).
 *
 * Contract:
 * (1) days < 1 (including future/clock-skew via Math.max(0, now-synced))
 *     => 'synced today'
 * (2) 1..29 days => 'synced Nd ago'
 * (3) 30..364 days => 'synced Nmo ago' with months = max(1, floor(days/30))
 * (4) >=365 days => 'synced Ny ago' with years = max(1, floor(days/365))
 * (5) unparseable lastSyncedAt => slice(0,10) when length >= 10 else original
 * (6) invalid now (NaN Date/number) => same fallback
 * (7) never throws on empty string, garbage, or extreme values
 * (8) Date | number accepted for now
 *
 * Hermetic: zero I/O, no DB/network/.env, no React/DOM. Asserts exact label
 * strings against production helper only. Never evaluates systemPrompt getters.
 *
 * Run: npm run eval:relative-freshness-label-smoke
 */

import { formatRelativeSyncedLabel } from '@/lib/format-relative-synced-label';

// Fixed injectable now (no wall-clock Date.now() in assertions).
const NOW_MS = Date.parse('2024-06-26T12:00:00.000Z');
const DAY_MS = 86_400_000;

function isoDaysAgo(days: number): string {
  return new Date(NOW_MS - days * DAY_MS).toISOString();
}

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

function assertLabel(
  lastSyncedAt: string,
  expected: string,
  now: Date | number = NOW_MS,
): void {
  const actual = formatRelativeSyncedLabel(lastSyncedAt, now);
  assert(
    actual === expected,
    `expected "${expected}" for "${lastSyncedAt}", got "${actual}"`,
  );
}

// ---- Tests -------------------------------------------------------------

console.log('\nrelative-freshness-label eval: smoke\n');

test('same-day ISO => synced today', () => {
  assertLabel('2024-06-26T08:00:00.000Z', 'synced today');
});

test('3d ago => synced 3d ago', () => {
  assertLabel(isoDaysAgo(3), 'synced 3d ago');
});

test('45d ago (~1mo) => synced 1mo ago', () => {
  assertLabel(isoDaysAgo(45), 'synced 1mo ago');
});

test('400d ago (~1y) => synced 1y ago', () => {
  assertLabel(isoDaysAgo(400), 'synced 1y ago');
});

test('future timestamp (clock skew) treated as today', () => {
  assertLabel('2024-06-27T12:00:00.000Z', 'synced today');
});

test("invalid 'not-a-date' falls back to slice(0,10)", () => {
  // length === 10 => slice is the whole string
  assertLabel('not-a-date', 'not-a-date');
});

test('short invalid string falls back to original', () => {
  assertLabel('bad', 'bad');
});

test('Date object accepted for now (same-day)', () => {
  assertLabel(
    '2024-06-26T01:00:00.000Z',
    'synced today',
    new Date(NOW_MS),
  );
});

test('invalid now (NaN number) uses same fallback as unparseable', () => {
  assertLabel('2024-01-15T00:00:00.000Z', '2024-01-15', Number.NaN);
});

test('never throws on empty string, garbage, or extreme values', () => {
  const inputs: Array<{ last: string; now?: Date | number }> = [
    { last: '' },
    { last: '@@@' },
    { last: 'not-a-date-at-all' },
    { last: isoDaysAgo(0) },
    { last: isoDaysAgo(10_000) },
    { last: '2024-06-26T12:00:00.000Z', now: new Date(Number.NaN) },
    { last: '2024-06-26T12:00:00.000Z', now: Number.POSITIVE_INFINITY },
  ];
  for (const { last, now } of inputs) {
    let result: string | undefined;
    try {
      result =
        now === undefined
          ? formatRelativeSyncedLabel(last, NOW_MS)
          : formatRelativeSyncedLabel(last, now);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`threw on last="${last}": ${msg}`);
    }
    assert(typeof result === 'string', `expected string for last="${last}"`);
  }
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
