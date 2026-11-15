import { expect, test } from '@playwright/test';

// KF-SE5BAR: a multiline ListActionRow keeps its primary label, description,
// and status on their own lines, each wrapping, instead of one run of text.
test('multiline ListActionRow stacks label, description, and status', async ({
  page,
}, testInfo) => {
  for (const width of [1280, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=list-action-row');
    const row = page.locator('[data-demo-action-row="multiline"]');
    await row.scrollIntoViewIfNeeded();

    const layout = await row.evaluate((element) => {
      const rect = (selector: string) => {
        const part = element.querySelector(selector);
        if (!part) throw new Error(`Expected ${selector}`);
        const box = part.getBoundingClientRect();
        const lineHeight = parseFloat(window.getComputedStyle(part).lineHeight);
        return {
          top: box.top,
          bottom: box.bottom,
          lines: box.height / lineHeight,
        };
      };
      return {
        primary: rect('.kui-list-action-row__primary-label'),
        description: rect('.kui-list-action-row__description'),
        status: rect('.kui-list-action-row__status'),
      };
    });

    expect(layout.description.top).toBeGreaterThanOrEqual(
      layout.primary.bottom - 0.5,
    );
    expect(layout.status.top).toBeGreaterThanOrEqual(
      layout.description.bottom - 0.5,
    );
    if (width === 390) {
      // Both long lines wrap rather than ellipsize at a phone width.
      expect(layout.primary.lines).toBeGreaterThan(1.5);
      expect(layout.description.lines).toBeGreaterThan(1.5);
    }
    await row.screenshot({
      path: testInfo.outputPath(`list-action-row-multiline-${width}.png`),
    });
  }
});
