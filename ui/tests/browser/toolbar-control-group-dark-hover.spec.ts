import { expect, type Locator, type Page, test } from '@playwright/test';

import { contrastRatio } from '../../evaluator/index.mjs';

// KF-5YKYTA: a lone control's hover replaces a group's whole fill. The dark
// tone's hover tint is a translucent surface wash meant to lie over its loud
// fill, so a dark single group (the AnchoredSurface catalog's volume control)
// that swapped its fill for the wash showed its white icon on a near-white
// circle over a light page (about 1.3:1). The wash now paints over the fill.

/** The rendered pixel inside the group's pill, clear of its centered icon. */
async function paintedFill(page: Page, group: Locator): Promise<number[]> {
  const box = (await group.boundingBox())!;
  // 5px in from the top edge on the center line: inside the 40px pill, above
  // a centered 24px icon.
  const image = await page.screenshot({
    clip: { x: box.x + box.width / 2, y: box.y + 5, width: 1, height: 1 },
  });
  return page.evaluate(async (base64) => {
    const bitmap = await globalThis.createImageBitmap(
      await (await globalThis.fetch(`data:image/png;base64,${base64}`)).blob(),
    );
    const context = document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true })!;
    context.drawImage(bitmap, 0, 0);
    return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  }, image.toString('base64'));
}

async function iconColor(page: Page, control: Locator): Promise<number[]> {
  const color = await control.evaluate(
    (element) => window.getComputedStyle(element).color,
  );
  return page.evaluate((value) => {
    const context = document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true })!;
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  }, color);
}

async function hoveredContrast(page: Page, group: Locator, control: Locator) {
  await control.hover();
  // Let the group's 0.2s background transition settle.
  await page.waitForTimeout(500);
  return contrastRatio(
    await iconColor(page, control),
    await paintedFill(page, group),
  )!;
}

for (const scheme of ['light', 'dark'] as const)
  for (const width of [1280, 390])
    test(`${scheme} ${width}px: a hovered dark single group keeps its icon at AA over its dark fill`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/?component=anchored-surface');
      const group = page.locator(
        '.kui-toolbar-control-group[data-tone="dark"][data-single="true"]',
      );
      const control = group.locator('[data-anchored-surface-trigger="media"]');
      await control.scrollIntoViewIfNeeded();
      const resting = contrastRatio(
        await iconColor(page, control),
        await paintedFill(page, group),
      )!;
      const hovered = await hoveredContrast(page, group, control);
      // Non-text contrast for an icon is 3:1; the tinted fill stays well past
      // it and visibly lighter than at rest.
      expect(hovered).toBeGreaterThanOrEqual(3);
      expect(hovered).toBeLessThan(resting);
    });

for (const scheme of ['light', 'dark'] as const)
  test(`${scheme}: a hovered dark single group paints what one hovered control of a dark group paints`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?component=toolbar-control-group');
    const pair = page.getByRole('button', { name: 'Previous' });
    await pair.scrollIntoViewIfNeeded();
    await pair.hover();
    await page.waitForTimeout(500);
    const reference = await paintedFill(page, pair);

    await page.goto('/?component=anchored-surface');
    const single = page.locator(
      '.kui-toolbar-control-group[data-tone="dark"][data-single="true"]',
    );
    const control = single.locator('[data-anchored-surface-trigger="media"]');
    await control.scrollIntoViewIfNeeded();
    await control.hover();
    await page.waitForTimeout(500);
    const painted = await paintedFill(page, single);
    // Both are the same wash over the same translucent fill; the two catalog
    // stages' page colors show through slightly differently.
    for (const [index, channel] of painted.entries())
      expect(Math.abs(channel - reference[index]!)).toBeLessThanOrEqual(6);
  });
