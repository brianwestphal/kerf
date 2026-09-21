import { expect, test } from '@playwright/test';

test('SunkenPanel owns one lowered 8px inset and vertical content stack', async ({
  page,
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
    };
  });
  expect(geometry).toMatchObject({
    display: 'flex',
    direction: 'column',
    padding: '8px',
    gap: '8px',
  });
  expect(geometry.background).not.toBe('rgba(0, 0, 0, 0)');

  const unnamed = page
    .locator('[data-demo="sunken-panel"] [data-component="sunken-panel"]')
    .nth(1);
  await expect(unnamed).not.toHaveAttribute('role');
  await expect(unnamed).not.toHaveAttribute('aria-label');
});
