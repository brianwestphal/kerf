// KF-PX5EVZ: insert an existing document as a `#view` (row template phase 2,
// docs/26-ui-editor.md §3.7). Add a child's "Existing document…" opens a
// picker over the project's documents, which the dev server lists; the
// picked one renders on the canvas at once and one Undo removes it.
import { expect, type Page, test } from '@playwright/test';

import { openLibrary } from './areas.js';
import { addChild, canvas, select } from './build.js';

const API = '/__kerf-ui-editor/api/file';
const LIST = '01JC0V1EW0000000000000000T';

const main = {
  schema: 'kerf-ui-document/v1',
  name: 'Inbox',
  catalogs: ['@kerfjs/ui'],
  root: {
    id: '01JC0V1EW0000000000000000S',
    type: '@kerfjs/ui:pane',
    props: { fill: true },
    zones: {
      content: [
        {
          id: LIST,
          name: 'messages',
          type: '@kerfjs/ui:list',
          props: { ariaLabel: 'Messages' },
          zones: {
            children: [
              {
                id: '01JC0V1EW0000000000000000W',
                type: '@kerfjs/ui:list-item',
                props: {
                  label: 'Quarterly report',
                  action: { $action: 'open-message' },
                },
              },
            ],
          },
        },
      ],
    },
  },
};

/** A composed document whose one required param the insert seeds. */
const part = {
  schema: 'kerf-ui-document/v1',
  name: 'MessageRow',
  catalogs: ['@kerfjs/ui'],
  params: {
    subject: { type: { kind: 'string' } },
    detail: { type: { kind: 'string' }, default: 'Composed from a document' },
  },
  root: {
    id: '01JC0V1EW0000000000000000R',
    type: '@kerfjs/ui:list-item',
    props: {
      label: { $param: 'subject' },
      description: { $param: 'detail' },
      action: { $action: 'open-message' },
    },
  },
};

const url = (path: string) => `${API}?path=${encodeURIComponent(path)}`;

/**
 * Saves both documents in a folder of their own (the list skips dot-folders,
 * so it is an ignored `pw-documents/` folder) and opens the composing one.
 */
async function openMain(page: Page, name: string) {
  const folder = `pw-documents/insert-${name}-${Date.now()}`;
  for (const [file, document] of [
    ['inbox.kui.json', main],
    ['message-row.kui.json', part],
  ] as const) {
    const response = await page.request.put(url(`${folder}/${file}`), {
      headers: { 'X-Kerf-UI-Editor': '1', 'Content-Type': 'application/json' },
      data: JSON.stringify(document),
    });
    expect(response.ok()).toBe(true);
  }
  await page.addInitScript((path) => {
    globalThis.localStorage.setItem('kerf-ui-editor:path', path);
  }, `${folder}/inbox.kui.json`);
  await page.goto('/');
  await expect(canvas(page)).toContainText('Quarterly report');
  return folder;
}

/** Selects the List and opens Insert Document from Add a child. */
async function openInsert(page: Page, folder: string) {
  await select(page, 'messages');
  await addChild(page, 'Existing document…');
  const dialog = page.getByRole('dialog', { name: 'Insert Document' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('searchbox').fill(folder);
  const row = dialog.getByRole('button', {
    name: `${folder}/message-row.kui.json`,
  });
  await expect(row).toBeVisible();
  // The composing document is not offered.
  await expect(
    dialog.getByRole('button', { name: `${folder}/inbox.kui.json` }),
  ).toHaveCount(0);
  return { dialog, row };
}

test('inserts a listed document as a #view that renders at once', async ({
  page,
}, info) => {
  const folder = await openMain(page, info.project.name);
  const { dialog, row } = await openInsert(page, folder);
  await row.click();
  await expect(dialog).toBeHidden();
  await expect(canvas(page)).toContainText('Composed from a document');
  await expect(canvas(page)).toContainText('Subject');
  // The #view is selected, and the composing file names it relatively.
  await expect(page.locator('[data-action="editor-open-view"]')).toBeVisible();
  await expect
    .poll(async () => {
      const saved = JSON.parse(
        await (await page.request.get(url(`${folder}/inbox.kui.json`))).text(),
      );
      return saved.root.zones.content[0].zones.children[1];
    })
    .toMatchObject({
      type: '#view',
      src: './message-row.kui.json',
      props: { subject: 'Subject' },
    });
  // One Undo removes it.
  await page.locator('[data-action="editor-undo"]').click();
  await expect(canvas(page)).not.toContainText('Composed from a document');
});

for (const width of [1440, 390]) {
  test(`captures the Insert Document picker at ${width}`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'chromium', 'visual QA capture');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    const folder = await openMain(page, `capture-${width}`);
    const { dialog, row } = await openInsert(page, folder);
    // Wide to the capture width with the dialog open.
    await page.setViewportSize({ width, height: 900 });
    await expect(dialog).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().length))
      .toBe(0);
    const box = (await dialog.boundingBox())!;
    expect(box.width).toBeGreaterThan(0);
    expect(box.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: info.outputPath(`kf-px5evz-insert-${width}.png`),
    });
    await row.click();
    await expect(dialog).toBeHidden();
    await expect(canvas(page)).toContainText('Composed from a document');
  });
}

// KF-FXACB5 / KF-BBES58: the Library offers project documents in a dedicated
// mode; a click inserts one as a `#view` inside the selection, a drag drops
// it like a component, and either renders at once.
async function libraryDocument(page: Page, folder: string) {
  await openLibrary(page);
  const library = page.locator('#editor-library');
  await library
    .locator(
      '[data-segmented-control-id="editor-library-mode"] [data-segment-value="documents"]',
    )
    .click();
  await library.getByRole('searchbox').fill(folder);
  const row = library.locator(
    `[data-editor-palette-document="${folder}/message-row.kui.json"]`,
  );
  await expect(row).toBeVisible();
  await expect(
    library.getByRole('tree', { name: 'Documents' }),
  ).toBeVisible();
  await expect(
    library.locator(`[data-editor-palette-document="${folder}/inbox.kui.json"]`),
  ).toHaveCount(0);
  return { library, row };
}

test('inserts a Library document by click and by drag', async ({
  page,
}, info) => {
  const folder = await openMain(page, `library-${info.project.name}`);
  await select(page, 'messages');
  const { library, row } = await libraryDocument(page, folder);
  await row.click();
  // A transient Library closes after the insert.
  await expect(library).toBeHidden();
  await expect(canvas(page)).toContainText('Composed from a document');
  await page.locator('[data-action="editor-undo"]').click();
  await expect(canvas(page)).not.toContainText('Composed from a document');

  const again = await libraryDocument(page, folder);
  const from = (await again.row.boundingBox())!;
  await page.mouse.move(from.x + 20, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + from.height / 2, { steps: 3 });
  const to = (await canvas(page).boundingBox())!;
  await page.mouse.move(to.x + to.width * 0.3, to.y + to.height * 0.85, {
    steps: 10,
  });
  await page.mouse.up();
  await expect(again.library).toBeHidden();
  await expect(canvas(page)).toContainText('Composed from a document');
  await expect
    .poll(async () => {
      const saved = JSON.parse(
        await (await page.request.get(url(`${folder}/inbox.kui.json`))).text(),
      );
      return saved.root.zones.content.at(-1);
    })
    .toMatchObject({
      type: '#view',
      src: './message-row.kui.json',
      props: { subject: 'Subject' },
    });
});

test('navigates document columns by pointer and keyboard and remembers the layout', async ({
  page,
}, info) => {
  const folder = await openMain(page, `columns-${info.project.name}`);
  const { library } = await libraryDocument(page, folder);
  await library
    .locator('[data-segmented-control-id="editor-document-view"] [data-segment-value="columns"]')
    .click();
  await library.locator('[data-item-id="folder:pw-documents/"]').click();
  await library.locator(`[data-item-id="folder:${folder}/"]`).click();
  const file = library.locator(
    `[data-editor-palette-document="${folder}/message-row.kui.json"]`,
  );
  await expect(file).toBeVisible();
  await library.getByRole('button', { name: 'Parent folder' }).click();
  const folderRow = library.locator(`[data-item-id="folder:${folder}/"]`);
  await folderRow.focus();
  await folderRow.press('ArrowRight');
  await expect(file).toBeFocused();
  await page.reload();
  await openLibrary(page);
  await library
    .locator('[data-segmented-control-id="editor-library-mode"] [data-segment-value="documents"]')
    .click();
  await expect(library.locator('#editor-library-documents-columns')).toBeVisible();
});

for (const width of [2048, 390]) {
  test(`captures the Library's documents at ${width}`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'chromium', 'visual QA capture');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 2048, height: 1128 });
    const folder = await openMain(page, `library-capture-${width}`);
    await select(page, 'messages');
    // Wide to the capture width before the Library opens over it.
    await page.setViewportSize({ width, height: width === 390 ? 900 : 1128 });
    const { library } = await libraryDocument(page, folder);
    await library.getByRole('searchbox').fill(folder);
    await expect(
      library.locator('[data-editor-palette-document]').first(),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().length))
      .toBe(0);
    const box = (await library.boundingBox())!;
    expect(box.width).toBeGreaterThan(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: info.outputPath(`kf-bbes58-library-documents-editor-${width}.png`),
    });
    await library.screenshot({
      path: info.outputPath(`kf-d4xzxg-library-tree-${width}.png`),
    });
    await library
      .locator('[data-segmented-control-id="editor-document-view"] [data-segment-value="columns"]')
      .click();
    await expect(library.getByRole('region', { name: 'Documents' })).toBeVisible();
    await library.locator('[data-item-id="folder:pw-documents/"]').click();
    await library.locator(`[data-item-id="folder:${folder}/"]`).click();
    await expect(
      library.locator(`[data-editor-palette-document="${folder}/message-row.kui.json"]`),
    ).toBeVisible();
    await library.screenshot({
      path: info.outputPath(`kf-d4xzxg-library-columns-${width}.png`),
    });
    await library.getByRole('button', { name: 'Parent folder' }).click();
    const folderRow = library.locator(`[data-item-id="folder:${folder}/"]`);
    await expect(folderRow).toBeVisible();
    await folderRow.focus();
    await folderRow.press('ArrowRight');
    await expect(
      library.locator(`[data-editor-palette-document="${folder}/message-row.kui.json"]`),
    ).toBeFocused();
    await library
      .locator('[data-segmented-control-id="editor-document-view"] [data-segment-value="tree"]')
      .click();
    await expect(library.locator('[data-editor-palette]')).toHaveCount(0);
    await expect(
      library.locator('[data-segmented-control-id="editor-palette-view"]'),
    ).toHaveCount(0);
    await library.getByRole('searchbox').fill(folder);
    await library.locator('[data-editor-palette-document]').click();
    await expect(canvas(page)).toContainText('Composed from a document');
  });
}
