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

  const demo = page.locator('[data-demo="grid"]');
  const two = demo.locator('[data-component="grid"][data-columns="2"]');
  const four = demo.locator('[data-component="grid"][data-columns="4"]');
  const flexible = demo.locator('[data-component="grid"][data-flex="true"]');

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

test('Grid fits minimum-width columns and collapses at the container boundary', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=grid');
  const responsive = page.locator(
    '[data-demo="grid"] [data-component="grid"][data-min-column-width="true"]',
  );
  await expect(responsive).toHaveAttribute('data-min-column-width', 'true');
  await expect(responsive).not.toHaveAttribute('data-columns');
  for (const [width, count] of [
    [768, 2],
    [767, 1],
    [320, 1],
  ]) {
    await responsive.evaluate((element, value) => {
      (element as HTMLElement).style.width = `${value}px`;
      (element as HTMLElement).style.flex = 'none';
      (element as HTMLElement).style.maxWidth = 'none';
    }, width);
    const geometry = await responsive.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        width: element.getBoundingClientRect().width,
        columns: style.gridTemplateColumns.split(' ').length,
        gap: style.columnGap,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      };
    });
    expect(geometry.width).toBe(width);
    expect(geometry.columns).toBe(count);
    expect(geometry.gap).toBe('16px');
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    await responsive.screenshot({
      path: testInfo.outputPath(`responsive-grid-${width}.png`),
    });
  }
});
