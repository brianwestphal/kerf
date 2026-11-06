// KF-D9P3NP: Extract to document (row template phase 3, docs/26-ui-editor.md
// §3.7). A repeated row becomes a row document of its own through a Save
// As–style dialog; the list composes it through a `#view`, whose rows still
// render on the canvas, and the row document opens with Open document.
import { expect, type Page, test } from '@playwright/test';

import { area } from './areas.js';
import { canvas } from './build.js';

const API = '/__kerf-ui-editor/api/file';
const ROW = '01JC0V1EW0000000000000000R';

const list = {
  schema: 'kerf-ui-document/v1',
  name: 'Messages',
  catalogs: ['@kerfjs/ui'],
  params: {
    messages: {
      type: {
        kind: 'array',
        items: {
          kind: 'object',
          props: [
            { name: 'id', type: { kind: 'string' }, required: true },
            { name: 'subject', type: { kind: 'string' }, required: true },
          ],
        },
      },
      default: [
        { id: 'm1', subject: 'Quarterly report' },
        { id: 'm2', subject: 'Lunch on Friday' },
        { id: 'm3', subject: 'Design review notes' },
      ],
    },
  },
  root: {
    id: '01JC0V1EW0000000000000000S',
    type: '@kerfjs/ui:pane',
    props: { fill: true },
    zones: {
      content: [
        {
          id: '01JC0V1EW0000000000000000T',
          type: '@kerfjs/ui:list',
          props: { ariaLabel: 'Messages' },
          zones: {
            children: [
              {
                $each: { $param: 'messages' },
                as: 'message',
                key: 'message.id',
                template: {
                  id: ROW,
                  type: '@kerfjs/ui:list-item',
                  props: {
                    label: { $bind: 'message.subject' },
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

const url = (path: string) => `${API}?path=${encodeURIComponent(path)}`;

/** Saves the list in a folder of its own and opens it. */
async function openList(page: Page, name: string) {
  const folder = `.kerf-ui-editor/pw-extract/${name}-${Date.now()}`;
  const response = await page.request.put(url(`${folder}/messages.kui.json`), {
    headers: { 'X-Kerf-UI-Editor': '1', 'Content-Type': 'application/json' },
    data: JSON.stringify(list),
  });
  expect(response.ok()).toBe(true);
  await page.addInitScript((path) => {
    globalThis.localStorage.setItem('kerf-ui-editor:path', path);
  }, `${folder}/messages.kui.json`);
  await page.goto('/');
  await expect(canvas(page)).toContainText('Quarterly report');
  return folder;
}

const read = async (page: Page, path: string) => {
  const response = await page.request.get(url(path));
  return response.status() === 404
    ? undefined
    : JSON.parse(await response.text());
};
const rowOf = (document: typeof list) =>
  document.root.zones.content[0]!.zones.children[0]!.template;

/** Selects a row and opens the Extract dialog from the Flow area. */
async function openExtract(page: Page) {
  await canvas(page).getByText('Lunch on Friday').click();
  await area(page, 'Flow');
  await page.getByRole('button', { name: /New document/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Extract to Document' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('extracts a repeated row into a row document the list composes', async ({
  page,
}, info) => {
  const folder = await openList(page, info.project.name);
  const dialog = await openExtract(page);
  // Always asked, starting from a name beside the list.
  const path = dialog.getByRole('textbox', { name: 'Path' });
  await expect(path).toHaveValue(`${folder}/messages-list-item.kui.json`);
  await path.fill(`${folder}/message-row.kui.json`);
  await dialog.getByRole('button', { name: 'Extract' }).click();
  await expect(dialog).toBeHidden();

  // The canvas renders the composed rows; the Inspector shows the #view.
  await expect(canvas(page)).toContainText('Quarterly report');
  await expect(canvas(page)).toContainText('Design review notes');
  await expect(
    page.getByText('View ./message-row.kui.json').first(),
  ).toBeVisible();
  const written = await read(page, `${folder}/message-row.kui.json`);
  expect(written).toMatchObject({
    name: 'MessageRow',
    params: { subject: { type: { kind: 'string' } } },
    root: { id: ROW, props: { label: { $param: 'subject' } } },
  });
  await expect
    .poll(async () => rowOf(await read(page, `${folder}/messages.kui.json`)))
    .toMatchObject({
      type: '#view',
      src: './message-row.kui.json',
      props: { subject: { $bind: 'message.subject' } },
    });

  // One Undo restores the row in place; the row document stays. Redo
  // brings the #view back.
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect
    .poll(async () => rowOf(await read(page, `${folder}/messages.kui.json`)).id)
    .toBe(ROW);
  await expect(canvas(page)).toContainText('Quarterly report');
  expect(await read(page, `${folder}/message-row.kui.json`)).toBeDefined();
  await page.getByRole('button', { name: 'Redo' }).click();
  await canvas(page).getByText('Lunch on Friday').click();

  // Open document shows the row document; Back returns to the list.
  await page.locator('[data-action="editor-open-view"]').click();
  await expect(
    page.getByText(`${folder}/message-row.kui.json · saved`),
  ).toBeVisible();
  await expect(canvas(page)).not.toContainText('Quarterly report');
  await page.getByRole('button', { name: 'Back to messages.kui.json' }).click();
  await expect(canvas(page)).toContainText('Quarterly report');
});

for (const width of [1440, 390]) {
  test(`captures the Extract dialog and the composed result at ${width}`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'chromium', 'visual QA capture');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    await openList(page, `capture-${width}`);
    if (width < 600) {
      await canvas(page).getByText('Lunch on Friday').click();
      await page
        .getByRole('button', { name: 'Show Inspector' })
        .first()
        .click();
    } else await canvas(page).getByText('Lunch on Friday').click();
    await area(page, 'Flow');
    await page.screenshot({
      path: info.outputPath(`kf-d9p3np-flow-${width}.png`),
    });
    await page.getByRole('button', { name: /New document/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Extract to Document' });
    await expect(dialog).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().length))
      .toBe(0);
    await page.screenshot({
      path: info.outputPath(`kf-d9p3np-dialog-${width}.png`),
    });
    await dialog.getByRole('button', { name: 'Extract' }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.locator('[data-action="editor-open-view"]'),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().length))
      .toBe(0);
    await page.screenshot({
      path: info.outputPath(`kf-d9p3np-extracted-${width}.png`),
    });
  });
}
