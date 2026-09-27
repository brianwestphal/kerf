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
  await expect(restore).toBeVisible();
  await expect(restore).toHaveCSS('position', 'fixed');
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

    await workbench.getByRole('button', { name: 'Hide navigator' }).click();
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

  test('compact viewports present no resizable shell', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#catalog-workbench-resizable')).toBeHidden();
    await expect(
      page.getByText('Resizable rails are a desktop affordance.'),
    ).toBeVisible();
  });
});
