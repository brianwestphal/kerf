import { expect, test } from '@playwright/test';

test('applies typed lengths and direct List spacing shorthands in a real browser', async ({
  browserName,
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=list');

  const content = page.locator('[data-demo="list"] .demo-list__content');
  await expect(content).toHaveCSS('gap', '24px');
  await expect(content).toHaveAttribute(
    'style',
    '--_kui-list-gap:var(--kui-space-l);--_kui-list-flex:1 1 auto',
  );

  const tools = content.locator('section').nth(1).locator('.kui-list');
  await expect(tools).toHaveCSS('gap', '8px');
  await expect(tools).toHaveAttribute(
    'style',
    '--_kui-list-gap:var(--kui-space-xs)',
  );

  if (browserName === 'chromium') {
    await page.screenshot({
      path: 'test-results/css-values-list-wide.png',
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(content).toHaveCSS('gap', '24px');
    await expect(tools).toHaveCSS('gap', '8px');
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: 'test-results/css-values-list-narrow.png',
      fullPage: true,
    });
  }
});
