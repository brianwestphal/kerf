import { expect, test } from '@playwright/test';

// A List's contentWidth caps its content at a readable measure plus its own
// insets and centers the column; on a phone the column fills the width.
test('List contentWidth centers a readable page column', async ({ page }) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=list');
    const column = page.locator('[data-demo-page-column]');
    await column.scrollIntoViewIfNeeded();
    const geometry = await column.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const parent = element.parentElement!.getBoundingClientRect();
      const style = globalThis.getComputedStyle(element);
      return {
        content:
          box.width -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight),
        left: box.left - parent.left,
        right: parent.right - box.right,
        parent: parent.width,
      };
    });
    if (width > 1000) {
      // The frame is wider than the column, so the centering shows.
      expect(geometry.parent).toBeGreaterThan(geometry.content + 120);
      expect(geometry.content).toBeCloseTo(440, 0);
      expect(geometry.left).toBeGreaterThan(20);
      expect(Math.abs(geometry.left - geometry.right)).toBeLessThanOrEqual(1);
    } else {
      expect(geometry.left).toBeLessThanOrEqual(1);
      expect(geometry.right).toBeLessThanOrEqual(1);
    }
  }
});
