import { expect, test } from '@playwright/test';

test('view-title Select keeps its 36px trigger and inset focus ring', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=select');
    const section = page.locator('[data-demo-section="select-view-title"]');
    const select = section.locator('wa-select[name="view-title-demo"]');
    await expect(select).toHaveAttribute('data-presentation', 'title');
    await expect(select).toHaveAttribute('data-focus-ring-inset', 'true');
    const geometry = await select.evaluate((node) => {
      const combobox =
        node.shadowRoot!.querySelector<HTMLElement>('[part~="combobox"]')!;
      const caret = node.shadowRoot!.querySelector<HTMLElement>(
        '[part~="expand-icon"]',
      )!;
      const label = node.shadowRoot!.querySelector<HTMLElement>(
        '[part~="display-input"]',
      )!;
      const style = window.getComputedStyle(combobox);
      return {
        height: combobox.getBoundingClientRect().height,
        paddingStart: style.paddingInlineStart,
        weight: style.fontWeight,
        labelLeft: label.getBoundingClientRect().left,
        caretLeft: caret.getBoundingClientRect().left,
        caretGap:
          caret.getBoundingClientRect().left -
          label.getBoundingClientRect().right,
      };
    });
    expect(geometry.height).toBeCloseTo(36, 0);
    expect(geometry.paddingStart).toBe('0px');
    expect(geometry.weight).toBe('700');
    expect(geometry.caretLeft).toBeGreaterThan(geometry.labelLeft);
    expect(geometry.caretGap).toBeLessThan(8);
    expect(geometry.caretLeft - geometry.labelLeft).toBeLessThan(100);
    const listText = section.locator('.kui-list-item__primary-label').first();
    expect(geometry.labelLeft).toBeCloseTo(
      (await listText.boundingBox())!.x,
      0,
    );

    await section.evaluate((node) => {
      (node as HTMLElement).style.overflow = 'hidden';
    });
    const displayInput = select.locator('[part~="display-input"]');
    await displayInput.focus();
    await expect(displayInput).toBeFocused();
    expect(
      await select.evaluate((node) => {
        const combobox =
          node.shadowRoot!.querySelector<HTMLElement>('[part~="combobox"]')!;
        return window.getComputedStyle(combobox).outlineOffset;
      }),
    ).toBe('-3px');
    await section.screenshot({
      path: `test-results/select-title-focus-${testInfo.project.name}-${width}.png`,
    });
    await select.click();
    await expect(select).toHaveAttribute('open', '');
    await select.getByRole('option', { name: 'Active' }).click();
    await expect(select).toHaveAttribute('value', 'active');
  }
});
