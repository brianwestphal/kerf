import { expect, test } from '@playwright/test';

import { waitForScrollSettled } from './scroll-settle.js';

test('catalogs Workbench public geometry and controlled collapse', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=workbench');

  const demo = page.locator('[data-demo="workbench"]');
  const full = page.locator('#catalog-workbench-full');
  const collapsed = page.locator('#catalog-workbench-collapsed');
  await expect(demo).toBeVisible();
  await expect(full.locator('[data-workbench-rail]')).toHaveCount(2);
  await expect(full.locator('[data-workbench-drawer]')).toHaveCount(1);
  // The fixed 280 px rails give way to the work area's 320 px minimum when
  // the example is narrower than both rails beside it: they shrink in
  // proportion and their content follows the shown width.
  const width = async (selector: string) =>
    (await full.locator(selector).first().boundingBox())!.width;
  const fullWidth = (await full.boundingBox())!.width;
  expect(fullWidth).toBeLessThan(280 * 2 + 320);
  await expect.poll(() => width('.kui-workbench__center')).toBeCloseTo(320, 0);
  const railWidth = await width('[data-workbench-rail="left"]');
  expect(railWidth).toBeCloseTo((fullWidth - 320) / 2, 0);
  expect(await width('[data-workbench-rail="right"]')).toBeCloseTo(
    railWidth,
    0,
  );
  expect(
    await width('[data-workbench-rail="left"] > .kui-workbench__panel-content'),
  ).toBeCloseTo(railWidth - 1, 0);
  await expect(collapsed.locator('[data-workbench-rail="left"]')).toHaveCSS(
    'width',
    '0px',
  );
  await expect(collapsed.locator('[data-workbench-drawer]')).toHaveCSS(
    'height',
    '0px',
  );
  const configuredDrawer = collapsed.locator('[data-workbench-drawer]');
  await expect(configuredDrawer).toHaveAttribute('data-separator', 'hidden');
  await expect(configuredDrawer).toHaveAttribute(
    'data-collapse-motion',
    'fade-slide',
  );
  await expect(configuredDrawer).toHaveAttribute(
    'data-content-overflow',
    'visible',
  );
  await expect(
    configuredDrawer.locator('.kui-workbench__panel-content'),
  ).toHaveCSS('opacity', '0');
  const restore = collapsed.locator('.kui-workbench__restore');
  await expect(
    restore.locator('[data-component="floating-toolbar"]'),
  ).toBeVisible();
  await expect(restore).toHaveCSS('position', 'absolute');
  await expect(restore).toHaveCSS('bottom', '16px');
  await expect
    .poll(() =>
      demo.evaluate((element) => element.scrollWidth <= element.clientWidth),
    )
    .toBe(true);
  if (testInfo.project.name === 'chromium')
    await demo.screenshot({ path: 'test-results/workbench-catalog-wide.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(demo).toBeVisible();
  await expect(full).toBeHidden();
  await expect(
    page.getByText('Workbench is a desktop-class shell.'),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  if (testInfo.project.name === 'chromium')
    await page.screenshot({
      path: 'test-results/workbench-catalog-narrow.png',
      fullPage: true,
    });
});

test('bottom drawer opens and closes monotonically from one bottom anchor', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=workbench');

  const samples = await page.evaluate(async () => {
    const drawer = document.querySelector<HTMLElement>(
      '#catalog-workbench-full [data-workbench-drawer]',
    )!;
    const sampleTransition = async (collapsed: boolean) => {
      const content = drawer.querySelector<HTMLElement>(
        '.kui-workbench__panel-content',
      )!;
      drawer.dataset.collapsed = String(collapsed);
      const frames: Array<{
        distanceFromBottom: number;
        drawerBottom: number;
        translateY: number;
      }> = [];
      let settledFrames = 0;
      for (let index = 0; index < 90; index += 1) {
        await new Promise(window.requestAnimationFrame);
        const drawerBounds = drawer.getBoundingClientRect();
        const transform = window.getComputedStyle(content).transform;
        frames.push({
          distanceFromBottom:
            content.getBoundingClientRect().top - drawerBounds.bottom,
          drawerBottom: drawerBounds.bottom,
          translateY: transform === 'none' ? 0 : new DOMMatrix(transform).m42,
        });
        const frame = frames.at(-1)!;
        const settled = collapsed
          ? Math.abs(frame.distanceFromBottom) < 0.5
          : Math.abs(frame.translateY) < 0.5;
        settledFrames = settled ? settledFrames + 1 : 0;
        if (settledFrames >= 2) break;
      }
      return { settled: settledFrames >= 2, frames };
    };

    drawer.dataset.collapsed = 'true';
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    const opening = await sampleTransition(false);
    const closing = await sampleTransition(true);
    return { opening, closing };
  });

  expect(samples.opening.settled).toBe(true);
  expect(samples.closing.settled).toBe(true);
  const bottomDrift = (frames: typeof samples.opening.frames) =>
    Math.max(...frames.map(({ drawerBottom }) => drawerBottom)) -
    Math.min(...frames.map(({ drawerBottom }) => drawerBottom));
  expect(bottomDrift(samples.opening.frames)).toBeLessThan(1.5);
  expect(bottomDrift(samples.closing.frames)).toBeLessThan(1.5);
  expect(samples.opening.frames.some(({ translateY }) => translateY > 20)).toBe(
    true,
  );
  expect(samples.closing.frames.some(({ translateY }) => translateY > 20)).toBe(
    true,
  );

  for (let index = 1; index < samples.opening.frames.length; index += 1) {
    expect(
      samples.opening.frames[index]!.distanceFromBottom,
    ).toBeLessThanOrEqual(
      samples.opening.frames[index - 1]!.distanceFromBottom + 1,
    );
  }
  for (let index = 1; index < samples.closing.frames.length; index += 1) {
    expect(
      samples.closing.frames[index]!.distanceFromBottom,
    ).toBeGreaterThanOrEqual(
      samples.closing.frames[index - 1]!.distanceFromBottom - 1,
    );
  }
  expect(samples.opening.frames.at(-1)!.distanceFromBottom).toBeLessThan(-200);
  expect(
    Math.abs(samples.closing.frames.at(-1)!.distanceFromBottom),
  ).toBeLessThan(1.5);
});

test('a static overlay rail renders exactly its size, border included', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=workbench');
  // An out-of-flow rail used to size to its content plus its 1px border.
  const full = page.locator('#catalog-workbench-full');
  const rail = full.locator('[data-workbench-rail="left"]');
  await full.scrollIntoViewIfNeeded();
  await rail.evaluate((element) => {
    element.dataset.presentation = 'overlay';
  });
  await expect(rail).toHaveCSS('position', 'absolute');
  expect((await rail.boundingBox())!.width).toBe(280);
  await expect(rail).toHaveCSS('border-right-width', '1px');
  // The content fills the rail inside its separator border.
  const content = rail.locator('.kui-workbench__panel-content');
  expect((await content.boundingBox())!.width).toBe(279);

  // A resizable rail's overlay takes its current size the same way.
  const resizable = page.locator(
    '#catalog-workbench-resizable [data-workbench-rail="left"]',
  );
  await resizable.evaluate((element) => {
    element.removeAttribute('data-responsive-overlay-at');
    element.dataset.presentation = 'overlay';
  });
  await expect(resizable).toHaveCSS('position', 'absolute');
  expect((await resizable.boundingBox())!.width).toBe(240);
});

test.describe('resizable Workbench panels', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/?component=workbench');
  });

  test('resizing is off by default: fixed panels render no separator handle', async ({
    page,
  }) => {
    await expect(
      page.locator('#catalog-workbench-full [data-kui-resize-handle]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#catalog-workbench-full [data-resizable]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#catalog-workbench-resizable [data-kui-resize-handle]'),
    ).toHaveCount(3);
  });

  test('keyboard resizing steps, accelerates, and clamps to the limits', async ({
    page,
  }) => {
    const workbench = page.locator('#catalog-workbench-resizable');
    const rail = workbench.locator('[data-workbench-rail="left"]');
    const handle = workbench.getByRole('separator', {
      name: 'Resize Navigator',
    });
    await expect(rail).toHaveCSS('width', '240px');
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await expect(rail).toHaveCSS('width', '256px');
    await expect(handle).toHaveAttribute('aria-valuenow', '256');
    await page.keyboard.press('Shift+ArrowLeft');
    await expect(rail).toHaveCSS('width', '192px');
    await page.keyboard.press('Shift+ArrowLeft');
    await expect(rail).toHaveCSS('width', '180px');
    await page.keyboard.press('End');
    await expect(rail).toHaveCSS('width', '400px');
    await page.keyboard.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', '400');

    const drawer = workbench.locator('[data-workbench-drawer]');
    const drawerHandle = workbench.getByRole('separator', {
      name: 'Resize Console',
    });
    await expect(drawer).toHaveCSS('height', '160px');
    await drawerHandle.focus();
    await page.keyboard.press('ArrowUp');
    await expect(drawer).toHaveCSS('height', '176px');
    await page.keyboard.press('Home');
    await expect(drawer).toHaveCSS('height', '120px');
  });

  test('pointer drags resize live, straddle the separator, and clamp', async ({
    page,
  }) => {
    const workbench = page.locator('#catalog-workbench-resizable');
    const rail = workbench.locator('[data-workbench-rail="left"]');
    const handle = rail.locator('[data-kui-resize-handle]');
    await workbench.scrollIntoViewIfNeeded();
    const railBox = (await rail.boundingBox())!;
    const box = (await handle.boundingBox())!;
    // The 20px hit target is centered on the rail's inner edge, reaching past
    // the clipped rail into the work area where the engine can extend the
    // clip; elsewhere it sits wholly inside the rail's edge.
    const straddles = await page.evaluate(() =>
      CSS.supports('overflow-clip-margin', '10px'),
    );
    expect(box.width).toBe(20);
    expect(
      Math.abs(
        box.x + box.width / 2 - (railBox.x + 240 - (straddles ? 0 : 10)),
      ),
    ).toBeLessThanOrEqual(1);
    const y = box.y + box.height / 2;
    const x = box.x + box.width / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 50, y, { steps: 5 });
    await expect(rail).toHaveAttribute('data-resizing', 'true');
    await expect(rail).toHaveCSS('width', '290px');
    await page.mouse.up();
    await expect(rail).not.toHaveAttribute('data-resizing', 'true');
    await expect(rail).toHaveCSS('width', '290px');
    await expect(handle).toHaveAttribute('aria-valuenow', '290');

    await page.mouse.move(x + 50, y);
    await page.mouse.down();
    await page.mouse.move(x + 600, y, { steps: 5 });
    await page.mouse.up();
    await expect(rail).toHaveCSS('width', '400px');

    const drawer = workbench.locator('[data-workbench-drawer]');
    const drawerBox = (await drawer
      .locator('[data-kui-resize-handle]')
      .boundingBox())!;
    const dx = drawerBox.x + drawerBox.width / 2;
    const dy = drawerBox.y + drawerBox.height / 2;
    await page.mouse.move(dx, dy);
    await page.mouse.down();
    await page.mouse.move(dx, dy - 40, { steps: 4 });
    await page.mouse.up();
    await expect(drawer).toHaveCSS('height', '200px');
  });

  test('collapsing keeps the size and expanding restores it', async ({
    page,
  }) => {
    const workbench = page.locator('#catalog-workbench-resizable');
    const rail = workbench.locator('[data-workbench-rail="left"]');
    const handle = rail.locator('[data-kui-resize-handle]');
    await handle.focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expect(rail).toHaveCSS('width', '304px');

    // An open rail's toggle lives in its own toolbar; closing it moves the
    // toggle to the editor toolbar.
    await rail.getByRole('button', { name: 'Hide navigator' }).click();
    await expect(rail).toHaveAttribute('data-collapsed', 'true');
    await expect(rail).toHaveCSS('width', '0px');
    await expect(handle).toBeHidden();
    await expect(handle).toHaveAttribute('tabindex', '-1');
    // A collapsed panel ignores resize keys.
    await handle.evaluate((element) =>
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
      ),
    );

    await workbench.getByRole('button', { name: 'Show navigator' }).click();
    await expect(rail).toHaveAttribute('data-collapsed', 'false');
    await expect(rail).toHaveCSS('width', '304px');
    await expect(handle).toHaveAttribute('tabindex', '0');
  });

  test('persists committed sizes across a reload', async ({ page }) => {
    const workbench = page.locator('#catalog-workbench-resizable');
    await workbench
      .getByRole('separator', { name: 'Resize Navigator' })
      .focus();
    await page.keyboard.press('Shift+ArrowRight');
    await workbench.getByRole('separator', { name: 'Resize Console' }).focus();
    await page.keyboard.press('ArrowUp');
    await expect
      .poll(() =>
        page.evaluate(() => [
          window.localStorage.getItem('kerf-ui-demo.workbench.navigator'),
          window.localStorage.getItem('kerf-ui-demo.workbench.console'),
        ]),
      )
      .toEqual(['304', '176']);

    await page.reload();
    await expect(
      page.locator('#catalog-workbench-resizable [data-workbench-rail="left"]'),
    ).toHaveCSS('width', '304px');
    await expect(
      page.locator('#catalog-workbench-resizable [data-workbench-drawer]'),
    ).toHaveCSS('height', '176px');
  });

  test('rails stop growing at the work-area minimum and shrink in proportion', async ({
    page,
  }) => {
    const workbench = page.locator('#catalog-workbench-resizable');
    const left = workbench.locator('[data-workbench-rail="left"]');
    const right = workbench.locator('[data-workbench-rail="right"]');
    const center = workbench.locator('.kui-workbench__center');
    const width = async (locator: typeof left) =>
      (await locator.boundingBox())!.width;
    await workbench.scrollIntoViewIfNeeded();
    await workbench.getByRole('button', { name: 'Show inspector' }).click();
    await expect(right).toHaveAttribute('data-collapsed', 'false');
    await expect(right).toHaveCSS('width', '160px');

    // End asks for the 400 px maximum; the navigator stops where the editor
    // keeps its 320 px default minimum beside the 160 px inspector.
    const room = (await width(workbench)) - 320 - 160;
    expect(room).toBeLessThan(400);
    const handle = workbench.getByRole('separator', {
      name: 'Resize Navigator',
    });
    await handle.focus();
    await page.keyboard.press('End');
    await expect(handle).toHaveAttribute(
      'aria-valuenow',
      String(Math.floor(room)),
    );
    expect(Math.abs((await width(center)) - 320)).toBeLessThanOrEqual(1);
    await expect(handle).toHaveAttribute(
      'aria-valuemax',
      String(Math.floor(room)),
    );

    // A drag past the minimum stops there too.
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    expect(
      Math.abs((await width(left)) - Math.floor(room)),
    ).toBeLessThanOrEqual(1);
    expect(Math.abs((await width(center)) - 320)).toBeLessThanOrEqual(1);

    // A narrower workbench squeezes the rails in proportion, never the editor.
    const ratio = (await width(left)) / (await width(right));
    await workbench.evaluate((element) => {
      element.style.width = '720px';
    });
    await expect.poll(async () => Math.round(await width(center))).toBe(320);
    expect((await width(left)) / (await width(right))).toBeCloseTo(ratio, 1);
    expect((await width(left)) + (await width(right))).toBeCloseTo(400, 0);
    // The navigator's content follows its shown width instead of clipping.
    const content = left.locator('.kui-workbench__panel-content');
    expect(
      Math.abs((await width(content)) - (await width(left))),
    ).toBeLessThanOrEqual(1);

    // The inspector now shows less than its 160 px minimum. Its separator
    // reports the width actually shown, in a range pinned there, since the
    // separator cannot move a track the container holds.
    const inspector = workbench.getByRole('separator', {
      name: 'Resize Inspector',
    });
    const shown = Math.floor(await width(right));
    expect(shown).toBeLessThan(160);
    const range = () =>
      inspector.evaluate((element) =>
        ['aria-valuemin', 'aria-valuenow', 'aria-valuemax'].map((name) =>
          element.getAttribute(name),
        ),
      );
    await expect.poll(range).toEqual([`${shown}`, `${shown}`, `${shown}`]);

    await workbench.evaluate((element) => {
      element.style.removeProperty('width');
    });
    await expect
      .poll(async () => Math.round(await width(left)))
      .toBe(Math.floor(room));
    // Room to show the minimum again restores the configured range.
    await expect.poll(range).toEqual(['160', '160', '160']);
  });

  test('the drawer stops growing at the work-area minimum height and gives way to it', async ({
    page,
  }) => {
    const workbench = page.locator('#catalog-workbench-resizable');
    const main = workbench.locator('.kui-workbench__main');
    const drawer = workbench.locator('[data-workbench-drawer]');
    const height = async (locator: typeof main) =>
      (await locator.boundingBox())!.height;
    await workbench.scrollIntoViewIfNeeded();
    const column = await height(workbench.locator('.kui-workbench__center'));

    // End asks for the 320 px maximum; the console stops where the editor
    // keeps its 120 px default minimum height.
    const room = Math.floor(column - 120);
    expect(room).toBeLessThan(320);
    const handle = workbench.getByRole('separator', { name: 'Resize Console' });
    await handle.focus();
    await page.keyboard.press('End');
    await expect(handle).toHaveAttribute('aria-valuenow', String(room));
    await expect(handle).toHaveAttribute('aria-valuemax', String(room));
    expect(Math.abs((await height(main)) - 120)).toBeLessThanOrEqual(1);

    // A shorter workbench shrinks the console, never the editor, and the
    // console's content follows its shown height.
    await workbench.evaluate((element) => {
      element.style.height = '300px';
    });
    await expect.poll(async () => Math.round(await height(main))).toBe(120);
    const shown = await height(drawer);
    expect(shown).toBeLessThan(room);
    const content = drawer.locator('.kui-workbench__panel-content');
    expect(Math.abs((await height(content)) - (shown - 1))).toBeLessThanOrEqual(
      1,
    );
    await expect(
      drawer.getByText('Console', { exact: true }).first(),
    ).toBeInViewport();

    await workbench.evaluate((element) => {
      element.style.removeProperty('height');
    });
    await expect.poll(async () => Math.round(await height(drawer))).toBe(room);
  });

  test('rails present as overlays below the narrow Workbench breakpoint', async ({
    page,
  }) => {
    const workbench = page.locator('#catalog-workbench-resizable');
    const left = workbench.locator('[data-workbench-rail="left"]');
    const handle = left.locator('[data-kui-resize-handle]');
    const center = workbench.locator('.kui-workbench__center');
    await workbench.scrollIntoViewIfNeeded();
    // Wide: inline, resizable, beside the work area.
    await expect(left).toHaveAttribute('data-responsive-overlay-at', 'narrow');
    await expect(left).toHaveCSS('position', 'relative');
    await expect(handle).toBeVisible();

    // A workbench 704 px or narrower presents the rail as an overlay: out of
    // flow over the full-width work area, with no separator to resize. A
    // 1024 px viewport leaves the catalog example narrower than that. The
    // overlay is transient: wireWorkbench collapses it on entering the
    // breakpoint, so it covers nothing until the user opens it.
    await page.setViewportSize({ width: 1024, height: 900 });
    await workbench.scrollIntoViewIfNeeded();
    const narrow = (await workbench.boundingBox())!.width;
    expect(narrow).toBeLessThanOrEqual(704);
    await expect(left).toHaveCSS('position', 'absolute');
    await expect(left).toHaveAttribute('data-collapsed', 'true');
    // A collapsed overlay drops its surface so nothing covers the editor.
    await expect(left).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(left).toHaveCSS('box-shadow', 'none');
    await expect(left).toHaveCSS('pointer-events', 'none');
    await expect(handle).toBeHidden();
    await expect
      .poll(async () => Math.round((await center.boundingBox())!.width))
      .toBe(Math.round(narrow));
    // The rendered presentation stays inline; only the container decides.
    await expect(left).toHaveAttribute('data-presentation', 'inline');

    await workbench.getByRole('button', { name: 'Show navigator' }).click();
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await expect(left).toHaveCSS('width', '240px');
    await expect(left).not.toHaveCSS('box-shadow', 'none');

    // Wide again: inline, expanded as it was before the breakpoint applied,
    // and resizable at the size it had.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(left).toHaveCSS('position', 'relative');
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await expect(handle).toBeVisible();
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await expect(left).toHaveCSS('width', '256px');
  });

  test('an overlay drawer keeps its height, statically and responsively', async ({
    page,
  }) => {
    const workbench = page.locator('#catalog-workbench-resizable');
    const drawer = workbench.locator('[data-workbench-drawer]');
    const content = drawer.locator('.kui-workbench__panel-content');
    await workbench.scrollIntoViewIfNeeded();

    // A static overlay drawer used to collapse to its 1px border: its content
    // is absolutely positioned, so the out-of-flow box had no height.
    await drawer.evaluate((element) => {
      element.dataset.presentation = 'overlay';
    });
    await expect(drawer).toHaveCSS('position', 'absolute');
    await expect(drawer).toHaveCSS('height', '160px');
    // It covers the bottom of the work-area column it docks under, not the
    // inline navigator beside it.
    const box = (await drawer.boundingBox())!;
    const column = (await workbench
      .locator('.kui-workbench__center')
      .boundingBox())!;
    expect(
      Math.abs(box.y + box.height - (column.y + column.height)),
    ).toBeLessThanOrEqual(1);
    expect(Math.abs(box.x - column.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.width - column.width)).toBeLessThanOrEqual(1);
    await expect(content).toBeVisible();
    await expect(drawer.getByText('Console')).toBeInViewport();
    await drawer.evaluate((element) => {
      element.dataset.presentation = 'inline';
    });
    await expect(drawer).toHaveCSS('position', 'relative');

    // A responsive overlay drawer switches below the Workbench breakpoint.
    // Narrow first: the wiring collapses the rails there, and that re-render
    // would drop an attribute set before it.
    await page.setViewportSize({ width: 390, height: 844 });
    await workbench.scrollIntoViewIfNeeded();
    await expect(
      workbench.locator('[data-workbench-rail="left"]'),
    ).toHaveAttribute('data-collapsed', 'true');
    await expect(drawer).toHaveCSS('position', 'relative');
    await drawer.evaluate((element) => {
      element.dataset.responsiveOverlayAt = 'narrow';
    });
    await expect(drawer).toHaveCSS('position', 'absolute');
    await expect(drawer).toHaveCSS('height', '160px');
    await expect(drawer.locator('[data-kui-resize-handle]')).toBeHidden();
    // The work area takes the full height beneath the overlay.
    const narrow = (await workbench.boundingBox())!;
    await expect
      .poll(async () =>
        Math.round(
          (await workbench.locator('.kui-workbench__main').boundingBox())!
            .height,
        ),
      )
      .toBe(Math.round(narrow.height));
    expect(
      await content.evaluate(
        (element) => window.getComputedStyle(element).backgroundColor,
      ),
    ).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('compact viewports keep the work area with overlay rails', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const workbench = page.locator('#catalog-workbench-resizable');
    await workbench.scrollIntoViewIfNeeded();
    await expect(workbench).toBeVisible();
    const left = workbench.locator('[data-workbench-rail="left"]');
    await expect(left).toHaveCSS('position', 'absolute');
    await expect(left.locator('[data-kui-resize-handle]')).toBeHidden();
    const width = (await workbench.boundingBox())!.width;
    expect(
      Math.round(
        (await workbench.locator('.kui-workbench__center').boundingBox())!
          .width,
      ),
    ).toBe(Math.round(width));
    // The overlay starts collapsed, so the editor is readable on arrival.
    await expect(left).toHaveAttribute('data-collapsed', 'true');
    await expect(workbench.getByText('Resize the panels')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    if (testInfo.project.name === 'chromium')
      await workbench.screenshot({
        path: 'test-results/workbench-overlay-rails-compact.png',
      });
  });

  test('an open overlay rail closes on Escape or an outside click and returns focus', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const workbench = page.locator('#catalog-workbench-resizable');
    const left = workbench.locator('[data-workbench-rail="left"]');
    const right = workbench.locator('[data-workbench-rail="right"]');
    await workbench.scrollIntoViewIfNeeded();
    await expect(left).toHaveAttribute('data-collapsed', 'true');

    // Escape closes the open overlay and focus returns to the control that
    // opened it, including from inside the overlay.
    const showNavigator = workbench.getByRole('button', {
      name: 'Show navigator',
    });
    await showNavigator.focus();
    await page.keyboard.press('Enter');
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await expect(left).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(left).toHaveAttribute('data-collapsed', 'true');
    await expect(showNavigator).toBeFocused();

    // An outside click closes it; a click inside keeps it open.
    await showNavigator.click();
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await left.getByText('Navigator').click();
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    const editor = workbench.getByText('Resize the panels');
    const box = (await workbench.boundingBox())!;
    await page.mouse.click(box.x + box.width - 16, box.y + box.height - 16);
    await expect(left).toHaveAttribute('data-collapsed', 'true');
    await expect(editor).toBeVisible();

    // The rail's own toggle still closes an open overlay exactly once.
    await showNavigator.click();
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await left.getByRole('button', { name: 'Hide navigator' }).click();
    await expect(left).toHaveAttribute('data-collapsed', 'true');

    // The open inspector overlay has taken its toggle into its own toolbar;
    // Escape still closes it and focus returns to the editor toolbar.
    const showInspector = workbench.getByRole('button', {
      name: 'Show inspector',
    });
    await showInspector.click();
    await expect(right).toHaveAttribute('data-collapsed', 'false');
    await page.keyboard.press('Escape');
    await expect(right).toHaveAttribute('data-collapsed', 'true');
    await expect(showInspector).toBeFocused();
  });

  test('an open overlay rail takes focus and keeps Tab inside it; an inline rail does not', async ({
    page,
  }, testInfo) => {
    const workbench = page.locator('#catalog-workbench-resizable');
    const left = workbench.locator('[data-workbench-rail="left"]');
    const toolbar = workbench.locator('.kui-workbench__main');
    const toggle = toolbar.getByRole('button', { name: 'Show navigator' });
    const own = left.getByRole('button', { name: 'Hide navigator' });
    await workbench.scrollIntoViewIfNeeded();

    // Wide, the rail is inline and open, its toggle in its own toolbar.
    // Closing it moves the toggle — and focus — to the editor toolbar;
    // showing it again moves both back into the rail, which takes no other
    // focus.
    await own.focus();
    await page.keyboard.press('Enter');
    await expect(left).toHaveAttribute('data-collapsed', 'true');
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await expect(own).toBeFocused();

    // Narrow, it is an overlay over the editor: focus moves to its first
    // control, the header's own close control.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(left).toHaveAttribute('data-collapsed', 'true');
    await workbench.scrollIntoViewIfNeeded();
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    const close = left.getByRole('button', { name: 'Hide navigator' });
    await expect(close).toBeFocused();
    await expect(close).toBeInViewport();
    // The rail's content never scrolled to reveal it mid-slide.
    expect(
      await left
        .locator('.kui-workbench__panel-content')
        .evaluate((content) => content.parentElement!.scrollLeft),
    ).toBe(0);
    if (testInfo.project.name === 'chromium')
      await workbench.screenshot({
        path: 'test-results/workbench-overlay-focus-in.png',
      });

    // Tab and Shift+Tab cycle inside the rail and never reach the editor it
    // covers.
    const count = await left.evaluate(
      (rail) =>
        rail.querySelectorAll(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ).length,
    );
    const insideRail = () =>
      page.evaluate(
        () =>
          document.activeElement?.closest('[data-workbench-rail="left"]') !==
          null,
      );
    for (let step = 0; step < count + 2; step += 1) {
      await page.keyboard.press('Tab');
      expect(await insideRail()).toBe(true);
    }
    for (let step = 0; step < count + 2; step += 1) {
      await page.keyboard.press('Shift+Tab');
      expect(await insideRail()).toBe(true);
    }

    // Escape closes it and returns focus to the toggle that opened it.
    await page.keyboard.press('Escape');
    await expect(left).toHaveAttribute('data-collapsed', 'true');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAccessibleName('Show navigator');
  });

  test('overlay rails stack above an overlay drawer, the right rail above the left', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const workbench = page.locator('#catalog-workbench-resizable');
    const left = workbench.locator('[data-workbench-rail="left"]');
    const right = workbench.locator('[data-workbench-rail="right"]');
    const drawer = workbench.locator('[data-workbench-drawer]');
    await workbench.scrollIntoViewIfNeeded();
    await expect(left).toHaveAttribute('data-collapsed', 'true');

    // Overlays are exclusive, so the wiring keeps one rail open at a time.
    // Stacking still decides what shows when an app opts out of that
    // (exclusiveOverlays: false): open the inspector from the editor toolbar,
    // then show the navigator beside it directly, and present the console as
    // an overlay too.
    await workbench
      .locator('.kui-workbench__main')
      .getByRole('button', { name: 'Show inspector' })
      .focus();
    await page.keyboard.press('Enter');
    await expect(right).toHaveAttribute('data-collapsed', 'false');
    await left.evaluate((element) => {
      // Stand in for an expanded render: a collapsed rail is also inert and
      // hidden, and an inert box is not hit-testable.
      element.dataset.collapsed = 'false';
      element.removeAttribute('inert');
      element.removeAttribute('aria-hidden');
    });
    await drawer.evaluate((element) => {
      element.dataset.responsiveOverlayAt = 'narrow';
    });
    for (const panel of [left, right, drawer])
      await expect(panel).toHaveCSS('position', 'absolute');

    const owner = (x: number, y: number) =>
      page.evaluate(
        ([px, py]) => {
          const hit = document.elementFromPoint(px!, py!);
          const panel = hit?.closest(
            '[data-workbench-rail], [data-workbench-drawer]',
          );
          if (!panel) return null;
          return panel.hasAttribute('data-workbench-drawer')
            ? 'drawer'
            : `rail-${panel.getAttribute('data-workbench-rail')}`;
        },
        [x, y],
      );
    const box = (await workbench.boundingBox())!;
    const drawerBox = (await drawer.boundingBox())!;
    const leftBox = (await left.boundingBox())!;
    const rightBox = (await right.boundingBox())!;
    const bottom = drawerBox.y + drawerBox.height - 12;
    // Each rail covers the drawer where they meet in a bottom corner.
    expect(await owner(leftBox.x + 12, bottom)).toBe('rail-left');
    expect(await owner(rightBox.x + rightBox.width - 12, bottom)).toBe(
      'rail-right',
    );
    // The drawer still shows between them where no rail reaches, if any.
    if (rightBox.x > leftBox.x + leftBox.width)
      expect(
        await owner((leftBox.x + leftBox.width + rightBox.x) / 2, bottom),
      ).toBe('drawer');
    // Where the rails overlap each other, the right rail is on top.
    expect(leftBox.x + leftBox.width).toBeGreaterThan(rightBox.x);
    expect(await owner(rightBox.x + 4, box.y + box.height / 3)).toBe(
      'rail-right',
    );
    if (testInfo.project.name === 'chromium')
      await workbench.screenshot({
        path: 'test-results/workbench-overlay-stacking.png',
      });
  });

  test("an open overlay covers other panels' restore controls", async ({
    page,
  }, testInfo) => {
    const workbench = page.locator('#catalog-workbench-collapsed');
    const inspector = workbench.locator('[data-workbench-rail="right"]');
    const restore = workbench.getByRole('button', { name: 'Show console' });
    await workbench.scrollIntoViewIfNeeded();
    await expect(restore).toBeVisible();

    // Present the open inspector as an overlay: it now spans the Workbench's
    // end edge, over the work-area corner where the collapsed console's
    // restore control floats.
    await inspector.evaluate((element) => {
      element.dataset.presentation = 'overlay';
    });
    await expect(inspector).toHaveCSS('position', 'absolute');
    const topmost = () =>
      restore.evaluate((button) => {
        const box = button.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
        if (button.contains(hit)) return 'restore';
        return hit?.closest('[data-workbench-rail="right"]')
          ? 'inspector'
          : String(hit?.className);
      });
    // The open overlay is the top layer: the control sits beneath it.
    expect(await topmost()).toBe('inspector');
    if (testInfo.project.name === 'chromium')
      await workbench.screenshot({
        path: 'test-results/workbench-overlay-covers-restore.png',
      });

    // Collapsed, the overlay drops its surface and pointer events, so the
    // control beneath it is visible and usable again.
    await inspector.evaluate((element) => {
      element.dataset.collapsed = 'true';
    });
    await expect.poll(topmost).toBe('restore');
    await restore.click();
    await expect(workbench.locator('[data-workbench-drawer]')).toHaveAttribute(
      'data-collapsed',
      'false',
    );
  });

  test('opening one overlay rail closes the other, so neither hides its controls', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const workbench = page.locator('#catalog-workbench-resizable');
    const left = workbench.locator('[data-workbench-rail="left"]');
    const right = workbench.locator('[data-workbench-rail="right"]');
    const toolbar = workbench.locator('.kui-workbench__main');
    await workbench.scrollIntoViewIfNeeded();
    await expect(left).toHaveAttribute('data-collapsed', 'true');

    // By keyboard, which is no outside press: only exclusivity closes the
    // navigator when the inspector opens.
    const showNavigator = toolbar.getByRole('button', {
      name: 'Show navigator',
    });
    await showNavigator.focus();
    await page.keyboard.press('Enter');
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await toolbar.getByRole('button', { name: 'Show inspector' }).focus();
    await page.keyboard.press('Enter');
    await expect(right).toHaveAttribute('data-collapsed', 'false');
    await expect(left).toHaveAttribute('data-collapsed', 'true');
    const close = right.getByRole('button', { name: 'Hide inspector' });
    await expect(close).toBeInViewport();
    if (testInfo.project.name === 'chromium')
      await workbench.screenshot({
        path: 'test-results/workbench-overlay-exclusive.png',
      });

    // And back: the navigator's own close control is never covered.
    await showNavigator.focus();
    await page.keyboard.press('Enter');
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await expect(right).toHaveAttribute('data-collapsed', 'true');
    const hideNavigator = left.getByRole('button', { name: 'Hide navigator' });
    // Once the rails' slides settle, the control is the navigator's own.
    await expect
      .poll(async () => {
        const box = (await hideNavigator.boundingBox())!;
        return page.evaluate(
          ([x, y]) =>
            document
              .elementFromPoint(x!, y!)
              ?.closest('[data-workbench-rail="left"]') !== null,
          [box.x + box.width / 2, box.y + box.height / 2],
        );
      })
      .toBe(true);
    await hideNavigator.click();
    await expect(left).toHaveAttribute('data-collapsed', 'true');
    await expect(showNavigator).toBeFocused();

    // Wide, the rails are inline and stay open together.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(left).toHaveCSS('position', 'relative');
    await toolbar.getByRole('button', { name: 'Show inspector' }).click();
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await expect(right).toHaveAttribute('data-collapsed', 'false');
  });

  test("an overlay rail closes from its own header's control and returns focus", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const workbench = page.locator('#catalog-workbench-resizable');
    const right = workbench.locator('[data-workbench-rail="right"]');
    const editorToggle = workbench
      .locator('.kui-workbench__main')
      .getByRole('button', { name: 'Show inspector' });
    await workbench.scrollIntoViewIfNeeded();
    await editorToggle.focus();
    await page.keyboard.press('Enter');
    await expect(right).toHaveAttribute('data-collapsed', 'false');
    await expect(right).toHaveCSS('position', 'absolute');

    // Open, the toggle leaves the editor toolbar for the rail's own, so the
    // overlay never depends on a control it covers.
    await expect(
      workbench
        .locator('.kui-workbench__main')
        .locator('[data-workbench-toggle="right"]'),
    ).toHaveCount(0);
    const close = right.getByRole('button', { name: 'Hide inspector' });
    await expect(close).toBeInViewport();
    if (testInfo.project.name === 'chromium')
      await workbench.screenshot({
        path: 'test-results/workbench-overlay-rail-close.png',
      });
    await close.click();
    await expect(right).toHaveAttribute('data-collapsed', 'true');
    // Focus leaves the hidden rail for the toggle that opened it.
    await expect(editorToggle).toBeFocused();
    await expect(editorToggle).toHaveAccessibleName('Show inspector');

    // By keyboard too: focus the rail's close control and activate it.
    await page.keyboard.press('Enter');
    await expect(right).toHaveAttribute('data-collapsed', 'false');
    await close.focus();
    await page.keyboard.press('Enter');
    await expect(right).toHaveAttribute('data-collapsed', 'true');
    await expect(editorToggle).toBeFocused();
  });

  test('a collapsed panel leaves the Tab order and reveals nothing, and still slides out', async ({
    page,
  }, testInfo) => {
    const workbench = page.locator('#catalog-workbench-resizable');
    const toolbar = workbench.locator('.kui-workbench__main');
    const left = workbench.locator('[data-workbench-rail="left"]');
    const right = workbench.locator('[data-workbench-rail="right"]');
    const content = (panel: typeof left) =>
      panel.locator('> .kui-workbench__panel-content');
    await workbench.scrollIntoViewIfNeeded();

    // Wide, the inline navigator hides from its own header's control: its
    // content still slides out, becomes inert, and focus returns to the
    // editor toolbar's toggle rather than staying on a control that left.
    const hide = left.getByRole('button', { name: 'Hide navigator' });
    await hide.focus();
    const animating = await hide.evaluate((button: HTMLElement) => {
      button.click();
      return button
        .closest('.kui-workbench__panel-content')!
        .getAnimations()
        .some((animation) => animation.playState === 'running');
    });
    expect(animating).toBe(true);
    await expect(left).toHaveAttribute('data-collapsed', 'true');
    await expect(content(left)).toHaveAttribute('inert', '');
    // The labeled rail leaves the accessibility tree whole, so no empty
    // complementary landmark stays behind for a screen reader to land on.
    const leftLabel = (await left.getAttribute('aria-label'))!;
    await expect(left).toHaveAttribute('aria-hidden', 'true');
    await expect(left).toHaveAttribute('inert', '');
    await expect(
      workbench.getByRole('complementary', { name: leftLabel, exact: true }),
    ).toHaveCount(0);
    const navigatorToggle = toolbar.getByRole('button', {
      name: 'Show navigator',
    });
    await expect(navigatorToggle).toBeFocused();
    await navigatorToggle.press('Enter');
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await expect(content(left)).not.toHaveAttribute('inert');
    await expect(
      workbench.getByRole('complementary', { name: leftLabel, exact: true }),
    ).toHaveCount(1);

    // Narrow, both rails are collapsed overlays: Tab and Shift+Tab from the
    // editor toolbar never reach either, and nothing hidden scrolls into view.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(left).toHaveAttribute('data-collapsed', 'true');
    await expect(right).toHaveAttribute('data-collapsed', 'true');
    await expect(content(right)).toHaveAttribute('inert', '');
    await workbench.scrollIntoViewIfNeeded();
    const inCollapsedPanel = () =>
      page.evaluate(
        () =>
          document.activeElement?.closest(
            '[data-workbench-rail][data-collapsed="true"], [data-workbench-drawer][data-collapsed="true"]',
          ) != null,
      );
    for (const key of ['Tab', 'Shift+Tab']) {
      await toolbar.getByRole('button', { name: 'Show inspector' }).focus();
      for (let step = 0; step < 6; step += 1) {
        await page.keyboard.press(key);
        expect(await inCollapsedPanel()).toBe(false);
      }
    }
    for (const rail of [left, right])
      expect(await rail.evaluate((element) => element.scrollLeft)).toBe(0);
    if (testInfo.project.name === 'chromium')
      await workbench.screenshot({
        path: 'test-results/workbench-collapsed-inert.png',
      });

    // The collapsed responsive output drawer is out of the Tab order too;
    // showing it makes its content reachable again.
    const drawerWorkbench = page.locator(
      '#catalog-workbench-responsive-drawer',
    );
    const drawer = drawerWorkbench.locator('[data-workbench-drawer]');
    await drawerWorkbench.scrollIntoViewIfNeeded();
    await expect(drawer).toHaveAttribute('data-collapsed', 'true');
    await expect(content(drawer)).toHaveAttribute('inert', '');
    const outputToggle = drawerWorkbench
      .locator('.kui-workbench__main')
      .getByRole('button', { name: 'Show output' });
    for (const key of ['Tab', 'Shift+Tab']) {
      await outputToggle.focus();
      for (let step = 0; step < 3; step += 1) {
        await page.keyboard.press(key);
        expect(await inCollapsedPanel()).toBe(false);
      }
    }
    await outputToggle.focus();
    await page.keyboard.press('Enter');
    await expect(drawer).toHaveAttribute('data-collapsed', 'false');
    await expect(content(drawer)).not.toHaveAttribute('inert');
    await expect(
      drawer.getByRole('button', { name: 'Hide output' }),
    ).toBeFocused();
  });

  test('a rail open at wire-up returns focus to its aria-controls toggle when it closes from inside', async ({
    page,
  }) => {
    const workbench = page.locator('#catalog-workbench-resizable');
    const left = workbench.locator('[data-workbench-rail="left"]');
    await workbench.scrollIntoViewIfNeeded();
    // The navigator starts open, so the wiring recorded no opener for it.
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await expect(left).toHaveAttribute(
      'id',
      'catalog-workbench-resizable-left-rail',
    );
    const own = left.getByRole('button', { name: 'Hide navigator' });
    await expect(own).toHaveAttribute(
      'aria-controls',
      'catalog-workbench-resizable-left-rail',
    );
    const toggle = workbench
      .locator('.kui-workbench__main')
      .getByRole('button', { name: /navigator$/ });

    await own.focus();
    await page.keyboard.press('Enter');
    await expect(left).toHaveAttribute('data-collapsed', 'true');
    // Focus lands on the editor toolbar toggle that now names the rail, not
    // on the document body.
    await expect(toggle).toHaveAttribute(
      'aria-controls',
      'catalog-workbench-resizable-left-rail',
    );
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAccessibleName('Show navigator');
  });

  test('the collapsed console restores from its corner control', async ({
    page,
  }) => {
    const workbench = page.locator('#catalog-workbench-collapsed');
    const drawer = workbench.locator('[data-workbench-drawer]');
    await workbench.scrollIntoViewIfNeeded();
    const restore = workbench.locator('.kui-workbench__restore');
    const group = restore.locator('[data-component="toolbar-control-group"]');
    await expect(group).toBeVisible();

    // The control floats in the bottom-end corner of the work area it
    // restores into, beside the expanded inspector: anchored to the
    // Workbench, not the viewport, and inset once by the restore corner even
    // though a FloatingToolbar (which has its own inset) hosts it.
    const column = (await workbench
      .locator('.kui-workbench__center')
      .boundingBox())!;
    const corner = async () => {
      const box = (await group.boundingBox())!;
      return {
        end: Math.round(column.x + column.width - (box.x + box.width)),
        bottom: Math.round(column.y + column.height - (box.y + box.height)),
      };
    };
    expect(await corner()).toEqual({ end: 16, bottom: 16 });
    await expect(
      restore.locator('[data-component="floating-toolbar"]'),
    ).toHaveAttribute('role', 'toolbar');
    // It scrolls with the Workbench instead of staying on the viewport.
    const before = (await group.boundingBox())!.y;
    // Wheel over the control itself: the work area is a Pane whose content
    // scroller does not chain a wheel to the page.
    await group.hover();
    await page.mouse.wheel(0, -120);
    await expect
      .poll(async () => (await group.boundingBox())!.y)
      .toBeGreaterThan(before);
    // Measure once the scroll has finished; WebKitGTK animates wheel scrolls.
    await waitForScrollSettled(group);
    const moved = (await workbench
      .locator('.kui-workbench__center')
      .boundingBox())!;
    const box = (await group.boundingBox())!;
    expect(Math.round(moved.y + moved.height - (box.y + box.height))).toBe(16);

    await restore.getByRole('button', { name: 'Show console' }).click();
    await expect(drawer).toHaveAttribute('data-collapsed', 'false');
    await expect(drawer).toHaveCSS('height', '120px');
    await expect(restore).toHaveCount(0);
    await workbench.getByRole('button', { name: 'Hide console' }).click();
    await expect(drawer).toHaveAttribute('data-collapsed', 'true');
    await expect(
      workbench.getByRole('button', { name: 'Show console' }),
    ).toBeVisible();
  });
});

test('the responsive drawer example is inline when wide and a transient overlay when narrow', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=workbench');
  const workbench = page.locator('#catalog-workbench-responsive-drawer');
  const drawer = workbench.locator('[data-workbench-drawer]');
  const main = workbench.locator('.kui-workbench__main');
  const editorToggle = main.getByRole('button', { name: 'Show output' });
  await workbench.scrollIntoViewIfNeeded();

  // Wide: the drawer opens inline in its own 180 px track below the editor.
  await expect(drawer).toHaveAttribute('data-responsive-overlay-at', 'narrow');
  await expect(drawer).toHaveAttribute('data-collapsed', 'false');
  await expect(drawer).toHaveCSS('position', 'relative');
  await expect(drawer).toHaveCSS('height', '180px');
  const wide = (await workbench.boundingBox())!;
  expect(Math.round(wide.height - (await main.boundingBox())!.height)).toBe(
    180,
  );
  // Open, its toggle lives in its own toolbar, not the editor's.
  await expect(
    drawer.getByRole('button', { name: 'Hide output' }),
  ).toBeVisible();
  await expect(main.locator('[data-workbench-toggle]')).toHaveCount(0);
  if (testInfo.project.name === 'chromium')
    await workbench.screenshot({
      path: 'test-results/workbench-responsive-drawer-wide.png',
    });

  // Narrow: an overlay over the bottom of the full-height editor, hidden on
  // arrival because wireWorkbench collapses it as the breakpoint applies.
  await page.setViewportSize({ width: 390, height: 844 });
  await workbench.scrollIntoViewIfNeeded();
  await expect(drawer).toHaveCSS('position', 'absolute');
  await expect(drawer).toHaveAttribute('data-collapsed', 'true');
  await expect(drawer).toHaveCSS('pointer-events', 'none');
  const narrow = (await workbench.boundingBox())!;
  await expect
    .poll(async () => Math.round((await main.boundingBox())!.height))
    .toBe(Math.round(narrow.height));
  await expect(workbench.getByText('Narrow the workbench')).toBeVisible();

  // The editor's bottom toolbar opens it over the editor; its own toolbar
  // closes it, and focus returns to the toggle in the editor's bottom
  // toolbar.
  await editorToggle.focus();
  await page.keyboard.press('Enter');
  await expect(drawer).toHaveAttribute('data-collapsed', 'false');
  await expect(drawer).toHaveCSS('height', '180px');
  const box = (await drawer.boundingBox())!;
  expect(
    Math.abs(box.y + box.height - (narrow.y + narrow.height)),
  ).toBeLessThanOrEqual(1);
  await expect(drawer.getByText('Build output')).toBeInViewport();
  if (testInfo.project.name === 'chromium')
    await workbench.screenshot({
      path: 'test-results/workbench-responsive-drawer-narrow-open.png',
    });
  await drawer.getByRole('button', { name: 'Hide output' }).click();
  await expect(drawer).toHaveAttribute('data-collapsed', 'true');
  await expect(editorToggle).toBeFocused();

  // Escape and an outside press close it too.
  await page.keyboard.press('Enter');
  await expect(drawer).toHaveAttribute('data-collapsed', 'false');
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveAttribute('data-collapsed', 'true');
  await editorToggle.click();
  await expect(drawer).toHaveAttribute('data-collapsed', 'false');
  await workbench.getByText('Narrow the workbench').click();
  await expect(drawer).toHaveAttribute('data-collapsed', 'true');

  // Wide again: back inline and open, as it was before the breakpoint.
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(drawer).toHaveCSS('position', 'relative');
  await expect(drawer).toHaveAttribute('data-collapsed', 'false');
});

test('at phone widths an overlay rail fills the Workbench less a dismiss strip, one rail at a time', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=workbench');
  const workbench = page.locator('#catalog-workbench-resizable');
  const left = workbench.locator('[data-workbench-rail="left"]');
  const right = workbench.locator('[data-workbench-rail="right"]');
  const main = workbench.locator('.kui-workbench__main');
  await workbench.scrollIntoViewIfNeeded();
  const box = (await workbench.boundingBox())!;
  // Border-box geometry of the Workbench's content area.
  const inner = await workbench.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const start = parseFloat(style.borderLeftWidth);
    const end = parseFloat(style.borderRightWidth);
    return { left: rect.left + start, right: rect.right - end };
  });

  await main.getByRole('button', { name: 'Show navigator' }).click();
  await expect(left).toHaveAttribute('data-collapsed', 'false');
  await expect(left).toHaveCSS('position', 'absolute');
  await expect
    .poll(async () => {
      const rail = (await left.boundingBox())!;
      return Math.round(inner.right - (rail.x + rail.width));
    })
    .toBe(44);
  if (testInfo.project.name === 'chromium')
    await workbench.screenshot({
      path: 'test-results/workbench-phone-overlay-inset.png',
    });
  // A press in the strip beside it closes it.
  await page.mouse.click(inner.right - 22, box.y + box.height / 2);
  await expect(left).toHaveAttribute('data-collapsed', 'true');

  // The right rail leaves its strip on the other side, and opening it keeps
  // the navigator closed: one rail at a time.
  await main.getByRole('button', { name: 'Show inspector' }).click();
  await expect(right).toHaveAttribute('data-collapsed', 'false');
  await expect(left).toHaveAttribute('data-collapsed', 'true');
  await expect
    .poll(async () => Math.round((await right.boundingBox())!.x - inner.left))
    .toBe(44);

  // `compactOverlay: "full"` fills the Workbench.
  await right.evaluate((element) => {
    element.dataset.compactOverlay = 'full';
  });
  await expect
    .poll(async () => Math.round((await right.boundingBox())!.width))
    .toBe(Math.round(inner.right - inner.left));
});
