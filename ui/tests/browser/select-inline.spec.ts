import { expect, test } from '@playwright/test';

test('inline Select trigger takes its badge box and keeps focus and listbox behavior', async ({
  page,
  browserName,
}) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=select');
    const select = page.locator('[name="inline-status"]');
    const badge = select.locator('[data-component="badge"]');
    await expect(select).toBeVisible();
    await expect(badge).toBeVisible();
    const geometry = await select.evaluate((host) => {
      const trigger =
        host.shadowRoot!.querySelector<HTMLElement>('[part~="combobox"]')!;
      const badge = host.querySelector<HTMLElement>(
        '[data-component="badge"]',
      )!;
      const style = window.getComputedStyle(trigger);
      const bounds = trigger.getBoundingClientRect();
      const badgeBounds = badge.getBoundingClientRect();
      return {
        width: bounds.width,
        height: bounds.height,
        badgeWidth: badgeBounds.width,
        badgeHeight: badgeBounds.height,
        minHeight: style.minHeight,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        borderLeft: style.borderLeftWidth,
        borderRight: style.borderRightWidth,
      };
    });
    expect(geometry.minHeight).toBe('0px');
    expect(geometry.paddingLeft).toBe('0px');
    expect(geometry.paddingRight).toBe('0px');
    expect(geometry.borderLeft).toBe('0px');
    expect(geometry.borderRight).toBe('0px');
    expect(geometry.width).toBeCloseTo(geometry.badgeWidth, 0);
    expect(geometry.height).toBeCloseTo(geometry.badgeHeight, 0);
    if (browserName === 'chromium')
      await select.screenshot({
        path: `test-results/select-inline-${width}.png`,
      });

    await select.click();
    await expect(select).toHaveAttribute('open');
    await expect(select.locator('wa-option')).toHaveCount(3);
    await page.keyboard.press('Escape');
    await expect(select).not.toHaveAttribute('open');
    const outline = await select.evaluate(
      (host) =>
        window.getComputedStyle(
          host.shadowRoot!.querySelector('[part~="combobox"]')!,
        ).outlineStyle,
    );
    expect(outline).not.toBe('none');
  }
});
