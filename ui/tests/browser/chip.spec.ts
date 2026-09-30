import { expect, test } from '@playwright/test';

test('Chip delegates removal, sizes its compact control, and disables unavailable removal', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=chip');
  const demo = page.locator('[data-demo="chip"]');
  const urgent = demo.locator('[data-component="chip"][data-item-id="urgent"]');
  const removeUrgent = urgent.getByRole('button', {
    name: 'Remove Urgent tag',
  });
  await expect(urgent).toHaveAttribute('data-tone', 'brand');
  await expect(removeUrgent).toHaveAttribute('data-action', 'log-chip-remove');
  await removeUrgent.click();
  await expect(page.locator('.catalog-log')).toHaveText('Remove tag: urgent');

  const compact = demo.locator('[data-item-id="reviewed"]');
  const compactButton = compact.getByRole('button', {
    name: 'Remove Reviewed tag',
  });
  await expect(compact).toHaveAttribute('data-size', 'compact');
  const compactBox = await compact.boundingBox();
  const buttonBox = await compactButton.boundingBox();
  expect(compactBox?.height).toBe(20);
  expect(buttonBox?.width).toBe(16);
  await compactButton.focus();
  await expect(compactButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText('Remove tag: reviewed');

  const locked = demo.locator('[data-item-id="locked"]');
  await expect(locked).toHaveAttribute('data-disabled', '');
  await expect(
    locked.getByRole('button', { name: 'Remove Locked tag' }),
  ).toBeDisabled();
  await expect(demo.locator('[data-component="chip"]')).toHaveCount(4);
  await expect(
    demo.locator('[data-component="chip"]').last().locator('button'),
  ).toHaveCount(0);
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/chip-wide.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(removeUrgent).toBeVisible();
  await expect(compactButton).toBeVisible();
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/chip-narrow.png' });
});
