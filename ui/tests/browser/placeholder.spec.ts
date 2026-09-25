import { expect, test } from '@playwright/test';

test('renders the Skeleton primitive demo', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=skeleton');

  const demo = page.locator('[data-demo="skeleton"]');
  await expect(demo).toBeVisible();
  await expect(demo).toHaveAttribute('data-catalog-example-stack', '');

  const composition = demo.locator(
    '[data-catalog-example][data-catalog-geometry-overlay-skip]',
  );
  await expect(composition).toHaveCount(1);
  await expect(composition).toHaveAttribute('data-align', 'none');

  // Primitive blocks render and are decorative by default.
  const blocks = demo.locator('.kui-list .kui-skeleton');
  expect(await blocks.count()).toBeGreaterThanOrEqual(4);

  // A component's placeholder mode is shown in composition (ValueTable rows).
  const rows = demo.locator('.kui-value-table__row[data-placeholder="true"]');
  expect(await rows.count()).toBe(2);
  await expect(rows.first().locator('.kui-value-table__label')).toHaveText(
    'Status',
  );
  await expect(rows.first().locator('dd .kui-skeleton')).toBeVisible();

  // Skeleton blocks read as flat fill with no animation.
  const animation = await blocks
    .first()
    .evaluate((element) => window.getComputedStyle(element).animationName);
  expect(animation === 'none' || animation === '').toBe(true);

  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/skeleton-primitive.png' });
});

test('every placeholder-supporting component demos its placeholder case', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  // Each single-component demo (AppTab via `tabs`, ValueTableRow via `value-table`)
  // must surface its placeholder=true variant so the loading state is discoverable
  // where the component is evaluated, not only inside the loading-inspector recipe.
  const components = [
    'segmented-control',
    'toolbar-text',
    'list-header',
    'list-action-row',
    'list-item',
    'value-table',
    'select',
    'state-banner',
    'tabs',
  ];
  for (const id of components) {
    await page.goto(`/?component=${id}`);
    const demo = page.locator(`[data-demo="${id}"]`);
    await expect(demo, `${id} demo is visible`).toBeVisible();
    await expect(
      demo.locator('[data-placeholder="true"]').first(),
      `${id} demos a placeholder case`,
    ).toBeVisible();
  }
});

test('the Loading inspector recipe composes placeholder chrome and swaps to loaded', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=recipe-loading-inspector');

  const inspector = page.locator('[data-recipe="recipe-loading-inspector"]');
  await expect(inspector).toBeVisible();

  // Loading state: real chrome with skeleton values.
  await expect(inspector).toHaveAttribute('data-inspector-loading', 'true');
  await expect(
    inspector.locator(
      '[data-component="toolbar-text"][data-placeholder="true"]',
    ),
  ).toBeVisible();
  await expect(
    inspector.locator(
      '.kui-toolbar__leading [data-component="toolbar-control-group"]',
    ),
  ).toBeVisible();
  const rows = inspector.locator(
    '.kui-value-table__row[data-placeholder="true"]',
  );
  expect(await rows.count()).toBe(4);
  await expect(rows.first().locator('.kui-value-table__label')).toHaveText(
    'Status',
  );
  await expect(rows.first().locator('dd .kui-skeleton')).toBeVisible();
  // Select renders a static placeholder box, not the interactive wa-select.
  await expect(inspector.locator('.kui-select--placeholder')).toBeVisible();
  expect(await inspector.locator('wa-select').count()).toBe(0);
  // A placeholder menu item is disabled and carries no action.
  const item = inspector
    .locator('.kui-list-item[data-placeholder="true"]')
    .first();
  await expect(item).toBeDisabled();
  expect(await item.getAttribute('data-action')).toBeNull();

  if (browserName === 'chromium')
    await inspector.screenshot({
      path: 'test-results/recipe-loading-inspector.png',
    });

  // Toggling shows the populated record with the same chrome.
  await inspector.getByRole('button', { name: 'Show loaded' }).click();
  await expect(inspector).toHaveAttribute('data-inspector-loading', 'false');
  await expect(
    inspector.locator('.kui-value-table__row[data-placeholder="true"]'),
  ).toHaveCount(0);
  await expect(inspector.locator('wa-select')).toBeVisible();
  await expect(inspector.getByText('Mara Lopez')).toBeVisible();
});
