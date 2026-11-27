import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

import { animationsSettled } from '../helpers/animations-settled.js';

const fixture = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/popup-menu-opener-anchor.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

test('an opener-box menu flips and scrolls clear of a tall trigger', async ({
  page,
}, testInfo) => {
  const bundle = await fixture;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1100, height: 640 });
  await page.setContent(
    '<!doctype html><html><body><main class="kui-app-root" data-fixture-root></main></body></html>',
  );
  await page.addStyleTag({
    content:
      bundle.outputFiles
        .find(({ path }) => path.endsWith('.css'))!
        .text.replace(
          /remify\((-?[\d.]+)px\)/g,
          (_, pixels: string) => `${Number(pixels) / 16}rem`,
        ) +
      '\n[data-fixture-root] {padding: 24px} #opener {position: fixed; left: 24px; top: 56%; min-height: 58px}',
  });
  await page.addScriptTag({
    content: bundle.outputFiles.find(({ path }) => path.endsWith('.js'))!.text,
  });

  const opener = page.getByRole('button', { name: 'More Actions' });
  const menu = page.getByRole('menu', { name: 'Ticket Actions' });
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 640 });
    await opener.click();
    await expect(menu).toHaveAttribute('data-placement', /top/);
    const anchorBox = (await opener.boundingBox())!;
    const panelBox = (await menu.boundingBox())!;
    expect(panelBox.y).toBeGreaterThanOrEqual(9);
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(anchorBox.y + 1);
    expect(
      Math.abs(panelBox.y + panelBox.height - anchorBox.y),
    ).toBeLessThanOrEqual(1);
    expect(
      await menu.evaluate((panel) => panel.scrollHeight > panel.clientHeight),
    ).toBe(true);
    await animationsSettled(page);
    await page.screenshot({
      path: testInfo.outputPath(`popup-opener-flip-${width}.png`),
      clip: { x: 0, y: 0, width: 330, height: 450 },
    });
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(opener).toBeFocused();
  }

  await opener.evaluate((button) => {
    button.style.top = '65px';
  });
  await opener.click();
  await expect(menu).toHaveAttribute('data-placement', /bottom/);
  const anchorBox = (await opener.boundingBox())!;
  expect((await menu.boundingBox())!.y).toBeGreaterThanOrEqual(
    anchorBox.y + anchorBox.height - 1,
  );
});
