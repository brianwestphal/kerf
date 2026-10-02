import { expect, test } from '@playwright/test';

test('standalone tab bar actions stay visible while the tabs scroll', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=tab-bar');
  const bar = page.locator('[data-tab-bar-id="raw-action-tab-bar"]');
  const tabs = bar.locator('.kui-tab-bar__tabs');
  const adjacent = bar.locator('.kui-tab-bar__trailing > wa-button');
  const primary = bar.locator('.kui-tab-bar__end > wa-button');

  await expect(adjacent).toHaveText('Add tab');
  await expect(primary).toHaveText('New ticket…');
  await expect(bar.locator('.kui-toolbar-control-group')).toHaveCount(0);
  await bar.evaluate((element) => {
    element.style.width = '680px';
  });
  await expect
    .poll(() =>
      tabs.evaluate((element) => element.scrollWidth > element.clientWidth),
    )
    .toBe(true);
  await expect(adjacent).toBeVisible();
  await expect(primary).toBeVisible();
  if (testInfo.project.name === 'chromium')
    await bar.screenshot({
      path: testInfo.outputPath('tab-bar-action-wide.png'),
    });

  await bar.evaluate((element) => {
    element.style.width = '390px';
  });
  await expect
    .poll(() =>
      tabs.evaluate((element) => element.scrollWidth > element.clientWidth),
    )
    .toBe(true);
  const positions = await bar.evaluate((element) => {
    const bounds = (selector: string) =>
      element.querySelector(selector)!.getBoundingClientRect();
    const barBounds = element.getBoundingClientRect();
    const tabBounds = bounds('.kui-tab-bar__tabs');
    const adjacentBounds = bounds('.kui-tab-bar__trailing');
    const primaryBounds = bounds('.kui-tab-bar__end');
    return {
      tabsRight: tabBounds.right,
      adjacentLeft: adjacentBounds.left,
      adjacentRight: adjacentBounds.right,
      primaryLeft: primaryBounds.left,
      primaryRight: primaryBounds.right,
      barRight: barBounds.right,
    };
  });
  expect(positions.tabsRight).toBeLessThanOrEqual(positions.adjacentLeft + 1);
  expect(positions.adjacentRight).toBeLessThanOrEqual(
    positions.primaryLeft + 1,
  );
  expect(positions.primaryRight).toBeLessThanOrEqual(positions.barRight + 1);
  await expect(adjacent).toBeVisible();
  await expect(primary).toBeVisible();
  if (testInfo.project.name === 'chromium')
    await bar.screenshot({
      path: testInfo.outputPath('tab-bar-action-narrow.png'),
    });
});
