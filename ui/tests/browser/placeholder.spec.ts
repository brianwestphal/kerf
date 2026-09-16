import { expect, test } from '@playwright/test';

test('renders the Skeleton primitive and a faithful loading inspector', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=skeleton');

  const demo = page.locator('[data-demo="skeleton"]');
  await expect(demo).toBeVisible();

  // Primitive blocks render and are decorative by default.
  const blocks = demo.locator('.demo-skeleton-blocks .kui-skeleton');
  expect(await blocks.count()).toBeGreaterThanOrEqual(4);

  // The loading inspector shows real chrome with skeleton values.
  const inspector = demo.locator('.demo-skeleton-inspector');
  await expect(inspector.locator('[data-component="panel-header"][data-placeholder="true"]')).toBeVisible();
  await expect(inspector.locator('.kui-panel-header__icon')).toBeVisible();

  // ValueTable keeps field labels, replaces values with skeletons.
  const rows = inspector.locator('.kui-value-table__row[data-placeholder="true"]');
  expect(await rows.count()).toBe(3);
  await expect(rows.first().locator('.kui-value-table__label')).toHaveText('Status');
  await expect(rows.first().locator('dd .kui-skeleton')).toBeVisible();

  // Select renders a static placeholder box, not the interactive wa-select.
  await expect(inspector.locator('.kui-select--placeholder')).toBeVisible();
  expect(await inspector.locator('wa-select').count()).toBe(0);

  // A placeholder menu item is disabled and carries no action.
  const item = inspector.locator('.kui-menu-item[data-placeholder="true"]').first();
  await expect(item).toBeDisabled();
  expect(await item.getAttribute('data-action')).toBeNull();

  // Skeleton blocks read as flat fill with no animation.
  const animation = await blocks.first().evaluate((element) => window.getComputedStyle(element).animationName);
  expect(animation === 'none' || animation === '').toBe(true);

  if (browserName === 'chromium') await demo.screenshot({ path: 'test-results/skeleton-inspector-wide.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(inspector.locator('.kui-select--placeholder')).toBeVisible();
  if (browserName === 'chromium') await demo.screenshot({ path: 'test-results/skeleton-inspector-narrow.png' });
});
