import { expect, test } from '@playwright/test';

// KF-QAVQCA: the footer "Related components" select must not open a listbox that
// runs off-screen and makes the whole catalog horizontally scrollable. `fitMenu`
// ties the listbox width to the (on-screen) select, so it can never overflow.
test('the related-components select does not overflow the viewport when open', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto('/?component=lucide-icon'); // used by many → a long related list
  const select = page.locator('.catalog-relationships wa-select').first();
  await select.click();
  await page.waitForTimeout(200);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
