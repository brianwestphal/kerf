import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

import { animationsSettled } from '../helpers/animations-settled.js';

// KF-ZX9Q0X: a group a collapsed Workbench panel relocates into the work
// area's leading zone honors `yield-to-expanded-sibling` against the work
// area's expanded trailing search, in a 480px-or-narrower toolbar.
const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/workbench-relocated-yield.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function openFixture(page: Page, width: number) {
  const bundle = await fixtureBundle;
  await page.setViewportSize({ width, height: 700 });
  await page.setContent(
    '<!doctype html><html><body style="margin:0"><div class="kui-app-root" data-fixture-root style="height:100vh"></div></body></html>',
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

for (const [width, yields] of [
  [390, true],
  [1024, false],
] as const) {
  test(`a relocated group ${yields ? 'yields to' : 'stays beside'} the expanded search at ${String(width)}px`, async ({
    page,
  }, testInfo) => {
    await openFixture(page, width);
    const toolbar = page.locator('.kui-toolbar[aria-label="Tickets"]');
    const announcer = toolbar.getByRole('button', { name: 'Announcer' });
    const toggle = toolbar.getByRole('button', { name: /Projects/ });
    // Collapsed, the rail's group and toggle sit in the work area's toolbar.
    await expect(announcer).toBeVisible();
    await expect(toggle).toBeVisible();
    await expect(
      toolbar.locator('.kui-toolbar__leading').getByRole('button', {
        name: 'Announcer',
      }),
    ).toBeVisible();

    await toolbar.getByRole('button', { name: 'Search' }).click();
    const field = toolbar.getByRole('searchbox', { name: 'Search Tickets' });
    await expect(field).toBeFocused();
    if (yields) await expect(announcer).toBeHidden();
    else await expect(announcer).toBeVisible();
    // The toggle does not opt in, so it always stays.
    await expect(toggle).toBeVisible();
    await animationsSettled(page);
    await toolbar.screenshot({
      path: testInfo.outputPath(`relocated-yield-open-${String(width)}.png`),
    });

    // Closing the search brings the relocated group back.
    await page.keyboard.press('Escape');
    await expect(
      toolbar.locator('.kui-toolbar-control-group[data-expanded="true"]'),
    ).toHaveCount(0);
    await expect(announcer).toBeVisible();
  });
}
