/**
 * Smoke eval: pure relative freshness labels for research run completedAt badges.
 * Production SoT: formatRelativeResearchedLabel(completedAt, now?) from
 * src/lib/format-relative-researched-label.ts (injectable now for determinism).
 *
 * Contract:
 * (1) days < 1 (including future/clock-skew via Math.max(0, now-completed))
 *     => 'researched today'
 * (2) 1..29 days => 'researched Nd ago'
 * (3) 30..364 days => 'researched Nmo ago' with months = max(1, floor(days/30))
 * (4) >=365 days => 'researched Ny ago' with years = max(1, floor(days/365))
 * (5) unparseable string completedAt => ISO date slice YYYY-MM-DD when
 *     length >= 10 else original / empty-safe fallback per production
 * (6) invalid Date completedAt (NaN) => empty string
 * (7) invalid now (NaN Date/number) => same fallback as production
 * (8) never throws on empty string, garbage, Date instance, extreme values
 * (9) Date | number accepted for now
 * (10) assert via production helper import only (no hand-mirrored day tables,
 *      no React/DOM render of ResearchViewer, no class strings)
 *
 * Distinct from formatRelativeSyncedLabel / eval:relative-freshness-label-smoke
 * (synced * company preview contract must stay green).
 *
 * Hermetic: zero I/O, no DB/network/.env, no React/DOM. Asserts exact label
 * strings against production helper only. Never evaluates systemPrompt getters.
 *
 * Run: npm run eval:research-run-relative-freshness-smoke
 */

import { formatRelativeResearchedLabel } from '@/lib/format-relative-researched-label';

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
  completedAt: string | Date,
  expected: string,
  now: Date | number = NOW_MS,
): void {
  const actual = formatRelativeResearchedLabel(completedAt, now);
  assert(
    actual === expected,
    `expected "${expected}" for ${String(completedAt)}, got "${actual}"`,
  );
}

// ---- Tests -------------------------------------------------------------

console.log('\nresearch-run-relative-freshness eval: smoke\n');

test('same-day ISO => researched today', () => {
  assertLabel('2024-06-26T08:00:00.000Z', 'researched today');
});

test('3d ago => researched 3d ago', () => {
  assertLabel(isoDaysAgo(3), 'researched 3d ago');
});

test('45d ago (~1mo) => researched 1mo ago', () => {
  assertLabel(isoDaysAgo(45), 'researched 1mo ago');
});

test('400d ago (~1y) => researched 1y ago', () => {
  assertLabel(isoDaysAgo(400), 'researched 1y ago');
});

test('future timestamp (clock skew) treated as today', () => {
  assertLabel('2024-06-27T12:00:00.000Z', 'researched today');
});

test("invalid 'not-a-date' falls back to slice(0,10)", () => {
  // length === 10 => slice is the whole string
  assertLabel('not-a-date', 'not-a-date');
});

test('short invalid string falls back to original', () => {
  assertLabel('bad', 'bad');
});

test('invalid Date completedAt (NaN) => empty string', () => {
  assertLabel(new Date(Number.NaN), '');
});

test('Date completedAt accepted (same-day)', () => {
  assertLabel(new Date('2024-06-26T08:00:00.000Z'), 'researched today');
});

test('Date object accepted for now (same-day)', () => {
  assertLabel(
    '2024-06-26T01:00:00.000Z',
    'researched today',
    new Date(NOW_MS),
  );
});

test('invalid now (NaN number) uses same fallback as production', () => {
  assertLabel('2024-01-15T00:00:00.000Z', '2024-01-15', Number.NaN);
});

test('never throws on empty string, garbage, Date instance, or extreme values', () => {
  const inputs: Array<{ completed: string | Date; now?: Date | number }> = [
    { completed: '' },
    { completed: '@@@' },
    { completed: 'not-a-date-at-all' },
    { completed: isoDaysAgo(0) },
    { completed: isoDaysAgo(10_000) },
    { completed: new Date(Number.NaN) },
    { completed: new Date(NOW_MS - 5 * DAY_MS) },
    { completed: '2024-06-26T12:00:00.000Z', now: new Date(Number.NaN) },
    { completed: '2024-06-26T12:00:00.000Z', now: Number.POSITIVE_INFINITY },
  ];
  for (const { completed, now } of inputs) {
    let result: string | undefined;
    try {
      result =
        now === undefined
          ? formatRelativeResearchedLabel(completed, NOW_MS)
          : formatRelativeResearchedLabel(completed, now);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`threw on completed=${String(completed)}: ${msg}`);
    }
    assert(
      typeof result === 'string',
      `expected string for completed=${String(completed)}`,
    );
  }
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
