import { expect, test } from '@playwright/test';

/**
 * A non-interactive icon placed directly in a ToolbarControlGroup (a heading's
 * identity glyph) is an icon tile: it takes an icon button's 40px slot and
 * 16px visual, so it centers in the 44px group without being wrapped in a
 * focusable button that does nothing. Unwrapped, it sat at the group's start
 * edge; wrapped, it became an unlabeled no-op control.
 */
test('a direct icon tile centers in its group without a control', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/?component=headers');
  const group = page
    .locator('.kui-toolbar-control-group:has(> svg[data-lucide="wrench"])')
    .first();
  await group.scrollIntoViewIfNeeded();
  await expect(group.locator('button, wa-button, a, [tabindex]')).toHaveCount(
    0,
  );
  const geometry = await group.evaluate((element) => {
    const groupRect = element.getBoundingClientRect();
    const icon = element.querySelector(':scope > svg')!.getBoundingClientRect();
    const style = window.getComputedStyle(
      element.querySelector(':scope > svg')!,
    );
    return {
      dx: icon.left + icon.width / 2 - (groupRect.left + groupRect.width / 2),
      dy: icon.top + icon.height / 2 - (groupRect.top + groupRect.height / 2),
      tile: icon.width,
      visual: parseFloat(style.width),
      groupWidth: groupRect.width,
    };
  });
  expect(Math.abs(geometry.dx)).toBeLessThan(0.75);
  expect(Math.abs(geometry.dy)).toBeLessThan(0.75);
  expect(geometry.tile).toBeCloseTo(40, 0);
  expect(geometry.visual).toBeCloseTo(16, 0);
  expect(geometry.groupWidth).toBeCloseTo(44, 0);
});
