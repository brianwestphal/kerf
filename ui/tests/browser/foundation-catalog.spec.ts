import { expect, test } from '@playwright/test';

test('catalogs the public foundation token surface without overflow', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=foundation');

  const demo = page.locator('[data-demo="foundation"]');
  await expect(demo).toBeVisible();
  await expect(demo.locator('.demo-foundation__tone')).toHaveCount(5);
  await expect(demo.locator('.demo-foundation__tone--brand')).toHaveCSS(
    'color',
    'rgb(26, 93, 207)',
  );
  await expect
    .poll(() =>
      demo.evaluate((element) => element.scrollWidth <= element.clientWidth),
    )
    .toBe(true);
  if (testInfo.project.name === 'chromium')
    await demo.screenshot({
      path: 'test-results/foundation-catalog-wide.png',
    });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(demo).toBeVisible();
  await expect
    .poll(() =>
      demo.evaluate((element) => element.scrollWidth <= element.clientWidth),
    )
    .toBe(true);
  if (testInfo.project.name === 'chromium')
    await page.screenshot({
      path: 'test-results/foundation-catalog-narrow.png',
      fullPage: true,
    });
});
