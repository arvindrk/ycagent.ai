/**
 * Smoke eval: pure ResearchViewer run-status header badge presentation model.
 * Production SoT: getResearchRunHeaderBadgeModel({ startedAt, completedAt, now? })
 * from src/lib/get-research-run-header-badge-model.ts (injectable now for determinism).
 *
 * Contract:
 * (1) mode none when startedAt missing/invalid: primaryLabel null, durationSeconds null, title null
 * (2) mode live when started valid and completedAt missing/invalid: primaryLabel exactly
 *     'research live', durationSeconds null, title includes started_at ISO and does NOT
 *     include completed_at or dur:
 * (3) mode completed when started and completed both valid: primaryLabel equals
 *     formatRelativeResearchedLabel(completedAt, now) (production import; no day tables),
 *     durationSeconds = round((completed-started)/1000) when completed >= started else null,
 *     title includes started_at ISO, completed_at ISO, and dur: Ns when duration known
 * (4) completed before started => durationSeconds null but still mode completed with
 *     researched primaryLabel
 * (5) never throws on garbage startedAt/completedAt/now
 * (6) assert via production helper import only (no hand-mirrored researched day tables,
 *     no React/DOM render of ResearchViewer, no class strings)
 * (7) Date | string accepted for timestamps; now Date | number when needed
 *
 * Distinct from eval:research-run-relative-freshness-smoke (researched * wording only)
 * and eval:relative-freshness-label-smoke (synced *).
 *
 * Hermetic: zero I/O, no DB/network/.env, no React/DOM. Never evaluates systemPrompt getters.
 *
 * Run: npm run eval:research-viewer-run-badge-state-smoke
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

console.log('\nresearch-viewer-run-badge-state eval: smoke\n');

test('mode none when startedAt missing', () => {
  const model = getResearchRunHeaderBadgeModel({ now: NOW_MS });
  assert(model.mode === 'none', `expected mode none, got ${model.mode}`);
  assert(model.primaryLabel === null, `expected primaryLabel null, got ${model.primaryLabel}`);
  assert(model.durationSeconds === null, `expected durationSeconds null, got ${model.durationSeconds}`);
  assert(model.title === null, `expected title null, got ${model.title}`);
});

test('mode none when startedAt invalid string', () => {
  const model = getResearchRunHeaderBadgeModel({
    startedAt: 'not-a-date',
    completedAt: COMPLETED_ISO,
    now: NOW_MS,
  });
  assert(model.mode === 'none', `expected mode none, got ${model.mode}`);
  assert(model.primaryLabel === null, 'primaryLabel must be null');
  assert(model.durationSeconds === null, 'durationSeconds must be null');
  assert(model.title === null, 'title must be null');
});

test("mode live: primaryLabel exactly 'research live', duration null, title started only", () => {
  const model = getResearchRunHeaderBadgeModel({
    startedAt: STARTED_ISO,
    now: NOW_MS,
  });
  assert(model.mode === 'live', `expected mode live, got ${model.mode}`);
  assert(
    model.primaryLabel === 'research live',
    `expected primaryLabel "research live", got "${model.primaryLabel}"`,
  );
  assert(model.durationSeconds === null, `expected durationSeconds null, got ${model.durationSeconds}`);
  assert(model.title !== null, 'title must be non-null for live');
  assert(
    model.title.includes(`started_at: ${STARTED_ISO}`),
    `title must include started_at ISO, got "${model.title}"`,
  );
  assert(!model.title.includes('completed_at'), `live title must not include completed_at: "${model.title}"`);
  assert(!model.title.includes('dur:'), `live title must not include dur:: "${model.title}"`);
});

test('mode live when completedAt invalid', () => {
  const model = getResearchRunHeaderBadgeModel({
    startedAt: STARTED_ISO,
    completedAt: 'garbage',
    now: NOW_MS,
  });
  assert(model.mode === 'live', `expected mode live, got ${model.mode}`);
  assert(model.primaryLabel === 'research live', `got primaryLabel "${model.primaryLabel}"`);
  assert(model.durationSeconds === null, 'durationSeconds must be null');
  assert(model.title !== null && !model.title.includes('completed_at'), 'no completed_at in title');
  assert(model.title !== null && !model.title.includes('dur:'), 'no dur: in title');
});

test('mode completed: primaryLabel via formatRelativeResearchedLabel, duration + full title', () => {
  const model = getResearchRunHeaderBadgeModel({
    startedAt: STARTED_ISO,
    completedAt: COMPLETED_ISO,
    now: NOW_MS,
  });
  const expectedLabel = formatRelativeResearchedLabel(COMPLETED_ISO, NOW_MS);
  assert(model.mode === 'completed', `expected mode completed, got ${model.mode}`);
  assert(
    model.primaryLabel === expectedLabel,
    `primaryLabel must equal formatRelativeResearchedLabel: expected "${expectedLabel}", got "${model.primaryLabel}"`,
  );
  assert(model.durationSeconds === 330, `expected durationSeconds 330, got ${model.durationSeconds}`);
  assert(model.title !== null, 'title must be non-null for completed');
  assert(
    model.title.includes(`started_at: ${STARTED_ISO}`),
    `title missing started_at: "${model.title}"`,
  );
  assert(
    model.title.includes(`completed_at: ${COMPLETED_ISO}`),
    `title missing completed_at: "${model.title}"`,
  );
  assert(model.title.includes('dur: 330s'), `title missing dur: 330s: "${model.title}"`);
});

test('completed before started => durationSeconds null, still completed with researched label', () => {
  const model = getResearchRunHeaderBadgeModel({
    startedAt: STARTED_ISO,
    completedAt: COMPLETED_BEFORE_STARTED_ISO,
    now: NOW_MS,
  });
  const expectedLabel = formatRelativeResearchedLabel(COMPLETED_BEFORE_STARTED_ISO, NOW_MS);
  assert(model.mode === 'completed', `expected mode completed, got ${model.mode}`);
  assert(
    model.primaryLabel === expectedLabel,
    `primaryLabel must equal formatRelativeResearchedLabel: expected "${expectedLabel}", got "${model.primaryLabel}"`,
  );
  assert(model.durationSeconds === null, `expected durationSeconds null, got ${model.durationSeconds}`);
  assert(model.title !== null, 'title must be non-null');
  assert(model.title.includes(`started_at: ${STARTED_ISO}`), 'title needs started_at');
  assert(
    model.title.includes(`completed_at: ${COMPLETED_BEFORE_STARTED_ISO}`),
    'title needs completed_at',
  );
  assert(!model.title.includes('dur:'), `title must not include dur: when duration unknown: "${model.title}"`);
});

test('Date instances accepted for timestamps and now', () => {
  const started = new Date(STARTED_ISO);
  const completed = new Date(COMPLETED_ISO);
  const model = getResearchRunHeaderBadgeModel({
    startedAt: started,
    completedAt: completed,
    now: NOW,
  });
  const expectedLabel = formatRelativeResearchedLabel(completed, NOW);
  assert(model.mode === 'completed', `expected mode completed, got ${model.mode}`);
  assert(
    model.primaryLabel === expectedLabel,
    `primaryLabel must match formatRelativeResearchedLabel, got "${model.primaryLabel}"`,
  );
  assert(model.durationSeconds === 330, `expected 330, got ${model.durationSeconds}`);
  assert(model.title !== null && model.title.includes('dur: 330s'), `title: "${model.title}"`);
});

test('never throws on garbage startedAt/completedAt/now', () => {
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
      model.mode === 'none' || model.mode === 'live' || model.mode === 'completed',
      `unexpected mode ${String(model.mode)}`,
    );
    assert(
      model.primaryLabel === null || typeof model.primaryLabel === 'string',
      'primaryLabel must be null or string',
    );
    assert(
      model.durationSeconds === null || typeof model.durationSeconds === 'number',
      'durationSeconds must be null or number',
    );
    assert(model.title === null || typeof model.title === 'string', 'title must be null or string');
    assert(
      model.ariaLabel === null || typeof model.ariaLabel === 'string',
      'ariaLabel must be null or string',
    );
  }
});

// ---- Summary -----------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
