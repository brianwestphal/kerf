import { expect, test } from '@playwright/test';

for (const width of [1100, 390]) {
  test(`compact text and metadata geometry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });

    await page.goto('/?component=text');
    const flush = page.locator('[data-demo-copy="flush"]');
    await expect(flush).toBeVisible();
    const geometry = await flush.evaluate((el) => {
      const css = window.getComputedStyle(el);
      return [
        css.marginTop,
        css.paddingTop,
        css.borderTopWidth,
        parseFloat(css.lineHeight),
      ];
    });
    expect(geometry.slice(0, 3)).toEqual(['0px', '0px', '0px']);
    expect(geometry[3]).toBeCloseTo(19.2, 2);
    await flush.screenshot({
      path: `test-results/small-layout-flush-${width}.png`,
    });
    await page.screenshot({
      path: `test-results/small-layout-text-${width}.png`,
      fullPage: true,
    });

    await page.goto('/?component=value-table');
    const table = page.locator('.kui-value-table[data-density="compact"]');
    const row = table.locator('.kui-value-table__row').first();
    await expect(row).toBeVisible();
    expect(
      await row.evaluate((el) => {
        const css = window.getComputedStyle(el);
        return [css.paddingTop, css.columnGap];
      }),
    ).toEqual(['4px', '4px']);
    await table.evaluate((el) => {
      const style = (el as HTMLElement).style;
      style.setProperty('--kui-value-table-row-columns', '80px minmax(0, 1fr)');
      style.setProperty('--kui-value-table-row-padding-block', '6px');
      style.setProperty('--kui-value-table-row-gap', '10px');
    });
    expect(
      await row.evaluate((el) => {
        const css = window.getComputedStyle(el);
        return [
          css.gridTemplateColumns.split(' ')[0],
          css.paddingTop,
          css.columnGap,
        ];
      }),
    ).toEqual(['80px', '6px', '10px']);
    await table.screenshot({
      path: `test-results/small-layout-table-${width}.png`,
    });

    await page.goto('/?component=toolbar-text');
    const heading = page.locator('.kui-toolbar-text[data-size="xsmall"]');
    await expect(heading).toBeVisible();
    expect(
      await heading.evaluate((el) => window.getComputedStyle(el).fontSize),
    ).toBe('11px');
    await heading.screenshot({
      path: `test-results/small-layout-heading-${width}.png`,
    });
  });
}

test('token search editor shrinks inside a narrow group', async ({ page }) => {
  await page.goto('/?component=token-search-field');
  const geometry = await page.evaluate(() => {
    const host = document.createElement('div');
    host.style.width = '120px';
    host.innerHTML =
      '<div class="kui-token-search"><span class="kui-token-search__leading"></span><div class="kui-token-search__editor" role="searchbox">Find</div></div>';
    document.body.append(host);
    const field = host.querySelector<HTMLElement>('.kui-token-search')!;
    const editor = host.querySelector<HTMLElement>(
      '.kui-token-search__editor',
    )!;
    const result = {
      editorMinWidth: window.getComputedStyle(editor).minWidth,
      fieldWidth: field.getBoundingClientRect().width,
      hostWidth: host.getBoundingClientRect().width,
    };
    host.remove();
    return result;
  });
  expect(geometry).toEqual({
    editorMinWidth: '0px',
    fieldWidth: 120,
    hostWidth: 120,
  });
});
