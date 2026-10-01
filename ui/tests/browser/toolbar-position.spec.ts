import { expect, test } from '@playwright/test';

test('catalog resource toolbar uses footer semantics', async ({ page }) => {
  await page.goto('/?component=toolbar');
  const pane = page
    .locator('#kui-catalog > .kui-workbench__center [data-component="pane"]')
    .first();
  await expect(
    pane.locator(':scope > .kui-pane__header .kui-toolbar').first(),
  ).toHaveJSProperty('tagName', 'HEADER');
  await expect(
    pane.locator(':scope > .kui-pane__footer .kui-toolbar').first(),
  ).toHaveJSProperty('tagName', 'FOOTER');
});

test('Workbench main bottom toolbar uses footer semantics', async ({
  page,
}) => {
  await page.goto('/?component=workbench');
  const workbench = page.locator('#catalog-workbench-responsive-drawer');
  await expect(
    workbench.locator('[data-workbench-main] .kui-pane__footer .kui-toolbar'),
  ).toHaveJSProperty('tagName', 'FOOTER');
  await expect(
    workbench.locator('[data-workbench-main] .kui-pane__header .kui-toolbar'),
  ).toHaveJSProperty('tagName', 'HEADER');
});
