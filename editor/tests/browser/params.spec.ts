import { expect, type Locator, test } from '@playwright/test';

const edit = (name: string, part: string, index?: number) =>
  `[data-editor-document-param-edit='${JSON.stringify({ name, part, ...(index === undefined ? {} : { index }) })}']`;

async function choose(field: Locator, option: string) {
  await field.locator('.kui-select__trigger').click();
  await field.getByRole('option', { name: option, exact: true }).click();
}

test('authors boolean and list parameters in the Document rail before binding props', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Params' }).click();
  const panel = page.locator('#editor-document-areas-params-panel');
  await expect(panel).toBeVisible();

  await panel
    .locator('[data-editor-document-param-new="name"] input')
    .fill('showDetails');
  await choose(
    panel.locator('[data-editor-document-param-new="type"]'),
    'Boolean',
  );
  await panel.getByRole('button', { name: 'Add parameter' }).click();
  const flag = panel.locator('[data-editor-param-row="showDetails"]');
  await expect(flag).toBeVisible();
  await flag.getByRole('switch', { name: 'Use default' }).click();
  await choose(flag.locator(edit('showDetails', 'default')), 'True');
  await expect(flag.locator(edit('showDetails', 'default'))).toHaveAttribute(
    'value',
    'true',
  );

  await panel
    .locator('[data-editor-document-param-new="name"] input')
    .fill('cards');
  await choose(
    panel.locator('[data-editor-document-param-new="type"]'),
    'List',
  );
  await panel.getByRole('button', { name: 'Add parameter' }).click();
  let cards = panel.locator('[data-editor-param-row="cards"]');
  await cards.getByRole('button', { name: 'Add field' }).click();
  await cards.locator(`${edit('cards', 'fieldName', 0)} input`).fill('id');
  await cards.locator(`${edit('cards', 'fieldName', 0)} input`).press('Enter');
  cards = panel.locator('[data-editor-param-row="cards"]');
  await cards.getByRole('button', { name: 'Add field' }).click();
  await cards.locator(`${edit('cards', 'fieldName', 1)} input`).fill('label');
  await cards.locator(`${edit('cards', 'fieldName', 1)} input`).press('Enter');
  await expect(cards.locator('[data-editor-param-field-row]')).toHaveCount(2);

  await cards.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('params-wide.png') });
  await page
    .locator(
      '[data-editor-canvas] [data-kerf-node="01JB8Z1M6Q8E1X9V4S7K2R3T5D"]',
    )
    .click();
  await page.getByRole('tab', { name: 'Flow' }).click();
  await expect(page.locator('[data-editor-control="condition"]')).toContainText(
    'Param showDetails',
  );
  await expect(page.locator('[data-editor-control="repeat"]')).toContainText(
    'Param cards',
  );
});

test('renames and removes an unused parameter with undo and redo on a narrow viewport', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Show Document' }).click();
  await page.getByRole('tab', { name: 'Params' }).click();
  const panel = page.locator('#editor-document-areas-params-panel');
  await panel
    .locator('[data-editor-document-param-new="name"] input')
    .fill('draftCount');
  await choose(
    panel.locator('[data-editor-document-param-new="type"]'),
    'Number',
  );
  await panel.getByRole('button', { name: 'Add parameter' }).click();
  await expect(
    panel.locator('[data-editor-param-row="draftCount"]'),
  ).toBeVisible();

  const rename = panel.locator(`${edit('draftCount', 'name')} input`);
  await rename.fill('itemCount');
  await rename.press('Enter');
  await expect(
    panel.locator('[data-editor-param-row="itemCount"]'),
  ).toBeVisible();
  await panel
    .locator('[data-editor-param-row="itemCount"]')
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('params-narrow.png') });
  await panel
    .locator('[data-editor-param-row="itemCount"]')
    .getByRole('button', { name: 'Remove parameter' })
    .click();
  await expect(
    panel.locator('[data-editor-param-row="itemCount"]'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Hide Document' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('button', { name: 'Show Document' }).click();
  await expect(
    panel.locator('[data-editor-param-row="itemCount"]'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Hide Document' }).click();
  await page.getByRole('button', { name: 'Redo' }).click();
  await page.getByRole('button', { name: 'Show Document' }).click();
  await expect(
    panel.locator('[data-editor-param-row="itemCount"]'),
  ).toHaveCount(0);
});
