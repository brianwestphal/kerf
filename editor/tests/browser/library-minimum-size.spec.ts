import { expect, type Page, test } from '@playwright/test';

import { openLibrary } from './areas.js';

const surface = (page: Page) => page.locator('#editor-library');

test('Library minimum height keeps search and result rows usable without pinning', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect(
    page.locator('[data-editor-canvas] [data-kerf-node]').first(),
  ).toBeVisible();
  for (const [width, height] of [
    [2048, 900],
    [960, 900],
    [390, 844],
    [2048, 900],
  ] as const) {
    await page.setViewportSize({ width, height });
    await openLibrary(page);
    const panel = surface(page);
    const grip = panel.getByRole('button', {
      name: 'Resize Library vertically',
    });
    await expect
      .poll(async () => {
        const bounds = await panel.boundingBox();
        return (
          bounds !== null &&
          bounds.x >= 15 &&
          bounds.x + bounds.width <= width - 15
        );
      })
      .toBe(true);
    await grip.hover();
    const box = (await grip.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, 1, { steps: 8 });
    await page.mouse.up();
    expect((await panel.boundingBox())!.height).toBeCloseTo(320, 0);
    await expect(panel).not.toHaveAttribute('data-pinned', '');
    const search = panel.locator('[data-editor-palette-filter]');
    const row = panel.locator('[data-editor-palette]').first();
    await expect(search).toBeVisible();
    await expect(row).toBeVisible();
    const panelBox = (await panel.boundingBox())!;
    for (const control of [search, row]) {
      const controlBox = (await control.boundingBox())!;
      expect(controlBox.height).toBeGreaterThan(0);
      expect(controlBox.y + controlBox.height).toBeLessThanOrEqual(
        panelBox.y + panelBox.height - 8,
      );
    }
    await grip.focus();
    await page.keyboard.press('Shift+ArrowUp');
    expect((await panel.boundingBox())!.height).toBeCloseTo(320, 0);
    const remembered = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('kerf-ui-editor:library')!),
    );
    expect(remembered.placement.height).toBe(320);
    expect(remembered.pinned).toBe(false);
    await search.focus();
    await expect(search).toBeFocused();
    await page.mouse.move(1, 1);
    await panel.screenshot({
      path: info.outputPath(`KF-GC3PRB-library-minimum-${width}.png`),
      animations: 'disabled',
    });
    await page.screenshot({
      path: info.outputPath(`KF-GC3PRB-editor-library-minimum-${width}.png`),
      animations: 'disabled',
    });
    await page.mouse.click(1, 1);
    await expect(panel).toBeHidden();
    await openLibrary(page);
    expect((await panel.boundingBox())!.height).toBeCloseTo(320, 0);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  }
  await page.setViewportSize({ width: 390, height: 320 });
  await openLibrary(page);
  await expect
    .poll(async () => Math.round((await surface(page).boundingBox())!.height))
    .toBe(288);
  await expect
    .poll(async () => {
      const compact = await surface(page).boundingBox();
      return (
        compact !== null && compact.y >= 15 && compact.y + compact.height <= 305
      );
    })
    .toBe(true);
});
