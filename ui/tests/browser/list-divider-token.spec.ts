import { expect, test } from '@playwright/test';

test('ListHeader, ListItem, and ListActionRow inherit the containing List divider tone', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=list');
  const list = page.locator('[data-demo-divider-list]');
  const rows = [
    list.locator('.kui-list-header[data-divider="both"]'),
    list.locator('.kui-list-item[data-divider="both"]'),
    list.locator('.kui-list-action-row[data-divider="both"]'),
  ];
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    const defaults = await Promise.all(
      rows.map((row) =>
        row.evaluate(
          (element) =>
            element.ownerDocument.defaultView!.getComputedStyle(element)
              .borderTopColor,
        ),
      ),
    );
    await list.evaluate((element) =>
      (element as HTMLElement).style.setProperty(
        '--kui-list-group-divider-color',
        'rgb(124, 34, 162)',
      ),
    );
    for (const row of rows) {
      await expect(row).toHaveCSS('border-top-color', 'rgb(124, 34, 162)');
      await expect(row).toHaveCSS('border-bottom-color', 'rgb(124, 34, 162)');
    }
    await list.screenshot({
      path: testInfo.outputPath(`list-divider-token-${width}.png`),
    });
    await list.evaluate((element) =>
      (element as HTMLElement).style.removeProperty(
        '--kui-list-group-divider-color',
      ),
    );
    for (const [index, row] of rows.entries())
      await expect(row).toHaveCSS('border-top-color', defaults[index]);
  }
});
