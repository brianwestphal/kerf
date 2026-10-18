import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// A wrapped Toolbar in a filling List keeps its whole natural height beside a
// flex scroller, however long the scrolling page is: its explicit one-band
// minimum must not let the column shrink it onto its second row.
const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/toolbar-wrap-flex-shell.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function measure(page: Page, long: boolean) {
  const bundle = await fixtureBundle;
  await page.setViewportSize({ width: 390, height: 844 });
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
  await page.addScriptTag({ content: `globalThis.kuiFixtureLong = ${long};` });
  await page.addScriptTag({
    content: bundle.outputFiles.find((file) => file.path.endsWith('.js'))!.text,
  });
  return page.locator('.kui-toolbar').evaluate((toolbar) => {
    const box = toolbar.getBoundingClientRect();
    const trailing = toolbar
      .querySelector('.kui-toolbar__trailing')!
      .getBoundingClientRect();
    const leading = toolbar
      .querySelector('.kui-toolbar__leading')!
      .getBoundingClientRect();
    return {
      height: box.height,
      overflow: toolbar.scrollHeight - toolbar.clientHeight,
      wrapped: trailing.top >= leading.bottom - 1,
      trailingInside: trailing.bottom <= box.bottom + 0.5,
    };
  });
}

test('a wrapped toolbar keeps its natural height beside a long scroller', async ({
  page,
}) => {
  const short = await measure(page, false);
  const long = await measure(page, true);
  // At 390px the identity and the back link take two rows.
  expect(short.wrapped).toBe(true);
  expect(long.wrapped).toBe(true);
  // The long page never squeezes the toolbar: same height, nothing clipped.
  expect(long.height).toBeCloseTo(short.height, 0);
  expect(long.overflow).toBeLessThanOrEqual(0);
  // The long page really does overflow its scroller.
  expect(
    await page
      .locator('.kui-list[data-scrollable="true"]')
      .evaluate((list) => list.scrollHeight > list.clientHeight),
  ).toBe(true);
  expect(long.trailingInside).toBe(true);
});
