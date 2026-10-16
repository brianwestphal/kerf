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
    // maxTriggerWidth caps it and keeps the caret.
    await expect(compact).toHaveAttribute('data-trigger-max', '');
    await expect(compact.locator('.kui-select__caret')).toBeVisible();
    // The cap holds without a triggerWidth too (the view-title Select).
    const title = page.locator('[name="view-title-demo"]');
    const capped = await title.evaluate((element) => {
      element.setAttribute('data-trigger-max', '');
      (element as HTMLElement).style.setProperty(
        '--_kui-select-trigger-max',
        '3rem',
      );
      const caret = element.querySelector('.kui-select__caret')!;
      const box = element.getBoundingClientRect();
      const caretBox = caret.getBoundingClientRect();
      return {
        width: box.width,
        caretInside: caretBox.width > 0 && caretBox.right <= box.right + 0.5,
      };
    });
    expect(capped.width).toBeLessThanOrEqual(48.5);
    expect(capped.caretInside).toBe(true);
    await compact.screenshot({
      path: testInfo.outputPath(`select-compact-${width}.png`),
    });
  }
});
