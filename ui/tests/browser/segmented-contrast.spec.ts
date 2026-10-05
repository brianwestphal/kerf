import { expect, test } from '@playwright/test';

import { minPaintedTextContrast } from './painted-contrast.js';

for (const width of [1100, 390]) {
  test(`filled segmented labels meet AA at ${width}px in light and dark`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=segmented-control');
    const control = page.locator(
      '[data-segmented-control-id="inspector-section"]',
    );
    const unselected = control.locator(
      '.kui-segmented-control__item[data-selected="false"]',
    );

    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') {
        await page.locator('[data-action="toggle-theme"]').click();
        await expect(page.locator('html')).toHaveClass(/demo-dark/);
      }
      await expect(unselected.first()).toBeVisible();
      const colors = await unselected.first().evaluate((item) => ({
        text: window.getComputedStyle(item).color,
        track: window.getComputedStyle(item.parentElement!).backgroundColor,
        transitionProperty: window.getComputedStyle(item).transitionProperty,
      }));
      if (testInfo.project.name === 'chromium')
        await control.screenshot({
          path: `test-results/segmented-filled-${theme}-${width}.png`,
        });
      expect(
        await minPaintedTextContrast(unselected),
        `${theme} filled segmented label contrast (${JSON.stringify(colors)})`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(colors.transitionProperty.split(', ')).not.toContain('color');
    }
  });
}
