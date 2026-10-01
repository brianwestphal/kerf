import { expect, test } from '@playwright/test';

test('LucideIcon named and numeric sizes follow the root font scale', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=lucide-icon');
  const row = page.locator('[data-demo-icon-sizes]');
  const steps = [
    ['xs', 12],
    ['s', 16],
    ['m', 20],
    ['l', 24],
    ['xl', 32],
    ['30', 30],
  ] as const;
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    for (const rootSize of [16, 20]) {
      await page.evaluate((size) => {
        globalThis.document.documentElement.style.fontSize = `${size}px`;
      }, rootSize);
      for (const [step, pixels] of steps) {
        const icon = row.locator(`[data-size="${step}"]`);
        await expect(icon).toHaveCSS('width', `${(pixels / 16) * rootSize}px`);
        await expect(icon).toHaveCSS('height', `${(pixels / 16) * rootSize}px`);
        await expect(icon).toHaveAttribute('aria-hidden', 'true');
      }
    }
    await page.evaluate(() => {
      globalThis.document.documentElement.style.removeProperty('font-size');
    });
    await row.screenshot({
      path: testInfo.outputPath(`lucide-icon-sizes-${width}.png`),
    });
  }
});
