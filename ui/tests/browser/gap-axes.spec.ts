import { expect, type Locator, type Page, test } from '@playwright/test';

function example(page: Page, label: string): Locator {
  return page.locator('[data-catalog-example]').filter({
    has: page.locator('[data-catalog-example-label]', { hasText: label }),
  });
}

test('Row, Grid, and List resolve independent gaps without leaking into nested layouts', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=row');
  const row = example(page, 'Independent gaps').locator(
    '[data-component="row"]',
  );
  await expect(row).toHaveCSS('column-gap', '0px');
  await expect(row).toHaveCSS('row-gap', '16px');
  const rowTops = await row.evaluate((element) =>
    [...element.children].map((child) => child.getBoundingClientRect().top),
  );
  expect(new Set(rowTops).size).toBeGreaterThan(1);

  const nestedRows = example(page, 'Nested row insets').locator(
    '[data-component="row"]',
  );
  await expect(nestedRows.first()).toHaveCSS('column-gap', '0px');
  await expect(nestedRows.first()).toHaveCSS('row-gap', '16px');
  await expect(nestedRows.nth(1)).toHaveCSS('column-gap', '8px');
  await expect(nestedRows.nth(1)).toHaveCSS('row-gap', '8px');
  if (browserName === 'chromium')
    await example(page, 'Independent gaps').screenshot({
      path: 'test-results/row-independent-gaps.png',
    });

  await page.goto('/?component=grid');
  const grid = page.locator('[data-demo-grid-gap-axes]');
  await expect(grid).toHaveCSS('column-gap', '0px');
  await expect(grid).toHaveCSS('row-gap', '16px');
  const measuredGridGap = await grid.evaluate((element) => {
    const [first, , third] = element.children;
    return (
      third!.getBoundingClientRect().top - first!.getBoundingClientRect().bottom
    );
  });
  expect(measuredGridGap).toBeCloseTo(16, 0);
  if (browserName === 'chromium')
    await example(page, 'Independent gaps').screenshot({
      path: 'test-results/grid-independent-gaps.png',
    });

  await page.goto('/?component=list');
  const list = page.locator(
    '[data-demo="list"] [data-component="list"][data-scrollable="true"]',
  );
  await expect(list).toHaveAttribute('data-gap', 'true');
  await expect(list).toHaveCSS('column-gap', '0px');
  await expect(list).toHaveCSS('row-gap', '24px');
  if (browserName === 'chromium')
    await example(page, 'Scrollable application list').screenshot({
      path: 'test-results/list-independent-gaps.png',
    });
});
