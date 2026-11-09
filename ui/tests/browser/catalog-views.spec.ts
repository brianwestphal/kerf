import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`migrated compositions render at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const component of [
      'foundation',
      'document-baseline',
      'layout',
      'application-tabs',
      'feedback',
      'toast',
      'tooltip',
    ]) {
      await page.goto(`/?component=${component}`);
      const demo = page.locator(`[data-demo="${component}"]`);
      await expect(demo).toBeVisible();
      await expect(demo.locator('[data-kerf-node]').first()).toBeAttached();
      await demo.screenshot({
        path: testInfo.outputPath(`${component}-${width}.png`),
      });
    }
  });

  test(`catalog views keep their composition and actions at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=headers');
    const headers = page.locator('[data-demo="headers"]');
    await expect(headers.locator('.kui-toolbar')).toHaveCount(2);
    await expect(headers.locator('.kui-value-table__row')).toHaveCount(3);
    await expect(
      headers.locator('.kui-toolbar__leading .kui-toolbar-control-group svg'),
    ).toHaveCount(1);
    await headers.screenshot({
      path: testInfo.outputPath(`headers-${width}.png`),
    });
    await headers.getByRole('button', { name: 'New Pattern' }).click();
    await expect(page.locator('output.catalog-log')).toHaveText(
      'Add action requested',
    );
    await headers.getByRole('button', { name: 'Done' }).click();
    await expect(page.locator('output.catalog-log')).toHaveText('Done');

    await page.goto('/?component=recipe-workspace-header');
    const recipe = page.locator('[data-recipe="recipe-workspace-header"]');
    await expect(recipe.locator('.kui-toolbar')).toHaveCount(1);
    await expect(recipe.locator('.kui-state-banner')).toContainText(
      'Ready for Review',
    );
    await recipe.screenshot({
      path: testInfo.outputPath(`recipe-workspace-header-${width}.png`),
    });
    for (const [label, command] of [
      ['Share', 'share'],
      ['More Actions', 'more'],
      ['Publish Update', 'publish'],
    ] as const) {
      const button = recipe.getByRole('button', { name: label });
      await expect(button).toHaveAttribute('data-recipe-command', command);
      await button.click();
      await expect(page.locator('output.catalog-log')).toHaveText(
        `${command} requested`,
      );
    }
  });
}
