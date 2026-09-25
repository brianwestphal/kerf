import { expect, test } from '@playwright/test';

test('renders typed tab presentations without consumer descendant CSS', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=tab-bar');
  const demo = page.locator('[data-demo="tab-bar"]');

  // Inspector presentation: compact rectangular tabs that keep their
  // intrinsic width next to an adjacent trailing action.
  const inspector = demo.locator('[data-tab-bar-id="inspector-tab-bar"]');
  await expect(inspector).toHaveAttribute('data-allocation', 'intrinsic');
  await expect(inspector).toHaveAttribute(
    'data-trailing-placement',
    'adjacent',
  );
  const inspectorTabs = inspector.locator('[data-component="app-tab"]');
  await expect(inspectorTabs).toHaveCount(5);
  const tabGeometry = (tab: typeof inspectorTabs) =>
    tab.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      flexGrow: window.getComputedStyle(element).flexGrow,
      radius: window.getComputedStyle(element).borderRadius,
      labelWidth: element
        .querySelector('.kui-app-tab__name')!
        .getBoundingClientRect().width,
    }));
  const geometry = await tabGeometry(inspectorTabs.first());
  expect(geometry.height).toBe(32);
  expect(geometry.flexGrow).toBe('0');
  expect(geometry.labelWidth).toBeLessThanOrEqual(120);
  expect(geometry.radius).not.toBe('9999px');
  expect(
    await inspectorTabs
      .first()
      .locator('.kui-app-tab__name')
      .evaluate((element) => window.getComputedStyle(element).textOverflow),
  ).toBe('ellipsis');

  // Fill allocation stretches every tab across the bar with no consumer CSS.
  const fill = demo.locator('[data-tab-bar-id="segmented-tab-bar"]');
  await expect(fill).toHaveAttribute('data-allocation', 'fill');
  const fillTabs = fill.locator('[data-component="app-tab"]');
  await expect(fillTabs).toHaveCount(2);
  const fillGeometry = await tabGeometry(fillTabs.first());
  expect(fillGeometry.height).toBe(32);
  expect(fillGeometry.flexGrow).toBe('1');
  expect(fillGeometry.labelWidth).toBeLessThanOrEqual(120);

  await page.goto('/?component=tabs');
  const appTabDemo = page.locator('[data-demo="tabs"]');
  const iconTab = appTabDemo.locator(
    '[data-component="app-tab"][data-tab-id="status"]',
  );
  await expect(iconTab.getByRole('tab', { name: 'Status' })).toBeVisible();
  expect(
    await iconTab.evaluate((element) => element.getBoundingClientRect().width),
  ).toBe(32);
  await appTabDemo.screenshot({
    path: testInfo.outputPath('tab-presentations.png'),
  });
});
