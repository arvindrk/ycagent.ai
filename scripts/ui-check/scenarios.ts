import type { Page } from 'playwright';
import {
  bodyNotBlank,
  companyNamesLegible,
  firstResultAboveFold,
  hasResults,
  noEmptyResultSections,
  noHorizontalOverflow,
  noNestedInteractive,
  type Failure,
} from './assertions';

export interface Scenario {
  name: string;
  path: string;
  /** Typed into the search input, then the run waits for results to settle. */
  query?: string;
  viewport?: { width: number; height: number };
  check: (page: Page) => Promise<Failure[]>;
}

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

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
      all(p, [
        noHorizontalOverflow,
        companyNamesLegible,
        noNestedInteractive,
        hasResults,
        bodyNotBlank,
      ]),
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
];
