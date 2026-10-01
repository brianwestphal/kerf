import { expect, test } from '@playwright/test';

function luminance(color: string): number {
  const channels =
    color
      .match(/[\d.]+/g)
      ?.slice(0, 3)
      .map(Number) ?? [];
  const linear = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (
    0.2126 * (linear[0] ?? 0) +
    0.7152 * (linear[1] ?? 0) +
    0.0722 * (linear[2] ?? 0)
  );
}

for (const width of [1100, 390]) {
  test(`filled segmented labels meet AA at ${width}px in light and dark`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=segmented-control');
    const control = page.locator(
      '[data-segmented-control-id="inspector-section"]',
    );
    const unselected = control.locator(
      '.kui-segmented-control__item[data-selected="false"]',
    );

    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') {
        await page.locator('[data-action="toggle-theme"]').click();
        await expect(page.locator('html')).toHaveClass(/demo-dark/);
      }
      await expect(unselected.first()).toBeVisible();
      const colors = await unselected.first().evaluate((item) => ({
        text: window.getComputedStyle(item).color,
        track: window.getComputedStyle(item.parentElement!).backgroundColor,
        transitionProperty: window.getComputedStyle(item).transitionProperty,
      }));
      const text = luminance(colors.text);
      const track = luminance(colors.track);
      const ratio =
        (Math.max(text, track) + 0.05) / (Math.min(text, track) + 0.05);
      if (testInfo.project.name === 'chromium')
        await control.screenshot({
          path: `test-results/segmented-filled-${theme}-${width}.png`,
        });
      expect(
        ratio,
        `${theme} filled segmented label contrast (${JSON.stringify(colors)})`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(colors.transitionProperty.split(', ')).not.toContain('color');
    }
  });
}
