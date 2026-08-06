import type { Page } from 'playwright';
import {
  companyNamesLegible,
  firstResultAboveFold,
  hasResults,
  noEmptyResultSections,
  noHorizontalOverflow,
  noNestedInteractive,
  pageNotBlank,
  type Failure,
} from './assertions';

export interface Scenario {
  name: string;
  path: string;
  /** Typed into the search input, then the run waits for results to settle. */
  query?: string;
  viewport?: { width: number; height: number };
  check: (page: Page) => Promise<Failure[]>;
  /**
   * Runs instead of the standard type-and-settle flow, for scenarios that need
   * to observe intermediate frames rather than the resting state.
   */
  drive?: (page: Page) => Promise<Failure[]>;
}

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const SEARCH_INPUT = 'input[type="text"]';

async function all(page: Page, checks: ((p: Page) => Promise<Failure[]>)[]): Promise<Failure[]> {
  const results = await Promise.all(checks.map(c => c(page)));
  return results.flat();
}

export const scenarios: Scenario[] = [
  {
    name: 'browse: desktop',
    path: '/',
    viewport: DESKTOP,
    check: p =>
      all(p, [noHorizontalOverflow, companyNamesLegible, noNestedInteractive, hasResults, pageNotBlank]),
  },
  {
    name: 'browse: mobile',
    path: '/',
    viewport: MOBILE,
    check: p => all(p, [noHorizontalOverflow, companyNamesLegible, hasResults]),
  },
  {
    name: 'search: semantic query',
    path: '/',
    query: 'ai agents',
    viewport: DESKTOP,
    check: p =>
      all(p, [
        noHorizontalOverflow,
        companyNamesLegible,
        noNestedInteractive,
        noEmptyResultSections,
        firstResultAboveFold,
        hasResults,
      ]),
  },
  {
    name: 'search: filter-only query',
    path: '/',
    query: 'W24 hiring',
    viewport: DESKTOP,
    check: p =>
      all(p, [noHorizontalOverflow, companyNamesLegible, noEmptyResultSections, firstResultAboveFold]),
  },
  {
    name: 'search: name query',
    path: '/',
    query: 'stripe',
    viewport: DESKTOP,
    check: p => all(p, [noEmptyResultSections, firstResultAboveFold, hasResults]),
  },
  {
    name: 'search: mobile',
    path: '/',
    query: 'healthcare',
    viewport: MOBILE,
    check: p => all(p, [noHorizontalOverflow, companyNamesLegible, noEmptyResultSections]),
  },
  {
    // The regression that mattered most: typing one character used to unmount
    // the browse grid ~300ms before anything replaced it, leaving the page
    // empty. Sampling only the resting state cannot see it.
    name: 'search: no blank frame while typing',
    path: '/',
    viewport: DESKTOP,
    check: async () => [],
    drive: async page => {
      await page.locator(SEARCH_INPUT).first().click();
      await page.locator(SEARCH_INPUT).first().type('ai agents', { delay: 15 });

      for (let elapsed = 0; elapsed <= 1200; elapsed += 100) {
        const [blank] = await pageNotBlank(page);
        if (blank) {
          return [
            {
              rule: 'no-blank-frame',
              detail: `${blank.detail} at ~${elapsed}ms after the first keystroke`,
            },
          ];
        }
        await page.waitForTimeout(100);
      }
      return [];
    },
  },
  {
    name: 'search: restored from the URL',
    path: '/?q=payments+infrastructure',
    viewport: DESKTOP,
    check: async page => {
      const value = await page.locator(SEARCH_INPUT).first().inputValue();
      const failures =
        value === 'payments infrastructure'
          ? []
          : [{ rule: 'query-restored-from-url', detail: `input holds "${value}"` }];
      return [...failures, ...(await hasResults(page))];
    },
  },
];
