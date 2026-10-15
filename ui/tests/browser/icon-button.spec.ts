import { expect, test } from '@playwright/test';

// IconButton is an icon-only Button: a square one control height on each
// side, level with an adjacent labeled field.
test('IconButton is a control-height square level with its field and named by its icon', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=icon-button');
    const demo = page.locator('[data-demo="icon-button"]');
    const browse = demo.getByRole('button', { name: 'Browse for a Folder' });
    await expect(browse).toBeVisible();
    const geometry = await demo.evaluate((root) => {
      const field = root
        .querySelector('wa-input')!
        .shadowRoot!.querySelector('[part~="base"]')!
        .getBoundingClientRect();
      const buttons = [
        ...root.querySelectorAll('.kui-button[data-icon-only]'),
      ].map((host) => {
        const box = host.getBoundingClientRect();
        return {
          size: host.getAttribute('data-size'),
          w: box.width,
          h: box.height,
        };
      });
      const first = root
        .querySelector('.kui-button[data-icon-only]')!
        .getBoundingClientRect();
      return { field, first, buttons };
    });
    for (const button of geometry.buttons)
      expect(
        Math.abs(button.w - button.h),
        `${button.size} square`,
      ).toBeLessThan(1);
    expect(geometry.first.height).toBeCloseTo(geometry.field.height, 0);
    expect(geometry.first.top).toBeCloseTo(geometry.field.top, 0);
    expect(geometry.first.left).toBeGreaterThan(geometry.field.right);
    const sized = geometry.buttons.slice(-2);
    expect(sized.map((button) => button.size)).toEqual(['default', 'compact']);
    expect(sized[0]!.h).toBe(44);
    expect(sized[1]!.h).toBe(33);
  }
});
