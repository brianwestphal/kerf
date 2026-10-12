import { expect, test } from '@playwright/test';

// A layout-free, pointer-inert edge strip: starting activity reveals the wave
// and the status pill without moving the page; reduced motion only fades.
for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`EdgeActivityIndicator shows activity without layout (${reducedMotion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.setViewportSize({ width: 1100, height: 700 });
    await page.goto('/?component=edge-activity-indicator');
    const start = page.getByRole('button', { name: 'Start activity' });
    const before = await start.boundingBox();
    await start.click();
    const host = page.locator('[data-component="edge-activity-indicator"]');
    await expect(host).toHaveAttribute('data-busy', 'true');
    await expect(
      page.getByRole('status').filter({ hasText: 'Syncing' }),
    ).toHaveText('Syncing 3 providers…');
    // The same control, now "Stop activity", has not moved.
    const after = (await page
      .getByRole('button', { name: 'Stop activity' })
      .boundingBox())!;
    expect([after.x, after.y]).toEqual([before!.x, before!.y]);
    // Let the scale-in transition finish.
    await expect
      .poll(() =>
        host.evaluate(
          (node) =>
            node
              .querySelector('.kui-edge-activity-indicator__strip')!
              .getBoundingClientRect().height,
        ),
      )
      .toBe(4);
    const strip = await host.evaluate((node) => {
      const element = node.querySelector<HTMLElement>(
        '.kui-edge-activity-indicator__strip',
      )!;
      const style = window.getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return {
        top: box.top,
        height: box.height,
        hidden: element.getAttribute('aria-hidden'),
        pointer: window.getComputedStyle(node).pointerEvents,
        animation: style.animationName,
        mask: style.maskImage,
        hit: document
          .elementFromPoint(box.left + 10, 1)
          ?.closest('.kui-edge-activity-indicator'),
      };
    });
    expect(strip.top).toBe(0);
    expect(strip.height).toBe(4);
    expect(strip.hidden).toBe('true');
    expect(strip.pointer).toBe('none');
    expect(strip.hit).toBeFalsy();
    if (reducedMotion === 'reduce') {
      expect(strip.animation).toBe('none');
      expect(strip.mask).toBe('none');
    } else {
      expect(strip.animation).toBe('kui-edge-activity-indicator-wave');
      expect(strip.mask).not.toBe('none');
    }
    await page.getByRole('button', { name: 'Stop activity' }).click();
    await expect(host).toHaveAttribute('data-busy', 'false');
  });
}
