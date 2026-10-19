import { expect, type Page, test } from '@playwright/test';

async function example(page: Page) {
  await page.goto('/?component=list');
  const root = page.locator('[data-demo-view-transitions]');
  await root.scrollIntoViewIfNeeded();
  await expect(root.locator('[data-vt-row]')).toHaveCount(3);
  return root;
}

async function order(page: Page) {
  return page
    .locator('[data-demo-view-transitions] [data-vt-row]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-vt-row')),
    );
}

test('List catalog controls reorder, insert, remove, and reset stable named rows', async ({
  page,
}) => {
  const root = await example(page);
  expect(await order(page)).toEqual(['a', 'b', 'c']);
  const names = await root
    .locator('[data-vt-row]')
    .evaluateAll((elements) =>
      elements.map(
        (element) => window.getComputedStyle(element).viewTransitionName,
      ),
    );
  expect(names).toEqual(['vt-ux-list-a', 'vt-ux-list-b', 'vt-ux-list-c']);
  expect(new Set(names).size).toBe(3);
  await root.getByRole('button', { name: 'Reorder' }).click();
  await expect.poll(() => order(page)).toEqual(['c', 'b', 'a']);
  await root.getByRole('button', { name: 'Insert Delta' }).click();
  await expect.poll(() => order(page)).toEqual(['c', 'd', 'b', 'a']);
  await expect(
    root.getByRole('button', { name: 'Insert Delta' }),
  ).toBeDisabled();
  await root.getByRole('button', { name: 'Remove Last' }).click();
  await expect.poll(() => order(page)).toEqual(['c', 'd', 'b']);
  await root.getByRole('button', { name: 'Reset' }).click();
  await expect.poll(() => order(page)).toEqual(['a', 'b', 'c']);
  await expect(
    page.getByRole('link', { name: 'Read the recipe' }),
  ).toHaveAttribute('href', /docs\/view-transitions\.md$/);
});

test('List demo updates directly without View Transitions and under reduced motion', async ({
  page,
}) => {
  let root = await example(page);
  await page.evaluate(() =>
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: undefined,
    }),
  );
  await root.getByRole('button', { name: 'Reorder' }).click();
  expect(await order(page)).toEqual(['c', 'b', 'a']);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  root = await example(page);
  await root.getByRole('button', { name: 'Reorder' }).click();
  expect(await order(page)).toEqual(['c', 'b', 'a']);
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) =>
            (
              animation.effect as KeyframeEffect | null
            )?.pseudoElement?.includes('view-transition'),
          ).length,
    ),
  ).toBe(0);
});

for (const { width, height } of [
  { width: 1200, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`List row viewport stays fixed through all actions at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    const root = await example(page);
    const rows = root.locator('[data-vt-row-viewport]');
    const initial = await rows.boundingBox();
    expect(initial).not.toBeNull();
    const stableHeight = initial!.height;
    for (const action of ['Reorder', 'Insert Delta', 'Remove Last', 'Reset']) {
      const lastRow = root.locator('[data-vt-row]').last();
      const before = await lastRow.boundingBox();
      expect(before).not.toBeNull();
      const viewport = await rows.boundingBox();
      expect(before!.y + before!.height).toBeLessThanOrEqual(
        viewport!.y + viewport!.height,
      );
      await root
        .getByRole('button', { name: action })
        .evaluate((element: HTMLElement) => element.click());
      if (action === 'Remove Last' && testInfo.project.name === 'webkit') {
        await page.waitForTimeout(90);
        await root.screenshot({
          path: testInfo.outputPath(`list-remove-last-${width}-motion.png`),
        });
      }
      await expect
        .poll(async () => (await rows.boundingBox())?.height)
        .toBe(stableHeight);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.style.viewTransitionName,
          ),
        )
        .toBe('');
    }
  });
}

for (const width of [1402, 390]) {
  test(`List controls preserve catalog scroll at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 1402 ? 1252 : 844 });
    const root = await example(page);
    const position = () =>
      root.evaluate((element) => {
        const pane = element.closest('.kui-pane__content')!;
        return {
          scrollTop: pane.scrollTop,
          top: element.getBoundingClientRect().top,
        };
      });
    const baseline = await position();
    expect(baseline.scrollTop).toBeGreaterThan(0);
    for (const name of ['Reorder', 'Insert Delta', 'Remove Last', 'Reset']) {
      await root
        .getByRole('button', { name })
        .evaluate((element: HTMLElement) => element.click());
      const during = await position();
      expect(during.scrollTop).toBeCloseTo(baseline.scrollTop, 0);
      expect(during.top).toBeCloseTo(baseline.top, 0);
      await page.waitForTimeout(400);
      const settled = await position();
      expect(settled.scrollTop).toBeCloseTo(baseline.scrollTop, 0);
      expect(settled.top).toBeCloseTo(baseline.top, 0);
      if (name === 'Reorder' && testInfo.project.name === 'webkit')
        await page.screenshot({
          path: testInfo.outputPath(`list-scroll-stable-${width}-settled.png`),
        });
    }
  });
}

for (const width of [1200, 390]) {
  test(`List View Transitions demo remains readable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const root = await example(page);
    await root.getByRole('button', { name: 'Reorder' }).click();
    await expect.poll(() => order(page)).toEqual(['c', 'b', 'a']);
    const bounds = await root.locator('[data-vt-row]').evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      }),
    );
    expect(
      bounds.every(
        (rect) => rect.left >= 0 && rect.right <= width && rect.width > 180,
      ),
    ).toBe(true);
    if (testInfo.project.name === 'chromium')
      await root.screenshot({
        path: testInfo.outputPath(`list-view-transitions-${width}-motion.png`),
      });
    await page.waitForTimeout(400);
    if (testInfo.project.name === 'chromium')
      await root.screenshot({
        path: testInfo.outputPath(`list-view-transitions-${width}-settled.png`),
      });
  });
}

for (const { width, height } of [
  { width: 701, height: 626 },
  { width: 390, height: 844 },
]) {
  test(`List transition snapshots stay inside the visible specimen at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    const root = await example(page);
    const pane = page.locator('.kui-pane__content').filter({ has: root });
    await pane.evaluate((element, selector) => {
      const specimen = element.querySelector(selector)!;
      const paneBottom = element.getBoundingClientRect().bottom;
      element.scrollTop +=
        specimen.getBoundingClientRect().top - paneBottom + 250;
    }, '[data-demo-view-transitions]');
    const expected = await root.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const paneRect = element
        .closest('.kui-pane__content')!
        .getBoundingClientRect();
      return {
        top: Math.max(0, rect.top, paneRect.top),
        right: Math.min(window.innerWidth, rect.right, paneRect.right),
        bottom: Math.min(window.innerHeight, rect.bottom, paneRect.bottom),
        left: Math.max(0, rect.left, paneRect.left),
      };
    });
    await root
      .getByRole('button', { name: 'Reorder' })
      .evaluate((element: HTMLElement) => element.click());
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue(
            '--demo-list-view-transition-clip',
          ),
        ),
      )
      .toContain('inset(');
    const state = await page.evaluate(() => ({
      requestedClip: document.documentElement.style.getPropertyValue(
        '--demo-list-view-transition-clip',
      ),
      clip: window.getComputedStyle(
        document.documentElement,
        '::view-transition',
      ).clipPath,
      rootOldAnimation: window.getComputedStyle(
        document.documentElement,
        '::view-transition-old(root)',
      ).animationName,
      rootNewAnimation: window.getComputedStyle(
        document.documentElement,
        '::view-transition-new(root)',
      ).animationName,
    }));
    expect(state.rootOldAnimation).toBe('none');
    expect(state.rootNewAnimation).toBe('none');
    expect(state.clip).toMatch(/^inset\(/);
    const numbers = [...state.requestedClip.matchAll(/([\d.]+)px/g)].map(
      (match) => Number(match[1]),
    );
    expect(numbers[0]).toBeCloseTo(expected.top, 0);
    expect(width - numbers[1]).toBeCloseTo(expected.right, 0);
    expect(height - numbers[2]).toBeCloseTo(expected.bottom, 0);
    expect(numbers[3]).toBeCloseTo(expected.left, 0);
    if (testInfo.project.name === 'webkit')
      await page.screenshot({
        path: testInfo.outputPath(
          `list-transition-clipped-${width}-motion.png`,
        ),
      });
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue(
            '--demo-list-view-transition-clip',
          ),
        ),
      )
      .toBe('');
  });
}

for (const { width, height } of [
  { width: 701, height: 626 },
  { width: 390, height: 844 },
  { width: 2560, height: 1410 },
]) {
  test(`List motion keeps the surrounding page painted at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    const root = await example(page);
    const before = await page.screenshot();
    await root
      .getByRole('button', { name: 'Reorder' })
      .evaluate((element: HTMLElement) => element.click());
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.style.viewTransitionName),
      )
      .toBe('none');
    await page.waitForTimeout(90);
    const during = await page.screenshot({
      path:
        testInfo.project.name === 'webkit'
          ? testInfo.outputPath(`list-page-painted-${width}-motion.png`)
          : undefined,
    });
    const colors = await page.evaluate(
      async ({ images, x }) => {
        const sample = async (base64: string) => {
          const image = new window.Image();
          image.src = `data:image/png;base64,${base64}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const context = canvas.getContext('2d')!;
          context.drawImage(image, x, 30, 1, 1, 0, 0, 1, 1);
          return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
        };
        return Promise.all(images.map(sample));
      },
      {
        images: [before.toString('base64'), during.toString('base64')],
        x: Math.floor(width / 2),
      },
    );
    for (let channel = 0; channel < 3; channel++)
      expect(
        Math.abs(colors[0]![channel]! - colors[1]![channel]!),
      ).toBeLessThanOrEqual(3);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.style.viewTransitionName),
      )
      .toBe('');
  });
}
