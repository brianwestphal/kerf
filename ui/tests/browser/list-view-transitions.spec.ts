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
