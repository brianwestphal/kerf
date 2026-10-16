import { expect, type Locator, test } from '@playwright/test';

// A corner Badge straddles its control's top-trailing corner, out of the pointer's way, and out of the accessible name
// unless the control names it.
async function cornerGeometry(control: Locator) {
  return control.evaluate((element) => {
    const badge = element.querySelector<HTMLElement>(
      '.kui-badge[data-placement="corner"]',
    )!;
    const box = element.getBoundingClientRect();
    const mark = badge.getBoundingClientRect();
    return {
      top: mark.top - box.top,
      right: box.right - mark.right,
      // It straddles the corner: at most 4px outside the control's box.
      inside:
        mark.left >= box.left &&
        mark.right <= box.right + 4.5 &&
        mark.top >= box.top - 4.5 &&
        mark.bottom <= box.bottom,
      pointer: globalThis.getComputedStyle(badge).pointerEvents,
    };
  });
}

test('corner badges pin to the top-trailing corner of a toolbar button and an icon-only Button', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=toolbar-control-group');
    const eye = page.locator('[data-demo-corner-count]');
    await expect(eye).toHaveAccessibleName('Hidden Workspaces, 3 hidden');
    const toolbar = await cornerGeometry(eye);
    expect(toolbar.inside).toBe(true);
    // 4px past the padding box, so 3px past a bordered control's edge.
    expect(toolbar.top).toBeGreaterThanOrEqual(-4.5);
    expect(toolbar.top).toBeLessThanOrEqual(-2.5);
    // 4px past the padding box, so 3px past a bordered control's edge.
    expect(toolbar.right).toBeGreaterThanOrEqual(-4.5);
    expect(toolbar.right).toBeLessThanOrEqual(-2.5);
    expect(toolbar.pointer).toBe('none');

    await page.goto('/?component=button');
    const messages = page.locator('[data-demo-badge="count"]');
    await expect(messages).toHaveAccessibleName('Messages, 4 unread');
    await expect(messages.locator('.kui-badge')).toHaveText('4');
    const count = await cornerGeometry(messages);
    expect(count.inside).toBe(true);
    // 4px past the padding box, so 3px past a bordered control's edge.
    expect(count.right).toBeGreaterThanOrEqual(-4.5);
    expect(count.right).toBeLessThanOrEqual(-2.5);
    const dot = page.locator('[data-demo-badge="dot"]');
    await expect(dot).toHaveAccessibleName('Downloads, new download');
    expect((await cornerGeometry(dot)).inside).toBe(true);
  }
});
