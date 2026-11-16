import { expect, type Page, test } from '@playwright/test';

// KF-C29WJ9: RadioGroup presentation="tiles" draws each choice as a framed
// preview above its label. The native radios keep one Tab stop and arrow-key
// selection; the selection shows as a ring and a check, and the tiles wrap
// as whole tiles, three to a row in a phone-width column.

const theme = (page: Page) => page.getByRole('radiogroup', { name: 'Theme' });

/** Whether each tile's check badge is shown, in order. */
const checks = (page: Page) =>
  theme(page)
    .locator('.kui-radio-group__check')
    .evaluateAll((badges) =>
      badges.map((badge) => window.getComputedStyle(badge).display !== 'none'),
    );

for (const width of [1280, 390]) {
  test(`selects tiles by keyboard and pointer and fits ${String(width)}px`, async ({
    page,
    browserName,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=radio-group');
    const group = theme(page);
    await group.scrollIntoViewIfNeeded();
    const radios = group.getByRole('radio');
    await expect(radios).toHaveCount(3);
    await expect(group.getByRole('radio', { name: 'Auto' })).toBeChecked();
    expect(await checks(page)).toEqual([true, false, false]);

    // Three whole tiles on one row, inside the page.
    const tiles = group.locator('.kui-radio-group__tile');
    const boxes = await tiles.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().toJSON()),
    );
    expect(new Set(boxes.map((box) => Math.round(box.top))).size).toBe(1);
    for (const box of boxes) {
      expect(box.width).toBeGreaterThan(90);
      expect(box.right).toBeLessThanOrEqual(width);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await group.screenshot({
      path: testInfo.outputPath(`radio-tiles-auto-${String(width)}.png`),
    });

    // One Tab stop: the checked radio; the arrow keys move and select.
    await group.getByRole('radio', { name: 'Auto' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('radio', { name: 'Light' })).toBeChecked();
    await expect(group.getByRole('radio', { name: 'Light' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(await checks(page)).toEqual([false, false, true]);
    // WebKit on macOS leaves radios out of the Tab order by default.
    if (browserName !== 'webkit') {
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(group.getByRole('radio', { name: 'Dark' })).toBeFocused();
    }
    await group.screenshot({
      path: testInfo.outputPath(`radio-tiles-dark-focus-${String(width)}.png`),
    });

    // A press on a tile's artwork selects it: the radio covers the tile.
    const art = (await tiles
      .nth(1)
      .locator('.kui-radio-group__preview')
      .boundingBox())!;
    await page.mouse.click(art.x + art.width / 2, art.y + art.height / 2);
    await expect(group.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(await checks(page)).toEqual([false, true, false]);
    // The selected frame carries a ring as well as the check.
    const ring = await tiles
      .nth(1)
      .locator('.kui-radio-group__preview')
      .evaluate((frame) => window.getComputedStyle(frame).boxShadow);
    expect(ring).not.toBe('none');
    // Return the demo to its default.
    await tiles.nth(0).click();
    await expect(group.getByRole('radio', { name: 'Auto' })).toBeChecked();
  });
}

// KF-0ZTK8A: a short set of tiles shrinks to share one row down to a legible
// minimum before it wraps whole tiles, so three fit a 336px phone column.
test('tiles shrink to share a row before wrapping whole tiles', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=radio-group');
  const group = theme(page);
  await group.scrollIntoViewIfNeeded();
  const layout = () =>
    group.locator('.kui-radio-group__choice').evaluateAll((choices) =>
      choices.map((choice) => {
        const box = choice.getBoundingClientRect();
        return { top: Math.round(box.top), width: box.width };
      }),
    );

  // Unconstrained, the shrink-wrapped group keeps full 104px tiles.
  for (const tile of await layout()) expect(tile.width).toBeCloseTo(104, 0);

  for (const width of [336, 300]) {
    await group.evaluate((element, value) => {
      element.style.width = `${String(value)}px`;
    }, width);
    const tiles = await layout();
    expect(new Set(tiles.map((tile) => tile.top)).size).toBe(1);
    for (const tile of tiles) {
      expect(tile.width).toBeGreaterThanOrEqual(87.5);
      expect(tile.width).toBeLessThanOrEqual(104.5);
    }
    await group.screenshot({
      path: testInfo.outputPath(`radio-tiles-row-${String(width)}.png`),
    });
  }

  // Below three minimum tiles, whole tiles wrap at their full width.
  await group.evaluate((element) => {
    element.style.width = '250px';
  });
  const wrapped = await layout();
  expect(new Set(wrapped.map((tile) => tile.top)).size).toBe(2);
  for (const tile of wrapped) expect(tile.width).toBeCloseTo(104, 0);
  await group.screenshot({
    path: testInfo.outputPath('radio-tiles-wrap-250.png'),
  });
  await group.evaluate((element) => element.style.removeProperty('width'));
});
