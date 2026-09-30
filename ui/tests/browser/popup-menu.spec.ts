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

test('nested choices, selected details, disabled commands, and context opening work', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  const demo = page.locator('[data-demo="popup-menu"]');
  const nested = demo.locator('[data-component="popup-menu"]').filter({
    has: page.locator('wa-dropdown-item[slot="submenu"]'),
  });
  const trigger = nested.getByRole('button', { name: 'Decide' });
  await page.evaluate(() => {
    document.body.dataset.testSelectCount = '0';
    document.addEventListener('wa-select', (event) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.querySelector('wa-dropdown-item[slot="submenu"]')
      )
        return;
      document.body.dataset.testSelectCount = String(
        Number(document.body.dataset.testSelectCount) + 1,
      );
    });
  });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(nested).toHaveAttribute('open', '');
  await expect(nested.getByRole('menuitem', { name: 'Updated' })).toBeFocused();
  await expect(
    nested.locator('.kui-popup-menu__details [data-lucide]'),
  ).toBeVisible();
  const parent = nested.locator(
    'wa-dropdown-item:has(> wa-dropdown-item[slot="submenu"])',
  );
  const approve = parent.locator('wa-dropdown-item[slot="submenu"]').first();
  const reject = parent.locator('wa-dropdown-item[slot="submenu"]').last();
  await expect(parent).toHaveJSProperty('hasSubmenu', true);
  await expect(parent).toHaveJSProperty('submenuOpen', false);
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(parent).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(parent).toHaveJSProperty('submenuOpen', true);
  await expect(approve).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText('Decision: approve');
  await expect(page.locator('body')).toHaveAttribute(
    'data-test-select-count',
    '1',
  );

  await trigger.click();
  await parent.hover();
  await expect(approve).toBeVisible();
  await expect(approve).toHaveAttribute('checked', '');
  await expect(reject).toHaveAttribute('aria-disabled', 'true');
  await expect(reject).toHaveAttribute('title', 'A price is required');
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-nested-wide.png' });
  await approve.click();
  await expect(page.locator('.catalog-log')).toHaveText('Decision: approve');
  await expect(page.locator('body')).toHaveAttribute(
    'data-test-select-count',
    '2',
  );

  const context = demo.locator('[data-popup-context-menu]');
  const row = demo.locator('[data-popup-menu-context-target]');
  await row.click({ button: 'right', position: { x: 20, y: 12 } });
  const rowBox = await row.boundingBox();
  await expect(context).toHaveAttribute('open', '');
  await expect(
    demo.getByRole('button', { name: 'Demand actions' }),
  ).toBeDisabled();
  const anchorBox = await context.locator('[slot="trigger"]').boundingBox();
  expect(Math.abs(anchorBox!.x - (rowBox!.x + 20))).toBeLessThanOrEqual(2);
  expect(Math.abs(anchorBox!.y - (rowBox!.y + 12))).toBeLessThanOrEqual(2);
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/popup-menu-context-wide.png' });
  await context.getByRole('menuitem', { name: 'Open' }).click();
  await expect(page.locator('.catalog-log')).toHaveText(
    'Context demand opened',
  );
  await expect(context).not.toHaveAttribute('open', '');

  await page.setViewportSize({ width: 390, height: 844 });
  await row.click({ button: 'right', position: { x: 20, y: 12 } });
  await expect(context.getByRole('menuitem', { name: 'Open' })).toBeVisible();
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/popup-menu-context-narrow.png',
    });
});
