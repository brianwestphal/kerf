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

test('TabScaffold labels retain their full line box at wide and narrow widths', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=tab-scaffold');

  const scaffold = page.locator('#catalog-tab-scaffold');
  await expect(scaffold).toBeVisible();
  await expectLabelsUnclipped(scaffold);
  if (testInfo.project.name === 'chromium')
    await scaffold.screenshot({
      path: 'test-results/tab-scaffold-labels-wide.png',
    });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(scaffold).toBeVisible();
  await expectLabelsUnclipped(scaffold);
  if (testInfo.project.name === 'chromium')
    await scaffold.screenshot({
      path: 'test-results/tab-scaffold-labels-narrow.png',
    });
});
