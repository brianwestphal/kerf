import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// A `fill` SearchField inside a `sizing="grow"` group keeps the group's grow
// basis when it opens: the grown group shares its line with the trailing
// siblings instead of taking the whole line and wrapping every one of them.
const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/toolbar-grow-fill-search.tsx'),
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

for (const width of [1600, 900]) {
  test(`an opened fill search keeps its grow basis beside its siblings at ${width}px`, async ({
    page,
  }) => {
    await openFixture(page, width);
    const search = page.locator(
      '.kui-toolbar-control-group[data-content="search"]',
    );
    const settings = page.locator('[data-settings]');
    const trailing = page.locator('.kui-toolbar__trailing');
    const closedHeight = (await trailing.boundingBox())!.height;
    await page.getByRole('button', { name: 'Open search' }).click();
    await expect(search).toHaveAttribute('data-expanded', 'true');
    await expect(search).toHaveAttribute('data-sizing', 'grow');
    // Let the 0.25s basis motion settle.
    await page.waitForTimeout(400);
    const searchBox = (await search.boundingBox())!;
    const settingsBox = (await settings.boundingBox())!;
    // One row: Settings sits beside the search, not below it.
    expect(Math.abs(settingsBox.y - searchBox.y)).toBeLessThan(
      searchBox.height,
    );
    expect(settingsBox.x).toBeGreaterThan(searchBox.x + searchBox.width - 1);
    expect((await trailing.boundingBox())!.height).toBeLessThanOrEqual(
      closedHeight + 1,
    );
    // The grow basis still sizes the group (16rem), not the whole line.
    expect(searchBox.width).toBeGreaterThanOrEqual(16 * 16 - 1);
  });
}
