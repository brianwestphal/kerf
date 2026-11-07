import { expect, test } from '@playwright/test';

// KF-XFG3FZ: wireTabBars reports each bar's fit through onFitChange. The UX
// catalog's adaptive example swaps its wide end action for an icon button
// while the tabs overflow, and restores it once the free room covers the
// difference, with no oscillation in between.

test('onFitChange drives an adaptive end action without oscillating', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=tab-bar');
  const bar = page.locator('[data-tab-bar-id="adaptive-end-tab-bar"]');
  await bar.scrollIntoViewIfNeeded();
  const end = bar.locator('.kui-tab-bar__end');
  const wide = end.getByRole('button', { name: 'New Ticket…' });
  const fit = () =>
    bar.evaluate((element) => {
      const strip = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
      return {
        compact:
          element.querySelector(
            '.kui-tab-bar__end .kui-toolbar-control-group',
          ) !== null,
        scrolls: strip.scrollWidth > strip.clientWidth + 1,
      };
    });

  await expect(wide).toBeVisible();
  expect(await fit()).toEqual({ compact: false, scrolls: false });
  await bar.screenshot({ path: testInfo.outputPath('adaptive-end-wide.png') });

  // Narrow until the tabs would overflow beside the wide action.
  await page.setViewportSize({ width: 360, height: 900 });
  await expect.poll(async () => (await fit()).compact).toBe(true);
  await expect(end.getByRole('button', { name: 'New Ticket…' })).toBeVisible();
  // Settled: the swap holds across further frames rather than flipping back.
  for (let frame = 0; frame < 5; frame += 1)
    await page.evaluate(
      () => new Promise((resolve) => window.requestAnimationFrame(resolve)),
    );
  expect((await fit()).compact).toBe(true);
  // The attention tab's own chrome stays in view at the strip's start.
  const firstTab = bar.getByRole('tab', { name: /Terminal feedback/ });
  const stripBox = (await bar.locator('.kui-tab-bar__tabs').boundingBox())!;
  const tabBox = (await firstTab.boundingBox())!;
  expect(tabBox.x).toBeGreaterThanOrEqual(stripBox.x - 1);
  await bar.screenshot({
    path: testInfo.outputPath('adaptive-end-compact.png'),
  });

  // Widen again: the free room now covers the wide action, so it returns.
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect.poll(async () => (await fit()).compact).toBe(false);
  await expect(wide).toBeVisible();
  expect((await fit()).scrolls).toBe(false);
});
