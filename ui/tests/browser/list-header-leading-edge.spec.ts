// KF-J8GMA2: a ListHeader above summary rows starts its label on their
// leading-content edge, and the two compact together in a narrow column.
import { expect, test } from '@playwright/test';

test('ListHeader leadingEdge follows the summary rows across widths', async ({
  page,
}, testInfo) => {
  // 1100 leaves the rows wide; 390 compacts them (384px and narrower).
  for (const [width, inset] of [
    [1100, 13],
    [390, 9],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=summary-row');
    const example = page.locator('[data-demo-summary-row-header]');
    const header = example.locator('[data-leading-edge="summary-row"]');
    await expect(header).toBeVisible();
    const geometry = await example.evaluate((element) => {
      const head = element.querySelector<HTMLElement>(
        '[data-leading-edge="summary-row"]',
      )!;
      const range = document.createRange();
      range.selectNodeContents(
        head.querySelector('.kui-list-header__toggle > .kui-text')!,
      );
      const row = element.querySelector('.kui-summary-row')!;
      return {
        label: range.getBoundingClientRect().left,
        leading: element
          .querySelector('.kui-summary-row__leading')!
          .getBoundingClientRect().left,
        rowLeft: row.getBoundingClientRect().left,
        headerWidth: head.getBoundingClientRect().width,
        rowWidth: row.getBoundingClientRect().width,
      };
    });
    expect(geometry.headerWidth).toBeCloseTo(geometry.rowWidth, 0);
    expect(Math.abs(geometry.label - geometry.leading)).toBeLessThanOrEqual(
      0.5,
    );
    expect(Math.round(geometry.leading - geometry.rowLeft)).toBe(inset);
    // The toggle still opens and closes the rows.
    const toggle = header.locator('.kui-list-header__toggle');
    await toggle.click();
    await expect(example.locator('#summary-row-section-rows')).toBeHidden();
    await toggle.click();
    await expect(example.locator('#summary-row-section-rows')).toBeVisible();
    if (testInfo.project.name === 'chromium')
      await example.screenshot({
        path: testInfo.outputPath(`kf-j8gma2-leading-edge-${width}.png`),
        animations: 'disabled',
      });
  }
});
