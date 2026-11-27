import { expect, test } from '@playwright/test';

test('ProgressBar advances, sweeps with a transform, and centers its motion fallbacks', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=progress-bar');
  const demo = page.locator('[data-demo="progress-bar"]');
  const upload = demo.getByRole('progressbar', { name: 'Uploading Files' });
  await expect(upload).toHaveJSProperty('value', 3);
  await demo.getByRole('button', { name: 'Upload Next File' }).click();
  await expect(upload).toHaveJSProperty('value', 4);
  await expect(upload).toHaveAttribute('aria-valuetext', '4 of 12 files');
  await expect(demo.locator('.kui-progress-bar__value').first()).toHaveText(
    '4 of 12 files',
  );

  const geometry = await upload.evaluate((element) => {
    const root = element.closest('.kui-progress-bar')!;
    const label = root.querySelector('.kui-progress-bar__label')!;
    return {
      trackHeight: element.getBoundingClientRect().height,
      // The bar fills its container, less the shared 1px + 8px inset.
      inset:
        element.getBoundingClientRect().left -
        root.getBoundingClientRect().left,
      labelInset:
        label.getBoundingClientRect().left - root.getBoundingClientRect().left,
    };
  });
  expect(geometry.trackHeight).toBeCloseTo(6, 0);
  expect(geometry.inset).toBeCloseTo(9, 0);
  expect(geometry.labelInset).toBeCloseTo(9, 0);

  const migrating = demo.getByRole('progressbar', {
    name: 'Migrating Database',
  });
  expect(
    await migrating.evaluate((element) => element.matches(':indeterminate')),
  ).toBe(true);
  await expect(migrating).toHaveCSS('animation-name', 'none');
  const frame = migrating.locator('..');
  const example = demo.locator('[data-catalog-example]').filter({
    has: page.getByRole('progressbar', { name: 'Migrating Database' }),
  });
  const band = () =>
    frame.evaluate((element) => {
      const style = window.getComputedStyle(element, '::after');
      return {
        animation: style.animationName,
        width: Number.parseFloat(style.width),
        offset:
          style.transform === 'none'
            ? 0
            : new DOMMatrixReadOnly(style.transform).e,
        trackWidth: element.getBoundingClientRect().width,
      };
    });
  await expect
    .poll(async () => (await band()).animation)
    .toBe('kui-progress-bar-sweep');
  const sweep = await page.evaluate(() => {
    const animation = document
      .getAnimations()
      .find(
        (entry) =>
          entry instanceof CSSAnimation &&
          entry.animationName === 'kui-progress-bar-sweep',
      )!;
    animation.pause();
    animation.currentTime = 475;
    return (animation.effect as KeyframeEffect)
      .getKeyframes()
      .map((keyframe) => keyframe.transform);
  });
  expect(sweep).toEqual([
    expect.stringContaining('-90%'),
    expect.stringContaining('240%'),
  ]);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const active = await band();
    expect(active.width / active.trackWidth).toBeCloseTo(0.4, 2);
    await expect(migrating).toHaveCSS('height', '6px');
    await example.screenshot({
      path: testInfo.outputPath(`progress-bar-sweep-${width}.png`),
    });
  }
  await expect(
    demo.getByRole('progressbar', { name: 'Sync Progress' }),
  ).toHaveCSS('height', '4px');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => (await band()).animation).toBe('none');
  const reduced = await band();
  expect(reduced.offset / reduced.trackWidth).toBeCloseTo(0.3, 2);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => {
    document.documentElement.dataset.kuiEffects = 'static';
  });
  await expect.poll(async () => (await band()).animation).toBe('none');
  const staticBand = await band();
  expect(staticBand.offset / staticBand.trackWidth).toBeCloseTo(0.3, 2);
  await example.screenshot({
    path: testInfo.outputPath('progress-bar-static-390.png'),
  });

  // The visual path still follows the DOM's live native state.
  await migrating.evaluate((element) => {
    (element as HTMLProgressElement).value = 0.5;
  });
  await expect(migrating).toHaveAttribute('value', '0.5');
  expect(
    await frame.evaluate(
      (element) => window.getComputedStyle(element, '::after').content,
    ),
  ).toBe('none');
});

test('ProgressBar keeps its track border and solid band in forced colors', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Chromium emulates forced colors');
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.goto('/?component=progress-bar');
  const migrating = page.getByRole('progressbar', {
    name: 'Migrating Database',
  });
  const track = migrating.locator('..');
  await expect(track).toHaveCSS('border-top-width', '1px');
  await expect(track).toHaveCSS('height', '6px');
  expect(
    await track.evaluate((element) => {
      const probe = document.createElement('span');
      probe.style.cssText =
        'background-color: Highlight; forced-color-adjust: none';
      document.body.append(probe);
      const highlight = window.getComputedStyle(probe).backgroundColor;
      const band = window.getComputedStyle(element, '::after');
      probe.remove();
      return {
        matchesHighlight: band.backgroundColor === highlight,
        image: band.backgroundImage,
      };
    }),
  ).toEqual({ matchesHighlight: true, image: 'none' });
});

test('ProgressRing reports its value as a named progressbar and spins when indeterminate', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=progress-ring');
  const demo = page.locator('[data-demo="progress-ring"]');
  const medium = demo.getByRole('progressbar', {
    name: 'Upload Progress, medium',
  });
  await expect(medium).toHaveAttribute('aria-valuenow', '25');
  await demo.getByRole('button', { name: 'Upload Next File' }).click();
  await expect(medium).toHaveAttribute('aria-valuenow', '33');
  await expect(medium).toHaveAttribute('aria-valuetext', '4 of 12 files');
  const sizes = await demo
    .locator('.kui-progress-ring')
    .evaluateAll((rings) =>
      rings.slice(0, 3).map((ring) => ring.getBoundingClientRect().width),
    );
  expect(sizes).toEqual([16, 24, 40]);

  const connecting = demo.getByRole('progressbar', { name: 'Connecting' });
  const svg = connecting.locator('svg');
  await expect(connecting).not.toHaveAttribute('aria-valuenow');
  await expect(svg).toHaveCSS('animation-name', 'kui-progress-ring-spin');
  expect(
    await svg.evaluate((element) =>
      (element.getAnimations()[0]?.effect as KeyframeEffect)
        .getKeyframes()
        .at(-1),
    ),
  ).toMatchObject({ transform: 'rotate(270deg)' });
  await expect(svg).toHaveCSS('rotate', 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(svg).toHaveCSS('animation-name', 'none');
  expect(
    await svg.evaluate((element) => {
      const matrix = new DOMMatrixReadOnly(
        window.getComputedStyle(element).transform,
      );
      return [matrix.a, matrix.b, matrix.c, matrix.d];
    }),
  ).toEqual([0, -1, 1, 0].map((value) => expect.closeTo(value, 5)));
});
