import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/corner-status-consumer.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

const css = ['foundation', 'state-banner', 'corner-status']
  .map((name) =>
    readFileSync(
      resolve(import.meta.dirname, `../../dist/styles/${name}.css`),
      'utf8',
    ),
  )
  .join('\n');

async function mountFixture(page: Page, dir = 'ltr'): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  if (!javascript)
    throw new Error('Corner-status fixture emitted no JavaScript');
  await page.setViewportSize({ width: 800, height: 600 });
  await page.setContent(
    `<html dir="${dir}"><body style="margin:0">
      <header data-chrome style="position:fixed;inset:0;z-index:2147483647;background:rgb(255 0 0 / 0.2)"></header>
      <input data-field aria-label="Field" />
      <div data-app></div>
    </body></html>`,
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript.text });
}

const setProgress = (page: Page, value: number | null) =>
  page.evaluate(
    (next) =>
      (
        globalThis as unknown as { setProgress(v: number | null): void }
      ).setProgress(next),
    value,
  );

test('opens in the top layer at the bottom-end corner without taking focus', async ({
  page,
}) => {
  await mountFixture(page);
  await page.locator('[data-field]').focus();
  await setProgress(page, 3);
  const host = page.locator('.kui-corner-status');
  await expect(host).toBeVisible();
  expect(await host.evaluate((el) => el.matches(':popover-open'))).toBe(true);
  await expect(page.locator('[data-field]')).toBeFocused();

  // Above a fixed, max-z-index overlay: the banner's center hits the banner.
  const box = (await host.boundingBox())!;
  const hit = await page.evaluate(
    ({ x, y }) =>
      document.elementFromPoint(x, y)?.closest('.kui-corner-status') !== null,
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  );
  expect(hit).toBe(true);
  expect(Math.round(800 - (box.x + box.width))).toBe(16);
  expect(Math.round(600 - (box.y + box.height))).toBe(16);

  // Re-renders update in place; Escape and outside presses do not dismiss.
  await setProgress(page, 4);
  await expect(host).toContainText('4 of 12');
  await page.keyboard.press('Escape');
  await page.mouse.click(10, 10);
  expect(await host.evaluate((el) => el.matches(':popover-open'))).toBe(true);

  // Removed when the work ends, and reopened when it starts again.
  await setProgress(page, null);
  await expect(page.locator('.kui-corner-status')).toHaveCount(0);
  await setProgress(page, 1);
  await expect(page.locator('.kui-corner-status')).toBeVisible();
});

test('the end corner follows the document direction', async ({ page }) => {
  await mountFixture(page, 'rtl');
  await setProgress(page, 1);
  const box = (await page.locator('.kui-corner-status').boundingBox())!;
  expect(Math.round(box.x)).toBe(16);
});
