import { expect, test } from '@playwright/test';

test('avatar imagery belongs to the group or selected highlight', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=toolbar-control-group');

  const single = page.getByRole('group', { name: 'Profile', exact: true });
  await expect(single.locator('img')).toHaveCount(0);
  await expect(single).toHaveCSS('background-size', 'contain');
  expect(
    await single.evaluate(
      (node) => window.getComputedStyle(node).backgroundImage,
    ),
  ).toContain('logo');
  await expect(single.getByRole('button')).toHaveCSS(
    'background-image',
    'none',
  );

  const choices = page.getByRole('group', { name: 'Profile view' });
  const primary = choices.getByRole('button', { name: 'Primary profile' });
  const secondary = choices.getByRole('button', {
    name: 'Secondary profile',
  });
  await expect(choices).toHaveCSS('background-image', 'none');
  expect(
    await primary.evaluate(
      (node) => window.getComputedStyle(node).backgroundImage,
    ),
  ).toContain('logo');
  await expect(secondary).toHaveCSS('background-image', 'none');

  await secondary.click();
  await expect(secondary).toHaveAttribute('aria-pressed', 'true');
  expect(
    await secondary.evaluate(
      (node) => window.getComputedStyle(node).backgroundImage,
    ),
  ).toContain('logo');
  await expect(primary).toHaveCSS('background-image', 'none');

  if (browserName === 'chromium') {
    await single.screenshot({ path: 'test-results/avatar-single-wide.png' });
    await choices.screenshot({ path: 'test-results/avatar-multi-wide.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await single.screenshot({ path: 'test-results/avatar-single-narrow.png' });
    await choices.screenshot({ path: 'test-results/avatar-multi-narrow.png' });
  }
});
