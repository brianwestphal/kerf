import { expect, test } from '@playwright/test';

// KF-QAVQCA: the footer's related-entries menu must not run off-screen and make
// the whole catalog horizontally scrollable.
test('the related-entries menu does not overflow the viewport when open', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto('/?component=lucide-icon'); // used by many → a long related list
  const relationships = page.locator('[data-catalog-related]');
  await relationships.locator('wa-button[slot="trigger"]').click();
  await expect(
    relationships.locator('.kui-catalog__related-heading').first(),
  ).toBeVisible();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
