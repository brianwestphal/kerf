import { expect, test } from '@playwright/test';

test('automatic tab activation retains focus when a controlled consumer replaces its strip', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto('/?component=tab-bar');
  const bar = page.locator('[data-tab-bar-id="catalog-tabs"]');
  await expect(bar.getByRole('tab')).toHaveCount(7);
  // Model a consumer whose controlled activation renders a new strip. The demo's
  // real select handler runs first and updates selection; replacement follows it.
  await page.evaluate(() => {
    document.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest('[role="tab"]');
      const strip = button?.closest('[data-component="tab-bar"]');
      if (strip) strip.replaceWith(strip.cloneNode(true));
    });
  });
  await bar.getByRole('tab').first().focus();
  for (const [key, index] of [
    ['ArrowRight', 1],
    ['End', 6],
    ['ArrowRight', 0],
    ['ArrowLeft', 6],
    ['Home', 0],
    ['ArrowRight', 1],
  ] as const) {
    await page.keyboard.press(key);
    await expect(bar.getByRole('tab').nth(index)).toBeFocused();
    await expect(bar.getByRole('tab').nth(index)).toHaveAttribute(
      'aria-selected',
      'true',
    );
  }
  if (browserName === 'chromium')
    await bar.locator('..').screenshot({
      path: 'test-results/tab-bar-controlled-focus-wide.png',
    });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('End');
  await expect(bar.getByRole('tab').last()).toBeFocused();
  if (browserName === 'chromium')
    await bar.locator('..').screenshot({
      path: 'test-results/tab-bar-controlled-focus-narrow.png',
    });
});

test('disposing the demo wiring cancels pending tab focus restoration', async ({
  page,
}) => {
  for (const transition of [
    'automatic-activation',
    'keyboard-reorder',
  ] as const) {
    await page.goto('/?component=tab-bar');
    await page.evaluate((kind) => {
      const bar = document.querySelector<HTMLElement>(
        '[data-tab-bar-id="catalog-tabs"]',
      )!;
      if (kind === 'automatic-activation') {
        document.addEventListener('click', (event) => {
          if (!(event.target instanceof Element)) return;
          const strip = event.target.closest('[data-component="tab-bar"]');
          if (strip) strip.replaceWith(strip.cloneNode(true));
        });
      }
      const source = bar.querySelector<HTMLElement>('[role="tab"]')!;
      source.focus();
      source.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          altKey: kind === 'keyboard-reorder',
          shiftKey: kind === 'keyboard-reorder',
          bubbles: true,
        }),
      );
      window.dispatchEvent(new PageTransitionEvent('pagehide'));
      document
        .querySelector<HTMLElement>('[data-action="toggle-theme"]')!
        .focus();
    }, transition);
    await page.evaluate(() => Promise.resolve());
    await expect(
      page.locator('[data-action="toggle-theme"]').first(),
    ).toBeFocused();
  }
});
