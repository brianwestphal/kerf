import { expect, test } from '@playwright/test';

test('Select width policies and selected typography work at wide and narrow sizes', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=select');
    const compact = page.locator('[name="compact-workspace"]');
    const navigation = page.locator('[name="navigation-rendering-balance"]');
    const fill = page.locator('[name="labeled-rendering-balance"]');
    await expect(compact).toBeVisible();
    await expect(compact).toHaveAttribute('data-trigger-width', 'fit-content');
    await expect(navigation).toHaveAttribute(
      'data-trigger-width',
      'max-content',
    );
    await expect(fill).toHaveAttribute('data-trigger-width', 'fill');
    const details = await compact.evaluate((element) => {
      const selected = element.querySelector('.kui-select__custom-selected')!;
      const content = element.querySelector(
        '.kui-select__custom-selected-content',
      )!;
      const style = window.getComputedStyle(selected);
      const contentStyle = window.getComputedStyle(content);
      return {
        width: element.getBoundingClientRect().width,
        selectedColor: style.color,
        selectedSize: style.fontSize,
        selectedWeight: style.fontWeight,
        overflow: contentStyle.overflow,
        textOverflow: contentStyle.textOverflow,
        textWidth: content.scrollWidth,
        boxWidth: content.clientWidth,
      };
    });
    expect(details.width).toBeLessThanOrEqual(160);
    expect(details.selectedWeight).toBe('650');
    expect(details.selectedSize).toBe('11px');
    expect(details.selectedColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(details.overflow).toBe('hidden');
    expect(details.textOverflow).toBe('ellipsis');
    expect(details.textWidth).toBeGreaterThan(details.boxWidth);
    await compact.screenshot({
      path: testInfo.outputPath(`select-compact-${width}.png`),
    });
  }
});
