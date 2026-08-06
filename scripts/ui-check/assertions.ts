import type { Page } from 'playwright';

export interface Failure {
  rule: string;
  detail: string;
}

const CARD = 'a[aria-label^="View details for"]';

/**
 * Assertions run in the page and return failures rather than throwing, so one
 * run reports every violation instead of stopping at the first.
 */

export async function noHorizontalOverflow(page: Page): Promise<Failure[]> {
  const over = await page.evaluate(() => {
    const d = document.documentElement;
    return d.scrollWidth > d.clientWidth
      ? { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth }
      : null;
  });
  return over
    ? [{
        rule: 'no-horizontal-overflow',
        detail: `body scrolls horizontally: ${over.scrollWidth}px content in ${over.clientWidth}px viewport`,
      }]
    : [];
}

/**
 * A name is legible when all of it is visible. Absolute width is the wrong
 * test: a 3-character name legitimately renders narrow. Clipping is the defect.
 */
export async function companyNamesLegible(page: Page): Promise<Failure[]> {
  const bad = await page.evaluate(cardSel => {
    return [...document.querySelectorAll(cardSel)]
      .map(card => {
        const name = (card.getAttribute('aria-label') || '').replace('View details for ', '');
        const el = [...card.querySelectorAll<HTMLElement>('*')].find(
          n => n.textContent?.trim() === name && n.children.length === 0,
        );
        if (!el) return { name, width: 0, visible: false };
        return {
          name,
          width: Math.round(el.getBoundingClientRect().width),
          visible: el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().width > 0,
        };
      })
      .filter(r => !r.visible);
  }, CARD);

  return bad.slice(0, 5).map(b => ({
    rule: 'company-name-legible',
    detail: `"${b.name}" is clipped, rendering ${b.width}px of its full width`,
  }));
}

/** No section may announce its own emptiness above the first result. */
export async function noEmptyResultSections(page: Page): Promise<Failure[]> {
  const rows = await page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim() ?? '';
      if (/^No .{1,40} results$/.test(text)) out.push(text);
    }
    return [...new Set(out)];
  });
  return rows.map(text => ({
    rule: 'no-empty-result-sections',
    detail: `section announces absence: "${text}"`,
  }));
}

export async function firstResultAboveFold(page: Page, maxTop = 520): Promise<Failure[]> {
  const top = await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return Math.round(el.getBoundingClientRect().top + window.scrollY);
  }, CARD);

  if (top === null) return [{ rule: 'first-result-above-fold', detail: 'no result cards rendered' }];
  return top > maxTop
    ? [{
        rule: 'first-result-above-fold',
        detail: `first result starts ${top}px down the page (max ${maxTop}px)`,
      }]
    : [];
}

export async function hasResults(page: Page, min = 1): Promise<Failure[]> {
  const n = await page.locator(CARD).count();
  return n < min
    ? [{ rule: 'has-results', detail: `${n} result cards, expected at least ${min}` }]
    : [];
}

/** A page that never blanks: body text must not collapse below a floor. */
export async function bodyNotBlank(page: Page, minChars = 400): Promise<Failure[]> {
  const len = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim().length);
  return len < minChars
    ? [{ rule: 'body-not-blank', detail: `body rendered ${len} chars (min ${minChars})` }]
    : [];
}
