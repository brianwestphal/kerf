import { readdirSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

const views = new URL('../../../ui/ux-demo/views/', import.meta.url);

test('opens and previews every catalog view', async ({ page }) => {
  test.setTimeout(180_000);
  for (const file of readdirSync(views).filter((name) =>
    name.endsWith('.kui.json'),
  )) {
    await test.step(file, async () => {
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
      await expect(
        page.getByText('That file could not be opened'),
      ).toBeHidden();
      await expect(
        page.locator('[data-editor-canvas] [data-kerf-node]').first(),
      ).toBeAttached();
      await expect(
        page.getByText('This document cannot be previewed'),
      ).toBeHidden();
    });
  }
});
