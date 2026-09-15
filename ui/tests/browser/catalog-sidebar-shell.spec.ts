import { expect, type Page,test } from '@playwright/test';

const headerGeometry = async (page: Page) => page.evaluate(() => {
  const rect = (selector: string) => document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
  const logo = rect('.catalog-mark');
  const title = rect('.catalog-brand__identity h1');
  const subtitle = rect('.catalog-brand__subtitle');
  const subtitleStyle = window.getComputedStyle(document.querySelector<HTMLElement>('.catalog-brand__subtitle')!);
  const collapse = rect('.catalog-brand [aria-label="Collapse component catalog"]');
  const centerY = (value: DOMRect) => value.top + value.height / 2;
  return {
    collapseTitleCenterDelta: Math.abs(centerY(collapse) - centerY(title)),
    logoTitleCenterDelta: Math.abs(centerY(logo) - centerY(title)),
    subtitleBelowTitle: subtitle.top >= title.bottom - 1,
    subtitleTitleLeftDelta: Math.abs(subtitle.left + Number.parseFloat(subtitleStyle.paddingInlineStart) - title.left),
  };
});

test('uses the Kerf identity and relocates sidebar restore into the detail toolbar', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=recipe-app-shell');

  const shell = page.locator('.catalog-shell');
  const sidebar = page.locator('.catalog-sidebar');
  const detail = page.locator('.catalog-detail');
  const logo = sidebar.locator('.catalog-mark');

  await expect(logo).toHaveAttribute('src', /assets\/logo(?:-[^/]+)?\.svg/);
  await expect(logo).toHaveAttribute('alt', '');
  await expect(sidebar.getByText('K', { exact: true })).toHaveCount(0);
  const wideGeometry = await headerGeometry(page);
  expect(wideGeometry).toMatchObject({
    subtitleBelowTitle: true,
  });
  expect(wideGeometry.collapseTitleCenterDelta).toBeLessThanOrEqual(1);
  expect(wideGeometry.logoTitleCenterDelta).toBeLessThanOrEqual(1);
  expect(wideGeometry.subtitleTitleLeftDelta).toBeLessThanOrEqual(1);

  if (browserName === 'chromium') {
    await page.screenshot({ path: '/private/tmp/kf-9as9zr-sidebar-brand-after.png', fullPage: true });
  }

  await sidebar.getByRole('button', { name: 'Collapse component catalog' }).click();
  await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'true');
  await expect(sidebar).toBeHidden();
  await expect(sidebar.getByRole('button', { name: 'Collapse component catalog' })).toHaveCount(0);

  const restore = detail.getByRole('button', { name: 'Expand component catalog' });
  await expect(restore).toBeVisible();
  await expect(restore).toBeFocused();
  expect(await restore.evaluate((element) => element === document.querySelector('.catalog-header .kui-toolbar__leading button'))).toBe(true);
  await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBeLessThanOrEqual(1);
  await expect.poll(async () => (await detail.boundingBox())?.x ?? -1).toBeLessThanOrEqual(1);

  if (browserName === 'chromium') {
    await page.screenshot({ path: '/private/tmp/kf-n3gy7h-collapsed-sidebar-after.png', fullPage: true });
  }

  await restore.click();
  await expect(sidebar).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await headerGeometry(page)).toMatchObject({
    subtitleBelowTitle: true,
  });
  if (browserName === 'chromium') {
    await page.screenshot({ path: '/private/tmp/kf-9as9zr-sidebar-brand-after-narrow.png', fullPage: true });
  }
  await sidebar.getByRole('button', { name: 'Collapse component catalog' }).click();
  await expect(detail.getByRole('button', { name: 'Expand component catalog' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

  if (browserName === 'chromium') {
    await page.screenshot({ path: '/private/tmp/kf-n3gy7h-collapsed-sidebar-after-narrow.png', fullPage: true });
  }
});
