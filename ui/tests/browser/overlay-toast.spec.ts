import { expect, test } from '@playwright/test';

test('overlay-toast.css stacks toned toasts above the bottom edge and lets them leave', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/?component=toast');
    const demo = page.locator('[data-demo="toast"]');
    for (const label of [
      'Show Toast',
      'Show Success',
      'Show Warning',
      'Show Export Result',
    ])
      await demo.getByRole('button', { name: label }).click();

    const region = page.locator('.kerf-toasts');
    await expect(region).toHaveAttribute('aria-live', 'polite');
    const toasts = region.locator('.kerf-toast');
    await expect(toasts).toHaveCount(4);
    await expect(toasts.first()).toHaveAttribute('role', 'status');
    await expect(toasts.first()).toHaveCSS('opacity', '1');

    // Let the entrance settle before measuring.
    await expect
      .poll(() =>
        toasts.evaluateAll((items) =>
          items.every(
            (item) =>
              window.getComputedStyle(item).translate === 'none' ||
              window.getComputedStyle(item).translate === '0px',
          ),
        ),
      )
      .toBe(true);
    await expect(toasts.last()).toHaveCSS('opacity', '1');
    const geometry = await page.evaluate(() => {
      const root = document.querySelector('.kerf-toasts')!;
      const box = (element: Element) => element.getBoundingClientRect();
      const items = [...root.querySelectorAll('.kerf-toast')];
      const banner = root.querySelector('.kerf-toast > .kui-state-banner')!;
      return {
        position: window.getComputedStyle(root).position,
        pointer: window.getComputedStyle(root).pointerEvents,
        itemPointer: window.getComputedStyle(items[0]!).pointerEvents,
        width: box(root).width,
        lastBottom: window.innerHeight - box(items.at(-1)!).bottom,
        gaps: items
          .slice(1)
          .map((item, index) => box(item).top - box(items[index]!).bottom),
        lefts: items.map((item) => Math.round(box(item).left)),
        rights: items.map((item) => Math.round(box(item).right)),
        backgrounds: items
          .slice(0, 3)
          .map((item) => window.getComputedStyle(item).backgroundImage),
        bannerFlush:
          Math.abs(box(banner).left - box(banner.parentElement!).left) +
          Math.abs(box(banner).right - box(banner.parentElement!).right),
      };
    });
    // A fixed region at the bottom edge that never blocks the page.
    expect(geometry.position).toBe('fixed');
    expect(geometry.pointer).toBe('none');
    expect(geometry.itemPointer).toBe('auto');
    expect(geometry.width).toBeLessThanOrEqual(Math.min(width, 480));
    expect(geometry.lastBottom).toBeCloseTo(16, 0);
    // Newest last, 8px apart, on one column.
    for (const gap of geometry.gaps) expect(gap).toBeCloseTo(8, 0);
    expect(new Set(geometry.lefts).size).toBe(1);
    expect(new Set(geometry.rights).size).toBe(1);
    // The variants tone the surface; a StateBanner is the whole toast.
    expect(new Set(geometry.backgrounds).size).toBe(3);
    expect(geometry.bannerFlush).toBeLessThanOrEqual(1);

    // The toasts dismiss themselves and fade out through kui-toast-exit.
    await expect(toasts).toHaveCount(1, { timeout: 6000 });
    await expect(toasts).toHaveCount(0, { timeout: 6000 });
    await expect(region).toBeHidden();
  }
});

test('replace mode collapses a rapid sequence to the latest toast', async ({
  page,
}) => {
  await page.goto('/?component=toast');
  const copy = page
    .locator('[data-demo="toast"]')
    .getByRole('button', { name: 'Copy Link' });
  await copy.click();
  await copy.click();
  await copy.click();
  const toasts = page.locator('.kerf-toasts .kerf-toast');
  // Earlier toasts leave through their exit, so only one remains settled.
  await expect(toasts).toHaveCount(1);
  await expect(toasts.first()).toContainText('Copied at');
});

test('toasts only fade under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?component=toast');
  await page
    .locator('[data-demo="toast"]')
    .getByRole('button', { name: 'Show Toast' })
    .click();
  await expect(page.locator('.kerf-toast')).toHaveCSS('translate', 'none');
});
