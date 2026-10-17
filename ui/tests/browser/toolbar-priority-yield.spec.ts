import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// `visibility="yield-to-priority-row"` hides a trailing sibling exactly while
// the Toolbar's trailing-priority row is active, from the same container query
// as the row itself: at a 704px content width (a 720px viewport with the
// default insets) the search takes its own row and Settings yields, so the
// bar is two rows, never three; one pixel wider, nothing moves.
const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/toolbar-priority-yield.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function openFixture(page: Page, width: number) {
  const bundle = await fixtureBundle;
  await page.setViewportSize({ width, height: 600 });
  await page.setContent(
    '<!doctype html><html><body style="margin:0"><div class="kui-app-root" data-fixture-root></div></body></html>',
  );
  await page.addStyleTag({
    content: bundle.outputFiles
      .find((file) => file.path.endsWith('.css'))!
      .text.replace(
        /remify\(([\d.]+)px\)/g,
        (_, pixels: string) => `${Number(pixels) / 16}rem`,
      ),
  });
  await page.addScriptTag({
    content: bundle.outputFiles.find((file) => file.path.endsWith('.js'))!.text,
  });
}

/** Distinct row tops of the toolbar's visible zones' children. */
async function rows(page: Page) {
  return page.evaluate(() => {
    const tops = new Set<number>();
    for (const element of document.querySelectorAll<HTMLElement>(
      '.kui-toolbar > * > *',
    )) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) tops.add(Math.round(rect.top));
    }
    return tops.size;
  });
}

const contentWidth = (page: Page) =>
  page.locator('.kui-toolbar').evaluate((toolbar) => {
    const style = window.getComputedStyle(toolbar);
    return (
      toolbar.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight)
    );
  });

test('a yielding sibling hides exactly while the trailing-priority row is active', async ({
  page,
}) => {
  await openFixture(page, 720);
  expect(await contentWidth(page)).toBe(704);
  const settings = page.locator('[data-settings]');
  // Collapsed, nothing yields.
  await expect(settings).toBeVisible();
  await page.getByRole('button', { name: 'Open search' }).click();
  await expect(
    page.locator('.kui-toolbar-control-group[data-content="search"]'),
  ).toHaveAttribute('data-expanded', 'true');
  await expect(settings).toBeHidden();
  expect(await rows(page)).toBe(2);
});

test('one pixel past the compact width the row stays off and nothing yields', async ({
  page,
}) => {
  await openFixture(page, 721);
  expect(await contentWidth(page)).toBe(705);
  await page.getByRole('button', { name: 'Open search' }).click();
  await expect(page.locator('[data-settings]')).toBeVisible();
  await page.waitForTimeout(400);
  expect(await rows(page)).toBe(1);
});
