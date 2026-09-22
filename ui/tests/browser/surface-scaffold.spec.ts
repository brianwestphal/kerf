import { expect, test } from '@playwright/test';

test('applies typed dialog and popup surface geometry', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=surface-scaffold');
  const demo = page.locator('[data-demo="surface-scaffold"]');
  await expect(demo).toBeVisible();

  await demo.getByRole('button', { name: 'Open dialog' }).click();
  const dialog = page.locator('#catalog-wa-dialog');
  await expect(dialog).toHaveAttribute('open', '');
  const dialogGeometry = await dialog.evaluate((element) => {
    const root = element.shadowRoot!;
    const panel = root.querySelector('[part~="dialog"]')!;
    const body = root.querySelector('[part~="body"]')!;
    const footer = root.querySelector('[part~="footer"]')!;
    return {
      width: Math.round(panel.getBoundingClientRect().width),
      bodyPadding: window.getComputedStyle(body).padding,
      footerPadding: window.getComputedStyle(footer).padding,
    };
  });
  expect(dialogGeometry.width).toBeLessThanOrEqual(560);
  expect(dialogGeometry.bodyPadding).toBe('8px');
  expect(dialogGeometry.footerPadding).toBe('16px');
  await page.screenshot({
    path: testInfo.outputPath('dialog-surface.png'),
    fullPage: true,
  });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toHaveAttribute('open', '');

  const dropdown = demo.locator('wa-dropdown');
  await dropdown.getByRole('button', { name: 'Choose view' }).click();
  await expect(dropdown.locator('wa-dropdown-item').first()).toBeVisible();
  expect(
    await dropdown.evaluate(
      (element) =>
        window.getComputedStyle(
          element.shadowRoot!.querySelector('[part~="menu"]')!,
        ).padding,
    ),
  ).toBe('0px');
});
