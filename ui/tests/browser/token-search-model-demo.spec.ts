import { expect, test } from '@playwright/test';

test('grammar model suggests, commits, edits, removes, and clears in the real catalog', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=token-search-field');
  const demo = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: 'Grammar assisted search',
      }),
    });
  const field = demo.locator('[data-component="token-search-field"]');
  const editor = field.getByRole('searchbox', { name: 'Search with filters' });
  const chips = field.locator('[data-component="token-search-token"]');
  const result = demo.locator('[data-demo-grammar-result]');

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await editor.click();
    await editor.pressSequentially('tag:cl');
    await expect(
      field.getByRole('button', { name: 'tag:client' }),
    ).toBeVisible();
    await demo.screenshot({
      path: testInfo.outputPath(`grammar-suggestions-${width}.png`),
    });
    await editor.press('ArrowDown');
    await expect(
      field.getByRole('button', { name: 'tag:client' }),
    ).toBeFocused();
    await field.getByRole('button', { name: 'tag:client' }).press('Enter');
    await expect(chips).toHaveCount(1);
    await expect(result).toHaveText('No free text · 1 filters');
    await expect(editor).toBeFocused();
    await editor.pressSequentially('tag:c');
    await expect(
      field.locator('[data-token-search-suggestion="tag:client"]'),
    ).toHaveCount(0);
    for (let index = 0; index < 'tag:c'.length; index++)
      await editor.press('Backspace');
    await expect(chips).toHaveCount(1);
    await demo.screenshot({
      path: testInfo.outputPath(`grammar-chip-${width}.png`),
    });

    await editor.pressSequentially('is:open ');
    await expect(chips).toHaveCount(2);
    await chips
      .first()
      .getByRole('button', { name: 'Edit tag:client' })
      .click();
    await expect(chips).toHaveCount(1);
    await expect(editor).toContainText('tag:client');
    await editor.press('End');
    await editor.press('Space');
    await expect(chips).toHaveCount(2);
    await field.getByRole('button', { name: 'Clear search' }).click();
    await expect(chips).toHaveCount(0);
    await expect(result).toHaveText('No free text · 0 filters');
    await editor.pressSequentially('plain text');
    await field.getByRole('button', { name: 'Clear search' }).click();
    await expect(editor).toHaveText('');
  }
});

test('an app helper commits an active grammar value outside suggestions', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=token-search-field');
  const demo = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: 'Grammar assisted search',
      }),
    });
  const field = demo.locator('[data-component="token-search-field"]');
  const editor = field.getByRole('searchbox', { name: 'Search with filters' });
  const chips = field.locator('[data-component="token-search-token"]');
  const helper = demo.getByRole('button', { name: 'Add release tag' });

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await editor.click();
    await editor.pressSequentially('tag:rel');
    await expect(field.locator('[data-token-search-suggestion]')).toHaveCount(
      0,
    );
    await helper.click();
    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toHaveAttribute(
      'data-token-value',
      'tag:release',
    );
    await expect(demo.locator('[data-demo-grammar-result]')).toHaveText(
      'No free text · 1 filters',
    );
    await demo.screenshot({
      path: testInfo.outputPath(`grammar-helper-${width}.png`),
    });
    await helper.click();
    await expect(chips).toHaveCount(1);
    await field.getByRole('button', { name: 'Clear search' }).click();
    await expect(chips).toHaveCount(0);
  }
});

test('an app helper replaces DOM-owned draft text from saved search state', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=token-search-field');
  const demo = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: 'Grammar assisted search',
      }),
    });
  const field = demo.locator('[data-component="token-search-field"]');
  const editor = field.getByRole('searchbox', { name: 'Search with filters' });
  const helper = demo.getByRole('button', { name: 'Load saved search' });

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await editor.fill('draft');
    await expect(editor).toHaveText('draft');
    await helper.click();
    await expect(editor).toHaveText('roadmap');
    await expect(demo.locator('[data-demo-grammar-result]')).toHaveText(
      'roadmap · 0 filters',
    );
    await demo.screenshot({
      path: testInfo.outputPath(`grammar-replaced-${width}.png`),
    });
    await editor.fill('roadmap next');
    await expect(editor).toHaveText('roadmap next');
    await helper.click();
    await expect(editor).toHaveText('roadmap');
    await field.getByRole('button', { name: 'Clear search' }).click();
    await expect(editor).toHaveText('');
  }
});
