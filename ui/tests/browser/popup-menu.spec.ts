import { expect, test } from '@playwright/test';

test('PopupMenu opens from its toolbar trigger and dispatches the chosen command', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  const demo = page.locator('[data-demo="popup-menu"]');
  const sort = demo.locator('[data-component="popup-menu"]').first();
  const trigger = sort.getByRole('button', { name: 'Sort tickets' });
  await expect(trigger).toBeVisible();

  // The toolbar group sizes the trigger as a 40px toolbar control.
  const box = await trigger.boundingBox();
  expect(box?.height).toBeCloseTo(40, 0);

  await trigger.click();
  const priority = sort.getByRole('menuitem', { name: 'Priority' });
  await expect(priority).toBeVisible();
  await priority.click();
  await expect(page.locator('.catalog-log')).toHaveText('Sorted by priority');
  await expect(priority).toBeHidden();

  // Keyboard: Enter opens the menu, arrows move, Enter chooses.
  await trigger.focus();
  await page.keyboard.press('Enter');
  const recent = sort.getByRole('menuitem', { name: 'Recently updated' });
  await expect(recent).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(sort.getByRole('menuitem', { name: 'Priority' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(recent).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText(
    'Sorted by recently updated',
  );

  // Headings, dividers, item icons, and disabled items.
  const grouped = demo.locator('[data-component="popup-menu"]').nth(1);
  await grouped.getByRole('button', { name: 'Actions' }).click();
  await expect(
    grouped.locator('.kui-popup-menu__heading', { hasText: 'Ticket' }),
  ).toBeVisible();
  await expect(grouped.locator('wa-divider')).toHaveCount(1);
  await expect(
    grouped.locator('wa-dropdown-item [slot="icon"] [data-lucide="copy"]'),
  ).toBeVisible();
  await expect(
    grouped.getByRole('menuitem', { name: 'Delete' }),
  ).toHaveAttribute('aria-disabled', 'true');
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-grouped.png' });
  await page.keyboard.press('Escape');
  await expect(
    grouped.getByRole('menuitem', { name: 'Duplicate' }),
  ).toBeHidden();
});
