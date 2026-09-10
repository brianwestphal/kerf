import { expect, test } from '@playwright/test';

test('catalog routes every production component family and supports its stateful controls', async ({ page, browserName }) => {
  await page.goto('/');
  await expect(page.locator('.catalog-sidebar [data-component="menu-header"]')).toHaveCount(4);
  await expect(page.locator('.catalog-sidebar [data-component="menu-item"]')).toHaveCount(7);
  await expect(page.locator('[data-demo="toolbar"]')).toBeVisible();
  await page.locator('.catalog-sidebar [data-item-id="menu"]').click();
  await expect(page).toHaveURL(/component=menu/);
  await expect(page.locator('[data-demo="menu"]')).toBeVisible();
  await expect(page.locator('.catalog-sidebar [data-item-id="menu"]')).toHaveAttribute('aria-current', 'page');

  const themeButton = page.locator('[data-action="toggle-theme"]');
  await themeButton.click();
  await expect(themeButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveClass(/demo-dark/);
  await page.locator('[data-action="toggle-contrast"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-contrast/);
  await page.locator('[data-action="toggle-motion"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-reduced-motion/);

  await page.locator('.catalog-sidebar [data-item-id="tabs"]').click();
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').click();
  await expect(page.locator('[data-action="select-tab"][data-tab-id="guidelines"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').press('Backspace');
  await expect(page.locator('.catalog-log')).toHaveText('Close requested for guidelines');
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').press('ArrowRight');
  await expect(page.locator('[data-action="select-tab"][data-tab-id="catalog"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('[data-action="select-tab"][data-tab-id="catalog"]').press('Home');
  await expect(page.locator('[data-action="select-tab"][data-tab-id="library"]')).toHaveAttribute('aria-selected', 'true');

  await page.locator('.catalog-sidebar [data-item-id="feedback"]').click();
  await page.locator('[data-action="cycle-tone"]').click();
  await page.locator('[data-action="cycle-tone"]').click();
  await page.locator('[data-action="cycle-tone"]').click();
  await expect(page.locator('[data-component="state-banner"]')).toHaveAttribute('data-tone', 'danger');
  await expect(page.locator('[data-component="state-banner"]')).toHaveAttribute('role', 'alert');

  await page.goto('/?component=resize');
  const handle = page.locator('[data-kui-resize-handle]');
  await handle.focus();
  await handle.press('ArrowRight');
  await expect(page.locator('[data-region-size]')).toHaveText('292px');
  await handle.press('End');
  await expect(page.locator('[data-region-size]')).toHaveText('420px');

  await page.goto('/?component=select');
  await page.locator('wa-select').evaluate((element) => {
    const select = element as HTMLElement & { value: string };
    select.value = 'explicit';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('[data-select-value]')).toHaveText('explicit');

  if (browserName === 'chromium') {
    await page.goto('/');
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.screenshot({ path: 'test-results/ux-demo-wide.png', fullPage: true });
    await page.locator('[data-action="toggle-theme"]').click();
    await page.screenshot({ path: 'test-results/ux-demo-dark.png', fullPage: true });
    await page.goto('/');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/ux-demo-narrow.png', fullPage: true });
  }
});
