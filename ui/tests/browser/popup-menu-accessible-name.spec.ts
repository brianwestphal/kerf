import { expect, test } from '@playwright/test';

// PopupMenu names each menu panel (role="menu") from the label it already
// knows: the root menu from its trigger, a submenu from its item. These
// checks query the accessibility tree by name.
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=popup-menu');
});

test('an icon-only trigger names its open menu', async ({ page }) => {
  const demo = page.locator('[data-demo="popup-menu"]');
  const sort = demo.locator('[data-component="popup-menu"]').first();
  await sort.getByRole('button', { name: 'Sort Tickets' }).click();
  const menu = sort.getByRole('menu', { name: 'Sort Tickets', exact: true });
  await expect(menu).toBeVisible();
});

test('a text trigger and its submenu name their open menus', async ({
  page,
}) => {
  const demo = page.locator('[data-demo="popup-menu"]');
  const decide = demo
    .locator('[data-component="popup-menu"][data-trigger="button"]')
    .filter({ has: page.locator('[data-submenu]') });
  await decide.getByRole('button', { name: 'Decide' }).focus();
  await page.keyboard.press('Enter');
  const menu = decide.getByRole('menu', { name: 'Decide', exact: true });
  await expect(menu).toHaveCount(1);
  await expect(menu).toBeVisible();

  const item = decide.getByRole('menuitem', { name: 'Decide', exact: true });
  await expect(item).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(decide.locator('[data-decision="approve"]')).toBeFocused();
  // The submenu is named by its parent item, alongside the top-level menu.
  await expect(
    decide.getByRole('menu', { name: 'Decide', exact: true }),
  ).toHaveCount(2);
});

test('a context menu and its submenu are named', async ({ page }) => {
  const demo = page.locator('[data-demo="popup-menu"]');
  const context = demo.locator('[data-popup-context-menu]');
  await demo.locator('[data-popup-menu-context-target]').click({
    button: 'right',
  });
  await expect(
    context.locator(':scope > .kui-popup-menu__context-anchor'),
  ).toHaveAttribute('aria-expanded', 'true');
  const menu = context.getByRole('menu', {
    name: 'Demand Actions',
    exact: true,
  });
  await expect(menu).toBeVisible();
  await expect(page.getByRole('menu', { name: 'Demand Actions' })).toHaveCount(
    1,
  );

  await context.getByRole('menuitem', { name: 'More Actions' }).hover();
  const submenu = context.getByRole('menu', {
    name: 'More Actions',
    exact: true,
  });
  await expect(submenu).toBeVisible();
  await expect(
    context.getByRole('menuitem', { name: 'Copy Reference' }),
  ).toBeVisible();
});

for (const width of [390, 1280]) {
  test(`record commands expose the secondary line as their description at ${width}px`, async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    const trigger = page.getByRole('button', { name: 'Recent Tickets' });
    await trigger.click();
    const menu = page.getByRole('menu', { name: 'Recent Tickets' });
    const item = menu.getByRole('menuitem', { name: 'KF-104', exact: true });
    await expect(item).toHaveAccessibleDescription(
      'Keep the active project visible when the navigation panel opens',
    );
    await expect(item.getByText('Draft')).toBeVisible();
    const layout = await item.evaluate((element) => {
      const label = element
        .querySelector('.kui-popup-menu__item-label')!
        .getBoundingClientRect();
      const desc = element
        .querySelector('.kui-popup-menu__description')!
        .getBoundingClientRect();
      const details = element
        .querySelector('.kui-popup-menu__details')!
        .getBoundingClientRect();
      return {
        stacked: desc.top >= label.bottom - 1,
        fits: desc.right <= details.left + 1,
        overflow: element.scrollWidth - element.clientWidth,
      };
    });
    expect(layout).toEqual({ stacked: true, fits: true, overflow: 0 });
    if (browserName === 'chromium')
      await menu.screenshot({
        path: `test-results/popup-menu-records-${width}.png`,
        animations: 'disabled',
      });
  });
}
