import { expect, test } from '@playwright/test';

test('renders typed tab presentations without consumer descendant CSS', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=tab-bar');
  const demo = page.locator('[data-demo="tab-bar"]');

  const inspector = demo.locator('[data-tab-bar-id="inspector-tabs"]');
  await expect(inspector).toHaveAttribute('data-allocation', 'fill');
  await expect(inspector).toHaveAttribute(
    'data-trailing-placement',
    'adjacent',
  );
  const inspectorTabs = inspector.locator('[data-component="app-tab"]');
  await expect(inspectorTabs).toHaveCount(2);
  const geometry = await inspectorTabs.first().evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    flexGrow: window.getComputedStyle(element).flexGrow,
    radius: window.getComputedStyle(element).borderRadius,
    labelWidth: element
      .querySelector('.kui-app-tab__name')!
      .getBoundingClientRect().width,
  }));
  expect(geometry.height).toBe(32);
  expect(geometry.flexGrow).toBe('1');
  expect(geometry.labelWidth).toBeLessThanOrEqual(120);
  expect(geometry.radius).not.toBe('9999px');
  expect(
    await inspectorTabs
      .first()
      .locator('.kui-app-tab__name')
      .evaluate((element) => window.getComputedStyle(element).textOverflow),
  ).toBe('ellipsis');

  const iconTab = demo.locator(
    '[data-component="app-tab"][data-tab-id="navigation"]',
  );
  await expect(iconTab.getByRole('tab', { name: 'Navigation' })).toBeVisible();
  expect(
    await iconTab.evaluate((element) => element.getBoundingClientRect().width),
  ).toBe(32);
  await demo.screenshot({ path: testInfo.outputPath('tab-presentations.png') });
});
