import { expect, test } from '@playwright/test';

test('ResizableRegion releases clipping only during its descendant PopupMenu lifecycle', async ({
  page,
}) => {
  await page.goto('/?component=resize');
  const region = page.locator(
    '.kui-resizable-region[data-region-id="catalog-menu-drawer"]',
  );
  const content = region.locator(':scope > .kui-resizable-region__content');
  const menu = region.locator('wa-dropdown.kui-popup-menu');
  const trigger = menu.getByRole('button', { name: 'Create item' });
  await expect(region).toHaveAttribute('data-content-overflow', 'clip');
  await expect(content).toHaveCSS('overflow', 'hidden');
  for (let cycle = 0; cycle < 2; cycle++) {
    await trigger.click();
    await expect(menu).toHaveAttribute('open', '');
    await expect(region).toHaveCSS('z-index', '5');
    await expect(content).toHaveCSS('overflow', 'visible');
    await expect(
      menu.getByRole('menuitem', { name: 'New terminal' }),
    ).toBeVisible();
    await menu.getByRole('menuitem', { name: 'New terminal' }).click();
    await expect(menu).not.toHaveAttribute('open');
    await expect(content).toHaveCSS('overflow', 'hidden');
  }
});

test('resizable Workbench drawer releases rail and content clipping for PopupMenu', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=workbench');
  const drawer = page.locator(
    '#catalog-workbench-resizable [data-workbench-drawer]',
  );
  const content = drawer.locator(':scope > .kui-workbench__panel-content');
  const menu = drawer.locator('wa-dropdown.kui-popup-menu');
  const trigger = menu.getByRole('button', { name: 'Create item' });
  await expect(drawer).toHaveAttribute('data-content-overflow', 'auto');
  await expect(content).toHaveCSS('overflow', 'auto');
  await trigger.click();
  await expect(menu).toHaveAttribute('open', '');
  await expect(drawer).toHaveCSS('overflow', 'visible');
  await expect(drawer).toHaveCSS('z-index', '5');
  await expect(content).toHaveCSS('overflow', 'visible');
  const item = menu.getByRole('menuitem', { name: 'New terminal' });
  await expect(item).toBeVisible();
  expect((await item.boundingBox())!.y).toBeLessThan(
    (await drawer.boundingBox())!.y,
  );
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open');
  await expect(content).toHaveCSS('overflow', 'auto');
});
