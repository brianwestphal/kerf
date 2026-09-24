import { expect, type Locator, test } from '@playwright/test';

type GridGeometry = {
  columns: string;
  display: string;
  flex: string;
  gap: string;
  widths: number[];
};

async function gridGeometry(locator: Locator): Promise<GridGeometry> {
  return locator.evaluate((element) => {
    const style = globalThis.getComputedStyle(element);
    return {
      columns: style.gridTemplateColumns,
      display: style.display,
      flex: style.flex,
      gap: style.gap,
      widths: [...element.children].map(
        (child) => child.getBoundingClientRect().width,
      ),
    };
  });
}

function expectEqualWidths(widths: number[]) {
  expect(widths.length).toBeGreaterThan(0);
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(0.5);
}

test('Grid keeps fixed equal tracks, typed gaps, and flex participation', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=grid');

  const two = page.locator('.demo-grid-two');
  const four = page.locator('.demo-grid-four');
  const flexible = page.locator('.demo-grid-flex');

  await expect(two).toHaveAttribute('data-columns', '2');
  await expect(four).toHaveAttribute('data-columns', '4');
  const twoGeometry = await gridGeometry(two);
  expect(twoGeometry).toMatchObject({ display: 'grid', gap: '16px' });
  expect(twoGeometry.columns.split(' ')).toHaveLength(2);
  expectEqualWidths(twoGeometry.widths);

  const fourGeometry = await gridGeometry(four);
  expect(fourGeometry).toMatchObject({ display: 'grid', gap: '8px' });
  expect(fourGeometry.columns.split(' ')).toHaveLength(4);
  expectEqualWidths(fourGeometry.widths);

  await expect(flexible).toHaveAttribute('data-flex', 'true');
  expect((await gridGeometry(flexible)).flex).toBe('1 1 auto');

  if (browserName === 'chromium') {
    await page.screenshot({
      path: 'test-results/grid-wide.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page
        .locator('html')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    const narrowTwo = await gridGeometry(two);
    const narrowFour = await gridGeometry(four);
    expect(narrowTwo.columns.split(' ')).toHaveLength(2);
    expect(narrowFour.columns.split(' ')).toHaveLength(4);
    expectEqualWidths(narrowTwo.widths);
    expectEqualWidths(narrowFour.widths);
    await page.screenshot({
      path: 'test-results/grid-narrow.png',
      fullPage: true,
    });
  }
});
