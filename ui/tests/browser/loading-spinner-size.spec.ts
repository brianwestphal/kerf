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
      spinners.every((spinner) => {
        const { width, fontSize } = window.getComputedStyle(spinner);
        return width === fontSize;
      }),
    ),
  ).toBe(true);
  const inspect = async () =>
    sizes.locator('svg').evaluateAll((spinners) =>
      spinners.map((spinner) => {
        // A rotating SVG has a larger axis-aligned bounding box at an angle.
        const { width, height } = window.getComputedStyle(spinner);
        return {
          size: spinner.getAttribute('data-size'),
          width: Number.parseFloat(width),
          height: Number.parseFloat(height),
        };
      }),
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

test('LoadingSpinner rotates the outer SVG and respects reduced motion', async ({
  page,
}) => {
  await page.goto('/?component=loading-spinner');
  const spinner = page.locator('[data-demo-spinner-sizes] svg').first();
  await expect(spinner).toHaveCSS(
    'animation-name',
    'kui-loading-spinner-rotate',
  );
  await expect(spinner.locator('path')).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(spinner).toHaveCSS('animation-name', 'none');
});

test('LoadingSpinner colors inherit or paint the SVG inline', async ({
  page,
}) => {
  await page.goto('/?component=loading-spinner');
  const spinners = page.locator('[data-demo-spinner-colors] svg');
  await expect(spinners).toHaveCount(3);
  await expect(spinners.nth(0)).not.toHaveAttribute('style', /color:/);
  await expect(spinners.nth(1)).toHaveAttribute(
    'style',
    /color:var\(--kui-color-warning-on-quiet\)/,
  );
  await expect(spinners.nth(2)).toHaveCSS('color', 'rgb(102, 51, 153)');
  expect(
    await spinners
      .nth(0)
      .evaluate(
        (spinner) =>
          window.getComputedStyle(spinner).color ===
          window.getComputedStyle(spinner.parentElement!).color,
      ),
  ).toBe(true);
});
