import { expect, test } from '@playwright/test';

test('catalogs Workbench public geometry and controlled collapse', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=workbench');

  const demo = page.locator('[data-demo="workbench"]');
  const full = page.locator('#catalog-workbench-full');
  const collapsed = page.locator('#catalog-workbench-collapsed');
  await expect(demo).toBeVisible();
  await expect(full.locator('[data-workbench-rail]')).toHaveCount(2);
  await expect(full.locator('[data-workbench-drawer]')).toHaveCount(1);
  await expect(full.locator('[data-workbench-rail="left"]')).toHaveCSS(
    'width',
    '280px',
  );
  await expect(collapsed.locator('[data-workbench-rail="left"]')).toHaveCSS(
    'width',
    '0px',
  );
  await expect(collapsed.locator('[data-workbench-drawer]')).toHaveCSS(
    'height',
    '0px',
  );
  await expect
    .poll(() =>
      demo.evaluate((element) => element.scrollWidth <= element.clientWidth),
    )
    .toBe(true);
  if (testInfo.project.name === 'chromium')
    await demo.screenshot({ path: 'test-results/workbench-catalog-wide.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(demo).toBeVisible();
  await expect(full).toBeHidden();
  await expect(
    page.getByText('Workbench is a desktop-class shell.'),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  if (testInfo.project.name === 'chromium')
    await page.screenshot({
      path: 'test-results/workbench-catalog-narrow.png',
      fullPage: true,
    });
});
