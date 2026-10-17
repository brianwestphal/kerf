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

// A whole-control `disabled` keeps the current choice visible but makes every
// segment inert and dimmed like an author-disabled choice, with the not-allowed
// cursor of a live unavailable control.
test('a disabled SegmentedControl keeps its selection and ignores clicks', async ({
  page,
}) => {
  await page.goto('/?component=segmented-control');
  const control = page.locator(
    '[data-segmented-control-id="segmented-disabled"]',
  );
  await expect(control).toHaveAttribute('aria-disabled', 'true');
  const items = control.locator('.kui-segmented-control__item');
  await expect(items).toHaveCount(3);
  for (const item of await items.all()) {
    await expect(item).toBeDisabled();
    expect(
      await item.evaluate((el) => ({
        opacity: window.getComputedStyle(el).opacity,
        cursor: window.getComputedStyle(el).cursor,
      })),
    ).toEqual({ opacity: '0.45', cursor: 'not-allowed' });
  }
  const week = control.getByRole('button', { name: 'Week' });
  await expect(week).toHaveAttribute('aria-pressed', 'true');
  await control.getByRole('button', { name: 'Month' }).click({ force: true });
  await expect(week).toHaveAttribute('aria-pressed', 'true');
  await expect(control).toHaveAttribute('data-value', 'week');
});
