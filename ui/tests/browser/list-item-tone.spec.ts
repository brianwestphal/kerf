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
      style.setProperty('--kui-list-item-color', 'rgb(25, 70, 105)');
      style.setProperty('--kui-list-item-border', 'rgb(110, 120, 130)');
      style.setProperty(
        '--kui-list-item-hover-background',
        'rgb(219, 242, 232)',
      );
      style.setProperty('--kui-list-item-hover-border', 'rgb(160, 50, 90)');
      style.setProperty(
        '--kui-list-item-selected-background',
        'rgb(242, 228, 247)',
      );
      style.setProperty('--kui-list-item-selected-color', 'rgb(86, 32, 93)');
      style.setProperty('--kui-list-item-selected-border', 'rgb(20, 80, 160)');
    });
    await expect(rest).toHaveCSS('background-color', 'rgb(232, 242, 250)');
    await expect(rest).toHaveCSS('color', 'rgb(25, 70, 105)');
    await expect(rest).toHaveCSS('border-top-color', 'rgb(110, 120, 130)');
    await expect(selected).toHaveCSS('border-top-color', 'rgb(20, 80, 160)');
    await expect(selected).toHaveCSS('background-color', 'rgb(242, 228, 247)');
    await expect(selected).toHaveCSS('color', 'rgb(86, 32, 93)');
    const defaultRow = demo.locator('[data-item-id="default"]');
    await expect(defaultRow).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await viewport.screenshot({
      path: testInfo.outputPath(`list-item-tone-${width}.png`),
    });

    await rest.hover();
    await expect(rest).toHaveCSS('border-top-color', 'rgb(160, 50, 90)');
    await expect(rest).toHaveCSS('background-color', 'rgb(219, 242, 232)');
    await viewport.screenshot({
      path: testInfo.outputPath(`list-item-tone-hover-${width}.png`),
    });
  }
});

test('ListItem divider corners preserve custom tree roles and nested siblings', async ({
  page,
}) => {
  await page.goto('/?component=list-item');
  const row = page.locator('[data-item-id="member-0"]');
  await row.evaluate((element) => {
    element.setAttribute('role', 'treeitem');
    element.setAttribute('data-divider', 'none');
    (element as HTMLElement).style.setProperty(
      '--kui-list-item-radius',
      '12px',
    );
    const nested = document.createElement('div');
    nested.append(element);
    const next = document.createElement('div');
    next.setAttribute('data-divider', 'before');
    nested.append(next);
    document.querySelector('[data-demo="list-item"]')!.append(nested);
  });
  const next = row.locator('xpath=following-sibling::*[1]');
  for (const divider of ['before', 'both', 'after', 'none']) {
    await next.evaluate(
      (element, value) => element.setAttribute('data-divider', value),
      divider,
    );
    await expect(row).toHaveCSS(
      'border-bottom-left-radius',
      ['before', 'both'].includes(divider) ? '0px' : '12px',
    );
    await expect(row).toHaveCSS(
      'border-bottom-right-radius',
      ['before', 'both'].includes(divider) ? '0px' : '12px',
    );
  }
  await next.evaluate((element) => element.remove());
  await expect(row).toHaveCSS('border-bottom-left-radius', '12px');
});
