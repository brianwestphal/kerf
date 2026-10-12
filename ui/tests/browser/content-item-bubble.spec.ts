import { expect, test } from '@playwright/test';

test('ContentItem bubbles fit their content at the start or end of the row', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=content-item');
  const transcript = page.locator('[data-demo-transcript]');
  const user = page.locator('[data-demo-bubble="user"]');
  const assistant = page.locator('[data-demo-bubble="assistant"]');
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await transcript.scrollIntoViewIfNeeded();
    const geometry = await transcript.evaluate((list) => {
      const box = list.getBoundingClientRect();
      const read = (selector: string) => {
        const element = list.querySelector<HTMLElement>(selector)!;
        const rect = element.getBoundingClientRect();
        const style = globalThis.getComputedStyle(element);
        return {
          left: rect.left - box.left,
          right: box.right - rect.right,
          width: rect.width,
          background: style.backgroundColor,
          color: style.color,
        };
      };
      return {
        width: box.width,
        user: read('[data-demo-bubble="user"]'),
        assistant: read('[data-demo-bubble="assistant"]'),
      };
    });
    // The short user message shrinks to its text at the end of the row.
    expect(geometry.user.width).toBeLessThan(geometry.width * 0.8);
    expect(geometry.user.left).toBeGreaterThan(geometry.width * 0.2);
    expect(geometry.user.right).toBeLessThanOrEqual(9);
    expect(geometry.user.left).toBeGreaterThan(geometry.user.right);
    // The long assistant reply caps at 80% of the row, at its start.
    expect(geometry.assistant.width).toBeLessThanOrEqual(
      geometry.width * 0.8 + 1,
    );
    expect(geometry.assistant.left).toBeLessThanOrEqual(9);
    expect(geometry.user.background).not.toBe(geometry.assistant.background);
    await transcript.screenshot({
      path: testInfo.outputPath(`content-item-bubbles-${width}.png`),
    });
    await transcript.screenshot({
      path: `test-results/content-item-bubbles-${width}.png`,
    });
  }
  await expect(user).toHaveAttribute('data-appearance', 'brand-loud');
  await expect(assistant).toHaveAttribute('data-bubble', 'start');
});
