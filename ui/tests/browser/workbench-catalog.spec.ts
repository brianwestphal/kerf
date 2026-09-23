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
