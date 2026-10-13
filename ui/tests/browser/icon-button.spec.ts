import { expect, test } from '@playwright/test';

// Web Awesome squares a wa-button only for a lone wa-icon; IconButton gives a
// lone LucideIcon the same geometry, level with an adjacent labeled field.
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
      const part = (host: Element) =>
        host
          .shadowRoot!.querySelector('[part~="base"]')!
          .getBoundingClientRect();
      const field = part(root.querySelector('wa-input')!);
      const buttons = [...root.querySelectorAll('.kui-icon-button')].map(
        (host) => {
          const box = part(host);
          return {
            size: host.getAttribute('size'),
            w: box.width,
            h: box.height,
          };
        },
      );
      const first = part(root.querySelector('.kui-icon-button')!);
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
    const sized = geometry.buttons.slice(-3);
    expect(sized.map((button) => button.size)).toEqual(['s', 'm', 'l']);
    expect(sized[0]!.h).toBeLessThan(sized[1]!.h);
    expect(sized[1]!.h).toBeLessThan(sized[2]!.h);
  }
});
