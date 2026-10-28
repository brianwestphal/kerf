import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(
    page.locator('[data-editor-canvas] [data-kerf-node]').first(),
  ).toBeVisible();
});

test('selects a canvas node and highlights it without running its action', async ({
  page,
}) => {
  const compose = page.locator(
    `[data-editor-canvas] [data-kerf-node="${COMPOSE}"]`,
  );
  await compose.click();
  await expect(
    page.getByText('composeButton · Button', { exact: false }),
  ).toBeVisible();
  const highlight = page.locator('.editor-selection');
  await expect(highlight).toBeVisible();
  const [box, target] = await Promise.all([
    highlight.boundingBox(),
    compose.boundingBox(),
  ]);
  expect(Math.abs(box!.x - target!.x)).toBeLessThan(2);
  expect(Math.abs(box!.width - target!.width)).toBeLessThan(2);
});

test('selects from the outline and documents a palette component', async ({
  page,
}) => {
  await page
    .locator(
      '[data-action="editor-select-node"][data-item-id="01JB8Z1M6Q8E1X9V4S7K2R3T5E"]',
    )
    .click();
  await expect(
    page.getByText('folderList · List', { exact: false }),
  ).toBeVisible();
  await page
    .locator('[data-action="editor-show-component"]', { hasText: /^Badge$/ })
    .click();
  await expect(page.getByText('Nothing selected')).toBeHidden();
});

test('opens a document file and reports one that is not a view document', async ({
  page,
}) => {
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schema":"x"}'),
  });
  await expect(page.getByText('That file could not be opened')).toBeVisible();
  const document = {
    schema: 'kerf-ui-document/v1',
    name: 'Greeting',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3TXA',
      type: '@kerfjs/ui:button',
      props: { children: 'Hello from a file', tone: 'success' },
    },
  };
  await input.setInputFiles({
    name: 'greeting.kui.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(document)),
  });
  await expect(page.locator('[data-editor-canvas]')).toContainText(
    'Hello from a file',
  );
  await expect(
    page.getByText('greeting.kui.json · 1 nodes · valid'),
  ).toBeVisible();
  await expect(page.getByText('That file could not be opened')).toBeHidden();
});

test('saves the document as a .kui.json download', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-action="editor-save"]').click(),
  ]);
  expect(download.suggestedFilename()).toBe('inbox.kui.json');
  const saved = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(saved).toMatchObject({ schema: 'kerf-ui-document/v1', name: 'Inbox' });
});

for (const [width, height] of [
  [1440, 900],
  [900, 800],
  [390, 800],
] as const) {
  test(`captures the selected state at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    if (width > 600)
      await page
        .locator(`[data-editor-canvas] [data-kerf-node="${COMPOSE}"]`)
        .click();
    await page.mouse.move(1, height - 1);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: info.outputPath(`kf-4nrzcv-editor-selected-${width}.png`),
      animations: 'disabled',
    });
  });
}

test('lists problems and selects the node a problem is about', async ({
  page,
}, info) => {
  const document = JSON.parse(
    await readFile(
      new URL('../../src/sample.kui.json', import.meta.url),
      'utf8',
    ),
  );
  document.root.zones.header[0].zones.trailing[0].props.tone = 'purple';
  document.params.bad = { type: { kind: 'map' } };
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: 'inbox.kui.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(document)),
    });
  const problems = page.locator('[data-action="editor-select-problem"]');
  await expect(problems).toHaveCount(2);
  await expect(page.getByText('2 problems in this document')).toBeVisible();
  await problems.nth(1).click();
  await expect(
    page.getByText('composeButton · Button', { exact: false }),
  ).toBeVisible();
  // The broken node previews as a selectable placeholder; the rest renders.
  const canvas = page.locator('[data-editor-canvas]');
  await expect(canvas).toContainText('composeButton cannot render');
  await expect(canvas).toContainText('Label 2');
  await expect(page.locator('.editor-selection')).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-f355bf-editor-problems-preview-1440.png'),
    animations: 'disabled',
  });
});

test('exports the view module from the Export menu', async ({ page }, info) => {
  const menu = page.locator('.kui-popup-menu').filter({ hasText: 'Export' });
  await menu.getByRole('button', { name: 'Export' }).click();
  await expect(
    page.getByRole('menuitem', { name: 'View module (.view.ts)' }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath('kf-y38yrt-editor-export-menu-1440.png'),
    animations: 'disabled',
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'View module (.view.ts)' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('inbox.view.ts');
  const code = await readFile((await download.path())!, 'utf8');
  expect(code).toBe(
    await readFile(
      new URL('../../../ui/tests/fixtures/view/inbox.view.ts', import.meta.url),
      'utf8',
    ),
  );
  await expect(page.getByText('Exported the view module')).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-y38yrt-editor-exported-1440.png'),
    animations: 'disabled',
  });
});

test('compares the document with an existing generated module', async ({
  page,
}, info) => {
  const golden = await readFile(
    new URL('../../../ui/tests/fixtures/view/inbox.view.ts', import.meta.url),
    'utf8',
  );
  const compare = page.locator('input[type="file"]').nth(1);
  await compare.setInputFiles({
    name: 'inbox.view.ts',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      golden
        .replace(/"compose" \| "open-item"/, '"compose" | "open-item"')
        .replace(
          '"actions":{"compose":"view","open-item":"row"}',
          '"actions":{"compose":"view","open-item":"row","archive":"view"}',
        ),
    ),
  });
  await expect(
    page.getByText(/Regenerating makes 1 contract change, 1 breaking/),
  ).toBeVisible();
  await expect(
    page.getByText('Breaking: action "archive" removed', { exact: false }),
  ).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-9j810j-editor-compare-1440.png'),
    animations: 'disabled',
  });
  await compare.setInputFiles({
    name: 'notes.ts',
    mimeType: 'text/plain',
    buffer: Buffer.from('export {};'),
  });
  await expect(
    page.getByText('That file is not a generated view module'),
  ).toBeVisible();
});

test('edits, adds, moves, deletes, and undoes from the inspector', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const canvasCompose = page.locator(
    `[data-editor-canvas] [data-kerf-node="${COMPOSE}"]`,
  );
  await canvasCompose.click();

  // An enum prop, through the Select popup.
  await page.locator('[data-editor-prop="tone"]').click();
  await page.getByRole('option', { name: 'danger' }).click();
  await expect(canvasCompose).toHaveAttribute('data-tone', 'danger');

  // A boolean prop, through its Switch.
  await page
    .locator('[data-editor-prop="disabled"]')
    .getByRole('switch')
    .click();
  await expect(canvasCompose).toBeDisabled();

  // Text-accepting content, committed with Enter.
  const label = page
    .locator('[data-editor-prop="children"]')
    .getByRole('textbox');
  await label.fill('Write');
  await label.press('Enter');
  await expect(canvasCompose).toHaveText('Write');

  // An invalid name is refused with its reason.
  const name = page.locator('[data-editor-name]').getByRole('textbox');
  await name.fill('Send Button');
  await name.press('Enter');
  await expect(page.locator('[data-editor-name]')).toContainText('camelCase');
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-kx77tv-editor-editing-1440.png'),
    animations: 'disabled',
  });

  // Undo from the keyboard outside a text field, then redo from the toolbar.
  await page
    .locator(`[data-action="editor-select-node"][data-item-id="${COMPOSE}"]`)
    .click();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(canvasCompose).toHaveText('Compose');
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(canvasCompose).toHaveText('Write');

  // Add a Button to the toolbar's trailing zone; it becomes the selection.
  await page
    .locator(
      '[data-action="editor-select-node"][data-item-id="01JB8Z1M6Q8E1X9V4S7K2R3T5B"]',
    )
    .click();
  await page.locator('[data-editor-add="zone"]').click();
  await page.getByRole('option', { name: 'trailing' }).click();
  await page.locator('[data-editor-add="component"]').click();
  await page.getByRole('option', { name: 'Button', exact: true }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('8 nodes · valid')).toBeVisible();
  await expect(
    page.locator('[data-editor-canvas] [data-kerf-node]', {
      hasText: /^Button$/,
    }),
  ).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-kx77tv-editor-added-1440.png'),
    animations: 'disabled',
  });

  // Delete it, and undo the delete.
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('7 nodes · valid')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('8 nodes · valid')).toBeVisible();
});
