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
 * A name is broken when it is clipped *and* crushed narrow. Neither test works
 * alone: a 3-character name legitimately renders at 26px without clipping, and
 * a 53-character name legitimately truncates at full card width.
 */
const NAME_MIN_VISIBLE_PX = 120;

export async function companyNamesLegible(page: Page): Promise<Failure[]> {
  const bad = await page.evaluate(([cardSel, minVisible]: [string, number]) => {
    return [...document.querySelectorAll(cardSel)]
      .map(card => {
        const name = (card.getAttribute('aria-label') || '').replace('View details for ', '');
        // The name may live on the link itself or on a descendant, depending on
        // whether the whole card or just the title is the anchor.
        const el = [card as HTMLElement, ...card.querySelectorAll<HTMLElement>('*')].find(
          n => n.textContent?.trim() === name && n.children.length === 0,
        );
        if (!el) return { name, width: 0, clipped: true };
        return {
          name,
          width: Math.round(el.getBoundingClientRect().width),
          clipped: el.scrollWidth > el.clientWidth + 1,
        };
      })
      .filter(r => r.clipped && r.width < minVisible);
  }, [CARD, NAME_MIN_VISIBLE_PX] as [string, number]);

  return bad.slice(0, 5).map(b => ({
    rule: 'company-name-legible',
    detail: `"${b.name}" is crushed to ${b.width}px and clipped (min ${NAME_MIN_VISIBLE_PX}px before truncation is acceptable)`,
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

/**
 * Interactive elements must not nest. A button inside an anchor is invalid
 * markup and the inner control is unreachable by keyboard.
 */
export async function noNestedInteractive(page: Page): Promise<Failure[]> {
  const found = await page.evaluate(() =>
    [...document.querySelectorAll('a a, a button, button a, button button')]
      .slice(0, 3)
      .map(el => `<${el.tagName.toLowerCase()}> inside <${el.parentElement?.closest('a,button')?.tagName.toLowerCase()}>`),
  );
  return found.map(detail => ({ rule: 'no-nested-interactive', detail }));
}

/**
 * The page must always be showing something. Measured structurally rather than
 * by text length, because a skeleton is a legitimate loading state and renders
 * no text at all.
 */
export async function pageNotBlank(page: Page, minElements = 20): Promise<Failure[]> {
  const painted = await page.evaluate(() => {
    const main = document.querySelector('main') ?? document.body;
    return [...main.querySelectorAll('*')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 8 && r.height > 8;
    }).length;
  });
  return painted < minElements
    ? [{ rule: 'page-not-blank', detail: `only ${painted} painted elements in main (min ${minElements})` }]
    : [];
}
