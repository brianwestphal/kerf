import { expect, test } from '@playwright/test';

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
  await expect(full.locator('[data-workbench-rail="left"]')).toHaveCSS(
    'width',
    '280px',
  );
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

    // The editor toolbar's toggle; the rail's own header has one too.
    await workbench
      .locator('.kui-workbench__main')
      .getByRole('button', { name: 'Hide navigator' })
      .click();
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

    await workbench.evaluate((element) => {
      element.style.removeProperty('width');
    });
    await expect
      .poll(async () => Math.round(await width(left)))
      .toBe(Math.floor(room));
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

    // The app's own toggle still closes an open overlay exactly once.
    await showNavigator.click();
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await workbench
      .locator('.kui-workbench__main')
      .getByRole('button', { name: 'Hide navigator' })
      .click();
    await expect(left).toHaveAttribute('data-collapsed', 'true');

    // The inspector overlay covers its editor toolbar toggle; Escape still
    // closes it.
    const showInspector = workbench.getByRole('button', {
      name: 'Show inspector',
    });
    await showInspector.click();
    await expect(right).toHaveAttribute('data-collapsed', 'false');
    await page.keyboard.press('Escape');
    await expect(right).toHaveAttribute('data-collapsed', 'true');
    await expect(showInspector).toBeFocused();
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

    // Open both rails from the editor toolbar by keyboard (a keyboard click
    // is no outside press, so the first stays open), then present the
    // console as an overlay too. Opening a rail re-renders, so the drawer's
    // attribute goes on last.
    for (const name of ['Show navigator', 'Show inspector']) {
      await workbench
        .locator('.kui-workbench__main')
        .getByRole('button', { name })
        .focus();
      await page.keyboard.press('Enter');
    }
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await expect(right).toHaveAttribute('data-collapsed', 'false');
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
    // The order does not depend on which opened last: reopen the navigator.
    // (The right rail covers the navigator's own close control, so by key.)
    await left.getByRole('button', { name: 'Hide navigator' }).focus();
    await page.keyboard.press('Enter');
    await expect(left).toHaveAttribute('data-collapsed', 'true');
    await workbench
      .locator('.kui-workbench__main')
      .getByRole('button', { name: 'Show navigator' })
      .focus();
    await page.keyboard.press('Enter');
    await expect(left).toHaveAttribute('data-collapsed', 'false');
    await drawer.evaluate((element) => {
      element.dataset.responsiveOverlayAt = 'narrow';
    });
    await expect(drawer).toHaveCSS('position', 'absolute');
    expect(await owner(leftBox.x + 12, bottom)).toBe('rail-left');
    expect(await owner(rightBox.x + 4, box.y + box.height / 3)).toBe(
      'rail-right',
    );
    if (testInfo.project.name === 'chromium')
      await workbench.screenshot({
        path: 'test-results/workbench-overlay-stacking.png',
      });
  });

  test("an overlay rail closes from its own header's control and returns focus", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const workbench = page.locator('#catalog-workbench-resizable');
    const right = workbench.locator('[data-workbench-rail="right"]');
    const editorToggle = workbench
      .locator('.kui-workbench__main')
      .getByRole('button', { name: /inspector$/ });
    await workbench.scrollIntoViewIfNeeded();
    await editorToggle.focus();
    await page.keyboard.press('Enter');
    await expect(right).toHaveAttribute('data-collapsed', 'false');
    await expect(right).toHaveCSS('position', 'absolute');

    // The open overlay covers the editor toolbar's toggle: a press there
    // lands in the inspector, not on the toggle.
    const box = (await editorToggle.boundingBox())!;
    expect(
      await page.evaluate(
        ([x, y]) =>
          document
            .elementFromPoint(x!, y!)
            ?.closest('[data-workbench-rail="right"]') !== null,
        [box.x + box.width / 2, box.y + box.height / 2],
      ),
    ).toBe(true);

    // Its own header carries a reachable Hide control instead.
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
    await workbench.hover();
    await page.mouse.wheel(0, -120);
    await expect
      .poll(async () => (await group.boundingBox())!.y)
      .toBeGreaterThan(before);
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
