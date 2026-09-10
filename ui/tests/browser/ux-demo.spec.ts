import { expect, test } from '@playwright/test';

test('catalog routes every production component family and supports its stateful controls', async ({ page, browserName }) => {
  await page.goto('/');
  await expect(page.locator('[data-catalog-card]')).toHaveCount(7);
  await expect(page.locator('wa-select')).toHaveCount(1);
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').click();
  await expect(page.locator('[data-action="select-tab"][data-tab-id="guidelines"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').press('Backspace');
  await expect(page.locator('.catalog-log')).toHaveText('Close requested for guidelines');
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').press('ArrowRight');
  await expect(page.locator('[data-action="select-tab"][data-tab-id="catalog"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('[data-action="select-tab"][data-tab-id="catalog"]').press('Home');
  await expect(page.locator('[data-action="select-tab"][data-tab-id="library"]')).toHaveAttribute('aria-selected', 'true');
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
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/ux-demo-narrow.png', fullPage: true });
  }
});
