/**
 * Smoke eval: pure ResearchViewer run-status header Badge ariaLabel presentation.
 * Production SoT: getResearchRunHeaderBadgeModel({ startedAt, completedAt, now? })
 * from src/lib/get-research-run-header-badge-model.ts (injectable now for determinism).
 *
 * Contract under test for ariaLabel:
 * (1) mode none when startedAt missing/invalid: ariaLabel null
 * (2) mode live when started valid and completedAt missing/invalid: ariaLabel exactly
 *     'Research status: live'
 * (3) mode completed when started and completed both valid: ariaLabel equals
 *     `Research status: completed, ${primaryLabel}` where primaryLabel equals
 *     formatRelativeResearchedLabel(completedAt, now) (production import; no day tables),
 *     and when durationSeconds is non-null append `, duration ${durationSeconds}s`
 * (4) completed before started => durationSeconds null so ariaLabel has no duration
 *     phrase but still completed framing with researched primaryLabel
 * (5) never throws on garbage startedAt/completedAt/now => ariaLabel null|string safely
 * (6) assert via production helper import only (no hand-mirrored researched day tables,
 *     no React/DOM render of ResearchViewer, no class strings, no full primaryLabel/title
 *     re-lock beyond what is needed to verify aria composition)
 * (7) Date | string accepted for timestamps; now Date | number when needed
 *
 * Distinct from eval:research-viewer-run-badge-state-smoke (primaryLabel/title/duration;
 * only type-checks ariaLabel) and eval:research-run-relative-freshness-smoke
 * (researched * wording only).
 *
 * Hermetic: zero I/O, no DB/network/.env, no React/DOM. Never evaluates systemPrompt getters.
 *
 * Run: npm run eval:research-viewer-run-status-aria-smoke
 */

import { formatRelativeResearchedLabel } from '@/lib/format-relative-researched-label';
import { getResearchRunHeaderBadgeModel } from '@/lib/get-research-run-header-badge-model';

// Fixed injectable now (no wall-clock Date.now() in assertions).
const NOW_MS = Date.parse('2024-06-26T12:00:00.000Z');
const NOW = new Date(NOW_MS);

const STARTED_ISO = '2024-06-26T10:00:00.000Z';
const COMPLETED_ISO = '2024-06-26T10:05:30.000Z'; // 330s after started
const COMPLETED_BEFORE_STARTED_ISO = '2024-06-26T09:00:00.000Z';

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

// ---- Tests -------------------------------------------------------------

console.log('\nresearch-viewer-run-status-aria eval: smoke\n');

test('ariaLabel null when startedAt missing (mode none)', () => {
  const model = getResearchRunHeaderBadgeModel({ now: NOW_MS });
  assert(model.mode === 'none', `expected mode none, got ${model.mode}`);
  assert(model.ariaLabel === null, `expected ariaLabel null, got ${model.ariaLabel}`);
});

test('ariaLabel null when startedAt invalid string (mode none)', () => {
  const model = getResearchRunHeaderBadgeModel({
    startedAt: 'not-a-date',
    completedAt: COMPLETED_ISO,
    now: NOW_MS,
  });
  assert(model.mode === 'none', `expected mode none, got ${model.mode}`);
  assert(model.ariaLabel === null, `expected ariaLabel null, got ${model.ariaLabel}`);
});

test("ariaLabel exactly 'Research status: live' when live", () => {
  const model = getResearchRunHeaderBadgeModel({
    startedAt: STARTED_ISO,
    now: NOW_MS,
  });
  assert(model.mode === 'live', `expected mode live, got ${model.mode}`);
  assert(
    model.ariaLabel === 'Research status: live',
    `expected ariaLabel "Research status: live", got "${model.ariaLabel}"`,
  );
});

test("ariaLabel 'Research status: live' when completedAt invalid", () => {
  const model = getResearchRunHeaderBadgeModel({
    startedAt: STARTED_ISO,
    completedAt: 'garbage',
    now: NOW_MS,
  });
  assert(model.mode === 'live', `expected mode live, got ${model.mode}`);
  assert(
    model.ariaLabel === 'Research status: live',
    `expected ariaLabel "Research status: live", got "${model.ariaLabel}"`,
  );
});

test('completed with duration: ariaLabel composes primaryLabel + duration phrase', () => {
  const model = getResearchRunHeaderBadgeModel({
    startedAt: STARTED_ISO,
    completedAt: COMPLETED_ISO,
    now: NOW_MS,
  });
  const primaryLabel = formatRelativeResearchedLabel(COMPLETED_ISO, NOW_MS);
  const expected = `Research status: completed, ${primaryLabel}, duration 330s`;
  assert(model.mode === 'completed', `expected mode completed, got ${model.mode}`);
  assert(model.durationSeconds === 330, `expected durationSeconds 330, got ${model.durationSeconds}`);
  assert(
    model.ariaLabel === expected,
    `expected ariaLabel "${expected}", got "${model.ariaLabel}"`,
  );
});

test('completed before started: completed framing, no duration phrase', () => {
  const model = getResearchRunHeaderBadgeModel({
    startedAt: STARTED_ISO,
    completedAt: COMPLETED_BEFORE_STARTED_ISO,
    now: NOW_MS,
  });
  const primaryLabel = formatRelativeResearchedLabel(COMPLETED_BEFORE_STARTED_ISO, NOW_MS);
  const expected = `Research status: completed, ${primaryLabel}`;
  assert(model.mode === 'completed', `expected mode completed, got ${model.mode}`);
  assert(model.durationSeconds === null, `expected durationSeconds null, got ${model.durationSeconds}`);
  assert(
    model.ariaLabel === expected,
    `expected ariaLabel "${expected}", got "${model.ariaLabel}"`,
  );
  assert(
    model.ariaLabel !== null && !model.ariaLabel.includes('duration'),
    `ariaLabel must not include duration phrase: "${model.ariaLabel}"`,
  );
});

test('Date instances accepted for timestamps and now (aria composition)', () => {
  const started = new Date(STARTED_ISO);
  const completed = new Date(COMPLETED_ISO);
  const model = getResearchRunHeaderBadgeModel({
    startedAt: started,
    completedAt: completed,
    now: NOW,
  });
  const primaryLabel = formatRelativeResearchedLabel(completed, NOW);
  const expected = `Research status: completed, ${primaryLabel}, duration 330s`;
  assert(model.mode === 'completed', `expected mode completed, got ${model.mode}`);
  assert(
    model.ariaLabel === expected,
    `expected ariaLabel "${expected}", got "${model.ariaLabel}"`,
  );
});

test('never throws on garbage startedAt/completedAt/now; ariaLabel null|string', () => {
  const cases: Array<{
    startedAt?: string | Date | null;
    completedAt?: string | Date | null;
    now?: Date | number;
  }> = [
    {},
    { startedAt: null, completedAt: null },
    { startedAt: '', completedAt: '' },
    { startedAt: '@@@', completedAt: '@@@' },
    { startedAt: new Date(Number.NaN), completedAt: new Date(Number.NaN) },
    { startedAt: STARTED_ISO, completedAt: COMPLETED_ISO, now: Number.NaN },
    { startedAt: STARTED_ISO, completedAt: COMPLETED_ISO, now: new Date(Number.NaN) },
    { startedAt: STARTED_ISO, completedAt: COMPLETED_ISO, now: Number.POSITIVE_INFINITY },
    { startedAt: 'not-a-date', completedAt: COMPLETED_ISO },
    { startedAt: STARTED_ISO, completedAt: 'not-a-date' },
    {
      startedAt: new Date('1900-01-01T00:00:00.000Z'),
      completedAt: new Date('9999-12-31T23:59:59.999Z'),
      now: NOW_MS,
    },
  ];

  for (const input of cases) {
    let model: ReturnType<typeof getResearchRunHeaderBadgeModel> | undefined;
    try {
      model = getResearchRunHeaderBadgeModel(input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`threw on input ${JSON.stringify(input)}: ${msg}`);
    }
    assert(
      model.ariaLabel === null || typeof model.ariaLabel === 'string',
      'ariaLabel must be null or string',
    );
  }
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
