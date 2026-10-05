import { expect, test } from '@playwright/test';

import { minPaintedTextContrast } from './painted-contrast.js';

test('dark toolbar titles remain readable and actionable across themes and widths', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=toolbar-text');
  const example = page.locator('[data-demo-toolbar-text-dark]');
  const titles = example.locator('.kui-toolbar-text');
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const size of [
      'xlarge',
      'xlarge-fixed',
      'large',
      'default',
      'small',
      'xsmall',
    ]) {
      await titles.evaluateAll((elements, size) => {
        for (const element of elements) element.setAttribute('data-size', size);
      }, size);
      // Dark control groups transition their foreground when the theme changes.
      await expect
        .poll(() => minPaintedTextContrast(titles), {
          message: `${scheme} ${size}`,
        })
        .toBeGreaterThanOrEqual(4.5);
    }
    await titles.evaluateAll((elements) => {
      for (const element of elements)
        element.setAttribute('data-size', 'default');
    });
    for (const width of [1100, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(titles.first()).toBeVisible();
      expect(await minPaintedTextContrast(titles)).toBeGreaterThanOrEqual(4.5);
      const action = example.getByRole('button', { name: 'Rename file' });
      await action.focus();
      await expect(action).toBeFocused();
      await action.press('Enter');
      await expect(page.locator('.catalog-log')).toHaveText(
        'Edit toolbar title requested',
      );
      await example.screenshot({
        path: testInfo.outputPath(`toolbar-text-dark-${scheme}-${width}.png`),
      });
    }
  }
});
