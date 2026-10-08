import { expect, test } from '@playwright/test';
import axe from 'axe-core';

import { minPaintedTextContrast } from './painted-contrast.js';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`ValueTable labels contrast in a sunken Pane (${colorScheme})`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/?component=value-table');

    const example = page
      .locator('[data-demo="value-table"] [data-catalog-example]')
      .filter({ hasText: 'Sunken Pane' });
    const pane = example.locator('.kui-pane');
    const table = pane.locator('.kui-value-table');
    await expect(table.locator('dt')).toHaveCount(3);
    expect(
      await minPaintedTextContrast(table.locator('dt')),
    ).toBeGreaterThanOrEqual(4.5);

    await page.addScriptTag({ content: axe.source });
    const violations = await pane.evaluate(async (element) => {
      const a11y = (window as unknown as { axe: typeof axe }).axe;
      const result = await a11y.run(element, {
        runOnly: { type: 'rule', values: ['color-contrast'] },
      });
      return result.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map(({ target }) => target),
      }));
    });
    expect(violations).toEqual([]);

    // The documented background token belongs to the app's ancestor, not to
    // the table root. Test it after the default-color assertions above.
    await pane.evaluate((element) => {
      (element as HTMLElement).style.setProperty(
        '--kui-value-table-background',
        '#ffffff',
      );
    });
    await expect(table).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    await pane.evaluate((element) => {
      (element as HTMLElement).style.removeProperty(
        '--kui-value-table-background',
      );
    });
    await example.screenshot({
      path: testInfo.outputPath(`value-table-sunken-${colorScheme}-wide.png`),
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await minPaintedTextContrast(table.locator('dt')),
    ).toBeGreaterThanOrEqual(4.5);
    await example.screenshot({
      path: testInfo.outputPath(`value-table-sunken-${colorScheme}-narrow.png`),
    });
  });
}
