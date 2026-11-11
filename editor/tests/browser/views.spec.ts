// KF-5N26H6: a list document whose `$each` rows are a composed row document
// (`#view`, docs/26-ui-editor.md §3.7): the editor loads the row through the
// dev server's file API, renders the rows in place, edits the `#view`'s
// props as the row document's params, and opens the row with a way back.
import { expect, type Page, test } from '@playwright/test';

import { canvas } from './build.js';

const API = '/__kerf-ui-editor/api/file';
const VIEW = '01JC0V1EW0000000000000000V';

const row = {
  schema: 'kerf-ui-document/v1',
  name: 'MessageRow',
  catalogs: ['@kerfjs/ui'],
  params: {
    title: { type: { kind: 'string' } },
    unread: { type: { kind: 'boolean' }, default: false },
  },
  root: {
    id: '01JC0V1EW0000000000000000R',
    type: '@kerfjs/ui:list-item',
    props: {
      label: { $param: 'title' },
      selected: { $param: 'unread' },
      action: { $action: 'open-message' },
    },
  },
};

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
                  id: VIEW,
                  type: '#view',
                  src: './message-row.kui.json',
                  props: { title: { $bind: 'message.subject' } },
                },
              },
            ],
          },
        },
      ],
    },
  },
};

/**
 * KF-58917B: a row that holds a Switch for its `on` param and a TabBar,
 * and a list whose rows bind `on` to their item.
 */
const toggleRow = {
  schema: 'kerf-ui-document/v1',
  name: 'ToggleRow',
  catalogs: ['@kerfjs/ui'],
  params: {
    title: { type: { kind: 'string' } },
    on: { type: { kind: 'boolean' }, default: false },
  },
  root: {
    id: '01JC0V1EW0000000000000001R',
    type: '@kerfjs/ui:row',
    zones: {
      children: [
        {
          id: '01JC0V1EW0000000000000001W',
          type: '@kerfjs/ui:switch',
          props: { label: { $param: 'title' }, checked: { $param: 'on' } },
        },
        {
          id: '01JC0V1EW0000000000000001B',
          type: '@kerfjs/ui:tab-bar',
          props: { id: 'views', label: 'Views' },
          zones: {
            tabs: [
              {
                id: '01JC0V1EW0000000000000001A',
                type: '@kerfjs/ui:tabs',
                props: { id: 'list', name: 'List', selected: true },
              },
              {
                id: '01JC0V1EW0000000000000001C',
                type: '@kerfjs/ui:tabs',
                props: { id: 'grid', name: 'Grid' },
              },
            ],
          },
        },
      ],
    },
  },
};

const toggleList = {
  ...list,
  name: 'Toggles',
  params: {
    messages: {
      type: {
        kind: 'array',
        items: {
          kind: 'object',
          props: [
            { name: 'id', type: { kind: 'string' }, required: true },
            { name: 'subject', type: { kind: 'string' }, required: true },
            { name: 'on', type: { kind: 'boolean' }, required: true },
          ],
        },
      },
      default: [
        { id: 'm1', subject: 'Quarterly report', on: false },
        { id: 'm2', subject: 'Lunch on Friday', on: false },
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
          $each: { $param: 'messages' },
          as: 'message',
          key: 'message.id',
          template: {
            id: VIEW,
            type: '#view',
            src: './message-row.kui.json',
            props: {
              title: { $bind: 'message.subject' },
              on: { $bind: 'message.on' },
            },
          },
        },
      ],
    },
  },
};

/**
 * KF-HBRKFH: a panel document with closable tabs repeated from its `tabs`
 * param and a Combobox in the first of a NavStack's two views, composed once.
 */
const panel = {
  schema: 'kerf-ui-document/v1',
  name: 'Panel',
  catalogs: ['@kerfjs/ui'],
  params: {
    tabs: {
      type: {
        kind: 'array',
        items: {
          kind: 'object',
          props: [{ name: 'id', type: { kind: 'string' }, required: true }],
        },
      },
      default: [],
    },
  },
  root: {
    id: '01JC0V1EW000000000000000P5',
    type: '@kerfjs/ui:nav-stack',
    props: {
      id: 'stack',
      label: 'Stack',
      views: [
        { key: 'home', toolbar: { title: 'Home' } },
        { key: 'more', toolbar: { title: 'More' } },
      ],
    },
    zones: {
      'views.0.content': [
        {
          id: '01JC0V1EW000000000000000P1',
          type: '@kerfjs/ui:text',
          props: { children: 'Quarterly report' },
        },
        {
          id: '01JC0V1EW000000000000000P2',
          type: '@kerfjs/ui:tab-bar',
          props: { id: 'open-files', label: 'Open files' },
          zones: {
            tabs: [
              {
                $each: { $param: 'tabs' },
                as: 'tab',
                key: 'tab.id',
                template: {
                  id: '01JC0V1EW000000000000000P3',
                  type: '@kerfjs/ui:tabs',
                  props: {
                    id: { $bind: 'tab.id' },
                    name: { $bind: 'tab.id' },
                    closable: true,
                  },
                },
              },
            ],
          },
        },
        {
          id: '01JC0V1EW000000000000000P4',
          type: '@kerfjs/ui:combobox',
          props: {
            id: 'city',
            label: 'City',
            suggestions: [
              { value: 'oslo', label: 'Oslo' },
              { value: 'rome', label: 'Rome' },
            ],
          },
        },
      ],
      'views.1.content': [
        {
          id: '01JC0V1EW000000000000000P7',
          type: '@kerfjs/ui:text',
          props: { children: 'More body' },
        },
      ],
    },
  },
};

/** The panel composed once, its tabs from a param of the composing document. */
const panelHost = {
  ...list,
  name: 'Workspace',
  params: {
    files: {
      type: {
        kind: 'array',
        items: {
          kind: 'object',
          props: [{ name: 'id', type: { kind: 'string' }, required: true }],
        },
      },
      default: [{ id: 'notes.md' }, { id: 'plan.md' }],
    },
  },
  root: {
    id: '01JC0V1EW0000000000000000S',
    type: '@kerfjs/ui:pane',
    props: { fill: true },
    zones: {
      content: [
        {
          id: VIEW,
          type: '#view',
          src: './message-row.kui.json',
          props: { tabs: { $param: 'files' } },
        },
      ],
    },
  },
};

/** Saves both documents in a folder of their own and opens the list. */
async function openList(
  page: Page,
  name: string,
  documents: { row: object; list: object } = { row, list },
) {
  const folder = `.kerf-ui-editor/pw-views/${name}-${Date.now()}`;
  const put = (path: string, document: unknown) =>
    page.request.put(`${API}?path=${encodeURIComponent(path)}`, {
      headers: { 'X-Kerf-UI-Editor': '1', 'Content-Type': 'application/json' },
      data: JSON.stringify(document),
    });
  expect(
    (await put(`${folder}/message-row.kui.json`, documents.row)).ok(),
  ).toBe(true);
  expect((await put(`${folder}/messages.kui.json`, documents.list)).ok()).toBe(
    true,
  );
  await page.addInitScript((path) => {
    globalThis.localStorage.setItem('kerf-ui-editor:path', path);
  }, `${folder}/messages.kui.json`);
  await page.goto('/');
  await expect(canvas(page)).toContainText('Quarterly report');
  return folder;
}

const read = async (page: Page, path: string) =>
  JSON.parse(
    await (
      await page.request.get(`${API}?path=${encodeURIComponent(path)}`)
    ).text(),
  );

test('renders composed rows, edits their params, and opens the row document', async ({
  page,
}, info) => {
  const folder = await openList(page, info.project.name);
  await expect(canvas(page)).toContainText('Lunch on Friday');
  await expect(canvas(page)).toContainText('Design review notes');

  // A click inside a row selects the #view, not the row document's node.
  await canvas(page).getByText('Lunch on Friday').click();
  const inspector = page.locator('[data-workbench-panel="rightRail"], body');
  await expect(
    inspector.getByText('View ./message-row.kui.json').first(),
  ).toBeVisible();
  await expect(page.getByText('Open document').first()).toBeVisible();
  await expect(page.getByText(`${folder}/message-row.kui.json`)).toBeVisible();
  await expect(page.getByText('message.subject').first()).toBeVisible();

  // Turning on `unread` (the row's `selected`) saves into the list document.
  await page.getByRole('switch', { name: 'Unread' }).click();
  await expect
    .poll(
      async () =>
        (await read(page, `${folder}/messages.kui.json`)).root.zones.content[0]
          .zones.children[0].template.props.unread,
    )
    .toBe(true);

  // Open document shows the row; Back returns to the list with it selected.
  await page.locator('[data-action="editor-open-view"]').click();
  const back = page.getByRole('button', { name: 'Back to messages.kui.json' });
  await expect(back).toBeVisible();
  await expect(
    page.getByText(`${folder}/message-row.kui.json · saved`),
  ).toBeVisible();
  await expect(canvas(page)).not.toContainText('Quarterly report');
  await back.click();
  await expect(canvas(page)).toContainText('Quarterly report');
  await expect(back).toBeHidden();
  await expect(
    page.getByText(`${folder}/messages.kui.json · saved`),
  ).toBeVisible();
  await expect(
    page.getByText('View ./message-row.kui.json').first(),
  ).toBeVisible();
});

test('play renders composed rows and logs an action from one (KF-85SCQD)', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openList(page, `play-${info.project.name}`);
  await page.locator('[data-action="editor-play"]').click();
  const stage = page.frameLocator('[data-editor-play-frame]');
  await expect(stage.getByText('Quarterly report')).toBeVisible();
  await expect(stage.getByText('Design review notes')).toBeVisible();
  await expect(stage.getByText(/cannot render/)).toHaveCount(0);
  // The row document's action fires from the played row, named as its #view.
  await stage.getByText('Lunch on Friday').click();
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

test('play wires a Switch and a TabBar inside composed rows (KF-58917B)', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openList(page, `play-wired-${info.project.name}`, {
    row: toggleRow,
    list: toggleList,
  });
  await page.locator('[data-action="editor-play"]').click();
  const stage = page.frameLocator('[data-editor-play-frame]');
  const lunch = stage.getByRole('switch', { name: 'Lunch on Friday' });
  const report = stage.getByRole('switch', { name: 'Quarterly report' });
  await expect(lunch).not.toBeChecked();
  // The row's Switch turns on its own item's `on`; the other row stays.
  await lunch.click();
  await expect(lunch).toBeChecked();
  await expect(report).not.toBeChecked();
  await lunch.click();
  await expect(lunch).not.toBeChecked();
  // A tab selects in its own row's bar.
  const grid = stage.getByRole('tab', { name: 'Grid' });
  await grid.nth(1).click();
  await expect(grid.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(grid.nth(0)).toHaveAttribute('aria-selected', 'false');
  await expect(stage.getByRole('tab', { name: 'List' }).nth(1)).toHaveAttribute(
    'aria-selected',
    'false',
  );
  if (info.project.name === 'chromium')
    await page.screenshot({
      path: info.outputPath('kf-58917b-play-wired-1440.png'),
      animations: 'disabled',
    });
});

test('play closes a composed tab, commits a composed Combobox, and starts its NavStack at the root (KF-HBRKFH)', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openList(page, `play-panel-${info.project.name}`, {
    row: panel,
    list: panelHost,
  });
  await page.locator('[data-action="editor-play"]').click();
  const stage = page.frameLocator('[data-editor-play-frame]');
  // The composed NavStack starts at its root view.
  await expect(stage.getByText('Quarterly report')).toBeVisible();
  await expect(stage.getByText('More body')).toHaveCount(0);
  // A tab closes out of the composing document's param.
  await expect(stage.getByRole('tab', { name: 'notes.md' })).toBeVisible();
  await stage
    .locator('.kui-tab-bar-item', { hasText: 'notes.md' })
    .locator('.kui-tab-bar-item__close')
    .click();
  await expect(stage.getByRole('tab', { name: 'notes.md' })).toHaveCount(0);
  await expect(stage.getByRole('tab', { name: 'plan.md' })).toBeVisible();
  // The composed Combobox's commit reaches its play copy, which renders
  // the suggestion's value (the focused field keeps its typed text).
  const city = stage.getByRole('combobox', { name: 'City' });
  await city.fill('ROME');
  await city.press('Enter');
  await expect(city).toHaveAttribute('value', 'rome');
  if (info.project.name === 'chromium')
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({
        path: info.outputPath(`kf-hbrkfh-play-composed-${width}.png`),
        animations: 'disabled',
      });
    }
});

for (const width of [1440, 390]) {
  test(`captures play with composed rows at ${width} (KF-85SCQD)`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'chromium', 'visual QA capture');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    await openList(page, `play-capture-${width}`);
    await page.locator('[data-action="editor-play"]').click();
    const stage = page.frameLocator('[data-editor-play-frame]');
    await expect(stage.getByText('Quarterly report')).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`kf-85scqd-play-${width}.png`),
      animations: 'disabled',
    });
  });
}

for (const width of [1440, 390]) {
  test(`captures the composed list and its Inspector at ${width}`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'chromium', 'visual QA capture');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    await openList(page, `capture-${width}`);
    await canvas(page).getByText('Quarterly report').click();
    const narrow = width < 600;
    // A narrow editor keeps the Inspector closed until it is asked for.
    if (narrow)
      await page
        .getByRole('button', { name: 'Show Inspector' })
        .first()
        .click();
    const open = page.locator('[data-action="editor-open-view"]');
    await expect(open).toBeInViewport({ ratio: 1 });
    await page.screenshot({
      path: info.outputPath(`kf-5n26h6-composed-${width}.png`),
    });
    await open.click();
    if (narrow) {
      // As an overlay, the Inspector's toggle names its return.
      await page.getByRole('button', { name: 'Preview' }).first().click();
      // The drawer has slid out once no transition is running.
      await expect(
        page.locator('.kui-workbench__rail--right[data-collapsed="true"]'),
      ).toHaveCount(1);
      await expect
        .poll(() => page.evaluate(() => document.getAnimations().length))
        .toBe(0);
      await page.mouse.move(0, 899);
    }
    await expect(
      page.locator('[data-action="editor-view-back"]'),
    ).toBeInViewport();
    await page.screenshot({
      path: info.outputPath(`kf-5n26h6-opened-${width}.png`),
    });
  });
}
