// KF-Z54E4H: the component Library is an Xcode-style transient popover the
// Preview toolbar's Library button and Shift+Cmd+L open. A drop closes it
// unless it is pinned or Option is held; pinned, it stays where it was put,
// across a reload.
import { expect, type Page, test } from '@playwright/test';

import { openLibrary } from './areas.js';
import { newDocument } from './build.js';

const library = (page: Page) => page.locator('#editor-library');
const button = (page: Page) => page.locator('[data-editor-library-button]');

/**
 * Drags palette row `name` over the canvas's lower left, inside the root
 * Pane and clear of where the Library opens.
 */
async function dragToCanvas(page: Page, name: string, alt = false) {
  const row = library(page).locator('[data-editor-palette]', {
    hasText: new RegExp(`^${name}$`),
  });
  await row.scrollIntoViewIfNeeded();
  const from = (await row.boundingBox())!;
  await page.mouse.move(from.x + 20, from.y + from.height / 2);
  await page.mouse.down();
  if (alt) await page.keyboard.down('Alt');
  await page.mouse.move(from.x + 40, from.y + from.height / 2, { steps: 3 });
  const to = (await page.locator('[data-editor-canvas]').boundingBox())!;
  await page.mouse.move(to.x + to.width * 0.3, to.y + to.height * 0.85, {
    steps: 10,
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(
    page.locator('[data-editor-canvas] [data-kerf-node]').first(),
  ).toBeVisible();
});

test('opens below its button with focus in the filter, and closes back to it', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Document params live between Outline and Problems.
  await expect(
    page.locator('[role="tab"][data-tab-id^="editor-document-areas-"]'),
  ).toHaveText(['Outline', 'Params', /^Problems/]);
  await button(page).click();
  await expect(library(page)).toBeVisible();
  await expect(page.locator('[data-editor-palette-filter]')).toBeFocused();
  const [panel, opener] = await Promise.all([
    library(page).boundingBox(),
    button(page).boundingBox(),
  ]);
  expect(panel!.y).toBeGreaterThanOrEqual(opener!.y + opener!.height);
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('KF-Z54E4H-library-transient-1440.png'),
    animations: 'disabled',
  });
  await page.keyboard.press('Escape');
  await expect(library(page)).toBeHidden();
  await expect(button(page)).toBeFocused();
  // The shortcut toggles it.
  await page.keyboard.press('ControlOrMeta+Shift+L');
  await expect(library(page)).toBeVisible();
  await expect(page.locator('[data-editor-palette-filter]')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+Shift+L');
  await expect(library(page)).toBeHidden();
  await expect(button(page)).toBeFocused();
});

test('closes after a drop, stays open for Option, and stays pinned', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await expect(page.getByText('1 node · valid')).toBeVisible();
  // A drag steps the transient Library aside; the drop closes it.
  await openLibrary(page);
  await dragToCanvas(page, 'Text');
  await expect(library(page)).toBeHidden();
  await page.mouse.up();
  await expect(page.getByText('2 nodes · valid')).toBeVisible();
  await expect(library(page)).toBeHidden();
  // Option held: it stays open, and the chip draws over it.
  await openLibrary(page);
  await dragToCanvas(page, 'Badge', true);
  await expect(library(page)).toBeVisible();
  const chip = page.locator('.kui-editor__drag-chip');
  await expect(chip).toContainText('Badge');
  expect(
    await chip.evaluate((element) => element.matches(':popover-open')),
  ).toBe(true);
  await page.mouse.up();
  await page.keyboard.up('Alt');
  // Option at the drop also asks where it goes: the Library waits out of
  // the way until the menu is answered, then comes back.
  await expect(library(page)).toBeHidden();
  await page.getByRole('menuitem', { name: 'Inside Pane › content' }).click();
  await expect(page.getByText('3 nodes · valid')).toBeVisible();
  await expect(library(page)).toBeVisible();
  // Pinned and moved: it stays through a drop, and after a reload.
  const handle = library(page).locator('.kui-pinnable-popover-surface__handle');
  const grip = (await handle.boundingBox())!;
  await page.mouse.move(grip.x + 10, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + 150, grip.y + 250, { steps: 8 });
  await page.mouse.up();
  await expect(library(page)).toHaveAttribute('data-pinned', '');
  const placed = (await library(page).boundingBox())!;
  await dragToCanvas(page, 'Text');
  await expect(library(page)).toBeVisible();
  await page.mouse.up();
  await expect(page.getByText('4 nodes · valid')).toBeVisible();
  await expect(library(page)).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('KF-Z54E4H-library-pinned-1440.png'),
    animations: 'disabled',
  });
  await page.reload();
  await openLibrary(page);
  await expect(library(page)).toHaveAttribute('data-pinned', '');
  // Where it was put, once it has settled from opening.
  await expect
    .poll(async () => {
      const restored = (await library(page).boundingBox())!;
      return Math.max(
        Math.abs(restored.x - placed.x),
        Math.abs(restored.y - placed.y),
      );
    })
    .toBeLessThan(2);
});

test('fits a phone’s gutter', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLibrary(page);
  const box = (await library(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(15);
  expect(box.x + box.width).toBeLessThanOrEqual(390 - 15);
  expect(box.y + box.height).toBeLessThanOrEqual(844 - 15);
  await expect(
    library(page).locator('[data-editor-palette]').first(),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath('KF-Z54E4H-library-transient-390.png'),
    animations: 'disabled',
  });
  await library(page).locator('[data-pinnable-popover-pin]').click();
  await expect(library(page)).toHaveAttribute('data-pinned', '');
  await page.screenshot({
    path: info.outputPath('KF-Z54E4H-library-pinned-390.png'),
    animations: 'disabled',
  });
});

test('Library results scroll to the visible bottom edge', async ({
  page,
}, info) => {
  for (const [width, height] of [
    [2560, 1410],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await openLibrary(page);
    await library(page)
      .locator(
        '[data-segmented-control-id="editor-palette-view"] [data-segment-value="grid"]',
      )
      .click();
    const results = library(page).locator(
      '.kui-pinnable-popover-surface__body > .kui-list:last-child',
    );
    const edges = await results.evaluate((list) => {
      const frame = list.closest('.kui-pinnable-popover-surface')!;
      const body = list.parentElement!;
      list.scrollTop = 100;
      return {
        frameBottom: frame.getBoundingClientRect().bottom,
        bodyBottom: body.getBoundingClientRect().bottom,
        listBottom: list.getBoundingClientRect().bottom,
        scrollTop: list.scrollTop,
      };
    });
    expect(edges.scrollTop).toBeGreaterThan(0);
    expect(edges.bodyBottom).toBeCloseTo(edges.frameBottom - 1, 0);
    expect(edges.listBottom).toBeCloseTo(edges.bodyBottom, 0);
    await library(page).screenshot({
      path: info.outputPath(`library-bottom-edge-${width}.png`),
    });
    if (width === 2560)
      await page.screenshot({
        path: info.outputPath('library-bottom-edge-editor-2560.png'),
      });
    await library(page).evaluate((node: HTMLElement) => node.hidePopover());
  }
});

test('Library shows a fixed-row divider only after results scroll', async ({
  page,
}, info) => {
  for (const [width, height] of [
    [2560, 1410],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await openLibrary(page);
    await library(page)
      .locator(
        '[data-segmented-control-id="editor-palette-view"] [data-segment-value="grid"]',
      )
      .click();
    const results = library(page).locator(
      '.kui-pinnable-popover-surface__body > .kui-list:last-child',
    );
    const fixedRow = library(page).locator(
      '.kui-pinnable-popover-surface__body > :nth-last-child(2)',
    );
    await results.evaluate((node) => {
      node.scrollTop = 0;
    });
    await expect(library(page)).not.toHaveAttribute('data-scrolled', '');
    const restingShadow = await fixedRow.evaluate(
      (node) => getComputedStyle(node).boxShadow,
    );
    await results.evaluate((node) => {
      node.scrollTop = 100;
    });
    await expect(library(page)).toHaveAttribute('data-scrolled', '');
    expect(
      await fixedRow.evaluate((node) => getComputedStyle(node).boxShadow),
    ).not.toBe(restingShadow);
    await library(page).screenshot({
      path: info.outputPath(`library-scroll-divider-${width}.png`),
    });
    if (width === 2560)
      await page.screenshot({
        path: info.outputPath('library-scroll-divider-editor-2560.png'),
      });
    await results.evaluate((node) => {
      node.scrollTop = 0;
    });
    await expect(library(page)).not.toHaveAttribute('data-scrolled', '');
    expect(
      await fixedRow.evaluate((node) => getComputedStyle(node).boxShadow),
    ).toBe(restingShadow);
    await library(page).evaluate((node: HTMLElement) => node.hidePopover());
  }
});

test('Library grid names truncate visibly without losing the full name', async ({
  page,
}, info) => {
  for (const [width, height] of [
    [2560, 1410],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await openLibrary(page);
    await library(page)
      .locator(
        '[data-segmented-control-id="editor-palette-view"] [data-segment-value="grid"]',
      )
      .click();
    const tile = library(page).locator('[title="DisclosureArrow"]');
    const name = tile.locator('.kui-text');
    await expect(name).toHaveText('DisclosureArrow');
    await expect(tile).toHaveAttribute('aria-label', 'DisclosureArrow');
    const treatment = await name.evaluate((node) => ({
      overflow: getComputedStyle(node).overflow,
      textOverflow: getComputedStyle(node).textOverflow,
      whiteSpace: getComputedStyle(node).whiteSpace,
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
    }));
    expect(treatment).toMatchObject({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });
    expect(treatment.scrollWidth).toBeGreaterThan(treatment.clientWidth);
    await tile.focus();
    await expect(tile).toBeFocused();
    await library(page).screenshot({
      path: info.outputPath(`library-readable-names-${width}.png`),
    });
    await library(page).evaluate((node: HTMLElement) => node.hidePopover());
  }
});

test('Library resizes vertically from its bottom edge', async ({
  page,
}, info) => {
  for (const [width, height] of [
    [2048, 1128],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await openLibrary(page);
    const surface = library(page);
    if ((await surface.getAttribute('data-pinned')) !== null)
      await surface.locator('[data-pinnable-popover-pin]').click();
    const grip = surface.locator(
      '.kui-pinnable-popover-surface__bottom-resize',
    );
    const before = (await surface.boundingBox())!;
    const edge = (await grip.boundingBox())!;
    await page.mouse.move(edge.x + edge.width / 2, edge.y + edge.height / 2);
    await page.mouse.down();
    await page.mouse.move(edge.x + edge.width / 2, edge.y - 100, {
      steps: 8,
    });
    await page.mouse.up();
    const after = (await surface.boundingBox())!;
    expect(after.height).toBeLessThan(before.height - 80);
    await expect(surface).toHaveAttribute('data-pinned', '');
    const results = surface.locator(
      '.kui-pinnable-popover-surface__body > .kui-list:last-child',
    );
    await results.evaluate((node) => {
      node.scrollTop = 100;
    });
    expect(await results.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    await surface.screenshot({
      path: info.outputPath(`library-bottom-resize-${width}.png`),
    });
    const lowerEdge = (await grip.boundingBox())!;
    await page.mouse.move(
      lowerEdge.x + lowerEdge.width / 2,
      lowerEdge.y + lowerEdge.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(lowerEdge.x + lowerEdge.width / 2, height - 1, {
      steps: 8,
    });
    await page.mouse.up();
    const expanded = (await surface.boundingBox())!;
    expect(expanded.y + expanded.height).toBeLessThanOrEqual(height - 15);
    const expandedEdge = (await grip.boundingBox())!;
    await page.mouse.move(
      expandedEdge.x + expandedEdge.width / 2,
      expandedEdge.y + expandedEdge.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(expandedEdge.x + expandedEdge.width / 2, 1, {
      steps: 8,
    });
    await page.mouse.up();
    expect((await surface.boundingBox())!.height).toBeGreaterThanOrEqual(159);
    expect((await surface.boundingBox())!.height).toBeLessThanOrEqual(161);
    await grip.focus();
    await page.keyboard.press('ArrowDown');
    expect((await surface.boundingBox())!.height).toBeGreaterThan(160);
    await surface.evaluate((node: HTMLElement) => node.hidePopover());
  }
});

test('Library header drag follows pointer without repeated layout reads', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 2048, height: 1128 });
  await openLibrary(page);
  const surface = library(page);
  const title = surface.locator('.kui-pinnable-popover-surface__handle');
  const before = (await surface.boundingBox())!;
  const handleBox = (await title.boundingBox())!;
  await page.evaluate(() => {
    const node = document.querySelector<HTMLElement>('#editor-library')!;
    const original = node.getBoundingClientRect.bind(node);
    const probe = { reads: 0, restore: () => {} };
    node.getBoundingClientRect = () => {
      probe.reads += 1;
      return original();
    };
    probe.restore = () => {
      node.getBoundingClientRect = original;
    };
    (
      window as Window & { __libraryDragProbe?: typeof probe }
    ).__libraryDragProbe = probe;
  });
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + 200,
    handleBox.y + handleBox.height / 2 + 150,
    { steps: 20 },
  );
  await page.mouse.up();
  const reads = await page.evaluate(() => {
    const probe = (
      window as Window & {
        __libraryDragProbe?: { reads: number; restore(): void };
      }
    ).__libraryDragProbe!;
    probe.restore();
    return probe.reads;
  });
  const after = (await surface.boundingBox())!;
  expect(after.x - before.x).toBeGreaterThan(100);
  expect(after.y - before.y).toBeGreaterThan(100);
  expect(reads).toBeLessThanOrEqual(6);
  await page.screenshot({ path: info.outputPath('library-drag-2048.png') });
});
