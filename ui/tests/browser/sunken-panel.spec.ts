import { expect, test } from '@playwright/test';

test('SunkenPanel owns one lowered 8px inset and vertical content stack', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=sunken-panel');

  const named = page.getByRole('region', { name: 'Release workspace' });
  await expect(named).toBeVisible();
  const geometry = await named.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      display: style.display,
      direction: style.flexDirection,
      padding: style.paddingTop,
      gap: style.rowGap,
      background: style.backgroundColor,
      radius: style.borderRadius,
    };
  });
  expect(geometry).toMatchObject({
    display: 'flex',
    direction: 'column',
    padding: '8px',
    gap: '8px',
  });
  expect(geometry.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(geometry.radius).not.toBe('0px');
  await expect(named).toHaveAttribute('data-shape', 'rounded');

  const unnamed = page
    .locator('[data-demo="sunken-panel"] [data-component="sunken-panel"]')
    .nth(1);
  await expect(unnamed).not.toHaveAttribute('role');
  await expect(unnamed).not.toHaveAttribute('aria-label');
  await expect(unnamed).toHaveAttribute('data-shape', 'square');
  await expect(unnamed).toHaveCSS('border-radius', '0px');

  if (browserName === 'chromium')
    await page
      .locator('[data-demo="sunken-panel"]')
      .screenshot({ path: 'test-results/sunken-panel-shapes.png' });
});
