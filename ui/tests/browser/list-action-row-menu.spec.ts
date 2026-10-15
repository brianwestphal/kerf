import { expect, test } from '@playwright/test';

test('ListActionRow trailing menu opens from its trigger, reveals on interaction, and opens at the pointer on right-click', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=list-action-row');
  const row = page.locator('[data-demo-action-row="menu"]');
  const primary = row.locator('.kui-list-action-row__primary');
  const menu = row.locator(':scope > [data-component="popup-menu"]');
  const trigger = menu.getByRole('button', { name: 'Actions for Run Tests' });
  const log = page.locator('.catalog-log');
  await expect(trigger).toBeAttached();

  // The trigger is the row's sibling trailing control: a 44px pill beside the
  // primary button, filling the row's height.
  const rowBox = (await row.boundingBox())!;
  const menuBox = (await menu
    .locator(':scope > .kui-popup-menu__trigger')
    .boundingBox())!;
  expect(Math.round(menuBox.width)).toBe(44);
  expect(Math.round(menuBox.height)).toBe(Math.round(rowBox.height));
  expect(
    Math.abs(menuBox.x + menuBox.width - (rowBox.x + rowBox.width)),
  ).toBeLessThanOrEqual(1);

  // Interaction visibility: hidden at rest, revealed on row hover.
  const triggerOpacity = () =>
    menu
      .locator(':scope > .kui-popup-menu__trigger')
      .evaluate((element) => window.getComputedStyle(element).opacity);
  await page.mouse.move(0, 0);
  await expect.poll(triggerOpacity).toBe('0');
  if (browserName === 'chromium')
    await row.screenshot({
      path: 'test-results/list-action-row-menu-rest-wide.png',
    });
  await primary.hover();
  await expect.poll(triggerOpacity).toBe('1');
  if (browserName === 'chromium')
    await row.screenshot({
      path: 'test-results/list-action-row-menu-hover-wide.png',
    });

  // The trigger opens the menu below it, end-aligned, and the chosen command
  // dispatches its own data-action.
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const edit = menu.getByRole('menuitem', { name: 'Edit' });
  await expect(edit).toBeVisible();
  // Placement lands in the frame after opening; wait for it to settle.
  await expect
    .poll(async () => (await edit.boundingBox())!.y)
    .toBeGreaterThanOrEqual(menuBox.y + menuBox.height - 1);
  // While the menu is open the trigger stays visible off hover.
  await page.mouse.move(0, 0);
  await expect.poll(triggerOpacity).toBe('1');
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/list-action-row-menu-open-wide.png',
    });
  await edit.click();
  await expect(log).toHaveText('Edit run-tests');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  // The primary action still selects the row.
  await primary.click();
  await expect(log).toHaveText('run-tests selected');
  await expect(row).toHaveAttribute('data-selected', 'true');

  // Right-click on the primary opens the same menu at the pointer.
  await primary.click({ button: 'right', position: { x: 40, y: 10 } });
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const pointerEdit = menu.getByRole('menuitem', { name: 'Edit' });
  await expect(pointerEdit).toBeVisible();
  const primaryBox = (await primary.boundingBox())!;
  await expect
    .poll(async () => (await pointerEdit.boundingBox())!.y)
    .toBeGreaterThanOrEqual(primaryBox.y + 10);
  const panel = (await pointerEdit.boundingBox())!;
  // The menu sits at the pointer, well left of the trailing trigger.
  expect(panel.x).toBeLessThan(primaryBox.x + 40 + 24);
  expect(panel.x).toBeGreaterThanOrEqual(primaryBox.x + 40 - 24);
  expect(panel.y).toBeGreaterThanOrEqual(primaryBox.y + 10);
  expect(panel.y).toBeLessThan(primaryBox.y + 10 + 40);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/list-action-row-menu-context-wide.png',
    });
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(pointerEdit).toBeHidden();

  // After a pointer opening, the trigger anchors the menu again.
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const reopenedEdit = menu.getByRole('menuitem', { name: 'Edit' });
  const triggerBox = (await menu
    .locator(':scope > .kui-popup-menu__trigger')
    .boundingBox())!;
  await expect
    .poll(async () => (await reopenedEdit.boundingBox())!.y)
    .toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height - 1);
  const reopened = (await reopenedEdit.boundingBox())!;
  expect(reopened.x).toBeGreaterThan(primaryBox.x + 120);
  await menu.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(log).toHaveText('Delete run-tests');

  // A row without a trailing menu keeps its own context-menu handling.
  const selectedPrimary = page
    .locator('[data-demo-action-row="selected"]')
    .locator('.kui-list-action-row__primary');
  await selectedPrimary.click({ button: 'right' });
  await expect(log).toHaveText('Context menu for src/main.ts primary');

  // Narrow width: the row, trigger, and pointer-opened menu fit the viewport.
  await page.setViewportSize({ width: 390, height: 844 });
  await primary.hover();
  await expect.poll(triggerOpacity).toBe('1');
  if (browserName === 'chromium')
    await row.screenshot({
      path: 'test-results/list-action-row-menu-hover-narrow.png',
    });
  await primary.click({ button: 'right', position: { x: 200, y: 10 } });
  await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  const narrowDelete = (await menu
    .getByRole('menuitem', { name: 'Delete' })
    .boundingBox())!;
  expect(narrowDelete.x + narrowDelete.width).toBeLessThanOrEqual(390);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/list-action-row-menu-context-narrow.png',
    });
  await page.keyboard.press('Escape');
  await trigger.click();
  await expect(menu.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/list-action-row-menu-open-narrow.png',
    });
});
