import { expect, test } from '@playwright/test';

const surface = '[data-component="anchored-surface"]';

test('element help owns focus, dismissal, and visible surface at wide and narrow widths', async ({
  page,
}, testInfo) => {
  for (const width of [1180, 390]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto('/?component=anchored-surface');
    const trigger = page.getByRole('button', { name: 'Explain this field' });
    // A pointer click must restore focus even in WebKit, which does not focus
    // buttons on pointer press by default.
    await trigger.click();
    const help = page.locator(surface);
    await expect(help).toBeVisible();
    await expect(help).toHaveAttribute('role', 'dialog');
    await expect(help).toHaveAttribute('aria-label', 'Field help');
    await expect(help.getByRole('button', { name: 'Got it' })).toBeFocused();
    const rect = await help.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(width + 1);
    await page.screenshot({
      path: `test-results/anchored-surface-${width}-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await expect(help).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await help.getByRole('button', { name: 'Got it' }).click();
    await expect(help).toHaveCount(0);
  }
});

test('pointer location clamps into a narrow viewport and dismisses outside', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/?component=anchored-surface');
  const trigger = page.getByRole('button', { name: 'Open at pointer' });
  await trigger.click();
  const help = page.locator(surface);
  await expect(help).toBeVisible();
  const rect = await help.boundingBox();
  expect(rect).not.toBeNull();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(376);
  await page.locator('body').click({ position: { x: 4, y: 4 } });
  await expect(help).toHaveCount(0);
});

test('interactive help remains usable inside a modal dialog', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto('/?component=anchored-surface');
  await page.getByRole('button', { name: 'Open dialog' }).click();
  const modal = page.locator('[data-anchored-surface-modal]');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Explain in dialog' }).click();
  const help = page.locator(surface);
  await expect(help).toBeVisible();
  expect(
    await help.evaluate((element) =>
      Boolean(element.closest('[data-kerf-overlay-host]')),
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/anchored-surface-modal-narrow-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await help.getByRole('button', { name: 'Got it' }).click();
  await expect(help).toHaveCount(0);
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Explain in dialog' }).click();
  await expect(help).toBeVisible();
  await modal.evaluate((dialog: HTMLDialogElement) => dialog.close());
  await expect(help).toHaveCount(0);
  await expect(modal).not.toBeVisible();
  await page.getByRole('button', { name: 'Open dialog' }).click();
  await modal.getByRole('button', { name: 'Close dialog' }).click();
  await expect(modal).not.toBeVisible();
});
