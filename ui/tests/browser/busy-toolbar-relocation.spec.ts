import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/busy-toolbar-relocation.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

for (const width of [1100, 390]) {
  test(`busy group and status relocate and recover through collapse/expand (${width}px)`, async ({
    page,
    browserName,
  }, testInfo) => {
    const bundle = await fixtureBundle;
    await page.setViewportSize({ width, height: 640 });
    await page.setContent(
      '<!doctype html><html><body><div class="kui-app-root" data-fixture-root style="height:400px"></div></body></html>',
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
      content: bundle.outputFiles.find((file) => file.path.endsWith('.js'))!
        .text,
    });
    const root = page.locator('[data-fixture-root]');
    const editor = page.locator(
      '[data-component="toolbar"][aria-label="Editor"]',
    );
    const panel = page.locator('[data-collapsible-panel="busy-nav"]');
    await expect(
      editor.getByRole('button', { name: 'Export files' }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Start export' }).click();
    await expect(page.getByRole('status')).toHaveText('Exporting files');
    await page.getByRole('button', { name: 'Hide navigator' }).click();
    await expect(panel).toHaveAttribute('aria-hidden', 'true');
    const action = editor.locator('button[aria-label="Export files"]');
    await expect(action).toBeVisible();
    await expect(action.locator('..')).toHaveAttribute('inert', '');
    await expect(page.getByRole('status')).toHaveCount(1);
    await expect(page.getByRole('status')).toHaveText('Exporting files');
    expect(
      await action.evaluate((element) => {
        (element as HTMLElement).focus();
        return document.activeElement === element;
      }),
    ).toBe(false);
    await action.click({ force: true });
    await expect(root).toHaveAttribute('data-export-count', '0');
    if (browserName === 'chromium')
      await root.screenshot({
        path: testInfo.outputPath(`busy-relocated-${width}.png`),
        animations: 'disabled',
      });
    await page.getByRole('button', { name: 'Finish export' }).click();
    await expect(action.locator('..')).not.toHaveAttribute('inert');
    await expect(page.getByRole('status')).toHaveCount(0);
    await action.click();
    await expect(root).toHaveAttribute('data-export-count', '1');
    await action.focus();
    await action.press('Enter');
    await expect(root).toHaveAttribute('data-export-count', '2');
    await page.getByRole('button', { name: 'Show navigator' }).click();
    await expect(
      editor.locator('button[aria-label="Export files"]'),
    ).toHaveCount(0);
    await expect(
      panel.getByRole('button', { name: 'Export files' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Start export' }).click();
    await page.getByRole('button', { name: 'Hide navigator' }).click();
    await expect(action.locator('..')).toHaveAttribute('inert', '');
    await expect(page.getByRole('status')).toHaveCount(1);
    await page.getByRole('button', { name: 'Show navigator' }).click();
    await expect(
      panel.locator('button[aria-label="Export files"]').locator('..'),
    ).toHaveAttribute('inert', '');
    await expect(page.getByRole('status')).toHaveCount(1);
    if (browserName === 'chromium')
      await root.screenshot({
        path: testInfo.outputPath(`busy-panel-restored-${width}.png`),
        animations: 'disabled',
      });
    await page.getByRole('button', { name: 'Finish export' }).click();
    await expect(page.getByRole('status')).toHaveCount(0);
    await panel.getByRole('button', { name: 'Export files' }).click();
    await expect(root).toHaveAttribute('data-export-count', '3');
  });
}
