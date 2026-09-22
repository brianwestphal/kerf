import type { Locator } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function contrastRatio(element: Locator): Promise<number> {
  return element.evaluate((node) => {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return 0;
    const luminance = (color: string) => {
      context.canvas.width = 1;
      context.canvas.height = 1;
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const channels = [
        ...context.getImageData(0, 0, 1, 1).data.slice(0, 3),
      ].map((channel) => {
        const value = channel / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
      return (
        0.2126 * (channels[0] ?? 0) +
        0.7152 * (channels[1] ?? 0) +
        0.0722 * (channels[2] ?? 0)
      );
    };
    const style = window.getComputedStyle(node);
    const foreground = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return (
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05)
    );
  });
}

test('pop stays attractive and readable across themes, contrast, and typed surfaces', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=foundation');
  const foundation = page.locator('[data-demo="foundation"]');
  const popTile = foundation.locator('.demo-foundation__tone--pop');
  await expect(popTile).toBeVisible();
  await expect(popTile).toHaveCSS('color', 'rgb(121, 36, 152)');
  await expect.poll(() => contrastRatio(popTile)).toBeGreaterThanOrEqual(4.5);
  if (testInfo.project.name === 'chromium')
    await foundation.screenshot({ path: 'test-results/pop-color-wide.png' });

  await page.locator('[data-action="toggle-theme"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-dark/);
  await expect(popTile).toHaveCSS('color', 'rgb(232, 165, 255)');
  await expect.poll(() => contrastRatio(popTile)).toBeGreaterThanOrEqual(4.5);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      foundation.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    )
    .toBe(true);
  if (testInfo.project.name === 'chromium')
    await foundation.screenshot({ path: 'test-results/pop-color-narrow.png' });

  await page.emulateMedia({ contrast: 'more' });
  await expect.poll(() => contrastRatio(popTile)).toBeGreaterThanOrEqual(7);
  await page.emulateMedia({ contrast: 'no-preference' });

  await page.goto('/?component=state-banner');
  const banner = page.locator(
    '[data-component="state-banner"][data-tone="pop"]',
  );
  await expect(banner).toBeVisible();
  await expect.poll(() => contrastRatio(banner)).toBeGreaterThanOrEqual(4.5);

  await page.goto('/?component=list-header');
  const popBadge = page
    .locator('[data-indicator-tone="pop"]')
    .locator('.kui-list-header__badge');
  await expect(popBadge).toBeVisible();
  await expect.poll(() => contrastRatio(popBadge)).toBeGreaterThanOrEqual(4.5);

  await page.goto('/?component=toolbar-control-group');
  const popGroup = page.locator(
    '[data-component="toolbar-control-group"][data-selected-tone="pop"]',
  );
  await expect(popGroup).toBeVisible();
  await expect(popGroup.locator('button[aria-pressed="true"]')).toHaveCSS(
    'color',
    'rgb(121, 36, 152)',
  );
});
