import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-3A0DBM: with trailingPlacement="adjacent" the tab strip is only as wide
// as its tabs, so `free` stays about 0. `onFitChange` reports the bar's
// content width and the room between the packed zones and the end zone
// (`endFree`), and reports again when only the bar grows.

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/tab-bar-adjacent-fit.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function mountFixture(page: Page, width: number): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Fit fixture emitted no JS/CSS');
  await page.setContent(
    `<!doctype html><html><body style="margin:0"><div data-fit-host style="width:${String(width)}px"></div></body></html>`,
  );
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
}

/** The latest report, plus the geometry it should describe. */
const measured = (page: Page) =>
  page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>(
      '[data-tab-bar-id="adjacent-fit"]',
    )!;
    const style = window.getComputedStyle(bar);
    const trailing = bar
      .querySelector('.kui-tab-bar__trailing')!
      .getBoundingClientRect();
    const end = bar.querySelector('.kui-tab-bar__end')!.getBoundingClientRect();
    return {
      fit: window.fits.at(-1),
      reports: window.fits.length,
      barWidth: bar.clientWidth - 2 * Number.parseFloat(style.paddingLeft),
      endFree: end.left - Number.parseFloat(style.columnGap) - trailing.right,
    };
  });

test('reports the room beside an adjacent strip and refits when only the bar grows', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1000, height: 300 });
  await mountFixture(page, 600);
  await expect.poll(async () => (await measured(page)).reports).toBe(1);
  const narrow = await measured(page);
  expect(narrow.fit!.overflowing).toBe(false);
  expect(Math.abs(narrow.fit!.free)).toBeLessThanOrEqual(1);
  expect(narrow.fit!.barWidth).toBe(Math.round(narrow.barWidth));
  expect(Math.abs(narrow.fit!.endFree - narrow.endFree)).toBeLessThanOrEqual(1);
  expect(narrow.fit!.endFree).toBeGreaterThan(100);
  await page
    .locator('[data-tab-bar-id="adjacent-fit"]')
    .screenshot({ path: testInfo.outputPath('adjacent-fit-600.png') });

  // Grow the host: no zone changes size, only the bar and its spare room.
  await page.locator('[data-fit-host]').evaluate((host) => {
    host.style.width = '900px';
  });
  await expect.poll(async () => (await measured(page)).reports).toBe(2);
  const wide = await measured(page);
  expect(wide.fit!.barWidth - narrow.fit!.barWidth).toBe(300);
  expect(wide.fit!.endFree - narrow.fit!.endFree).toBe(300);
  expect(wide.fit!.trailingWidth).toBe(narrow.fit!.trailingWidth);
  expect(wide.fit!.endWidth).toBe(narrow.fit!.endWidth);
  await page
    .locator('[data-tab-bar-id="adjacent-fit"]')
    .screenshot({ path: testInfo.outputPath('adjacent-fit-900.png') });
});
