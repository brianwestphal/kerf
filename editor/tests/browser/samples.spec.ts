// KF-JN4PF5: every saved demo build sample (editor/samples/) opens in the
// editor through Open, renders, and is valid.
import { readdirSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

const folder = new URL('../../samples/', import.meta.url);
const samples = readdirSync(folder).filter((file) =>
  file.endsWith('.kui.json'),
);

for (const file of samples) {
  test(`opens the ${file} sample`, async ({ page }) => {
    await page.goto('/');
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: file,
        mimeType: 'application/json',
        buffer: readFileSync(new URL(file, folder)),
      });
    await expect(
      page.getByText(/^Unsaved draft · autosaved · \d+ nodes? · valid$/),
    ).toBeVisible();
    await expect(page.getByText('That file could not be opened')).toBeHidden();
    await expect(
      page.locator('[data-editor-canvas] [data-kerf-node]').first(),
    ).toBeVisible();
  });
}
