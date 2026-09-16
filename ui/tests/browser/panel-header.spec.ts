import { expect, test } from '@playwright/test';

test('centers the PanelHeader icon inside its filled circle', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1000, height: 400 });
  await page.goto('/?component=panel-header');
  const iconGroup = page.locator('.demo-stack[data-demo="panel-header"] .kui-panel-header__icon').first();
  await expect(iconGroup).toBeVisible();

  // The icon is a raw svg (not a button); it must sit dead-center in the tile.
  const geometry = await iconGroup.evaluate((group) => {
    const tile = group.getBoundingClientRect();
    const svg = group.querySelector('svg')!.getBoundingClientRect();
    return {
      dx: Math.abs(tile.left + tile.width / 2 - (svg.left + svg.width / 2)),
      dy: Math.abs(tile.top + tile.height / 2 - (svg.top + svg.height / 2)),
    };
  });
  expect(geometry.dx).toBeLessThan(0.75);
  expect(geometry.dy).toBeLessThan(0.75);

  if (browserName === 'chromium') {
    await page.locator('.demo-stack[data-demo="panel-header"] .demo-example').nth(1).screenshot({ path: 'test-results/panel-header-icon-centered.png' });
  }
});
