import { expect, test } from '@playwright/test';

test('ListItem uses public resting and state border tones from its list', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=list-item');
    const demo = page.locator('[data-demo="list-item"]');
    const rest = demo.locator('[data-item-id="tone-rest"]');
    const selected = demo.locator('[data-item-id="tone-selected"]');
    const viewport = demo.locator(
      '.kui-catalog-example__viewport:has([data-item-id="tone-rest"])',
    );
    await viewport.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.setProperty('--kui-list-item-background', 'rgb(232, 242, 250)');
      style.setProperty('--kui-list-item-border', 'rgb(110, 120, 130)');
      style.setProperty('--kui-list-item-hover-border', 'rgb(160, 50, 90)');
      style.setProperty('--kui-list-item-selected-border', 'rgb(20, 80, 160)');
    });
    await expect(rest).toHaveCSS('background-color', 'rgb(232, 242, 250)');
    await expect(rest).toHaveCSS('border-top-color', 'rgb(110, 120, 130)');
    await expect(selected).toHaveCSS('border-top-color', 'rgb(20, 80, 160)');
    const defaultRow = demo.locator('[data-item-id="default"]');
    await expect(defaultRow).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await viewport.screenshot({
      path: testInfo.outputPath(`list-item-tone-${width}.png`),
    });

    await rest.hover();
    await expect(rest).toHaveCSS('border-top-color', 'rgb(160, 50, 90)');
  }
});
