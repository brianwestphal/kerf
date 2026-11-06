// KF-1CRGP1 / KF-YX6HMT: a list picks a row design per item. The Repeat section's Row
// designs turn a one-node `$each` template into an `$if` chain; the canvas
// renders each item's design, the outline lists both, and play mode runs a
// row of either design.
import { expect, type Page, test } from '@playwright/test';

import { area } from './areas.js';

const ids = {
  pane: '01JB8Z1M6Q8E1X9V4S7K2R3W0A',
  list: '01JB8Z1M6Q8E1X9V4S7K2R3W0B',
  row: '01JB8Z1M6Q8E1X9V4S7K2R3W0C',
};

/** A List of messages, some of them section headers. */
const document = {
  schema: 'kerf-ui-document/v1',
  name: 'Messages',
  catalogs: ['@kerfjs/ui'],
  params: {
    items: {
      type: {
        kind: 'array',
        items: {
          kind: 'object',
          props: [
            { name: 'id', type: { kind: 'string' }, required: true },
            { name: 'label', type: { kind: 'string' }, required: true },
            { name: 'header', type: { kind: 'boolean' }, required: false },
            { name: 'kind', type: { kind: 'string' }, required: false },
          ],
        },
      },
      default: [
        { id: 'today', label: 'Today', header: true, kind: 'section' },
        { id: 'lunch', label: 'Lunch with Sam', kind: 'message' },
        { id: 'standup', label: 'Standup notes', kind: 'note' },
      ],
    },
  },
  root: {
    id: ids.pane,
    type: '@kerfjs/ui:pane',
    zones: {
      content: [
        {
          id: ids.list,
          type: '@kerfjs/ui:list',
          props: { ariaLabel: 'Messages' },
          zones: {
            children: [
              {
                $each: { $param: 'items' },
                as: 'item',
                key: 'item.id',
                template: {
                  id: ids.row,
                  type: '@kerfjs/ui:list-item',
                  props: {
                    label: { $bind: 'item.label' },
                    action: { $action: 'open-message' },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
};

const openDocument = async (page: Page) => {
  await page.goto('/');
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: 'messages.kui.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(document)),
    });
  await expect(page.getByText(/· 3 nodes · valid$/)).toBeVisible();
};

const canvasRow = (page: Page, key: string) =>
  page.locator(`[data-editor-canvas] [data-key="${key}"]`);

/** Adds a ListHeader row design for the items whose `header` is true. */
const addHeaderDesign = async (page: Page) => {
  await page
    .locator(`[data-action="editor-select-node"][data-item-id="${ids.row}"]`)
    .click();
  await area(page, 'Flow');
  await page.locator('[data-editor-row-design="component"]').click();
  await page.getByRole('option', { name: 'ListHeader', exact: true }).click();
  await page.locator('[data-editor-row-design="condition"]').click();
  await page.getByRole('option', { name: 'item.header', exact: true }).click();
  await page.getByRole('button', { name: 'Add row design' }).click();
};

test('a list renders a row design per item', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await addHeaderDesign(page);
  await expect(page.getByText(/· 4 nodes · valid$/)).toBeVisible();
  // The header item takes the new design; the others keep the ListItem.
  await expect(canvasRow(page, 'today')).not.toHaveAttribute(
    'data-kerf-node',
    ids.row,
  );
  // The new design starts seeded; binding its label shows the item's.
  await expect(canvasRow(page, 'today')).toContainText('ListHeader');
  await area(page, 'Properties');
  await page.locator('[data-editor-bind="prop"]').click();
  await page.getByRole('option', { name: 'Label', exact: true }).click();
  await page.locator('[data-editor-bind="source"]').click();
  await page.getByRole('option', { name: 'item.label', exact: true }).click();
  await expect(canvasRow(page, 'today')).toContainText('Today');
  await area(page, 'Flow');
  await expect(canvasRow(page, 'lunch')).toHaveAttribute(
    'data-kerf-node',
    ids.row,
  );
  await expect(canvasRow(page, 'standup')).toHaveAttribute(
    'data-kerf-node',
    ids.row,
  );
  // The outline lists both designs with when each shows.
  const header = await canvasRow(page, 'today').getAttribute('data-kerf-node');
  await expect(
    page.locator(`[data-item-id="${header}"]`).getByText(/if item\.header/),
  ).toBeVisible();
  await expect(
    page.locator(`[data-item-id="${ids.row}"]`).getByText(/otherwise/),
  ).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-1crgp1-row-designs-1440.png'),
    animations: 'disabled',
  });

  // Clicking a row of the other design selects that design.
  await canvasRow(page, 'lunch').click();
  await expect(
    page.locator(
      `[data-action="editor-select-node"][data-item-id="${ids.row}"]`,
    ),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('combobox', { name: 'This design shows' }),
  ).toContainText('For every other item');

  // Play mode renders both designs and logs a row's action.
  await page.locator('[data-action="editor-play"]').click();
  const stage = page.frameLocator('[data-editor-play-frame]');
  await expect(stage.getByText('Today')).toBeVisible();
  await stage.getByText('Lunch with Sam').click();
  const log = page.locator('[data-action="editor-play-log"]');
  await expect(log).toHaveAttribute('aria-label', 'Action log, 1 new');
  await log.click();
  await expect(
    page
      .locator('[data-component="anchored-surface"]')
      .locator('[data-editor-play-log-entry]')
      .first(),
  ).toContainText('open-message');
});

test('removing a design leaves one template', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await addHeaderDesign(page);
  await expect(page.getByText(/· 4 nodes · valid$/)).toBeVisible();
  // KF-B0ZDE6: a chain says how to switch to kinds instead of offering it.
  await area(page, 'Flow');
  const note = page.locator('[data-editor-row-kind-note]');
  await expect(note).toHaveText(
    'Rows chosen by conditions; to pick them by kind, remove designs down to one.',
  );
  await expect(page.locator('[data-editor-control="row-kind"]')).toHaveCount(0);
  await note.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-b0zde6-row-kind-note-1440.png'),
    animations: 'disabled',
  });
  // The narrow Inspector shows the selected design's Row designs.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Show Inspector' }).click();
  await area(page, 'Flow');
  const remove = page.getByRole('button', { name: 'Remove row design' });
  await remove.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-1crgp1-row-designs-390.png'),
    animations: 'disabled',
  });
  await note.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath('kf-b0zde6-row-kind-note-390.png'),
    animations: 'disabled',
  });
  await remove.click();
  // One design again: the list can pick designs by kind, so no note.
  await expect(note).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByText(/· 3 nodes · valid$/)).toBeVisible();
  await expect(canvasRow(page, 'today')).toHaveAttribute(
    'data-kerf-node',
    ids.row,
  );
});

// KF-YX6HMT: the same list picks its designs by the item's kind.
test('a list keyed by kind renders each kind’s design', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await page
    .locator(`[data-action="editor-select-node"][data-item-id="${ids.row}"]`)
    .click();
  await area(page, 'Flow');
  // The Select's trigger: its root also holds the label and a hint, which
  // wraps differently per platform, so its center is not the trigger.
  await page
    .locator('[data-editor-control="row-kind"]')
    .getByRole('combobox')
    .click();
  await page.getByRole('option', { name: 'item.kind', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Pick the design by' }),
  ).toContainText('item.kind');
  await page.locator('[data-editor-kind="name"] input').fill('section');
  await page.locator('[data-editor-kind="component"]').click();
  await page.getByRole('option', { name: 'ListHeader', exact: true }).click();
  await page.getByRole('button', { name: 'Add kind' }).click();
  await expect(page.getByText(/· 4 nodes · valid$/)).toBeVisible();
  // The section item takes the new design; the others take `default`.
  await expect(canvasRow(page, 'today')).not.toHaveAttribute(
    'data-kerf-node',
    ids.row,
  );
  await expect(canvasRow(page, 'lunch')).toHaveAttribute(
    'data-kerf-node',
    ids.row,
  );
  await expect(canvasRow(page, 'standup')).toHaveAttribute(
    'data-kerf-node',
    ids.row,
  );
  const section = await canvasRow(page, 'today').getAttribute('data-kerf-node');
  await expect(
    page
      .locator(`[data-item-id="${section}"]`)
      .getByText(/item\.kind is section/),
  ).toBeAttached();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-yx6hmt-row-kinds-1440.png'),
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Show Inspector' }).click();
  await area(page, 'Flow');
  await page.getByRole('button', { name: 'Add kind' }).scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-yx6hmt-row-kinds-390.png'),
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 900 });

  // Play mode renders each kind's design and logs a default row's action.
  await page.locator('[data-action="editor-play"]').click();
  const stage = page.frameLocator('[data-editor-play-frame]');
  await stage.getByText('Lunch with Sam').click();
  const log = page.locator('[data-action="editor-play-log"]');
  await expect(log).toHaveAttribute('aria-label', 'Action log, 1 new');
});

// KF-STBQBG: a selected design moves earlier or later; the else stays last.
test('row designs reorder, the last one staying last', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await addHeaderDesign(page);
  const first = await canvasRow(page, 'today').getAttribute('data-kerf-node');
  // A second design from the selected one goes before the last, so the
  // header item still takes the first.
  await page.getByRole('button', { name: 'Add row design' }).click();
  await expect(page.getByText(/· 5 nodes · valid$/)).toBeVisible();
  await expect(canvasRow(page, 'today')).toHaveAttribute(
    'data-kerf-node',
    first!,
  );
  const earlier = page.getByRole('button', { name: 'Move design earlier' });
  const later = page.getByRole('button', { name: 'Move design later' });
  // The new design sits just before the else, so it cannot move later.
  await expect(later).toBeDisabled();
  await earlier.click();
  // Now first, it takes the header item.
  await expect(canvasRow(page, 'today')).not.toHaveAttribute(
    'data-kerf-node',
    first!,
  );
  await expect(earlier).toBeDisabled();
  await expect(later).toBeEnabled();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-stbqbg-row-designs-1440.png'),
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Show Inspector' }).click();
  await area(page, 'Flow');
  await later.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-stbqbg-row-designs-390.png'),
    animations: 'disabled',
  });
  await later.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(canvasRow(page, 'today')).toHaveAttribute(
    'data-kerf-node',
    first!,
  );
  // The else design has no move controls.
  await canvasRow(page, 'lunch').click();
  await area(page, 'Flow');
  await expect(earlier).toHaveCount(0);
  await expect(later).toHaveCount(0);
});
