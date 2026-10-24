import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/scrollable-list-popup-consumer.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

const css = ['foundation', 'document', 'layout', 'list', 'popup-menu', 'text']
  .map((name) =>
    readFileSync(
      resolve(import.meta.dirname, `../../dist/styles/${name}.css`),
      'utf8',
    ),
  )
  .join('\n');

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]) {
  test(`last-row PopupMenu stays inside a scrollable List and locked viewport at ${viewport.width}px`, async ({
    page,
    browserName,
  }) => {
    const result = await fixtureBundle;
    const javascript = result.outputFiles.find((file) =>
      file.path.endsWith('.js'),
    )!;
    await page.setViewportSize(viewport);
    await page.setContent(
      '<body><div class="kui-app-root" data-viewport="locked" data-app></div></body>',
    );
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: javascript.text });

    const list = page.locator('[data-popup-list]');
    await expect(list).toHaveCSS('position', 'relative');
    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect
      .poll(() => list.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);

    const geometry = () =>
      page.evaluate(() => ({
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: globalThis.innerHeight,
        pageScrollY: globalThis.scrollY,
      }));
    expect(await geometry()).toEqual({
      documentHeight: viewport.height,
      viewportHeight: viewport.height,
      pageScrollY: 0,
    });

    await page.screenshot({
      path: `test-results/scrollable-list-popup-${browserName}-${viewport.width}-closed.png`,
    });

    const lastMenu = page.locator('[data-row-menu="27"]');
    await lastMenu.locator('.kui-popup-menu__trigger').click();
    await expect(lastMenu.locator('.kui-popup-menu__menu')).toBeVisible();
    expect(await geometry()).toEqual({
      documentHeight: viewport.height,
      viewportHeight: viewport.height,
      pageScrollY: 0,
    });
    await page.screenshot({
      path: `test-results/scrollable-list-popup-${browserName}-${viewport.width}-open.png`,
    });
  });
}
