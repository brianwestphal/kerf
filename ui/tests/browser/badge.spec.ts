import { expect, test } from '@playwright/test';

import { minPaintedTextContrast } from './painted-contrast.js';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`compact neutral Badge text meets 4.5:1 contrast (${colorScheme})`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/?component=badge');

    const example = page
      .locator('[data-demo="badge"] [data-catalog-example]')
      .filter({ hasText: 'Neutral Metadata' });
    const badge = example.getByText('Draft', { exact: true });
    await expect(badge).toHaveAttribute('data-size', 'compact');
    await expect(badge).toHaveAttribute('data-tone', 'neutral');
    await expect(badge).toHaveAttribute('data-appearance', 'quiet');

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(badge).toBeVisible();
      expect(await minPaintedTextContrast(badge)).toBeGreaterThanOrEqual(4.5);
      await example.screenshot({
        path: testInfo.outputPath(`badge-neutral-${colorScheme}-${width}.png`),
      });
    }
  });
}

test('Badge maxWidth truncates long text with an ellipsis and a title', async ({
  page,
}) => {
  await page.goto('/?component=badge');
  const badge = page.locator('[data-demo-badge="truncate"]');
  const label = badge.locator('.kui-badge__label');
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await expect(badge).toHaveAttribute(
      'title',
      'customer-escalation-priority-review',
    );
    await expect(label).toHaveCSS('text-overflow', 'ellipsis');
    const geometry = await badge.evaluate((element) => {
      const text = element.querySelector('.kui-badge__label')!;
      return {
        width: element.getBoundingClientRect().width,
        clipped: text.scrollWidth > text.clientWidth,
      };
    });
    expect(geometry.width).toBeLessThanOrEqual(120);
    expect(geometry.clipped).toBe(true);
  }
  await badge.scrollIntoViewIfNeeded();
  await badge
    .locator('..')
    .screenshot({ path: 'test-results/badge-truncate-narrow.png' });
});
