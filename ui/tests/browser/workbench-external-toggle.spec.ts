import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// An overlay rail opened from a persistent toggle outside the Workbench takes
// focus once it becomes focusable, as it does from the Workbench's own
// relocating toggle; inline, focus stays on the toggle.
const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/workbench-external-toggle.tsx'),
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

test('an overlay rail opened from a persistent external toggle takes focus', async ({
  page,
}) => {
  await openFixture(page, 390);
  const toggle = page.locator('[data-app-toggle]');
  const rail = page.locator('#app [data-workbench-rail="left"]');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(rail).toHaveCSS('position', 'absolute');
  await expect
    .poll(() =>
      rail.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
  // Escape closes the overlay and hands focus back to the toggle.
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('an inline rail opened from a persistent external toggle leaves focus on it', async ({
  page,
}) => {
  await openFixture(page, 1200);
  const toggle = page.locator('[data-app-toggle]');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.waitForTimeout(300);
  await expect(toggle).toBeFocused();
});
