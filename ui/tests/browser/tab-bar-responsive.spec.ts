import { expect, test } from '@playwright/test';

test('segmented AppTabs switch to accessible icon-only at tablist container breakpoints', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=tab-bar');
  const bar = page.locator('[data-tab-bar-id="responsive-icon-tab-bar"]');
  const tabs = bar.locator('.kui-tab-bar__tabs');
  const overview = bar.getByRole('tab', { name: 'Overview' });
  const activity = bar.getByRole('tab', { name: 'Activity' });
  const name = bar.locator('.kui-app-tab__name').first();
  const setWidth = async (width: number) => {
    await bar.evaluate((element, value) => {
      element.style.width = `${value}px`;
    }, width);
    await expect
      .poll(() => tabs.evaluate((element) => element.clientWidth))
      .toBeGreaterThan(width - 45);
  };
  await setWidth(940);
  await expect(name).toHaveCSS('position', 'static');
  await expect(overview).toBeVisible();
  if (testInfo.project.name === 'chromium')
    await bar.screenshot({ path: testInfo.outputPath('tab-bar-wide.png') });
  await setWidth(780);
  await expect(name).toHaveCSS('position', 'absolute');
  await expect(bar.locator('.kui-app-tab').first()).toHaveCSS('width', '32px');
  await expect(overview).toHaveAttribute('aria-selected', 'true');
  await expect(activity).toBeVisible();
  if (testInfo.project.name === 'chromium')
    await bar.screenshot({
      path: testInfo.outputPath('tab-bar-icon-only.png'),
    });
  await bar.evaluate((element) => {
    element.dataset.allocation = 'fill';
  });
  await expect(bar.locator('.kui-app-tab').first()).toHaveCSS('width', '32px');
  await bar.evaluate((element) => {
    element.dataset.allocation = 'intrinsic';
  });

  await bar.evaluate((element) => {
    element.dataset.iconOnlyAt = 'narrow';
  });
  await expect(name).toHaveCSS('position', 'static');
  await setWidth(680);
  await expect(name).toHaveCSS('position', 'absolute');

  await bar.evaluate((element) => {
    element.dataset.iconOnlyAt = 'compact';
  });
  await expect(name).toHaveCSS('position', 'static');
  await setWidth(430);
  await expect(name).toHaveCSS('position', 'absolute');
  await expect(overview).toHaveAttribute('aria-selected', 'true');
});
