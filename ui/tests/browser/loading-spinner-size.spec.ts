import { expect, test } from '@playwright/test';

test('LoadingSpinner sizes match the icon scale at wide and narrow widths', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=loading-spinner');
  const sizes = page.locator('[data-demo-spinner-sizes]');
  const defaults = page.locator(
    '[data-demo="loading-spinner"] .kui-loading-spinner:not([data-size])',
  );
  expect(await defaults.count()).toBe(2);
  expect(
    await defaults.evaluateAll((spinners) =>
      spinners.every(
        (spinner) =>
          spinner.getBoundingClientRect().width ===
          Number.parseFloat(window.getComputedStyle(spinner).fontSize),
      ),
    ),
  ).toBe(true);
  const inspect = async () =>
    sizes.locator('svg').evaluateAll((spinners) =>
      spinners.map((spinner) => ({
        size: spinner.getAttribute('data-size'),
        width: spinner.getBoundingClientRect().width,
        height: spinner.getBoundingClientRect().height,
      })),
    );

  expect(await inspect()).toEqual([
    { size: 'xs', width: 12, height: 12 },
    { size: 's', width: 16, height: 16 },
    { size: 'm', width: 20, height: 20 },
    { size: 'l', width: 24, height: 24 },
    { size: 'xl', width: 32, height: 32 },
    { size: '30', width: 30, height: 30 },
  ]);
  await sizes.screenshot({
    path: `test-results/loading-spinner-sizes-${testInfo.project.name}-wide.png`,
  });
  if (testInfo.project.name === 'chromium')
    await page.locator('[data-demo="loading-spinner"]').screenshot({
      path: 'test-results/loading-spinner-demo-wide.png',
    });
  if (testInfo.project.name === 'chromium')
    await page.screenshot({
      path: 'test-results/loading-spinner-page-wide.png',
    });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await inspect()).toEqual([
    { size: 'xs', width: 12, height: 12 },
    { size: 's', width: 16, height: 16 },
    { size: 'm', width: 20, height: 20 },
    { size: 'l', width: 24, height: 24 },
    { size: 'xl', width: 32, height: 32 },
    { size: '30', width: 30, height: 30 },
  ]);
  await sizes.screenshot({
    path: `test-results/loading-spinner-sizes-${testInfo.project.name}-narrow.png`,
  });
  if (testInfo.project.name === 'chromium')
    await page.locator('[data-demo="loading-spinner"]').screenshot({
      path: 'test-results/loading-spinner-demo-narrow.png',
    });
  if (testInfo.project.name === 'chromium')
    await page.screenshot({
      path: 'test-results/loading-spinner-page-narrow.png',
    });
});
