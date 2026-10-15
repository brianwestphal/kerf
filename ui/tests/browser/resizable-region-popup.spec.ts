import { expect, type Locator, test } from '@playwright/test';

/** Whether the item is what a pointer at its center would hit (not clipped). */
const reachable = (item: Locator) =>
  item.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );
    return hit === element || element.contains(hit);
  });

// A PopupMenu opens in the top layer, which no ancestor's overflow clips, so
// a clipping region around it keeps clipping its own content while the menu
// shows in full.
test('a PopupMenu in a clipping ResizableRegion shows in full while the region keeps clipping', async ({
  page,
}) => {
  await page.goto('/?component=resize');
  const region = page.locator(
    '.kui-resizable-region[data-region-id="catalog-menu-drawer"]',
  );
  const content = region.locator(':scope > .kui-resizable-region__content');
  const menu = region.locator('.kui-popup-menu');
  const trigger = menu.getByRole('button', { name: 'Create Item' });
  await expect(region).toHaveAttribute('data-content-overflow', 'clip');
  await expect(content).toHaveCSS('overflow', 'hidden');
  for (let cycle = 0; cycle < 2; cycle++) {
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(content).toHaveCSS('overflow', 'hidden');
    const item = menu.getByRole('menuitem', { name: 'New Terminal' });
    await expect(item).toBeVisible();
    await expect.poll(() => reachable(item)).toBe(true);
    await item.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(content).toHaveCSS('overflow', 'hidden');
  }
});

test('a PopupMenu in a resizable Workbench drawer opens above the drawer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=workbench');
  const drawer = page.locator(
    '#catalog-workbench-resizable [data-workbench-drawer]',
  );
  const content = drawer.locator(':scope > .kui-workbench__panel-content');
  const menu = drawer.locator('.kui-popup-menu');
  const trigger = menu.getByRole('button', { name: 'Create Item' });
  await expect(drawer).toHaveAttribute('data-content-overflow', 'auto');
  await expect(content).toHaveCSS('overflow', 'auto');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(content).toHaveCSS('overflow', 'auto');
  const item = menu.getByRole('menuitem', { name: 'New Terminal' });
  await expect(item).toBeVisible();
  await expect
    .poll(async () => (await item.boundingBox())!.y)
    .toBeLessThan((await drawer.boundingBox())!.y);
  await expect.poll(() => reachable(item)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});
