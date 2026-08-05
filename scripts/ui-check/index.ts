/**
 * Chrome-driven UI checks. Renders the running app and asserts DOM invariants
 * that lint, typecheck, build and hermetic evals cannot see.
 *
 *   npm run dev
 *   npm run ui-check                    # all scenarios
 *   npm run ui-check -- --only=search   # substring filter
 *   BASE_URL=http://localhost:3001 npm run ui-check
 *
 * Screenshots for every scenario land in .ui-check/ for eyeballing a diff.
 */

import { chromium, type Browser, type Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { scenarios, type Scenario } from './scenarios';
import type { Failure } from './assertions';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const SHOT_DIR = process.env.UI_CHECK_OUT ?? '.ui-check';
const only = process.argv.find(a => a.startsWith('--only='))?.slice('--only='.length);

const SEARCH_INPUT = 'input[type="text"]';
const CARD = 'a[aria-label^="View details for"]';
const SKELETON = '.animate-pulse';

/**
 * Console noise that is an artefact of running locally, not a defect.
 * Keep this list short and specific; anything broader hides real regressions.
 */
const IGNORED_CONSOLE = [
  /PostHog was initialized without a token/,
  // Already reported with its URL by the failed-request check.
  /^Failed to load resource:/,
];

function isRemoteImageProxy(url: string): boolean {
  if (!url.includes('/_next/image')) return false;
  const target = new URL(url).searchParams.get('url') ?? '';
  return /^https?:\/\//.test(target);
}

/**
 * Waiting on a result card is not enough: the browse grid renders the same
 * card selector, so the wait resolves instantly on stale content and the
 * assertions then run against the loading skeleton. Wait for a resting state
 * instead: no skeleton and cards, or a terminal empty/error message.
 */
async function waitForSearchToSettle(page: Page): Promise<void> {
  await page
    .waitForFunction(
      ({ cardSel, skeletonSel }) => {
        const text = document.body.innerText;
        if (/No companies found|unavailable right now/i.test(text)) return true;
        return (
          document.querySelector(skeletonSel) === null &&
          document.querySelectorAll(cardSel).length > 0
        );
      },
      { cardSel: CARD, skeletonSel: SKELETON },
      { timeout: 20_000 },
    )
    .catch(() => undefined);
  await page.waitForTimeout(200);
}

async function runScenario(browser: Browser, scenario: Scenario) {
  const context = await browser.newContext({
    viewport: scenario.viewport ?? { width: 1440, height: 900 },
  });
  const page: Page = await context.newPage();
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', m => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (IGNORED_CONSOLE.some(p => p.test(text))) return;
    consoleErrors.push(text.slice(0, 160));
  });
  page.on('pageerror', e => consoleErrors.push(String(e).slice(0, 160)));
  page.on('response', r => {
    if (r.status() < 400 || !r.url().startsWith(BASE_URL)) return;
    // The image proxy faithfully reports upstream rot (~2.5% of YC's S3 objects
    // are gone) and the logo component falls back. Only count it when the
    // proxied target is our own origin, which means we built a bad URL.
    if (isRemoteImageProxy(r.url())) return;
    failedRequests.push(`${r.status()} ${r.url().replace(BASE_URL, '').slice(0, 90)}`);
  });

  try {
    await page.goto(BASE_URL + scenario.path, { waitUntil: 'networkidle', timeout: 60_000 });

    if (scenario.drive) {
      const driven = await scenario.drive(page);
      const slug = scenario.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      await page.screenshot({ path: path.join(SHOT_DIR, `${slug}.png`), fullPage: true });
      return driven;
    }

    if (scenario.query) {
      await page.locator(SEARCH_INPUT).first().click();
      await page.locator(SEARCH_INPUT).first().type(scenario.query, { delay: 15 });
      await waitForSearchToSettle(page);
    }

    const failures = await scenario.check(page);

    for (const url of [...new Set(failedRequests)].slice(0, 5)) {
      failures.push({ rule: 'no-failed-requests', detail: url });
    }
    for (const err of [...new Set(consoleErrors)].slice(0, 5)) {
      failures.push({ rule: 'no-console-errors', detail: err });
    }

    const slug = scenario.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    await page.screenshot({ path: path.join(SHOT_DIR, `${slug}.png`), fullPage: true });

    return failures;
  } catch (error) {
    return [{ rule: 'scenario-error', detail: error instanceof Error ? error.message : String(error) }];
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const selected = only ? scenarios.filter(s => s.name.includes(only)) : scenarios;
  if (selected.length === 0) {
    console.error(`No scenario matches --only=${only}`);
    process.exit(1);
  }

  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const probe = await fetch(BASE_URL).catch(() => null);
  if (!probe?.ok) {
    console.error(`\n  ui-check: no app at ${BASE_URL}. Start it with \`npm run dev\`.\n`);
    process.exit(1);
  }

  console.log(`\nui-check against ${BASE_URL}\n`);
  const browser = await chromium.launch({ channel: 'chrome' });
  const report: { scenario: string; failures: Failure[] }[] = [];

  for (const scenario of selected) {
    const failures = await runScenario(browser, scenario);
    report.push({ scenario: scenario.name, failures });
    if (failures.length === 0) {
      console.log(`  pass  ${scenario.name}`);
    } else {
      console.log(`  FAIL  ${scenario.name}`);
      for (const f of failures) console.log(`          ${f.rule}: ${f.detail}`);
    }
  }

  await browser.close();

  const total = report.reduce((n, r) => n + r.failures.length, 0);
  const failedScenarios = report.filter(r => r.failures.length > 0).length;
  console.log(
    `\n  ${selected.length - failedScenarios}/${selected.length} scenarios passed` +
      `${total > 0 ? `, ${total} violations` : ''}\n  screenshots: ${SHOT_DIR}/\n`,
  );

  if (total > 0) process.exit(1);
}

void main();
