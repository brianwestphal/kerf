import { expect, test } from '@playwright/test';

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
