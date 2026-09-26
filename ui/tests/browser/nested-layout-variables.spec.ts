import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-NB804H: List, Row, and Grid pass `gap` and `flex` through private custom
// properties. Custom properties inherit, so a nested instance that omitted a
// prop used to pick up its ancestor's value (a heading List inside a 24px form
// List got a 24px gap). Each instance now resets its private values.

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/nested-layout-variables.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function mountFixture(page: Page): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Nested fixture emitted no JS/CSS');
  await page.setContent(
    '<!doctype html><html><body><div data-nested-host></div></body></html>',
  );
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
  await expect(page.locator('[data-case="list-inner"]')).toBeVisible();
}

async function layout(page: Page, name: string) {
  return page.locator(`[data-case="${name}"]`).evaluate((element) => {
    const style = globalThis.getComputedStyle(element);
    const cells = [...element.querySelectorAll(':scope > [data-cell]')].map(
      (cell) => cell.getBoundingClientRect(),
    );
    const [first, second] = cells;
    return {
      flex: style.flex,
      rowGap: style.rowGap,
      columnGap: style.columnGap,
      blockSpacing: first && second ? second.top - first.bottom : null,
      inlineSpacing: first && second ? second.left - first.right : null,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 700 });
  await mountFixture(page);
});

test('a nested List without gap or flex keeps its own defaults', async ({
  page,
}) => {
  const outer = await layout(page, 'list-outer');
  expect(outer.rowGap).toBe('24px');
  expect(outer.flex).toBe('1 1 auto');

  const inner = await layout(page, 'list-inner');
  expect(inner.rowGap).toBe('0px');
  expect(inner.blockSpacing).toBe(0);
  expect(inner.flex).toBe('0 1 auto');
});

test('a nested Row without gap or flex keeps its own defaults', async ({
  page,
}) => {
  const outer = await layout(page, 'row-outer');
  expect(outer.columnGap).toBe('24px');
  expect(outer.flex).toBe('1 1 auto');

  const inner = await layout(page, 'row-inner');
  expect(inner.columnGap).toBe('8px');
  expect(inner.inlineSpacing).toBeCloseTo(8, 1);
  expect(inner.flex).toBe('0 1 auto');
});

test('a nested Grid without gap or flex keeps its own defaults', async ({
  page,
}) => {
  const outer = await layout(page, 'grid-outer');
  expect(outer.columnGap).toBe('24px');
  expect(outer.flex).toBe('1 1 auto');

  const inner = await layout(page, 'grid-inner');
  expect(inner.columnGap).toBe('8px');
  expect(inner.inlineSpacing).toBeCloseTo(8, 1);
  expect(inner.flex).toBe('0 1 auto');
});

test('a List nested through a Row does not inherit the outer List', async ({
  page,
}) => {
  const row = await layout(page, 'row-in-list');
  expect(row.columnGap).toBe('16px');

  const inner = await layout(page, 'list-in-row-inner');
  expect(inner.rowGap).toBe('0px');
  expect(inner.blockSpacing).toBe(0);
  expect(inner.flex).toBe('0 1 auto');
});
