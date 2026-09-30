import { expect, test } from '@playwright/test';

for (const width of [1100, 390]) {
  test(`list item geometry and drag target at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=list-item');
    const spacious = page.locator('.kui-list-item[data-item-id="spacious"]');
    const icon = spacious.locator('.kui-list-item__icon');
    await expect(spacious).toBeVisible();
    const geometry = await spacious.evaluate((el) => {
      const css = window.getComputedStyle(el);
      const icon = el.querySelector<HTMLElement>('.kui-list-item__icon')!;
      return {
        minHeight: css.minHeight,
        paddingTop: css.paddingTop,
        iconAlign: window.getComputedStyle(icon).alignSelf,
      };
    });
    expect(geometry).toMatchObject({
      minHeight: '52px',
      paddingTop: '12px',
      iconAlign: 'center',
    });
    await icon.scrollIntoViewIfNeeded();
    await spacious.screenshot({
      path: `test-results/list-spacious-${width}.png`,
    });

    await spacious.evaluate((el) => {
      const style = (el as HTMLElement).style;
      style.setProperty('--kui-list-item-icon-size', '24px');
      style.setProperty('--kui-list-item-trailing-color', 'rgb(10, 20, 30)');
      style.setProperty('--kui-list-item-label-weight', '700');
    });
    expect(await icon.evaluate((el) => window.getComputedStyle(el).width)).toBe(
      '24px',
    );
    expect(
      await spacious
        .locator('.kui-list-item__trailing')
        .evaluate((el) => window.getComputedStyle(el).color),
    ).toBe('rgb(10, 20, 30)');
    expect(
      await spacious
        .locator('.kui-list-item__label')
        .evaluate((el) => window.getComputedStyle(el).fontWeight),
    ).toBe('700');

    const target = page.locator('.kui-list-item[data-item-id="drag-target"]');
    await expect(target).toBeVisible();
    expect(
      await target.evaluate((el) => window.getComputedStyle(el).outlineStyle),
    ).toBe('solid');
    await target.screenshot({
      path: `test-results/list-drag-target-${width}.png`,
    });

    await page.goto('/?component=list-header');
    const header = page
      .locator('.kui-list-header[data-density="compact"]')
      .first();
    await header.evaluate((el) => {
      const style = (el as HTMLElement).style;
      style.setProperty('--kui-list-header-min-height', '48px');
      style.setProperty('--kui-list-header-title-padding-block', '6px');
      style.setProperty('--kui-list-header-title-padding-inline', '10px');
    });
    const title = header.locator('.kui-list-header__title');
    expect(
      await header.evaluate((el) => window.getComputedStyle(el).minHeight),
    ).toBe('48px');
    expect(
      await title.evaluate((el) => {
        const css = window.getComputedStyle(el);
        return [css.minHeight, css.paddingTop, css.paddingLeft];
      }),
    ).toEqual(['48px', '6px', '10px']);
    await header.screenshot({
      path: `test-results/list-header-density-${width}.png`,
    });
  });
}
