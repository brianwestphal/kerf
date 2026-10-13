import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-ET0EX8 scroll clearance: chrome laid over a scroll owner's block edge
// publishes `--kui-scroll-clearance-block-start/end`; a List or Pane that opts
// in with `scrollClearance` adds it inside its own scroll area, so content
// passes visibly beneath translucent chrome while the first and last items
// (and anything scrolled into view) still come to rest clear of it.

const fixtureBundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/scroll-clearance.tsx')],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

const css = ['foundation', 'layout', 'list', 'pane', 'text']
  .map((name) =>
    readFileSync(
      resolve(import.meta.dirname, `../../dist/styles/${name}.css`),
      'utf8',
    ),
  )
  .join('\n');

async function mountFixture(page: Page): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  )!;
  await page.setViewportSize({ width: 800, height: 1600 });
  await page.setContent('<body style="margin:0"><div data-app></div></body>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript.text });
  await expect(page.locator('[data-region="pane-both"]')).toBeVisible();
}

/** The region's scroller, overlays, first/last rows, and scroll state. */
async function regionGeometry(
  page: Page,
  name: string,
  scroll?: 'start' | 'middle' | 'end',
) {
  return page
    .locator(`[data-region="${name}"]`)
    .evaluate((region, position) => {
      const scroller = region.querySelector<HTMLElement>(
        '.kui-list, .kui-pane__content',
      )!;
      const max = scroller.scrollHeight - scroller.clientHeight;
      if (position === 'start') scroller.scrollTop = 0;
      if (position === 'middle') scroller.scrollTop = max / 2;
      if (position === 'end') scroller.scrollTop = max;
      const rect = (node: Element) => node.getBoundingClientRect();
      const rows = [...scroller.children];
      const header = rect(region.querySelector('[data-overlay="header"]')!);
      const footer = rect(region.querySelector('[data-overlay="footer"]')!);
      const style = globalThis.getComputedStyle(scroller);
      return {
        scroller: rect(scroller),
        header: { top: header.top, bottom: header.bottom },
        footer: { top: footer.top, bottom: footer.bottom },
        first: rect(rows[0]!).top,
        last: rect(rows.at(-1)!).bottom,
        beneathHeader: rows.filter(
          (row) =>
            rect(row).top < header.bottom && rect(row).bottom > header.top,
        ).length,
        beneathFooter: rows.filter(
          (row) =>
            rect(row).bottom > footer.top && rect(row).top < footer.bottom,
        ).length,
        scrollPaddingTop: style.scrollPaddingTop,
        scrollPaddingBottom: style.scrollPaddingBottom,
      };
    }, scroll);
}

test.beforeEach(async ({ page }) => {
  await mountFixture(page);
});

for (const name of ['list-both', 'pane-both']) {
  test(`${name}: content scrolls beneath both overlays and its ends rest clear of them`, async ({
    page,
  }) => {
    // The scroller fills the region, reaching beneath both overlays.
    const start = await regionGeometry(page, name, 'start');
    expect(Math.round(start.scroller.top)).toBe(Math.round(start.header.top));
    expect(Math.round(start.scroller.bottom)).toBe(
      Math.round(start.footer.bottom),
    );
    expect(start.scrollPaddingTop).toBe('48px');
    expect(start.scrollPaddingBottom).toBe('64px');
    // At the start, the first row rests below the header overlay.
    expect(Math.round(start.first)).toBe(Math.round(start.header.bottom));

    // Mid-scroll, rows pass visibly beneath both overlays.
    const middle = await regionGeometry(page, name, 'middle');
    expect(middle.beneathHeader).toBeGreaterThan(0);
    expect(middle.beneathFooter).toBeGreaterThan(0);

    // At the end, the last row rests above the footer overlay.
    const end = await regionGeometry(page, name, 'end');
    expect(Math.round(end.last)).toBe(Math.round(end.footer.top));
  });

  test(`${name}: scrollIntoView respects the clearance`, async ({ page }) => {
    const scroller = page.locator(
      `[data-region="${name}"] :is(.kui-list, .kui-pane__content)`,
    );
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.firstElementChild!.scrollIntoView({ block: 'start' });
    });
    const revealedFirst = await regionGeometry(page, name);
    expect(revealedFirst.first).toBeGreaterThanOrEqual(
      revealedFirst.header.bottom - 0.5,
    );
    await scroller.evaluate((element) => {
      element.scrollTop = 0;
      element.lastElementChild!.scrollIntoView({ block: 'end' });
    });
    const revealedLast = await regionGeometry(page, name);
    expect(revealedLast.last).toBeLessThanOrEqual(
      revealedLast.footer.top + 0.5,
    );
  });
}

test('a List clears only the edges it opts into', async ({ page }) => {
  const start = await regionGeometry(page, 'list-start', 'start');
  expect(Math.round(start.first)).toBe(Math.round(start.header.bottom));
  expect(start.scrollPaddingBottom).toBe('0px');
  const end = await regionGeometry(page, 'list-start', 'end');
  // No block-end clearance: the last row ends at the scroller's own end,
  // beneath the footer overlay.
  expect(Math.round(end.last)).toBe(Math.round(end.scroller.bottom));
});

test('a List without scrollClearance ignores the published context', async ({
  page,
}) => {
  const start = await regionGeometry(page, 'list-none', 'start');
  expect(Math.round(start.first)).toBe(Math.round(start.scroller.top));
  expect(start.scrollPaddingTop).toBe('auto');
  const end = await regionGeometry(page, 'list-none', 'end');
  expect(Math.round(end.last)).toBe(Math.round(end.scroller.bottom));
});
