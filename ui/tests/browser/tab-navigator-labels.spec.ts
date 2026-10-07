import type { Locator } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function expectLabelsUnclipped(scaffold: Locator) {
  const labels = scaffold.locator('.kui-tab-scaffold__tab-label');
  await expect(labels).toHaveCount(3);
  const metrics = await labels.evaluateAll((elements) =>
    elements.map((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      labelBottom: element.getBoundingClientRect().bottom,
      tabBottom: element.parentElement?.getBoundingClientRect().bottom ?? 0,
    })),
  );
  for (const metric of metrics) {
    expect(metric.clientHeight).toBeGreaterThanOrEqual(metric.scrollHeight);
    expect(metric.labelBottom).toBeLessThanOrEqual(metric.tabBottom);
  }
}

test('TabNavigator labels retain their full line box at wide and narrow widths', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=tab-navigator');

  const scaffold = page.locator('#catalog-tab-scaffold');
  await expect(scaffold).toBeVisible();
  await expectLabelsUnclipped(scaffold);
  if (testInfo.project.name === 'chromium')
    await scaffold.screenshot({
      path: 'test-results/tab-navigator-labels-wide.png',
    });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(scaffold).toBeVisible();
  await expectLabelsUnclipped(scaffold);
  if (testInfo.project.name === 'chromium')
    await scaffold.screenshot({
      path: 'test-results/tab-navigator-labels-narrow.png',
    });
});

test('TabNavigator separates a sunken active scene and nested Pane at wide and narrow widths', async ({
  page,
}, testInfo) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/?component=tab-navigator');
    for (const id of ['catalog-tab-scaffold', 'catalog-tab-scaffold-nested']) {
      const scaffold = page.locator(`#${id}`);
      const bar = scaffold.locator('.kui-tab-scaffold__bar');
      const edge = () =>
        bar.evaluate(
          (element) =>
            window.getComputedStyle(element).borderTopColor !==
            'rgba(0, 0, 0, 0)',
        );
      await expect(scaffold).toBeVisible();
      expect(await edge()).toBe(true);
      const geometry = () =>
        bar.evaluate((element) => {
          const barBox = element.getBoundingClientRect();
          const scaffoldBox = element
            .closest('.kui-tab-scaffold')!
            .getBoundingClientRect();
          return {
            top: Math.round(barBox.top - scaffoldBox.top),
            width: barBox.width,
            height: barBox.height,
          };
        });
      const before = await geometry();
      if (testInfo.project.name === 'chromium')
        await scaffold.screenshot({
          path: `test-results/tab-navigator-sunken-${id}-${viewport.width}.png`,
        });
      await bar.locator('[data-tab-scaffold-tab="search"]').click();
      await expect(
        scaffold.locator('[data-tab-scaffold-scene="search"]'),
      ).toHaveAttribute('data-active', 'true');
      expect(await edge()).toBe(false);
      expect(await geometry()).toEqual(before);
      if (testInfo.project.name === 'chromium')
        await scaffold.screenshot({
          path: `test-results/tab-navigator-separator-${id}-${viewport.width}.png`,
        });
      await bar.locator('[data-tab-scaffold-tab="projects"]').click();
      await expect(
        scaffold.locator('[data-tab-scaffold-scene="projects"]'),
      ).toHaveAttribute('data-active', 'true');
      expect(await edge()).toBe(true);
      expect(await geometry()).toEqual(before);
    }
  }
});
