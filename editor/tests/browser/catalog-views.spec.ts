import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

const views = new URL('../../../ui/ux-demo/views/', import.meta.url);

for (const [file, expected] of [
  ['headers.kui.json', 'UI Foundations'],
  ['recipe-workspace-header.kui.json', 'Accessibility Readiness'],
] as const) {
  test(`opens and previews catalog view ${file}`, async ({ page }) => {
    await page.goto('/');
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: file,
        mimeType: 'application/json',
        buffer: readFileSync(new URL(file, views)),
      });

    await expect(
      page.getByText(/^Unsaved draft · autosaved · \d+ nodes? · valid$/),
    ).toBeVisible();
    await expect(page.getByText('That file could not be opened')).toBeHidden();
    await expect(page.locator('[data-editor-canvas]')).toContainText(expected);
    await expect(
      page.locator('[data-editor-canvas] [data-kerf-node]').first(),
    ).toBeVisible();
  });
}
