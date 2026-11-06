import { readFile } from 'node:fs/promises';

import { expect, type Page, test } from '@playwright/test';

import { area, openLibrary } from './areas.js';
import {
  addChild,
  canvas,
  dragComponent,
  embedIn,
  embedInOther,
  emptySpot,
  exported,
  newDocument,
  outlineRow,
  select,
  setField,
  turnOff,
  zoneSpot,
} from './build.js';

const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';

/**
 * Starts a new document whose root Pane takes its content's height: New's
 * Pane fills the canvas (KF-Z70DBC), which gives a nested whole-screen layout
 * a height of its own.
 */
async function contentHeightDocument(page: Page) {
  await newDocument(page);
  await select(page, /^Pane/);
  await turnOff(page, 'fill');
}

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
  const highlight = page.locator('.kui-editor__selection');
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
  await openLibrary(page);
  await page
    .locator('[data-action="editor-show-component"]', { hasText: /^Badge$/ })
    .click();
  await expect(page.getByText('Nothing selected')).toBeHidden();
});

test('filters the components list as you type', async ({ page }, info) => {
  // KF-Y26SKM: the Library narrows to names or categories.
  await page.setViewportSize({ width: 1440, height: 900 });
  await openLibrary(page);
  const rows = page.locator('[data-editor-palette]');
  const all = await rows.count();
  const filter = page.locator('[data-editor-palette-filter]');
  await filter.click();
  await page.keyboard.type('list');
  await expect(rows.first()).toBeVisible();
  const names = await rows.allTextContents();
  expect(names.length).toBeLessThan(all);
  for (const name of names) expect(name.toLowerCase()).toContain('list');
  // Typing again keeps the caret: the text reads in order.
  await page.keyboard.type('item');
  await expect(filter).toHaveText('listitem');
  await expect(rows).toHaveText(['ListItem', 'ListItemLink']);
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-y26skm-palette-filter-1440.png'),
    animations: 'disabled',
  });
  // A palette row from the filtered list still documents its component.
  await rows.first().click();
  await expect(page.getByText('Nothing selected')).toBeHidden();
  await page.getByRole('button', { name: 'Clear Filter' }).click();
  await expect(rows).toHaveCount(all);
  await expect(filter).toBeFocused();
  // KF-PR8MA6 / KF-Z54E4H: the filter stays above the Library's scrolling
  // list, so scrolling to its end leaves it in view above the rows.
  await rows.last().scrollIntoViewIfNeeded();
  await expect(filter).toBeInViewport();
  const field = (await filter.boundingBox())!;
  const firstVisible = (await rows.last().boundingBox())!;
  expect(field.y + field.height).toBeLessThanOrEqual(firstVisible.y);
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-pr8ma6-filter-pinned-1440.png'),
    animations: 'disabled',
  });
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
  // KF-0SY9M6: an opened file has no project path, so it becomes a draft.
  await expect(
    page.getByText('Unsaved draft · autosaved · 1 node · valid'),
  ).toBeVisible();
  await expect(page.getByText('That file could not be opened')).toBeHidden();
});

test('saves the document as a .kui.json download', async ({ page }) => {
  // KF-0SY9M6: with autosave, a download is an export of a copy.
  await page
    .locator('.kui-popup-menu')
    .filter({ hasText: 'Export' })
    .getByRole('button', { name: 'Export' })
    .click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'Document (.kui.json)' }).click(),
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
  await area(page, 'Problems');
  await problems.nth(1).click();
  await expect(
    page.getByText('composeButton · Button', { exact: false }),
  ).toBeVisible();
  // The broken node previews as a selectable placeholder; the rest renders.
  const canvas = page.locator('[data-editor-canvas]');
  await expect(canvas).toContainText('composeButton cannot render');
  await expect(canvas).toContainText('Label 2');
  await expect(page.locator('.kui-editor__selection')).toBeVisible();
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
  // A short window, so the Children area scrolls before Add.
  await page.setViewportSize({ width: 1440, height: 420 });
  await area(page, 'Children');
  await page.locator('[data-editor-add="zone"]').click();
  await page.getByRole('option', { name: 'trailing' }).click();
  await page.locator('[data-editor-add="component"]').click();
  await page.getByRole('option', { name: 'Button', exact: true }).click();
  const railScroll = () =>
    page
      .locator('[data-workbench-rail="right"]')
      .evaluate((rail) =>
        Math.max(
          rail.scrollTop,
          ...[...rail.querySelectorAll('*')].map((node) => node.scrollTop),
        ),
      );
  const add = page.getByRole('button', { name: 'Add', exact: true });
  await add.scrollIntoViewIfNeeded();
  expect(await railScroll()).toBeGreaterThan(0);
  await add.click();
  await expect(page.getByText('8 nodes · valid')).toBeVisible();
  // KF-JWD51N: the new selection opens the Inspector at its top, on its
  // Properties.
  await expect.poll(railScroll).toBe(0);
  await expect(page.locator('[data-editor-name]')).toBeInViewport();
  await page.setViewportSize({ width: 1440, height: 900 });
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

// KF-K5TKCV: a prop is bound to a param through the Bind section's popups,
// and the preview follows the binding.
test('edits a List gap from its size keywords and a builder call', async ({
  page,
}, info) => {
  // KF-Q5AXNP: a gap is a union of spacing tokens and css-values builders.
  await page.setViewportSize({ width: 1440, height: 900 });
  const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';
  await page
    .locator(`[data-action="editor-select-node"][data-item-id="${FOLDERS}"]`)
    .click();
  const list = page.locator(
    `[data-editor-canvas] [data-kerf-node="${FOLDERS}"]`,
  );
  const gap = page.locator('[data-editor-prop="gap"][data-editor-kind="size"]');
  await gap.click();
  await page.getByRole('option', { name: 'l', exact: true }).click();
  await expect(list).toHaveAttribute('data-gap', 'true');
  await expect(list).toHaveAttribute('style', /--_kui-list-gap:/);

  await gap.click();
  await page.getByRole('option', { name: 'Custom…' }).click();
  await expect(list).toHaveAttribute('data-gap', 'false');
  const builder = page
    .locator('[data-editor-prop="gap"][data-editor-kind="css"]')
    .getByRole('textbox');
  await builder.fill('px(12)');
  await builder.press('Enter');
  await expect(list).toHaveAttribute('style', /--_kui-list-gap:12px/);
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-q5axnp-list-gap-custom-1440.png'),
    animations: 'disabled',
  });
});

test('splits a List gap into columns and rows, one with a builder call', async ({
  page,
}, info) => {
  // KF-VA14AP: a gap's `{ column, row }` member, a size Select per axis.
  await page.setViewportSize({ width: 1440, height: 900 });
  const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';
  await page
    .locator(`[data-action="editor-select-node"][data-item-id="${FOLDERS}"]`)
    .click();
  const list = page.locator(
    `[data-editor-canvas] [data-kerf-node="${FOLDERS}"]`,
  );
  const axis = (name: string, kind = 'size') =>
    page.locator(
      `[data-editor-field='${JSON.stringify({ prop: 'gap', path: [name] })}'][data-editor-kind="${kind}"]`,
    );
  await page
    .locator('[data-editor-prop="gap"][data-editor-kind="size"]')
    .click();
  await page.getByRole('option', { name: 'Columns and rows…' }).click();
  await axis('column').click();
  await axis('column')
    .getByRole('option', { name: 'none', exact: true })
    .click();
  // Custom… keeps the axis's value until the builder field sets one.
  await axis('row').click();
  await axis('row').getByRole('option', { name: 'Custom…' }).click();
  await expect(axis('row', 'css')).toBeVisible();
  await expect(page.getByText(/is not a valid UiGap/)).toHaveCount(0);
  const builder = axis('row', 'css').getByRole('textbox');
  await builder.fill('px(12)');
  await builder.press('Enter');
  await expect(list).toHaveAttribute(
    'style',
    /--_kui-list-column-gap:[^;]*space-none[^;]*;--_kui-list-row-gap:12px/,
  );
  await expect(page.getByText(/nodes · valid/)).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-va14ap-list-gap-axes-1440.png'),
    animations: 'disabled',
  });
});

test('sets a component’s classes from the Inspector’s Advanced section', async ({
  page,
}, info) => {
  // KF-X8X8VX: `className` is an advanced Classes field, not hidden.
  await page.setViewportSize({ width: 1440, height: 900 });
  const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';
  await page
    .locator(`[data-action="editor-select-node"][data-item-id="${FOLDERS}"]`)
    .click();
  const list = page.locator(
    `[data-editor-canvas] [data-kerf-node="${FOLDERS}"]`,
  );
  const classes = page.locator('[data-editor-prop="className"]');
  await expect(page.getByText('Advanced', { exact: true })).toBeVisible();
  await expect(classes).toContainText('Classes');
  const input = classes.getByRole('textbox');
  await input.fill('kui-dark');
  await input.press('Enter');
  await expect(list).toHaveClass(/\bkui-dark\b/);
  await expect(list).toHaveClass(/\bkui-list\b/);
  await expect(page.getByText(/nodes · valid/)).toBeVisible();
  await classes.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-x8x8vx-classes-1440.png'),
    animations: 'disabled',
  });
});

test('binds a repeated row’s label to a document param', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .locator(
      '[data-action="editor-select-node"][data-item-id="01JB8Z1M6Q8E1X9V4S7K2R3T5F"]',
    )
    .click();
  await page.locator('[data-editor-bind="prop"]').click();
  await page.getByRole('option', { name: 'Label', exact: true }).click();
  await expect(page.locator('[data-editor-bind="source"]')).toHaveAttribute(
    'value',
    '{"$bind":"item.label"}',
  );
  await page.locator('[data-editor-bind="source"]').click();
  await page.getByRole('option', { name: 'Param title' }).click();
  // Every repeated row now shows the title param's sample value.
  await expect(
    page.locator('[data-editor-canvas]').getByText('Inbox', { exact: true }),
  ).toHaveCount(4);
  await expect(page.getByText('7 nodes · valid')).toBeVisible();
  await page.locator('[data-editor-bind="prop"]').scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-k5tkcv-editor-bind-1440.png'),
    animations: 'disabled',
  });
});

// KF-90GTJN: control flow from the inspector — show a node only when a
// param holds, and add a slot the application fills.
test('shows a node only when a param holds and adds a slot', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const select = (id: string) =>
    page
      .locator(`[data-action="editor-select-node"][data-item-id="${id}"]`)
      .click();
  await select(COMPOSE);
  await area(page, 'Flow');
  await page.locator('[data-editor-control="condition"]').click();
  await page.getByRole('option', { name: 'Param showEmpty' }).click();
  await expect(
    page
      .locator(`[data-item-id="${COMPOSE}"]`)
      .getByText('trailing · if showEmpty'),
  ).toBeVisible();
  await expect(page.getByText('7 nodes · valid')).toBeVisible();
  await page
    .locator('[data-editor-control="condition"]')
    .scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-90gtjn-editor-condition-1440.png'),
    animations: 'disabled',
  });

  // Add a slot to the toolbar's trailing zone; the outline and canvas show it.
  await select('01JB8Z1M6Q8E1X9V4S7K2R3T5B');
  await area(page, 'Children');
  await page.locator('[data-editor-add="zone"]').click();
  await page.getByRole('option', { name: 'trailing', exact: true }).click();
  await page.locator('[data-editor-slot="name"] input').fill('actions');
  await page.getByRole('button', { name: 'Add slot' }).click();
  const slotRow = page.locator(
    '[data-item-id="slot:01JB8Z1M6Q8E1X9V4S7K2R3T5B:trailing:1"]',
  );
  await expect(slotRow).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.locator('[data-editor-canvas]').getByText('actions slot'),
  ).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-90gtjn-editor-slot-1440.png'),
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(slotRow).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(slotRow).toBeVisible();
});

// KF-YR91FA: a label moves into nodes so a component can sit beside it, and
// back to text when the zone is one text run again.
test('turns a button label into nodes and adds a badge beside it', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .locator(`[data-action="editor-select-node"][data-item-id="${COMPOSE}"]`)
    .click();
  await page.getByRole('button', { name: 'Use as nodes' }).click();
  await expect(
    page.getByText('Holds 1 node; select it in the outline.'),
  ).toBeVisible();
  await area(page, 'Children');
  await page.locator('[data-editor-add="component"]').click();
  await page.getByRole('option', { name: 'Badge', exact: true }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('9 nodes · valid')).toBeVisible();
  await page
    .locator(`[data-action="editor-select-node"][data-item-id="${COMPOSE}"]`)
    .click();
  await expect(
    page.getByText('Holds 2 nodes; select them in the outline.'),
  ).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-yr91fa-editor-label-nodes-1440.png'),
    animations: 'disabled',
  });
});

// KF-5S56VQ: a conditional node gets an otherwise branch, which the outline
// shows as the other side of the same condition.
test('adds what shows otherwise to a conditional node', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .locator(
      '[data-action="editor-select-node"][data-item-id="01JB8Z1M6Q8E1X9V4S7K2R3T5G"]',
    )
    .click();
  await area(page, 'Flow');
  await page
    .locator('[data-editor-control="otherwise"]')
    .getByRole('combobox')
    .click();
  await page.getByRole('option', { name: 'Badge', exact: true }).click();
  await expect(page.getByText('content · unless showEmpty')).toBeVisible();
  await expect(page.getByText('8 nodes · valid')).toBeVisible();
  await page
    .locator('[data-editor-control="otherwise"]')
    .scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-5s56vq-editor-otherwise-1440.png'),
    animations: 'disabled',
  });
});

// KF-WXP6AB: dragging an outline row places the node; the validator decides
// where it may land.
test('drags a node in the outline to a new place', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const row = (id: string) =>
    page.locator(
      `[data-tree-list-id="editor-outline"] [role="treeitem"][data-item-id="${id}"]`,
    );
  const folders = row('01JB8Z1M6Q8E1X9V4S7K2R3T5E');
  const text = row('01JB8Z1M6Q8E1X9V4S7K2R3T5G');
  const box = (await text.boundingBox())!;
  await folders.dragTo(text, {
    targetPosition: { x: box.width / 2, y: box.height - 3 },
  });
  // folderList now follows the empty-state Text in the Pane's content.
  const order = await page
    .locator(
      '[data-tree-list-id="editor-outline"] [role="treeitem"][aria-level="2"]',
    )
    .evaluateAll((rows) =>
      rows.map((item) => item.getAttribute('data-item-id')),
    );
  expect(order.indexOf('01JB8Z1M6Q8E1X9V4S7K2R3T5E')).toBeGreaterThan(
    order.indexOf('01JB8Z1M6Q8E1X9V4S7K2R3T5G'),
  );
  await expect(folders).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('7 nodes · valid')).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-wxp6ab-editor-dragged-1440.png'),
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Undo' }).click();
  const restored = await page
    .locator(
      '[data-tree-list-id="editor-outline"] [role="treeitem"][aria-level="2"]',
    )
    .evaluateAll((rows) =>
      rows.map((item) => item.getAttribute('data-item-id')),
    );
  expect(restored.indexOf('01JB8Z1M6Q8E1X9V4S7K2R3T5E')).toBeLessThan(
    restored.indexOf('01JB8Z1M6Q8E1X9V4S7K2R3T5G'),
  );
});

test('shows where a dragged outline row would land', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const row = (id: string) =>
    page.locator(
      `[data-tree-list-id="editor-outline"] [role="treeitem"][data-item-id="${id}"]`,
    );
  const folders = row('01JB8Z1M6Q8E1X9V4S7K2R3T5E');
  const source = (await row(COMPOSE).boundingBox())!;
  const target = (await folders.boundingBox())!;
  await page.mouse.move(source.x + 40, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + 60, target.y + target.height / 2, {
    steps: 8,
  });
  await expect(folders).toHaveAttribute('data-drop-position', 'inside');
  const clip = { x: 0, y: 120, width: 300, height: 460 };
  await page.screenshot({
    path: info.outputPath('kf-wxp6ab-editor-drop-inside-1440.png'),
    clip,
  });
  await page.mouse.move(target.x + 60, target.y + 2, { steps: 3 });
  await expect(folders).toHaveAttribute('data-drop-position', 'before');
  await page.screenshot({
    path: info.outputPath('kf-wxp6ab-editor-drop-before-1440.png'),
    clip,
  });
  await page.mouse.up();
  await expect(folders).not.toHaveAttribute('data-drop-position');
});

// KF-5RKX3W: a slot is selected from its canvas placeholder, ringed like a
// node, and moved from the Inspector toolbar.
test('selects a slot on the canvas and moves it', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const placeholder = page.locator(
    '[data-editor-canvas] [data-editor-slot-address]',
  );
  await placeholder.click();
  const slotRow = (index: number) =>
    page.locator(
      `[data-tree-list-id="editor-outline"] [data-item-id="slot:01JB8Z1M6Q8E1X9V4S7K2R3T5A:content:${index}"]`,
    );
  await expect(slotRow(2)).toHaveAttribute('aria-selected', 'true');
  const ring = page.locator('.kui-editor__selection');
  await expect(ring).toBeVisible();
  const [box, target] = await Promise.all([
    ring.boundingBox(),
    placeholder.boundingBox(),
  ]);
  expect(Math.abs(box!.y - target!.y)).toBeLessThan(2);
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-5rkx3w-editor-slot-selected-1440.png'),
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Move up' }).click();
  await expect(slotRow(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('7 nodes · valid')).toBeVisible();
});

// KF-CWDE93: dragging on the canvas shows where a node lands and moves it.
test('drags a node on the canvas to after another', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const canvas = page.locator('[data-editor-canvas]');
  const compose = canvas.locator(`[data-kerf-node="${COMPOSE}"]`);
  const slot = canvas.locator('[data-editor-slot-address]');
  const from = (await compose.boundingBox())!;
  const to = (await slot.boundingBox())!;
  await page.mouse.move(from.x + 10, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 40, to.y + to.height - 2, { steps: 10 });
  const drop = page.locator('.kui-editor__drop');
  await expect(drop).toBeVisible();
  await expect(drop).toHaveAttribute('data-drop', 'line');
  await page.screenshot({
    path: info.outputPath('kf-cwde93-editor-canvas-drop-1440.png'),
    animations: 'disabled',
  });
  await page.mouse.up();
  await expect(drop).toBeHidden();
  // composeButton now follows the detail slot in the Pane's content.
  const outlineRow = page.locator(
    `[data-tree-list-id="editor-outline"] [data-item-id="${COMPOSE}"]`,
  );
  await expect(outlineRow).toHaveAttribute('aria-level', '2');
  await expect(outlineRow).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('7 nodes · valid')).toBeVisible();
  // The click that ended the drag did not select the slot under it.
  await expect(page.getByText('composeButton · Button')).toBeVisible();
});

// KF-SFAA5R: the Inspector's Move to list is checked with the scoped move
// check rather than a whole-document validation per zone. It still offers
// only legal zones, and choosing one moves the node there.
test('moves the selected node with Move to', async ({ page }) => {
  await select(page, 'composeButton');
  await area(page, 'Flow');
  const move = page.locator('[data-editor-move]');
  await move.locator('.kui-select__trigger').click();
  // A Button cannot sit inside the repeated ListItem (`row`), which renders
  // a button itself (KUI-V014).
  await expect(
    move.getByRole('option', { name: /^folderList › / }),
  ).toHaveCount(1);
  await expect(move.getByRole('option', { name: /^row › / })).toHaveCount(0);
  const choice = move.getByRole('option', { name: 'Pane › content' });
  await choice.click();
  await expect(choice).toBeHidden();
  const outlineRow = page.locator(
    `[data-tree-list-id="editor-outline"] [data-item-id="${COMPOSE}"]`,
  );
  await expect(outlineRow).toHaveAttribute('aria-level', '2');
  await expect(page.getByText('7 nodes · valid')).toBeVisible();
});

// KF-P6FPG2 / KF-0P9WWB: a Button nested in a repeated ListItem's description
// would split each row into two elements and fail the preview. The editor no
// longer builds such a document, and one opened from a file reports KUI-V014
// and draws the Button as a problem placeholder, so the rows still render.
test('reports a control nested in a repeated row and keeps the preview', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const sample = JSON.parse(
    await readFile(
      new URL('../../src/sample.kui.json', import.meta.url),
      'utf8',
    ),
  );
  const NESTED = '01JB8Z1M6Q8E1X9V4S7K2R3TXB';
  const nest = (node: Record<string, unknown>): boolean => {
    if (node.name === 'row') {
      node.zones = {
        description: [
          {
            id: NESTED,
            type: '@kerfjs/ui:button',
            props: { children: 'Nested' },
          },
        ],
      };
      return true;
    }
    return Object.values(node).some(
      (value) =>
        value !== null &&
        typeof value === 'object' &&
        nest(value as Record<string, unknown>),
    );
  };
  expect(nest(sample)).toBe(true);
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: 'nested.kui.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(sample)),
    });
  const canvas = page.locator('[data-editor-canvas]');
  await expect(canvas.getByText('Button cannot render')).toHaveCount(3);
  await expect(canvas.getByText('Label 3')).toBeVisible();
  await expect(
    canvas.getByText('This document cannot be previewed'),
  ).toHaveCount(0);
  await area(page, 'Problems');
  await expect(page.getByText(/^KUI-V014/)).toBeVisible();
  await area(page, 'Outline');
  // Deleting the nested Button makes the document valid again.
  await page
    .locator(`[data-action="editor-select-node"][data-item-id="${NESTED}"]`)
    .click();
  await page.locator('[data-action="editor-delete"]').click();
  await expect(canvas.getByText('Button cannot render')).toHaveCount(0);
  await expect(page.getByText('7 nodes · valid')).toBeVisible();
});

// KF-0SY9M6: every change autosaves (to a draft until Save As chooses a
// path), and a reload reopens the document where it was left.
test('autosaves edits, reopens them, and saves as a project path', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    page.getByText('Unsaved draft · autosaved · 7 nodes · valid'),
  ).toBeVisible();
  await page
    .locator(`[data-editor-canvas] [data-kerf-node="${COMPOSE}"]`)
    .click();
  await page.locator('[data-action="editor-delete"]').click();
  await expect(
    page.getByText('Unsaved draft · autosaved · 6 nodes · valid'),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('Unsaved draft · autosaved · 6 nodes · valid'),
  ).toBeVisible();

  const path = `.kerf-ui-editor/e2e/${info.project.name}-${Date.now()}.kui.json`;
  await page.getByRole('button', { name: 'Save As…' }).click();
  const field = page.getByRole('textbox', { name: 'Path' });
  await expect(field).toHaveValue('inbox.kui.json');
  await field.fill(path);
  await page.screenshot({
    path: info.outputPath('KF-0SY9M6-save-as-1440.png'),
    animations: 'disabled',
  });
  await page.locator('[data-editor-save-as="confirm"]').click();
  await expect(page.getByRole('dialog', { name: 'Save As' })).toBeHidden();
  await expect(
    page.getByText(`${path} · saved · 6 nodes · valid`),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath('KF-0SY9M6-saved-1440.png'),
    animations: 'disabled',
  });
  const saved = await readFile(
    new URL(`../../${path}`, import.meta.url),
    'utf8',
  );
  expect(JSON.parse(saved).name).toBe('Inbox');
  expect(saved).not.toContain(COMPOSE);
  await page.reload();
  await expect(
    page.getByText(`${path} · saved · 6 nodes · valid`),
  ).toBeVisible();
});

// KF-QSSTMX: New starts an empty document in a new draft that a reload keeps.
// KF-PK3GVY: it has no root; the canvas asks for the first component.
for (const width of [1440, 390] as const) {
  test(`starts a new empty document at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'New' }).click();
    const empty = page.locator(
      '[data-editor-canvas] [data-editor-empty="root"]',
    );
    await expect(
      page.getByText('Unsaved draft · autosaved · 0 nodes · 1 problem'),
    ).toBeVisible();
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('Start with a component');
    await expect(page.locator('[data-editor-canvas]')).not.toContainText(
      'Inbox',
    );
    await page.screenshot({
      path: info.outputPath(`KF-PK3GVY-new-${width}.png`),
      animations: 'disabled',
    });
    await page.reload();
    await expect(
      page.getByText('Unsaved draft · autosaved · 0 nodes · 1 problem'),
    ).toBeVisible();
    await expect(empty).toBeVisible();
  });
}

// KF-PK3GVY: the first component chosen becomes the root (a Pane fills),
// and deleting the root goes back to the empty state as one undo step.
test('picks the first component as the root, deletes it, and undoes', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'New' }).click();
  const empty = page.locator('[data-editor-canvas] [data-editor-empty="root"]');
  await area(page, 'Outline');
  await expect(page.getByText('No components yet')).toBeVisible();
  await expect(
    empty.locator('[data-editor-root="component"]'),
  ).toHaveJSProperty('value', '@kerfjs/ui:pane');
  await empty.getByRole('button', { name: 'Add' }).click();
  await expect(empty).toHaveCount(0);
  await expect(page.getByText('1 node · valid')).toBeVisible();
  await expect(outlineRow(page, /^Pane/)).toBeVisible();
  expect(await exported(page)).toEqual({
    type: '@kerfjs/ui:pane',
    props: { fill: true },
  });
  await page.screenshot({
    path: info.outputPath('KF-PK3GVY-first-root-1440.png'),
    animations: 'disabled',
  });
  // The root is selected; Delete empties the document.
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(empty).toBeVisible();
  await expect(page.getByText('0 nodes · 1 problem')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(empty).toHaveCount(0);
  await expect(page.getByText('1 node · valid')).toBeVisible();
  // The context menu deletes it too.
  await outlineRow(page, /^Pane/).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(empty).toBeVisible();
  // A component dropped on the empty canvas becomes the root.
  await dragComponent(page, 'NavStack', () => empty);
  await expect(empty).toHaveCount(0);
  const root = (await exported(page)) as { type: string; props?: object };
  expect(root.type).toBe('@kerfjs/ui:nav-stack');
});

// KF-67K2VP: a palette drag rests on the Outline tab to open it, then drops
// on an outline row.
test('drags a palette component onto an outline row', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await expect(page.getByText('1 node · valid')).toBeVisible();
  await openLibrary(page);
  const row = page.locator('[data-editor-palette="@kerfjs/ui:text"]');
  await row.scrollIntoViewIfNeeded();
  const from = (await row.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  const tab = page.getByRole('tab', { name: 'Outline' });
  const at = (await tab.boundingBox())!;
  await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2, {
    steps: 8,
  });
  // Resting on the tab opens the outline under the drag.
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  const target = page.locator('.kui-tree-list > [role="treeitem"]').first();
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 6,
  });
  await expect(target).toHaveAttribute('data-drop-position', 'inside');
  const chip = page.locator('.kui-editor__drag-chip');
  await expect(chip).toContainText('Text');
  // KF-23EBGS: the chip draws over the rail; no ancestor clips it (a pane
  // did in WebKit).
  expect(
    await chip.evaluate((element) => {
      for (let at = element.parentElement; at; at = at.parentElement)
        if (getComputedStyle(at).overflow !== 'visible') return at.className;
      return '';
    }),
  ).toBe('');
  await page.screenshot({
    path: info.outputPath('KF-67K2VP-outline-drop-1440.png'),
    animations: 'disabled',
  });
  await page.mouse.up();
  await expect(page.getByText('2 nodes · valid')).toBeVisible();
  await expect(target).not.toHaveAttribute('data-drop-position');
  // KF-Z54E4H: the transient Library closed after the drop.
  await expect(page.locator('#editor-library')).toBeHidden();
});

// KF-78MHM8: components drag from the palette onto the canvas.
// KF-WKABP2: a drag over a Workbench shows its zones where they render and
// drops into the one under the pointer; the seeded "Main" is replaced
// without asking, authored content after a confirmation; an Option-drop
// asks where it goes.
test('targets a Workbench’s zones, replaces Main, and asks on Option-drop', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'Workbench', () =>
    page.locator('[data-editor-canvas] [data-editor-empty]').first(),
  );
  const workbench = page.locator('[data-editor-canvas] .kui-workbench');
  await expect(workbench).toBeVisible();
  const caption = page.locator('.kui-editor__drop-caption');
  /** Starts a palette drag of `name` and rests at a point of the Workbench. */
  const hover = async (name: string, fx: number, fy: number) => {
    await openLibrary(page);
    const row = page.locator('[data-editor-palette]', {
      hasText: new RegExp(`^${name}$`),
    });
    await row.scrollIntoViewIfNeeded();
    const from = (await row.boundingBox())!;
    await page.mouse.move(from.x + 20, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 40, from.y + from.height / 2, { steps: 3 });
    const box = (await workbench.boundingBox())!;
    await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy, {
      steps: 10,
    });
  };
  await hover('NavStack', 0.1, 0.5);
  await expect(caption).toHaveText('Inside Workbench › Left rail');
  await expect(page.locator('.kui-editor__zone-ghost')).not.toHaveCount(0);
  await page.screenshot({
    path: info.outputPath('KF-WKABP2-left-rail-1440.png'),
    animations: 'disabled',
  });
  await page.mouse.move(
    ...(await workbench
      .boundingBox()
      .then(
        (box) =>
          [box!.x + box!.width / 2, box!.y + box!.height * 0.05] as const,
      )),
    { steps: 4 },
  );
  await expect(caption).toHaveText('Inside Workbench › Header');
  await page.mouse.move(
    ...(await workbench
      .boundingBox()
      .then(
        (box) => [box!.x + box!.width * 0.1, box!.y + box!.height / 2] as const,
      )),
    { steps: 4 },
  );
  await page.mouse.up();
  await expect(page.locator('.kui-editor__zone-ghost')).toHaveCount(0);
  // The NavStack fills the new left rail.
  await expect(workbench.locator('.kui-nav-stack')).toBeVisible();
  // The seeded Main is replaced without asking.
  await hover('Button', 0.5, 0.4);
  await expect(caption).toHaveText('Replace Main');
  await page.screenshot({
    path: info.outputPath('KF-WKABP2-replace-main-1440.png'),
    animations: 'disabled',
  });
  await page.mouse.up();
  const dialog = page.locator('#editor-replace-dialog');
  await expect(dialog).not.toHaveJSProperty('open', true);
  await expect(workbench.locator('.kui-button')).toBeVisible();
  // Authored content asks first.
  await hover('Text', 0.5, 0.4);
  await expect(caption).toHaveText('Replace Button');
  await page.mouse.up();
  await expect(dialog).toHaveJSProperty('open', true);
  await page.screenshot({
    path: info.outputPath('KF-WKABP2-confirm-1440.png'),
    animations: 'disabled',
  });
  await dialog.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(dialog).not.toHaveJSProperty('open', true);
  await expect(workbench.locator('.kui-button')).toHaveCount(0);
  // An Option-drop asks where it goes.
  await hover('Badge', 0.5, 0.4);
  await page.keyboard.down('Alt');
  await page.mouse.up();
  await page.keyboard.up('Alt');
  const choice = page.getByRole('menuitem', {
    name: 'Inside Workbench › Right rail',
  });
  await expect(choice).toBeVisible();
  await page.screenshot({
    path: info.outputPath('KF-WKABP2-option-drop-1440.png'),
    animations: 'disabled',
  });
  await choice.click();
  await expect(workbench.locator('.kui-badge')).toBeVisible();
});

// KF-JC7WTW: the Library's grid shows each component as added (a
// layout as a sketch), and a tile drags onto the canvas like a row.
test('shows the palette as a grid of thumbnails', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await expect(page.getByText('1 node · valid')).toBeVisible();
  await openLibrary(page);
  await page
    .locator(
      '[data-segmented-control-id="editor-palette-view"] [data-segment-value="grid"]',
    )
    .click();
  const tile = (key: string) =>
    page.locator(`[data-editor-palette="@kerfjs/ui:${key}"]`);
  // A control renders live, scaled into its tile.
  const host = tile('switch').locator('[data-editor-palette-thumb]');
  await expect(host).not.toHaveAttribute('data-thumb-empty');
  await expect
    .poll(() =>
      host.evaluate((element) => {
        const stage =
          element.shadowRoot!.querySelector<HTMLElement>('[data-thumb-stage]')!;
        const content = stage.firstElementChild!.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        return (
          stage.style.visibility === '' &&
          content.width > 0 &&
          content.left >= box.left &&
          content.right <= box.right
        );
      }),
    )
    .toBe(true);
  // A layout shows its sketch.
  await expect(tile('workbench').locator('svg')).toBeVisible();
  await page.screenshot({
    path: info.outputPath('KF-JC7WTW-palette-grid-1440.png'),
    animations: 'disabled',
  });
  // A tile drags onto the canvas.
  const button = tile('button');
  await button.scrollIntoViewIfNeeded();
  const from = (await button.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  const empty = page.locator('[data-editor-canvas] [data-editor-empty]');
  const to = (await empty.boundingBox())!;
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  await expect(page.getByText('2 nodes · valid')).toBeVisible();
  // The choice lasts across a reload.
  await page.reload();
  await openLibrary(page);
  await expect(tile('switch')).toHaveClass(/kui-content-item/);
});

test('drags components from the palette onto the canvas', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await expect(page.getByText('1 node · valid')).toBeVisible();
  await openLibrary(page);
  const canvas = page.locator('[data-editor-canvas]');
  const drag = async (
    key: string,
    to: { x: number; y: number },
    shot?: string,
  ) => {
    // KF-Z54E4H: each drop closes the transient Library.
    await openLibrary(page);
    const row = page.locator(`[data-editor-palette="${key}"]`);
    await row.scrollIntoViewIfNeeded();
    const box = (await row.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await expect(canvas.locator('.kui-editor__drop')).toBeVisible();
    // KF-Y4GHQV: a chip names what is dragged, and a caption where it lands.
    await expect(page.locator('.kui-editor__drag-chip')).toBeVisible();
    await expect(canvas.locator('.kui-editor__drop-caption')).toBeVisible();
    if (shot)
      await page.screenshot({
        path: info.outputPath(shot),
        animations: 'disabled',
      });
    await page.mouse.up();
  };
  const bounds = (await canvas.boundingBox())!;
  await drag(
    '@kerfjs/ui:text',
    {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    },
    'KF-78MHM8-dragging-1440.png',
  );
  await expect(page.getByText('2 nodes · valid')).toBeVisible();
  // The added node is selected; its props show in the Inspector.
  await expect(page.locator('[data-workbench-rail="right"]')).toContainText(
    'Text',
  );
  const added = canvas.locator('[data-kerf-node]').nth(1);
  const box = (await added.boundingBox())!;
  await drag(
    '@kerfjs/ui:button',
    {
      x: box.x + box.width / 2,
      y: box.y + box.height - 2,
    },
    'KF-Y4GHQV-palette-after-1440.png',
  );
  await expect(page.getByText('autosaved · 3 nodes · valid')).toBeVisible();
  await expect(canvas.getByRole('button')).toBeVisible();
  await page.screenshot({
    path: info.outputPath('KF-78MHM8-dropped-1440.png'),
    animations: 'disabled',
  });
  // KF-HNNWN9: a dropped Select starts with placeholder choices, so it renders
  // and the document stays valid.
  await drag('@kerfjs/ui:select', {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height - 24,
  });
  await expect(page.getByText('autosaved · 4 nodes · valid')).toBeVisible();
  await expect(canvas.getByText('Choice 1').first()).toBeVisible();
  // KF-Y4GHQV: moving a node on the canvas names it, dims its place, and
  // captions where it lands; letting go clears all three.
  const moved = (await canvas.getByRole('button').boundingBox())!;
  const first = (await added.boundingBox())!;
  await page.mouse.move(moved.x + moved.width / 2, moved.y + moved.height / 2);
  await page.mouse.down();
  await page.mouse.move(first.x + 20, first.y + 2, { steps: 8 });
  await expect(canvas.locator('.kui-editor__drag-source')).toBeVisible();
  await expect(page.locator('.kui-editor__drag-chip')).toContainText('Button');
  await expect(canvas.locator('.kui-editor__drop-caption')).toContainText(
    'Before Text',
  );
  await page.screenshot({
    path: info.outputPath('KF-Y4GHQV-canvas-move-1440.png'),
    animations: 'disabled',
  });
  await page.mouse.up();
  for (const part of ['drag-chip', 'drag-source', 'drop-caption'])
    await expect(page.locator(`.kui-editor__${part}`)).toBeHidden();
});

// KF-5QXNWS: the Inspector's title and tab strip stay pinned under its
// toolbar while a long Properties form scrolls.
for (const width of [1440, 900]) {
  test(`pins the Inspector's tabs while its form scrolls at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 700 });
    await page
      .locator(`[data-editor-canvas] [data-kerf-node="${COMPOSE}"]`)
      .click();
    const rail = page.locator('[data-workbench-rail="right"]');
    const properties = rail.getByRole('tab', { name: 'Properties' });
    await expect(properties).toBeInViewport();
    // Scroll the form to its end.
    await rail.locator('[data-editor-prop]').last().scrollIntoViewIfNeeded();
    await expect(properties).toBeInViewport();
    await expect(rail.getByText('composeButton · Button')).toBeInViewport();
    await page.screenshot({
      path: info.outputPath(`KF-5QXNWS-inspector-scrolled-${width}.png`),
      animations: 'disabled',
    });
  });
}

// KF-FGD8B3: a component whose required zones started empty (a Workbench's
// main) renders as added, with editable placeholders.
test('renders a Workbench chosen as the root with its placeholders', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await area(page, 'Outline');
  await page.locator('[data-action="editor-select-node"]').first().click();
  await area(page, 'Children');
  await page.locator('[data-editor-root="component"]').click();
  await page.getByRole('option', { name: 'Workbench', exact: true }).click();
  await page.getByRole('button', { name: 'Replace' }).click();
  const canvas = page.locator('[data-editor-canvas]');
  await expect(canvas).not.toContainText('cannot render');
  await expect(canvas).toContainText('Main');
  await expect(page.getByText(/· valid$/)).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-fgd8b3-workbench-root-1440.png'),
    animations: 'disabled',
  });
});

// KF-Z9S029: an object prop edits in a form from its type's fields, pushed
// in the Inspector for a single step of at most 10 fields and in a dialog
// for more.
async function workbenchRoot(page: Page) {
  await newDocument(page);
  await area(page, 'Outline');
  await page.locator('[data-action="editor-select-node"]').first().click();
  await area(page, 'Children');
  await page.locator('[data-editor-root="component"]').click();
  await page.getByRole('option', { name: 'Workbench', exact: true }).click();
  await page.getByRole('button', { name: 'Replace' }).click();
  await area(page, 'Properties');
}

for (const width of [1440, 900]) {
  test(`edits a Workbench's mainFooterList in the pushed Inspector view at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await workbenchRoot(page);
    await page
      .getByRole('button', { name: 'Configure main footer list' })
      .click();
    const stack = page.locator('#editor-inspector-stack');
    await expect(stack.getByText('Main footer list').first()).toBeVisible();
    const align = page.locator(
      `[data-editor-field='{"prop":"mainFooterList","path":["hAlign"]}']`,
    );
    await align.click();
    await page.getByRole('option', { name: 'center', exact: true }).click();
    // The canvas stays visible beside the form and updates live.
    await expect(page.locator('[data-editor-canvas]')).toBeVisible();
    await page.mouse.move(1, 1);
    await page.screenshot({
      path: info.outputPath(`kf-z9s029-subview-${width}.png`),
      animations: 'disabled',
    });
    await stack.getByRole('button', { name: 'Back' }).click();
    await expect(
      page.getByRole('button', { name: 'Configure main footer list' }),
    ).toContainText('1 field set');
  });
}

test('edits a Workbench mainPane of more than 10 fields in a dialog', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await workbenchRoot(page);
  await page.getByRole('button', { name: 'Configure main pane' }).click();
  const dialog = page.locator('#editor-field-dialog');
  await expect(dialog).toBeVisible();
  const dividers = dialog.locator(
    `[data-editor-field='{"prop":"mainPane","path":["chromeDividers"]}']`,
  );
  await dividers.click();
  await page.getByRole('option', { name: 'always', exact: true }).click();
  await expect(dividers).toHaveAttribute('value', 'always');
  await dialog.getByRole('button', { name: 'Configure tint' }).click();
  await expect(
    dialog.locator(
      `[data-editor-field='{"prop":"mainPane","path":["tint","scheme"]}']`,
    ),
  ).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-z9s029-dialog-nested-1440.png'),
    animations: 'disabled',
  });
  await dialog.getByRole('button', { name: 'Back' }).click();
  await expect(dividers).toBeVisible();
  await page.screenshot({
    path: info.outputPath('kf-z9s029-dialog-1440.png'),
    animations: 'disabled',
  });
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Configure main pane' }),
  ).toContainText('1 field set');
});

// KF-A9ZHGW: a set of enum values edits inline in a CheckboxGroup, a list
// of strings in a TagField.
test('edits a Pane’s separators and a TagField’s tags inline', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
  await area(page, 'Outline');
  await page
    .locator(`[data-action="editor-select-node"][data-item-id="${PANE}"]`)
    .click();
  const separators = page.locator('[data-editor-prop="separators"]');
  await separators.getByLabel('block-end').check();
  await expect(
    page.locator(`[data-editor-canvas] [data-kerf-node="${PANE}"]`),
  ).toHaveAttribute('data-separator-block-end', /.*/);
  await separators.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-a9zhgw-separators-1440.png'),
    animations: 'disabled',
  });

  await area(page, 'Children');
  await page.locator('[data-editor-add="component"]').click();
  await page.getByRole('option', { name: 'TagField', exact: true }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await area(page, 'Properties');
  const tags = page.locator('[data-editor-prop="tags"]');
  const editor = tags.locator('[data-tag-field-editor]');
  // Type after the seeded chips, at the editor's end.
  await editor.focus();
  await page.keyboard.press('End');
  await page.keyboard.type('urgent');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-editor-canvas]')).toContainText('urgent');
  await expect(tags).toContainText('urgent');
  await tags.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-a9zhgw-tags-1440.png'),
    animations: 'disabled',
  });
});

// KF-VYRDDQ: icon data picks a Lucide icon in a searchable dialog.
test('picks a LucideIcon’s icon from the icon picker', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
  await area(page, 'Outline');
  await page
    .locator(`[data-action="editor-select-node"][data-item-id="${PANE}"]`)
    .click();
  await area(page, 'Children');
  await page.locator('[data-editor-add="component"]').click();
  await page.getByRole('option', { name: 'LucideIcon', exact: true }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await area(page, 'Properties');
  // KF-PE0PTT: its text color field suggests a text color builder.
  const color = page.locator('[data-editor-prop="color"]');
  await expect(color.getByRole('textbox')).toHaveAttribute(
    'placeholder',
    'uiColor("success-on-quiet")',
  );
  await color.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-pe0ptt-color-field-1440.png'),
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Choose icon' }).click();
  const dialog = page.locator('#editor-icon-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/Showing \d+ of \d+ icons/);
  // KF-GQHRC0: the search has focus, so typing searches at once.
  await expect(dialog.locator('[data-editor-icon-search]')).toBeFocused();
  await page.keyboard.type('star');
  await expect(dialog.locator('[data-editor-icon="star"]')).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-vyrddq-icon-picker-1440.png'),
    animations: 'disabled',
  });
  await dialog.locator('[data-editor-icon="star"]').click();
  await expect(dialog).toBeHidden();
  // The canvas draws the same glyph the Inspector row shows.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const glyph = document.querySelector(
          '[data-editor-icon-place] svg',
        )!.innerHTML;
        return [...document.querySelectorAll('[data-editor-canvas] svg')].some(
          (svg) => svg.innerHTML === glyph,
        );
      }),
    )
    .toBe(true);
  await expect(page.getByRole('button', { name: 'Choose icon' })).toContainText(
    'star',
  );
  await page.screenshot({
    path: info.outputPath('kf-vyrddq-icon-row-1440.png'),
    animations: 'disabled',
  });
});

// KF-CY1D5W: a list of objects or union items edits item by item.
async function addToPane(page: Page, name: string) {
  const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
  await area(page, 'Outline');
  await page
    .locator(`[data-action="editor-select-node"][data-item-id="${PANE}"]`)
    .click();
  await area(page, 'Children');
  await page.locator('[data-editor-add="component"]').click();
  await page.getByRole('option', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await area(page, 'Properties');
}

test('edits a Select’s choices in the list editor', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await addToPane(page, 'Select');
  await page.getByRole('button', { name: 'Configure choices' }).click();
  const dialog = page.locator('#editor-field-dialog');
  await expect(dialog).toBeVisible();
  const rows = dialog.locator('[data-component="list-action-row"]');
  await expect(rows).toHaveCount(3);
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(3)).toContainText('Choice 4');
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-cy1d5w-choices-1440.png'),
    animations: 'disabled',
  });
  // Choose a row: its form opens in the dialog; Back returns to the list.
  await rows
    .nth(1)
    .getByRole('button', { name: 'Choice 2', exact: true })
    .click();
  const label = dialog
    .locator(`[data-editor-field='{"prop":"choices","path":[1,"label"]}']`)
    .getByRole('textbox');
  await label.fill('Second');
  await label.press('Enter');
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-cy1d5w-choice-form-1440.png'),
    animations: 'disabled',
  });
  await dialog.getByRole('button', { name: 'Back' }).click();
  await expect(rows.nth(1)).toContainText('Second');
  await dialog.getByRole('button', { name: 'Remove Choice 1' }).click();
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText('Second');
  // Drag the last row above the first.
  await rows.nth(2).dragTo(rows.first(), { targetPosition: { x: 20, y: 4 } });
  await expect(rows.first()).toContainText('Choice 4');
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('[data-editor-canvas]')).toBeVisible();
});

test('adds a divider to a PopupMenu’s items from the Add menu', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await addToPane(page, 'PopupMenu');
  await page.getByRole('button', { name: 'Configure items' }).click();
  const dialog = page.locator('#editor-field-dialog');
  const rows = dialog.locator('[data-component="list-action-row"]');
  await expect(rows).toHaveCount(3);
  await dialog.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menuitem', { name: 'Divider' }).click();
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(3)).toContainText('Divider');
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-cy1d5w-popup-items-1440.png'),
    animations: 'disabled',
  });
});

// KF-3CKTKN: a union of scalars or a number enum picks a typed value.
test('sets a LucideIcon’s size from a keyword, then a number', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await addToPane(page, 'LucideIcon');
  const size = page.locator(
    '[data-editor-prop="size"][data-editor-kind="choice"]',
  );
  await size.click();
  await page.getByRole('option', { name: 'Number…' }).click();
  const number = page
    .locator('[data-editor-prop="size"][data-editor-kind="number"]')
    .getByRole('spinbutton');
  await number.fill('40');
  await number.press('Enter');
  const icon = page.locator('[data-editor-canvas] svg').first();
  await expect
    .poll(async () => (await icon.boundingBox())?.width ?? 0)
    .toBeGreaterThan(30);
  await size.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-3cktkn-icon-size-1440.png'),
    animations: 'disabled',
  });
});

// KF-907BXY: a Workbench rail picks its kind, then edits that kind's form.
test('gives a Workbench a static left rail', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await workbenchRoot(page);
  const kind = page.locator(
    '[data-editor-prop="leftRail"][data-editor-kind="choice"]',
  );
  await kind.click();
  await page.getByRole('option', { name: 'Static panel…' }).click();
  const canvas = page.locator('[data-editor-canvas]');
  await expect(canvas).toContainText('leftRailContent slot');
  await page.getByRole('button', { name: 'Configure left rail' }).click();
  const label = page
    .locator(`[data-editor-field='{"prop":"leftRail","path":["label"]}']`)
    .getByRole('textbox');
  await label.fill('Folders');
  await label.press('Enter');
  await expect(canvas.locator('[data-workbench-rail="left"]')).toHaveAttribute(
    'aria-label',
    'Folders',
  );
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-907bxy-workbench-left-rail-1440.png'),
    animations: 'disabled',
  });
});

// KF-EZN7H2: a nested object in a panel (a union of static and navigation
// panels) opens its own form, and its fields write inside the panel.
test('configures the toolbar of a Workbench’s static bottom drawer', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await workbenchRoot(page);
  await page
    .locator('[data-editor-prop="bottomDrawer"][data-editor-kind="choice"]')
    .click();
  await page.getByRole('option', { name: 'Static panel…' }).click();
  await page.getByRole('button', { name: 'Configure bottom drawer' }).click();
  await page.getByRole('button', { name: 'Configure toolbar' }).click();
  const label = page
    .locator(
      `[data-editor-field='{"prop":"bottomDrawer","path":["toolbar","label"]}']`,
    )
    .getByRole('textbox');
  await label.fill('Console tools');
  await label.press('Enter');
  const root = (await exported(page)) as {
    props: { bottomDrawer: unknown };
  };
  expect(root.props.bottomDrawer).toMatchObject({
    toolbar: { label: 'Console tools' },
  });
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-ezn7h2-bottom-drawer-toolbar-1440.png'),
    animations: 'disabled',
  });
});

// KF-K3EKKF: in a narrow column an empty Toolbar's zone placeholders stay
// inside their zones, so each is its own drop target.
test('keeps an empty Toolbar’s zones apart in a narrow SplitView column', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'SplitView', () => emptySpot(page));
  await select(page, /^SplitView/);
  await embedIn(page, 'SizedRegion');
  await select(page, /^Text/);
  await embedInOther(page, 'List');
  await embedInOther(page, 'Pane');
  await addChild(page, 'Toolbar', 'header');
  const boxes = await canvas(page)
    .locator('[data-editor-empty]')
    .evaluateAll((spots) =>
      spots.map((spot) => {
        const own = spot.getBoundingClientRect();
        const zone = spot.parentElement!.getBoundingClientRect();
        return {
          left: own.left,
          right: own.right,
          zoneLeft: zone.left,
          zoneRight: zone.right,
        };
      }),
    );
  expect(boxes).toHaveLength(3);
  for (const [index, box] of boxes.entries()) {
    // Each placeholder fits its zone, and the next one starts after it.
    expect(box.left).toBeGreaterThanOrEqual(box.zoneLeft - 0.5);
    expect(box.right).toBeLessThanOrEqual(box.zoneRight + 0.5);
    const next = boxes[index + 1];
    if (next) expect(next.left).toBeGreaterThanOrEqual(box.right);
  }
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-k3ekkf-narrow-toolbar-zones-1440.png'),
    animations: 'disabled',
  });
  await dragComponent(page, 'ToolbarText', () => zoneSpot(page, 'Leading'));
  const root = (await exported(page)) as {
    zones: { content: [{ zones: { children: [unknown] } }] };
  };
  const splitView = root.zones.content[0].zones.children[0] as {
    zones: { list: [{ zones: { header: [{ zones: unknown }] } }] };
  };
  expect(splitView.zones.list[0].zones.header[0].zones).toEqual({
    leading: [{ type: '@kerfjs/ui:toolbar-text', props: expect.anything() }],
  });
});

// KF-PD6QC5: a rail's content and a toolbar's title take nodes.
test('composes a Workbench’s left rail and toolbar title from nodes', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await workbenchRoot(page);
  await page
    .locator('[data-editor-prop="leftRail"][data-editor-kind="choice"]')
    .click();
  await page.getByRole('option', { name: 'Static panel…' }).click();
  await page.getByRole('button', { name: 'Configure main toolbar' }).click();
  const label = page
    .locator(`[data-editor-field='{"prop":"mainToolbar","path":["label"]}']`)
    .getByRole('textbox');
  await label.fill('Main');
  await label.press('Enter');
  await page.getByRole('button', { name: 'Done' }).click();

  const add = async (zone: string, component: string) => {
    await area(page, 'Outline');
    await page.locator('[data-action="editor-select-node"]').first().click();
    await area(page, 'Children');
    await page.locator('[data-editor-add="zone"]').click();
    await page.getByRole('option', { name: zone, exact: true }).click();
    await page.locator('[data-editor-add="component"]').click();
    await page.getByRole('option', { name: component, exact: true }).click();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
  };
  await add('leftRail › content', 'List');
  await add('mainToolbar › title', 'ToolbarText');

  const canvas = page.locator('[data-editor-canvas]');
  // A new List has no rows yet, so it is present but takes no space.
  await expect(
    canvas.locator('[data-workbench-rail="left"] [data-component="list"]'),
  ).toHaveCount(1);
  await expect(canvas.locator('[data-component="toolbar-text"]')).toBeVisible();
  await expect(page.getByText(/· valid$/)).toBeVisible();
  await area(page, 'Outline');
  await expect(page.getByText('leftRail › content').first()).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-pd6qc5-workbench-rail-and-title-1440.png'),
    animations: 'disabled',
  });
});

// KF-24G2KV: a Chip's children take text or nodes, as other content does.
test('puts a Badge beside a Chip’s text', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await addToPane(page, 'Chip');
  await area(page, 'Children');
  await page.locator('[data-editor-add="zone"]').click();
  await page.getByRole('option', { name: 'children', exact: true }).click();
  await page.locator('[data-editor-add="component"]').click();
  await page.getByRole('option', { name: 'Badge', exact: true }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const chip = page.locator('[data-editor-canvas] [data-component="chip"]');
  await expect(chip.locator('[data-component="badge"]')).toBeVisible();
  await expect(page.getByText(/· valid$/)).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-24g2kv-chip-badge-1440.png'),
    animations: 'disabled',
  });
});

// KF-H3CB2P: a function prop becomes an app-supplied, prop-typed param.
test('promotes a Select’s renderSelected to an app-supplied param', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await addToPane(page, 'Select');
  // KF-D85GY0: an app-supplied prop promotes from its own row.
  await page.locator('[data-editor-promote-prop="renderSelected"]').click();
  await expect(page.getByText(/· valid$/)).toBeVisible();
  // The placeholder renders the chosen label.
  await expect(
    page.locator('[data-editor-canvas] [data-component="select"]').first(),
  ).toContainText('Choice 1');
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-h3cb2p-render-selected-1440.png'),
    animations: 'disabled',
  });
});

// KF-V9V2B6: a list prop becomes a prop-typed param that keeps its value.
test('promotes a Select’s choices to a param that keeps the list', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await addToPane(page, 'Select');
  await page.locator('[data-editor-promote]').click();
  await page.getByRole('option', { name: 'Choices', exact: true }).click();
  await page.getByRole('button', { name: 'Promote', exact: true }).click();
  await expect(page.getByText(/· valid$/)).toBeVisible();
  await expect(
    page.locator('[data-editor-canvas] [data-component="select"]').first(),
  ).toContainText('Choice 1');
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-v9v2b6-promoted-choices-1440.png'),
    animations: 'disabled',
  });
});

// KF-1ZSW5J: a NavStack view's seeded slot is named in its form, and a node
// added from there takes the slot's place.
test('fills a NavStack view’s slot-seeded content from its form', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'NavStack', () => emptySpot(page));
  await select(page, /^NavStack/);
  await page.getByRole('button', { name: 'Configure views' }).click();
  const dialog = page.locator('dialog[open]');
  await dialog.getByText('View 1', { exact: true }).click();
  const row = page.locator('[data-editor-content-add="views.0.content"]');
  await expect(row).toContainText(/Slot · view1Content/);
  // KF-3N67HR: the slot's outline row and the node that replaces it name
  // the same place.
  const place = page.locator('[data-action="editor-select-node"]', {
    hasText: 'views › 1 › content',
  });
  await expect(place).toContainText('view1Content');
  await page.screenshot({
    path: test.info().outputPath('kf-1zsw5j-view-form-1440.png'),
  });
  await row.click();
  await expect(dialog).toHaveCount(0);
  await addChild(page, 'List');
  await area(page, 'Outline');
  await expect(place).toContainText('List');
  await select(page, /^NavStack/);
  await page.getByRole('button', { name: 'Configure views' }).click();
  await dialog.getByText('View 1', { exact: true }).click();
  await expect(
    page.locator('[data-editor-content-node="views.0.content"]'),
  ).toContainText('List');
});

// KF-HGG7MJ: a selected TabNavigator's tab content is a drop target on the
// canvas, named after the item slot it replaces.
test('drops a component into a tab’s content from the canvas', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await area(page, 'Outline');
  await page.locator('[data-action="editor-select-node"]').first().click();
  await area(page, 'Children');
  await page.locator('[data-editor-root="component"]').click();
  await page.getByRole('option', { name: 'TabNavigator', exact: true }).click();
  await page.getByRole('button', { name: 'Replace' }).click();
  const spot = page
    .locator('[data-editor-canvas] [data-editor-empty]')
    .filter({ hasText: 'tab1Content slot — drop here' });
  await expect(spot).toBeVisible();
  await dragComponent(page, 'ContentItem', () => spot);
  await expect(spot).toHaveCount(0);
  const document = (await exported(page)) as {
    props: { tabs: { content?: unknown }[] };
    zones: Record<string, unknown[]>;
  };
  expect(document.zones['tabs.0.content']).toEqual([
    { type: '@kerfjs/ui:content-item' },
  ]);
  expect(document.props.tabs[0]).not.toHaveProperty('content');
  expect(document.props.tabs[1]).toHaveProperty('content', {
    $slot: 'tab2Content',
  });
});

// KF-6MGYSG: a whole-screen layout placed inside the root Pane shows as it
// would in an app, collapsed to its bar, until its hint's fix embeds it in a
// SizedRegion; then its content and drop targets show.
// KF-AMEZB3: New's root Pane fills, so a layout dropped in its content has a
// height and no KUI-H001 hint.
test('gives a TabNavigator in a filled root Pane a height, with no hint', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'TabNavigator', () => emptySpot(page));
  const scenes = page.locator(
    '[data-editor-canvas] .kui-tab-scaffold[data-kerf-node] .kui-tab-scaffold__scenes',
  );
  await expect
    .poll(async () => (await scenes.boundingBox())!.height)
    .toBeGreaterThan(200);
  await expect(page.locator('[data-editor-hints]')).toHaveCount(0);
});

test('embeds a nested TabNavigator from its hint, giving it a height', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await contentHeightDocument(page);
  await dragComponent(page, 'TabNavigator', () => emptySpot(page));
  const navigator = page.locator(
    '[data-editor-canvas] .kui-tab-scaffold[data-kerf-node]',
  );
  const scenes = navigator.locator('.kui-tab-scaffold__scenes');
  expect((await scenes.boundingBox())!.height).toBeLessThan(5);
  await area(page, 'Problems');
  await page
    .locator('[data-editor-hints]')
    .getByRole('button', { name: 'Embed in SizedRegion' })
    .click();
  await expect(page.locator('[data-editor-hints]')).toHaveCount(0);
  await expect
    .poll(async () => (await scenes.boundingBox())!.height)
    .toBeGreaterThan(200);
  await select(page, /^TabNavigator/);
  const spot = page
    .locator('[data-editor-canvas] [data-editor-empty]')
    .filter({ hasText: 'tab1Content slot — drop here' });
  await expect(spot).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('kf-6mgysg-embedded-tab-navigator-1440.png'),
  });
  await dragComponent(page, 'ContentItem', () => spot);
  await expect(spot).toHaveCount(0);
  const document = (await exported(page)) as {
    zones: {
      content: {
        type: string;
        props: unknown;
        zones: { children: { zones: Record<string, unknown[]> }[] };
      }[];
    };
  };
  expect(document.zones.content[0]!.type).toBe('@kerfjs/ui:sized-region');
  expect(document.zones.content[0]!.props).toEqual({
    minHeight: { $css: 'rem(20)' },
  });
  expect(
    document.zones.content[0]!.zones.children[0]!.zones['tabs.0.content'],
  ).toEqual([{ type: '@kerfjs/ui:content-item' }]);
  await expect(
    navigator.locator('.kui-content-item[data-kerf-node]'),
  ).toBeVisible();
});

// KF-6MGYSG: Embed in, in the Inspector's Flow area, with Other… for any
// container.
test('embeds the selected node from the Flow area’s Embed in section', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'Button', () => emptySpot(page));
  await select(page, /^Button/);
  await area(page, 'Flow');
  const section = page.locator('[data-editor-embed-section]');
  for (const name of ['SizedRegion', 'ListInsetControl', 'ListInsetText'])
    await expect(
      section.locator('[data-editor-embed]', { hasText: name }),
    ).toBeVisible();
  // The Inspector's title keeps its whole width.
  const title = page
    .locator('#editor-inspector-stack .kui-toolbar-text')
    .first();
  expect(await title.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: test.info().outputPath('kf-6mgysg-embed-section-1440.png'),
  });
  await section.getByText('Other…').click();
  const dialog = page.locator('#editor-embed-dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.type('row');
  await expect(
    dialog.locator('[data-editor-embed="@kerfjs/ui:row"]'),
  ).toBeVisible();
  await expect(
    dialog.locator('[data-editor-embed="@kerfjs/ui:list"]'),
  ).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath('kf-6mgysg-embed-other-1440.png'),
  });
  await dialog.locator('[data-editor-embed="@kerfjs/ui:row"]').click();
  await expect(dialog).toBeHidden();
  const document = (await exported(page)) as {
    zones: {
      content: { type: string; zones: Record<string, { type: string }[]> }[];
    };
  };
  expect(document.zones.content[0]!.type).toBe('@kerfjs/ui:row');
  expect(
    document.zones.content[0]!.zones.children!.map(({ type }) => type),
  ).toEqual(['@kerfjs/ui:button']);
});

// KF-84CCD1: Embed in on the root makes the container the new root, holding
// the whole old tree; a Pane that becomes the root fills.
test('embeds the root in a new root Pane', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'Button', () => emptySpot(page));
  await select(page, /^Pane/);
  await area(page, 'Flow');
  const section = page.locator('[data-editor-embed-section]');
  await expect(section).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('kf-84ccd1-root-embed-section-1440.png'),
  });
  await embedInOther(page, 'Pane');
  await expect(
    canvas(page).locator('.kui-button', { hasText: 'Button' }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('kf-84ccd1-root-embedded-1440.png'),
  });
  // The narrow Inspector offers it too, for the new root.
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole('button', { name: 'Show Inspector' }).click();
  await area(page, 'Flow');
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath('kf-84ccd1-root-embed-section-390.png'),
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  const document = (await exported(page)) as {
    type: string;
    props?: Record<string, unknown>;
    zones: {
      content: {
        type: string;
        zones: Record<string, { type: string }[]>;
      }[];
    };
  };
  expect(document.type).toBe('@kerfjs/ui:pane');
  expect(document.props).toEqual({ fill: true });
  expect(document.zones.content.map(({ type }) => type)).toEqual([
    '@kerfjs/ui:pane',
  ]);
  expect(
    document.zones.content[0]!.zones.content!.map(({ type }) => type),
  ).toEqual(['@kerfjs/ui:button']);
});

// KF-JV7XW1: a right-click on an Outline row or a canvas element selects its
// node and opens the node context menu, with Embed in and the node commands.
test('embeds a node from the Outline row’s context menu', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'Button', () => emptySpot(page));
  await area(page, 'Outline');
  await outlineRow(page, /^Button/).click({ button: 'right' });
  const menu = page.getByRole('menu', { name: 'Node actions' });
  await expect(menu).toBeVisible();
  // Opening it selected the row's node.
  await expect(outlineRow(page, /^Button/)).toHaveAttribute(
    'aria-selected',
    'true',
  );
  for (const name of ['Move up', 'Move down'])
    await expect(menu.getByRole('menuitem', { name })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  await menu.getByRole('menuitem', { name: 'Embed in' }).hover();
  const embedIn = page.getByRole('menu', { name: 'Embed in' });
  await expect(
    embedIn.getByRole('menuitem', { name: 'SizedRegion' }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('kf-jv7xw1-outline-menu-1440.png'),
  });
  await embedIn.getByRole('menuitem', { name: 'SizedRegion' }).click();
  await expect(menu).toBeHidden();
  await expect(outlineRow(page, /^SizedRegion/)).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const document = (await exported(page)) as {
    zones: {
      content: { type: string; zones: Record<string, { type: string }[]> }[];
    };
  };
  expect(document.zones.content[0]!.type).toBe('@kerfjs/ui:sized-region');
  expect(
    document.zones.content[0]!.zones.children!.map(({ type }) => type),
  ).toEqual(['@kerfjs/ui:button']);
});

test('embeds a canvas element from its context menu’s Other…', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'Button', () => emptySpot(page));
  const button = canvas(page).locator('.kui-button', { hasText: 'Button' });
  await button.click({ button: 'right' });
  const menu = page.getByRole('menu', { name: 'Node actions' });
  await expect(menu).toBeVisible();
  // The menu opens at the pointer, over the canvas element.
  const at = (await button.boundingBox())!;
  const box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(at.x);
  expect(box.x).toBeLessThan(at.x + at.width);
  await page.screenshot({
    path: test.info().outputPath('kf-jv7xw1-canvas-menu-1440.png'),
  });
  await menu.getByRole('menuitem', { name: 'Embed in' }).hover();
  await page
    .getByRole('menu', { name: 'Embed in' })
    .getByRole('menuitem', { name: 'Other…' })
    .click();
  const dialog = page.locator('#editor-embed-dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.type('row');
  await dialog.locator('[data-editor-embed="@kerfjs/ui:row"]').click();
  await expect(dialog).toBeHidden();
  const document = (await exported(page)) as {
    zones: {
      content: { type: string; zones: Record<string, { type: string }[]> }[];
    };
  };
  expect(document.zones.content[0]!.type).toBe('@kerfjs/ui:row');
  expect(
    document.zones.content[0]!.zones.children!.map(({ type }) => type),
  ).toEqual(['@kerfjs/ui:button']);
  // A left click still only selects.
  await button.click();
  await expect(menu).toBeHidden();
});

test('opens the node context menu from the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'Button', () => emptySpot(page));
  await area(page, 'Outline');
  const row = outlineRow(page, /^Button/);
  await row.click();
  await row.focus();
  await page.keyboard.press('Shift+F10');
  const menu = page.getByRole('menu', { name: 'Node actions' });
  await expect(menu).toBeVisible();
  // Below the row it opened from.
  const rowBox = (await row.boundingBox())!;
  expect((await menu.boundingBox())!.y).toBeGreaterThanOrEqual(
    rowBox.y + rowBox.height - 1,
  );
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  // Focus goes back to the row the menu opened from.
  await expect(row).toBeFocused();
  // Delete from the menu removes the node, one undo step.
  await page.keyboard.press('Shift+F10');
  await menu.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(outlineRow(page, /^Button/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(outlineRow(page, /^Button/)).toHaveCount(1);
});

test('shows the node context menu on the narrow canvas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'Button', () => emptySpot(page));
  await page.setViewportSize({ width: 390, height: 900 });
  const button = canvas(page).locator('.kui-button', { hasText: 'Button' });
  await button.click({ button: 'right' });
  const menu = page.getByRole('menu', { name: 'Node actions' });
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Embed in' }).hover();
  await expect(
    page
      .getByRole('menu', { name: 'Embed in' })
      .getByRole('menuitem', { name: 'Other…' }),
  ).toBeVisible();
  const fits = await page.evaluate(
    () =>
      globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth,
  );
  expect(fits).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('kf-jv7xw1-canvas-menu-390.png'),
  });
});

// KF-YZPBFH: the canvas shows the tab that holds the selected node, and
// rings it there; the document keeps the tab it opens on.
test('shows the tab that holds the selected node', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'TabNavigator', () => emptySpot(page));
  await select(page, /^TabNavigator/);
  await embedIn(page, 'SizedRegion');
  await select(page, /^TabNavigator/);
  const ring = page.locator('.kui-editor__selection');
  const scene = (index: number) =>
    page.locator('[data-editor-canvas] .kui-tab-scaffold__scene').nth(index);
  await expect(scene(0)).toHaveAttribute('data-active', 'true');
  // Tab 2 isn't the active one; adding to it selects the new node there.
  await addChild(page, 'ContentItem', 'tabs › 2 › content');
  await expect(scene(1)).toHaveAttribute('data-active', 'true');
  await expect(
    scene(1).locator('.kui-content-item[data-kerf-node]'),
  ).toBeVisible();
  await expect(ring).toBeVisible();
  const ringBox = (await ring.boundingBox())!;
  const itemBox = (await scene(1)
    .locator('.kui-content-item[data-kerf-node]')
    .boundingBox())!;
  expect(Math.abs(ringBox.y - itemBox.y)).toBeLessThan(6);
  await page.screenshot({
    path: test.info().outputPath('kf-yzpbfh-selected-tab-1440.png'),
  });
  await select(page, /^TabNavigator/);
  await expect(scene(0)).toHaveAttribute('data-active', 'true');
  const document = (await exported(page)) as {
    zones: {
      content: { zones: { children: { props: { active: string } }[] } }[];
    };
  };
  expect(document.zones.content[0].zones.children[0].props.active).toBe(
    'tab-1',
  );
});

// KF-ZC9EXM: a NavStack view below the top stays mounted but hidden under
// it; the selection ring hides rather than marking what the top view shows.
test('hides the selection ring for a node in a view below the top', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'NavStack', () => emptySpot(page));
  await select(page, /^NavStack/);
  await embedIn(page, 'SizedRegion');
  await select(page, /^NavStack/);
  const ring = page.locator('.kui-editor__selection');
  await expect(ring).toBeVisible();
  await addChild(page, 'ContentItem', 'views › 1 › content');
  await expect(page.locator('[data-editor-prop]').first()).toBeVisible();
  await expect(ring).toBeHidden();
  // A node in the top view is ringed.
  await select(page, /^NavStack/);
  await addChild(page, 'ContentItem', 'views › 3 › content');
  await expect(ring).toBeVisible();
});

// KF-63XR5K: a SizedRegion gives a nested layout its height on the canvas,
// as in an app; the canvas's own frame stays out of its way.
test('sizes a TabNavigator inside a SizedRegion as the region says', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await contentHeightDocument(page);
  await dragComponent(page, 'SizedRegion', () => emptySpot(page));
  await select(page, /^SizedRegion/);
  await page
    .locator('[data-editor-prop="minHeight"] input')
    .first()
    .fill('rem(25)');
  await page.keyboard.press('Enter');
  await dragComponent(page, 'TabNavigator', () => emptySpot(page));
  const region = page.locator(
    '[data-editor-canvas] .kui-sized-region[data-kerf-node]',
  );
  const navigator = region.locator('.kui-tab-scaffold[data-kerf-node]');
  await expect(navigator).toBeVisible();
  expect((await region.boundingBox())!.height).toBeCloseTo(400, 0);
  expect((await navigator.boundingBox())!.height).toBeCloseTo(400, 0);
  await expect(page.locator('.kui-editor__screen')).toHaveCount(0);
  const document = (await exported(page)) as {
    zones: { content: { props: unknown; zones: { children: unknown[] } }[] };
  };
  expect(document.zones.content[0]!.props).toEqual({
    minHeight: { $css: 'rem(25)' },
  });
  await page.screenshot({
    path: test.info().outputPath('kf-63xr5k-editor-sized-region-1440.png'),
  });
});

// KF-KQ72TW: a nested layout with no height is a hint, listed apart from
// problems; the document stays valid.
test('lists a hint for a TabNavigator nested in a Pane', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // A content-height Pane: a filled one gives the layout a height (KF-AMEZB3).
  await contentHeightDocument(page);
  await dragComponent(page, 'TabNavigator', () => emptySpot(page));
  await area(page, 'Problems');
  const hints = page.locator('[data-editor-hints]');
  await expect(hints).toContainText(
    'TabNavigator has no height of its own here and collapses to its bar; wrap it in SizedRegion',
  );
  await expect(page.getByText('valid', { exact: false }).first()).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('kf-kq72tw-hint-1440.png'),
  });
});

// KF-RMZ2NP: Show this view, in the Flow area, shows a NavStack's lower view
// on the canvas so its nodes can be seen and ringed.
test('shows a NavStack’s lower view from the Flow area', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'NavStack', () => emptySpot(page));
  await select(page, /^NavStack/);
  await embedIn(page, 'SizedRegion');
  await select(page, /^NavStack/);
  await addChild(page, 'ContentItem', 'views › 1 › content');
  const ring = page.locator('.kui-editor__selection');
  // Below the top view, it is out of sight.
  await expect(ring).toBeHidden();
  await select(page, /^NavStack/);
  await area(page, 'Flow');
  const rows = page.locator('[data-editor-show-view]');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(2)).toContainText('Top view');
  await rows.nth(0).click();
  await page.screenshot({
    path: test.info().outputPath('kf-rmz2np-flow-section-1440.png'),
  });
  const item = page.locator(
    '[data-editor-canvas] .kui-content-item[data-kerf-node]',
  );
  await expect(item).toBeVisible();
  await select(page, /^ContentItem/);
  await expect(ring).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('kf-rmz2np-shown-view-1440.png'),
  });
  // The top view again: the stack shows its last view, the item is hidden.
  await select(page, /^NavStack/);
  await area(page, 'Flow');
  await rows.nth(2).click();
  await expect(item).toBeHidden();
  const document = (await exported(page)) as {
    zones: {
      content: { zones: { children: { props: { views: unknown[] } }[] } }[];
    };
  };
  expect(
    document.zones.content[0]!.zones.children[0]!.props.views,
  ).toHaveLength(3);
});

// KF-NV427Y: in WebKit, an Inspector edit that inserted a row (the icon
// tile's Configure row) made the Inspector jump by that row's height about
// 300ms later, when the autosave rewrote the Preview status: a stale scroll
// anchoring adjustment. The Inspector's panes opt out of scroll anchoring.
test('keeps the Inspector still across the autosave after an edit inserts a row', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await newDocument(page);
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'ListActionRow', () => emptySpot(page));
  await select(page, /^ListActionRow/);
  const scroller = page
    .locator('#editor-inspector-stack .kui-pane__content')
    .filter({ visible: true });
  await expect(scroller).toHaveCSS('overflow-anchor', 'none');
  const trigger = page
    .locator('[data-editor-prop="iconTile"] .kui-select__trigger')
    .first();
  await trigger.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await expect(page.getByText(/ · saving…/)).toHaveCount(0);
  const before = await scroller.evaluate((el) => {
    // Record that this edit's autosave really ran: the status passes through
    // "saving…" and back.
    const status = document.body;
    const seen = { saving: false };
    new MutationObserver(() => {
      if (status.textContent?.includes(' · saving…')) seen.saving = true;
    }).observe(status, { subtree: true, childList: true, characterData: true });
    (window as unknown as { kfNv427y: typeof seen }).kfNv427y = seen;
    return el.scrollTop;
  });
  expect(before).toBeGreaterThan(0);
  await trigger.click();
  await page.getByRole('option', { name: 'Custom…', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Configure icon tile' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { kfNv427y: { saving: boolean } }).kfNv427y
            .saving,
      ),
    )
    .toBe(true);
  await expect(page.getByText(/ · saving…/)).toHaveCount(0);
  // One more frame so a late anchoring adjustment would have landed.
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => done(null))),
  );
  expect(await scroller.evaluate((el) => el.scrollTop)).toBe(before);
});

// KF-3QEZFB: a field inside an object prop (a ContentItem's media.src)
// promotes to a param and binds, beside the object's literal fields.
test('promotes and binds a field inside an object prop', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
  await dragComponent(page, 'Pane', () => emptySpot(page));
  await dragComponent(page, 'ContentItem', () => emptySpot(page));
  await select(page, /^ContentItem/);
  await page.getByRole('button', { name: 'Configure media' }).click();
  await setField(page, 'media', ['src'], 'skyline.svg');
  await setField(page, 'media', ['alt'], 'Skyline');
  // A larger object opens in the field dialog; a canvas dialog is not it.
  const form = page.locator('dialog[open]:not([data-editor-canvas] dialog)');
  await form.getByRole('button', { name: 'Promote to a param' }).click();
  // The field reads as bound, and its source names the param.
  await expect(form.getByText('Param nodeMediaSrc').first()).toBeVisible();
  await expect(form.locator('[data-editor-bind="field-source"]')).toContainText(
    'Param nodeMediaSrc',
  );
  await page.mouse.move(1, 1);
  await form.screenshot({
    path: info.outputPath('kf-3qezfb-bind-section-1440.png'),
    animations: 'disabled',
  });
  await form.getByText('Src', { exact: true }).first().scrollIntoViewIfNeeded();
  await form.screenshot({
    path: info.outputPath('kf-3qezfb-field-bound-1440.png'),
    animations: 'disabled',
  });
  await form.getByRole('button', { name: 'Done' }).click();
  await expect(form).toHaveCount(0);
  // The export keeps media's literal alt beside the bound src; the param
  // and its default are covered by the model's unit test.
  const tree = (await exported(page)) as {
    zones: { content: { zones: { content: { props: unknown }[] } }[] };
  };
  expect(tree.zones.content[0]!.zones.content[0]!.props).toEqual({
    media: { src: { $param: 'nodeMediaSrc' }, alt: 'Skyline' },
  });
  await expect(page.getByText(/ · \d+ nodes? · valid$/)).toBeVisible();
});
