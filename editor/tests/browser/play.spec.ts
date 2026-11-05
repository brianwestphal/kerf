// KF-60BEEJ: play mode core (docs/26-ui-editor.md §11). Play shows the play
// bar and a stage whose frame runs the document with real wiring over a
// play-time copy; Done or Escape returns to the editor as it was.
import { expect, type Page, test } from '@playwright/test';

const ids = {
  tabs: '01JB8Z1M6Q8E1X9V4S7K2R3T8B',
  stack: '01JB8Z1M6Q8E1X9V4S7K2R3T8C',
  first: '01JB8Z1M6Q8E1X9V4S7K2R3T8D',
  second: '01JB8Z1M6Q8E1X9V4S7K2R3T8E',
  search: '01JB8Z1M6Q8E1X9V4S7K2R3T8F',
};

const text = (id: string, children: string) => ({
  id,
  type: '@kerfjs/ui:text',
  props: { children },
});

/**
 * A TabNavigator whose Projects tab holds a two-view NavStack (Projects,
 * then Atlas) and whose Search tab holds text.
 */
const document = {
  schema: 'kerf-ui-document/v1',
  name: 'Play',
  catalogs: ['@kerfjs/ui'],
  root: {
    id: ids.tabs,
    type: '@kerfjs/ui:tab-navigator',
    props: {
      id: 'sections',
      label: 'Sections',
      tabs: [
        { id: 'projects', label: 'Projects' },
        { id: 'search', label: 'Search' },
      ],
      active: 'projects',
    },
    zones: {
      'tabs.0.content': [
        {
          id: ids.stack,
          type: '@kerfjs/ui:nav-stack',
          props: {
            id: 'projects-stack',
            label: 'Projects Navigation',
            views: [
              { key: 'projects', toolbar: { title: 'Projects' } },
              { key: 'atlas', toolbar: { title: 'Atlas' } },
            ],
          },
          zones: {
            'views.0.content': [text(ids.first, 'All projects')],
            'views.1.content': [text(ids.second, 'Atlas details')],
          },
        },
      ],
      'tabs.1.content': [text(ids.search, 'Search everything')],
    },
  },
};

const openDocument = async (page: Page) => {
  await page.goto('/');
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: 'play.kui.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(document)),
    });
  await expect(page.getByText(/· 5 nodes · valid$/)).toBeVisible();
};

/**
 * Fit: the frame, scaled down, sits whole inside the stage and keeps its
 * viewport: the default iPhone 17 in a browser tab, 402×678 (KF-R7KXSN).
 */
const expectFits = async (page: Page) => {
  const frame = page.locator('[data-editor-play-frame]');
  await expect(frame).toBeVisible();
  const stageBox = (await page.locator('[data-editor-stage]').boundingBox())!;
  const box = (await frame.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(stageBox.x);
  expect(box.y).toBeGreaterThanOrEqual(stageBox.y);
  expect(box.x + box.width).toBeLessThanOrEqual(stageBox.x + stageBox.width);
  expect(box.y + box.height).toBeLessThanOrEqual(stageBox.y + stageBox.height);
  // Scaled evenly.
  expect(box.width / box.height).toBeCloseTo(402 / 678, 2);
  expect(
    await page
      .frameLocator('[data-editor-play-frame]')
      .locator('html')
      .evaluate(() => [window.innerWidth, window.innerHeight]),
  ).toEqual([402, 678]);
  return box;
};

const play = (page: Page) =>
  page.locator('[data-action="editor-play"]').click();
const stage = (page: Page) => page.frameLocator('[data-editor-play-frame]');

test('Play shows the stage at the device viewport and Done restores the editor', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await page
    .locator(`[data-editor-canvas] [data-kerf-node="${ids.second}"]`)
    .click();
  const highlight = page.locator('.kui-editor__selection');
  await expect(highlight).toBeVisible();
  const ring = await highlight.boundingBox();
  const children = page.locator(
    '[data-editor-prop="children"] textarea, [data-editor-prop="children"] input',
  );
  await expect(children).toHaveValue('Atlas details');
  await play(page);
  await expect(page.locator('.kui-editor__editing')).toBeHidden();
  const frame = page.locator('[data-editor-play-frame]');
  await expect(frame).toBeVisible();
  await expectFits(page);
  await expect(page.locator('[data-action="editor-play-done"]')).toBeFocused();
  // KF-BFE3EC: play starts the stack at its root view, though the canvas
  // shows the view being edited.
  await expect(stage(page).getByText('All projects')).toBeVisible();
  await expect(stage(page).getByText('Atlas details')).toHaveCount(0);
  await page.locator('[data-action="editor-play-done"]').click();
  await expect(frame).toHaveCount(0);
  await expect(page.locator('[data-editor-canvas]')).toBeVisible();
  // The selection the author had is still there.
  await expect(highlight).toBeVisible();
  expect(await highlight.boundingBox()).toEqual(ring);
  await expect(children).toHaveValue('Atlas details');
});

test('Fit scales the frame to a short stage and follows its resizes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await openDocument(page);
  await play(page);
  const short = await expectFits(page);
  expect(short.height).toBeLessThan(876);
  // The stage never scrolls.
  const stageScroll = await page
    .locator('[data-editor-stage]')
    .evaluate((stage) => [
      stage.scrollHeight - stage.clientHeight,
      stage.scrollWidth - stage.clientWidth,
    ]);
  expect(stageScroll).toEqual([0, 0]);
  // A taller window scales it up again, never past its own size.
  await page.setViewportSize({ width: 1440, height: 1200 });
  await expect
    .poll(async () =>
      Math.round(
        (await page.locator('[data-editor-play-frame]').boundingBox())!.height,
      ),
    )
    .toBe(678);
  await expectFits(page);
  await page.setViewportSize({ width: 1440, height: 700 });
  await expect
    .poll(async () =>
      Math.round(
        (await page.locator('[data-editor-play-frame]').boundingBox())!.height,
      ),
    )
    .toBe(Math.round(short.height));
});

test('the stage runs the view for real and never selects', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await expect(page.getByText('Nothing selected')).toBeVisible();
  await play(page);
  const view = stage(page);
  // KF-BFE3EC: the stack starts at its root view, with no Back; a host's
  // mock handler pushes the rest (host.spec.ts).
  await expect(view.getByText('All projects')).toBeVisible();
  await expect(view.getByText('Atlas details')).toHaveCount(0);
  await expect(view.locator('[data-nav-back]')).toHaveCount(0);
  // A TabNavigator tab switches the scene.
  await view.locator('[data-tab-scaffold-tab="search"]').click();
  await expect(view.getByText('Search everything')).toBeVisible();
  // No editor key works on the stage's view, and the frame keeps its keys.
  await view.getByText('Search everything').click();
  await page.keyboard.press('ControlOrMeta+d');
  // Escape with focus outside the played view leaves play mode.
  await page.locator('[data-action="editor-play-done"]').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-editor-play-frame]')).toHaveCount(0);
  await expect(page.getByText('Nothing selected')).toBeVisible();
  // The document never changed: still five nodes, no undo step.
  await expect(page.getByText(/· 5 nodes · valid$/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  // Playing again starts fresh, from the document.
  await play(page);
  await expect(stage(page).getByText('All projects')).toBeVisible();
});

// KF-R7KXSN: device presets, orientation, scale, and installed-app safe
// areas (docs/26-ui-editor.md §11.1–§11.3).
const chooseIn = async (page: Page, control: string, option: string) => {
  const select = page.locator(`[data-editor-play="${control}"]`);
  await select.locator('.kui-select__trigger').click();
  await select.getByRole('option', { name: option, exact: true }).click();
};
const frameViewport = (page: Page) =>
  stage(page)
    .locator('html')
    .evaluate(() => [window.innerWidth, window.innerHeight]);
const deviceClassIn = (page: Page) =>
  stage(page).locator('html').getAttribute('data-kerf-play-device');

/** The frame lies inside the stage (Fit). */
const expectWithinStage = async (page: Page) => {
  const stageBox = (await page.locator('[data-editor-stage]').boundingBox())!;
  const box = (await page.locator('[data-editor-play-frame]').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(stageBox.x);
  expect(box.y).toBeGreaterThanOrEqual(stageBox.y);
  expect(box.x + box.width).toBeLessThanOrEqual(stageBox.x + stageBox.width);
  expect(box.y + box.height).toBeLessThanOrEqual(stageBox.y + stageBox.height);
};

test('the device menu sizes the frame, and deviceClass() inside follows it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await play(page);
  await expect(stage(page).getByText('All projects')).toBeVisible();
  await expect.poll(() => deviceClassIn(page)).toBe('mobile portrait');
  await chooseIn(page, 'device', 'iPad Pro 13"');
  await expect.poll(() => frameViewport(page)).toEqual([1032, 1282]);
  await expect.poll(() => deviceClassIn(page)).toBe('desktop portrait');
  // The view keeps running: no reload, so its runtime state survives.
  await stage(page).locator('[data-tab-scaffold-tab="search"]').click();
  await expect(stage(page).getByText('Search everything')).toBeVisible();
  await page.locator('[data-action="editor-play-rotate"]').click();
  await expect.poll(() => frameViewport(page)).toEqual([1376, 938]);
  await expect.poll(() => deviceClassIn(page)).toBe('desktop landscape');
  await expect(stage(page).getByText('Search everything')).toBeVisible();
  await chooseIn(page, 'device', 'MacBook Pro 16"');
  await expect.poll(() => frameViewport(page)).toEqual([1728, 1117]);
  await expect.poll(() => deviceClassIn(page)).toBe('xl-desktop landscape');
  await expect(
    page.locator('[data-action="editor-play-rotate"]'),
  ).toBeDisabled();
  await expectWithinStage(page);
  // The choice is remembered: playing again after a reload starts there.
  await page.locator('[data-action="editor-play-done"]').click();
  await page.reload();
  await openDocument(page);
  await play(page);
  await expect.poll(() => frameViewport(page)).toEqual([1728, 1117]);
});

test('Installed app moves the content below the safe area', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await play(page);
  const title = stage(page).getByText('All projects');
  await expect(title).toBeVisible();
  const top = () =>
    title.evaluate((element) => element.getBoundingClientRect().top);
  expect(await frameViewport(page)).toEqual([402, 678]);
  const tab = await top();
  await page.locator('[data-action="editor-play-installed"]').click();
  await expect.poll(() => frameViewport(page)).toEqual([402, 874]);
  // The iPhone 17's 62px status-bar safe area, now under the view's chrome.
  await expect.poll(top).toBe(tab + 62);
  await expect(
    page.locator('[data-action="editor-play-installed"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-action="editor-play-installed"]').click();
  await expect.poll(top).toBe(tab);
});

test('a fixed scale overflows and scrolls the stage; Fit returns', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await openDocument(page);
  await play(page);
  await chooseIn(page, 'scale', '150%');
  const frame = page.locator('[data-editor-play-frame]');
  await expect
    .poll(async () => Math.round((await frame.boundingBox())!.height))
    .toBe(Math.round(678 * 1.5));
  const overflow = () =>
    page
      .locator('[data-editor-stage]')
      .evaluate((element) => element.scrollHeight - element.clientHeight);
  expect(await overflow()).toBeGreaterThan(0);
  // The viewport inside never changes with the scale.
  expect(await frameViewport(page)).toEqual([402, 678]);
  await chooseIn(page, 'scale', 'Fit');
  await expect.poll(overflow).toBe(0);
  await expectWithinStage(page);
});

test('Flexible resizes from its fields and its drag handles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await play(page);
  await chooseIn(page, 'device', 'Flexible');
  await expect.poll(() => frameViewport(page)).toEqual([800, 600]);
  await expect(
    page.locator('[data-action="editor-play-rotate"]'),
  ).toBeDisabled();
  const width = page.locator('[data-editor-play-size="width"] input');
  await width.fill('640');
  await width.press('Enter');
  await width.blur();
  await expect.poll(() => frameViewport(page)).toEqual([640, 600]);
  // Drag the bottom handle 50px down; the viewport grows by that much at
  // the stage's scale.
  const handle = page.locator('.kui-editor__resize[data-edge="block-end"]');
  const scale = Number(
    await page.locator('.kui-editor__device-box').getAttribute('data-scale'),
  );
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 50, { steps: 4 });
  await page.mouse.up();
  await expect
    .poll(async () => (await frameViewport(page))[1])
    .toBe(Math.round(600 + 50 / scale));
  await expect(
    page.locator('[data-editor-play-size="height"] input'),
  ).toHaveValue(String(Math.round(600 + 50 / scale)));
});

// KF-E8T0AY: the mock device frame never changes the view's layout.
test('the Chrome toggle hides the device frame without moving the view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await play(page);
  await expect(stage(page).getByText('All projects')).toBeVisible();
  const frame = page.locator('[data-editor-play-frame]');
  const bezel = page.locator('.kui-editor__device-bezel');
  const chrome = page.locator('[data-action="editor-play-chrome"]');
  for (const [device, scale] of [
    ['iPhone 17', 'Fit'],
    ['iPhone SE', '100%'],
    ['MacBook Air 13"', 'Fit'],
  ] as const) {
    await chooseIn(page, 'device', device);
    await chooseIn(page, 'scale', scale);
    await expect(bezel).toBeVisible();
    const shown = await frame.boundingBox();
    const viewport = await frameViewport(page);
    await chrome.click();
    await expect(chrome).toHaveAttribute('aria-pressed', 'false');
    await expect(bezel).toBeHidden();
    expect(await frame.boundingBox()).toEqual(shown);
    expect(await frameViewport(page)).toEqual(viewport);
    await chrome.click();
    await expect(bezel).toBeVisible();
    expect(await frame.boundingBox()).toEqual(shown);
  }
  // The frame's parts never take a click from the view.
  await chooseIn(page, 'device', 'iPhone 17');
  await page.locator('[data-action="editor-play-installed"]').click();
  await stage(page).locator('[data-tab-scaffold-tab="search"]').click();
  await expect(stage(page).getByText('Search everything')).toBeVisible();
});

// KF-XV732Q: more play-time adapters — value controls, rows repeated by
// `$each`, tab close, resizing, a sidebar toggled by several actions, and a
// SplitView that follows the device (docs/26-ui-editor.md §11.4).
const xid = (n: number) =>
  `01JB8Z1M6Q8E1X9V4S7K2R3X${String(n).padStart(2, '0')}`;
const kui = (n: number, type: string, props: object, zones?: object) => ({
  id: xid(n),
  type: `@kerfjs/ui:${type}`,
  props,
  ...(zones ? { zones } : {}),
});
const options = (...values: string[]) =>
  values.map((value) => ({
    value,
    label: value[0]!.toUpperCase() + value.slice(1),
  }));
const itemsParam = (...names: string[]) => ({
  type: {
    kind: 'array',
    items: {
      kind: 'object',
      props: [
        { name: 'id', type: { kind: 'string' }, required: true },
        { name: 'name', type: { kind: 'string' }, required: true },
      ],
    },
  },
  default: names.map((name) => ({ id: name.toLowerCase(), name })),
});

/** Value controls, repeated tabs, a region, and a sidebar with two toggles. */
const controlsDocument = {
  schema: 'kerf-ui-document/v1',
  name: 'Controls',
  catalogs: ['@kerfjs/ui'],
  params: { tabs: itemsParam('Inbox', 'Drafts', 'Sent') },
  root: kui(
    0,
    'pane',
    {},
    {
      content: [
        kui(
          1,
          'tab-bar',
          { id: 'mail', label: 'Mail' },
          {
            tabs: [
              {
                $each: { $param: 'tabs' },
                as: 'tab',
                key: 'tab.id',
                template: kui(2, 'tabs', {
                  id: { $bind: 'tab.id' },
                  name: { $bind: 'tab.name' },
                }),
              },
            ],
          },
        ),
        kui(3, 'segmented-control', {
          id: 'view',
          label: 'View',
          value: 'list',
          choices: options('list', 'grid'),
        }),
        kui(4, 'switch', { label: 'Wifi' }),
        kui(5, 'select', {
          name: 'color',
          label: 'Color',
          value: 'red',
          choices: options('red', 'blue'),
        }),
        kui(6, 'slider', { id: 'volume', label: 'Volume', value: 10 }),
        kui(
          7,
          'resize',
          { id: 'region', label: 'Region', size: 160, min: 120, max: 240 },
          { children: [kui(8, 'text', { children: 'Region body' })] },
        ),
        kui(9, 'collapsible-panel', {
          id: 'side',
          side: 'left',
          label: 'Side',
          toolbar: {
            label: 'Side',
            toggle: { action: 'toggle-side', name: 'Side' },
          },
        }),
        {
          id: xid(10),
          type: '@kerfjs/ui:collapsible-panel#CollapsiblePanelToggle',
          props: {
            side: 'left',
            collapsed: false,
            action: 'open-side',
            panelId: 'side',
          },
        },
      ],
    },
  ),
};

/** A SplitView of two rows and their detail. */
const splitDocument = {
  schema: 'kerf-ui-document/v1',
  name: 'Split',
  catalogs: ['@kerfjs/ui'],
  root: kui(
    20,
    'split-view',
    { id: 'split', label: 'Split', listTitle: 'Notes', detailTitle: 'Note' },
    {
      list: [
        kui(
          21,
          'list',
          { ariaLabel: 'Notes' },
          {
            children: [
              kui(22, 'list-item', { label: 'Groceries', action: 'open-note' }),
              kui(23, 'list-item', { label: 'Packing', action: 'open-note' }),
            ],
          },
        ),
      ],
      detail: [kui(24, 'text', { children: 'Note details' })],
    },
  ),
};

const openPlayed = async (page: Page, played: object, nodes: number) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: 'played.kui.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(played)),
    });
  await expect(
    page.getByText(new RegExp(`· ${nodes} nodes · valid$`)),
  ).toBeVisible();
  await play(page);
  return stage(page);
};

test('value controls, repeated tabs, and a region keep what the person did', async ({
  page,
}) => {
  const view = await openPlayed(page, controlsDocument, 11);
  const node = (n: number) => view.locator(`[data-kerf-node="${xid(n)}"]`);
  const tab = (key: string) =>
    view.locator(`[data-kerf-node="${xid(2)}"][data-key="${key}"]`);
  // A repeated tab selects for its row only.
  await tab('drafts').getByRole('tab').click();
  await expect(tab('drafts')).toHaveAttribute('data-selected', 'true');
  await expect(tab('inbox')).toHaveAttribute('data-selected', 'false');
  await expect(tab('sent')).toHaveAttribute('data-selected', 'false');
  // The controls record their values in the play copy.
  const grid = node(3).getByRole('button', { name: 'Grid' });
  await grid.click();
  await expect(grid).toHaveAttribute('aria-pressed', 'true');
  await node(4).getByRole('switch').check();
  await node(5).locator('.kui-select__trigger').click();
  await node(5).getByRole('option', { name: 'Blue', exact: true }).click();
  await expect(node(5).locator('.kui-select__trigger')).toContainText('Blue');
  await node(6).getByRole('slider').focus();
  await page.keyboard.press('End');
  await expect(node(6).getByRole('slider')).toHaveValue('100');
  const handle = node(7).getByRole('separator');
  await handle.focus();
  await page.keyboard.press('End');
  await expect(handle).toHaveAttribute('aria-valuenow', '240');
  // A re-render (closing the selected tab) keeps every value, and hands the
  // selection to the next tab.
  await tab('drafts').getByRole('button', { name: 'Close Drafts' }).click();
  await expect(tab('drafts')).toHaveCount(0);
  await expect(tab('sent')).toHaveAttribute('data-selected', 'true');
  await expect(grid).toHaveAttribute('aria-pressed', 'true');
  await expect(node(4).getByRole('switch')).toBeChecked();
  await expect(node(5).locator('.kui-select__trigger')).toContainText('Blue');
  await expect(node(6).getByRole('slider')).toHaveValue('100');
  await expect(handle).toHaveAttribute('aria-valuenow', '240');
  // The sidebar collapses from its own toggle and opens from the other.
  const panel = view.locator('[data-collapsible-panel="side"]');
  await view.locator('[data-action="toggle-side"]').first().click();
  await expect(panel).toHaveAttribute('data-collapsed', 'true');
  await view.locator('[data-action="open-side"]').click();
  await expect(panel).toHaveAttribute('data-collapsed', 'false');
});

test('a SplitView follows the device: rows push the detail on a phone', async ({
  page,
}) => {
  const view = await openPlayed(page, splitDocument, 5);
  const split = view.locator('[data-component="split-view"]');
  // The default iPhone 17 is compact.
  await expect(split).toHaveAttribute('data-split-mode', 'compact');
  await view.getByRole('button', { name: 'Packing' }).click();
  await expect(view.getByText('Note details')).toBeVisible();
  await view.locator('[data-nav-back]').click();
  await expect(view.getByRole('button', { name: 'Packing' })).toBeVisible();
  await expect(view.getByText('Note details')).toHaveCount(0);
  // A roomy device shows both panes, and the chosen row stays selected.
  await chooseIn(page, 'device', 'iPad Pro 13"');
  await page.locator('[data-action="editor-play-rotate"]').click();
  await expect(split).toHaveAttribute('data-split-mode', 'split');
  await expect(view.getByText('Note details')).toBeVisible();
  await expect(view.getByRole('button', { name: 'Packing' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

// KF-59BF6C: the device menu says what play mode doesn't emulate.
test('the device menu notes what play mode does not emulate', async ({
  page,
}) => {
  const note =
    'Touch, pixel density, and the on-screen keyboard aren’t emulated.';
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await play(page);
  const select = page.locator('[data-editor-play="device"]');
  await select.locator('.kui-select__trigger').click();
  await expect(select.locator('.kui-select__note')).toBeVisible();
  await expect(select.locator('.kui-select__note')).toHaveText(note);
  await expect(select.getByRole('listbox')).toHaveAttribute(
    'aria-description',
    note,
  );
});

// KF-7XQAFR: a Switch nested inside an `$each` row keeps its value to its
// row, and a tab repeated from a `$bind` (a param object's array) closes.
const rowsDocument = {
  schema: 'kerf-ui-document/v1',
  name: 'Rows',
  catalogs: ['@kerfjs/ui'],
  params: {
    rows: itemsParam('Alpha', 'Beta'),
    // No default: the canvas's sample tabs are "Name", "Name 2", "Name 3".
    data: {
      type: {
        kind: 'object',
        props: [{ name: 'tabs', type: itemsParam().type, required: true }],
      },
    },
  },
  root: kui(
    30,
    'pane',
    {},
    {
      content: [
        {
          $each: { $param: 'rows' },
          as: 'row',
          key: 'row.id',
          template: kui(
            31,
            'row',
            {},
            {
              children: [
                kui(32, 'text', { children: { $bind: 'row.name' } }),
                kui(33, 'switch', { label: 'Notify' }),
              ],
            },
          ),
        },
        kui(
          34,
          'tab-bar',
          { id: 'data', label: 'Data' },
          {
            tabs: [
              {
                $each: { $bind: 'data.tabs' },
                as: 'tab',
                key: 'tab.id',
                template: kui(35, 'tabs', {
                  id: { $bind: 'tab.id' },
                  name: { $bind: 'tab.name' },
                }),
              },
            ],
          },
        ),
      ],
    },
  ),
};

test('a Switch nested in a row keeps its row’s value, and a bound tab closes', async ({
  page,
}) => {
  const view = await openPlayed(page, rowsDocument, 6);
  const toggle = (key: string) =>
    view
      .locator(`[data-kerf-node="${xid(31)}"][data-key="${key}"]`)
      .getByRole('switch');
  await toggle('beta').check();
  await expect(toggle('beta')).toBeChecked();
  await expect(toggle('alpha')).not.toBeChecked();
  // Closing a tab re-renders the view; each row keeps its own value.
  const tab = (name: string) => view.getByRole('tab', { name, exact: true });
  await expect(tab('Name 2')).toBeVisible();
  await view.getByRole('button', { name: 'Close Name 2' }).click();
  await expect(tab('Name 2')).toHaveCount(0);
  await expect(tab('Name')).toBeVisible();
  await expect(tab('Name 3')).toBeVisible();
  await expect(toggle('beta')).toBeChecked();
  await expect(toggle('alpha')).not.toBeChecked();
  // The other row toggles on its own.
  await toggle('alpha').check();
  await toggle('beta').uncheck();
  await view.getByRole('button', { name: 'Close Name 3' }).click();
  await expect(tab('Name 3')).toHaveCount(0);
  await expect(toggle('alpha')).toBeChecked();
  await expect(toggle('beta')).not.toBeChecked();
});

// KF-SN9EP4: a TabBar repeated per group, each repeating its group's tabs
// (`{ $bind: 'group.tabs' }`, a repeat inside a repeat's row, which renders
// since KF-CFA1S1). Every group has a tab `a`, so closing group 2's tab `a`
// must find the group by its outer row key and leave the others alone.
const groupsDocument = {
  schema: 'kerf-ui-document/v1',
  name: 'Groups',
  catalogs: ['@kerfjs/ui'],
  params: {
    groups: {
      type: {
        kind: 'array',
        items: {
          kind: 'object',
          props: [
            { name: 'id', type: { kind: 'string' }, required: true },
            { name: 'name', type: { kind: 'string' }, required: true },
            { name: 'tabs', type: itemsParam().type, required: true },
          ],
        },
      },
      default: [1, 2, 3].map((n) => ({
        id: `g${n}`,
        name: `Group ${n}`,
        tabs: [
          { id: 'a', name: `A${n}` },
          { id: 'b', name: `B${n}` },
        ],
      })),
    },
  },
  root: kui(
    40,
    'pane',
    {},
    {
      content: [
        {
          $each: { $param: 'groups' },
          as: 'group',
          key: 'group.id',
          template: kui(
            41,
            'tab-bar',
            { id: { $bind: 'group.id' }, label: { $bind: 'group.name' } },
            {
              tabs: [
                {
                  $each: { $bind: 'group.tabs' },
                  as: 'tab',
                  key: 'tab.id',
                  template: kui(42, 'tabs', {
                    id: { $bind: 'tab.id' },
                    name: { $bind: 'tab.name' },
                  }),
                },
              ],
            },
          ),
        },
      ],
    },
  ),
};

test('closing a tab repeated from an outer row’s array closes only that tab', async ({
  page,
}) => {
  const view = await openPlayed(page, groupsDocument, 3);
  const tab = (name: string) => view.getByRole('tab', { name, exact: true });
  const group = (n: number) =>
    view.locator(`[data-kerf-node="${xid(41)}"][data-key="g${n}"]`);
  for (const n of [1, 2, 3]) {
    await expect(group(n).getByRole('tab')).toHaveCount(2);
    await expect(tab(`A${n}`)).toBeVisible();
  }
  await group(2).getByRole('button', { name: 'Close A2' }).click();
  await expect(tab('A2')).toHaveCount(0);
  await expect(group(2).getByRole('tab')).toHaveCount(1);
  await expect(tab('B2')).toBeVisible();
  // The other groups keep both tabs, `a` included.
  for (const n of [1, 3]) {
    await expect(group(n).getByRole('tab')).toHaveCount(2);
    await expect(tab(`A${n}`)).toBeVisible();
    await expect(tab(`B${n}`)).toBeVisible();
  }
  // The canvas still renders the document.
  await expect(page.getByText('This document cannot be previewed')).toHaveCount(
    0,
  );
});

// KF-ZMBST3: inner rows whose keys repeat across outer rows keep their own
// play-time state: a Switch per item, and a tab selection per group's bar.
const groupSwitchesDocument = {
  schema: 'kerf-ui-document/v1',
  name: 'GroupSwitches',
  catalogs: ['@kerfjs/ui'],
  params: {
    groups: {
      type: {
        kind: 'array',
        items: {
          kind: 'object',
          props: [
            { name: 'id', type: { kind: 'string' }, required: true },
            { name: 'items', type: itemsParam().type, required: true },
          ],
        },
      },
      default: [1, 2].map((n) => ({
        id: `g${n}`,
        items: [{ id: 'a', name: `A${n}` }],
      })),
    },
  },
  root: kui(
    50,
    'pane',
    {},
    {
      content: [
        {
          $each: { $param: 'groups' },
          as: 'group',
          key: 'group.id',
          template: kui(
            51,
            'row',
            {},
            {
              children: [
                {
                  $each: { $bind: 'group.items' },
                  as: 'item',
                  key: 'item.id',
                  template: kui(
                    52,
                    'row',
                    {},
                    {
                      children: [
                        kui(53, 'switch', { label: { $bind: 'item.name' } }),
                      ],
                    },
                  ),
                },
              ],
            },
          ),
        },
      ],
    },
  ),
};

test('inner rows sharing a key across outer rows keep their own state', async ({
  page,
}) => {
  const view = await openPlayed(page, groupSwitchesDocument, 4);
  const toggle = (name: string) => view.getByRole('switch', { name });
  await toggle('A2').check();
  await expect(toggle('A2')).toBeChecked();
  await expect(toggle('A1')).not.toBeChecked();
  await toggle('A1').check();
  await toggle('A2').uncheck();
  await expect(toggle('A1')).toBeChecked();
  await expect(toggle('A2')).not.toBeChecked();
});

test('a TabBar repeated per group keeps its own selection', async ({
  page,
}) => {
  const view = await openPlayed(page, groupsDocument, 3);
  const tab = (name: string) => view.getByRole('tab', { name, exact: true });
  await tab('A2').click();
  await expect(tab('A2')).toHaveAttribute('aria-selected', 'true');
  await expect(tab('A1')).toHaveAttribute('aria-selected', 'false');
  await tab('B1').click();
  await expect(tab('B1')).toHaveAttribute('aria-selected', 'true');
  await expect(tab('A2')).toHaveAttribute('aria-selected', 'true');
  await expect(tab('A1')).toHaveAttribute('aria-selected', 'false');
  // Closing group 2's selected tab hands its selection to group 2's next.
  await view.getByRole('button', { name: 'Close A2' }).click();
  await expect(tab('A2')).toHaveCount(0);
  await expect(tab('B2')).toHaveAttribute('aria-selected', 'true');
  await expect(tab('B1')).toHaveAttribute('aria-selected', 'true');
});

// KF-36QBFM: a tab placed directly in a TabBar repeated per group is one
// node every group's bar shares, yet it selects and closes per group.
const placedGroupsDocument = {
  ...groupsDocument,
  name: 'PlacedGroups',
  root: kui(
    60,
    'pane',
    {},
    {
      content: [
        {
          $each: { $param: 'groups' },
          as: 'group',
          key: 'group.id',
          template: kui(
            61,
            'tab-bar',
            { id: { $bind: 'group.id' }, label: { $bind: 'group.name' } },
            {
              tabs: [
                kui(62, 'tabs', { id: 'home', name: 'Home', selected: true }),
                kui(63, 'tabs', { id: 'more', name: 'More' }),
                {
                  $each: { $bind: 'group.tabs' },
                  as: 'tab',
                  key: 'tab.id',
                  template: kui(64, 'tabs', {
                    id: { $bind: 'tab.id' },
                    name: { $bind: 'tab.name' },
                  }),
                },
              ],
            },
          ),
        },
      ],
    },
  ),
};

test('a tab placed in a TabBar repeated per group selects and closes per group', async ({
  page,
}) => {
  const view = await openPlayed(page, placedGroupsDocument, 5);
  const group = (n: number) =>
    view.locator(`[data-kerf-node="${xid(61)}"][data-key="g${n}"]`);
  const tab = (n: number, name: string) =>
    group(n).getByRole('tab', { name, exact: true });
  for (const n of [1, 2, 3])
    await expect(tab(n, 'Home')).toHaveAttribute('aria-selected', 'true');
  await tab(2, 'More').click();
  await expect(tab(2, 'More')).toHaveAttribute('aria-selected', 'true');
  await expect(tab(2, 'Home')).toHaveAttribute('aria-selected', 'false');
  for (const n of [1, 3]) {
    await expect(tab(n, 'Home')).toHaveAttribute('aria-selected', 'true');
    await expect(tab(n, 'More')).toHaveAttribute('aria-selected', 'false');
  }
  // A repeated tab in group 1 leaves group 2's placed selection alone.
  await tab(1, 'A1').click();
  await expect(tab(1, 'A1')).toHaveAttribute('aria-selected', 'true');
  await expect(tab(1, 'Home')).toHaveAttribute('aria-selected', 'false');
  await expect(tab(2, 'More')).toHaveAttribute('aria-selected', 'true');
  // Closing group 2's selected More closes it there only, and Home takes
  // the selection.
  await group(2).getByRole('button', { name: 'Close More' }).click();
  await expect(tab(2, 'More')).toHaveCount(0);
  await expect(tab(2, 'Home')).toHaveAttribute('aria-selected', 'true');
  await expect(tab(1, 'More')).toHaveCount(1);
  await expect(tab(3, 'More')).toHaveCount(1);
});

// KF-SYGSD0: the edit canvas shows a modal DialogSurface embedded; play mode
// opens it from its `show-dialog` trigger as an app does.
test('a dialog shows embedded on the canvas and opens from its trigger in play', async ({
  page,
}, testInfo) => {
  const dialogIds = {
    pane: '01JB8Z1M6Q8E1X9V4S7K2R3TCA',
    trigger: '01JB8Z1M6Q8E1X9V4S7K2R3TCB',
    dialog: '01JB8Z1M6Q8E1X9V4S7K2R3TCC',
    note: '01JB8Z1M6Q8E1X9V4S7K2R3TCD',
    done: '01JB8Z1M6Q8E1X9V4S7K2R3TCE',
  };
  const withDialog = {
    schema: 'kerf-ui-document/v1',
    name: 'Settings',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: dialogIds.pane,
      type: '@kerfjs/ui:pane',
      zones: {
        content: [
          {
            id: dialogIds.trigger,
            type: '@kerfjs/ui:button',
            props: {
              children: 'Open settings',
              action: 'show-dialog',
              rootAttributes: { 'data-dialog-id': 'settings' },
            },
          },
          {
            id: dialogIds.dialog,
            type: '@kerfjs/ui:surface-scaffold',
            props: { id: 'settings', label: 'Settings' },
            zones: {
              children: [text(dialogIds.note, 'Workspace settings')],
              footer: [
                {
                  id: dialogIds.done,
                  type: '@kerfjs/ui:button',
                  props: {
                    children: 'Done',
                    tone: 'brand',
                    rootAttributes: { 'data-dialog-close': '' },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  };
  await page.goto('/');
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: 'settings.kui.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(withDialog)),
    });
  await expect(page.getByText(/· 5 nodes · valid$/)).toBeVisible();

  // The canvas shows the closed modal in flow, and its content selects.
  const canvas = page.locator('[data-editor-canvas]');
  const shown = canvas.locator('dialog#settings');
  await expect(shown).toBeVisible();
  await expect(shown).toHaveAttribute('data-presentation', 'embedded');
  await expect(canvas.getByText('Workspace settings')).toBeVisible();
  await canvas.getByRole('button', { name: 'Done' }).click();
  await expect(shown).toBeVisible();
  // Its data-dialog-close control selected (the ring shows) and left the
  // dialog on the canvas.
  await expect(page.locator('.kui-editor__selection')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('dialog-canvas-embedded.png'),
  });

  // In play the dialog is modal: closed until its trigger opens it.
  await page.locator('[data-action="editor-play"]').click();
  const played = stage(page);
  const modal = played.locator('dialog#settings');
  await expect(
    played.getByRole('button', { name: 'Open settings' }),
  ).toBeVisible();
  await expect(modal).toBeHidden();
  await played.getByRole('button', { name: 'Open settings' }).click();
  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute('data-presentation', 'modal');
  // Its enter motion settles before the capture.
  await expect(modal).not.toHaveAttribute('data-kui-dialog-motion');
  await page.screenshot({ path: testInfo.outputPath('dialog-play-open.png') });
  await modal.getByRole('button', { name: 'Done' }).click();
  await expect(modal).toBeHidden();
});

// KF-T1V86Q: a PopoverDialogSurface shows embedded on the canvas, where its
// content selects; in play it opens from its popovertarget trigger and docks
// to the placeholder anchor the play page names for its `anchorName`.
test('a popover dialog shows embedded on the canvas and docks to the placeholder anchor in play', async ({
  page,
}, testInfo) => {
  const ids = {
    pane: '01JB8Z1M6Q8E1X9V4S7K2R3TDA',
    trigger: '01JB8Z1M6Q8E1X9V4S7K2R3TDB',
    request: '01JB8Z1M6Q8E1X9V4S7K2R3TDC',
    note: '01JB8Z1M6Q8E1X9V4S7K2R3TDD',
    deny: '01JB8Z1M6Q8E1X9V4S7K2R3TDE',
  };
  const withRequest = {
    schema: 'kerf-ui-document/v1',
    name: 'Request',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: ids.pane,
      type: '@kerfjs/ui:pane',
      zones: {
        content: [
          {
            id: ids.trigger,
            type: '@kerfjs/ui:button',
            props: {
              children: 'Show Request',
              popoverTarget: 'request',
              popoverTargetAction: 'show',
            },
          },
          {
            id: ids.request,
            type: '@kerfjs/ui:surface-scaffold#PopoverDialogSurface',
            props: {
              id: 'request',
              label: 'Allow File Access',
              dismiss: 'manual',
              anchorName: '--app-main',
            },
            zones: {
              children: [
                text(ids.note, 'The assistant wants to read three files.'),
                {
                  id: ids.deny,
                  type: '@kerfjs/ui:button',
                  props: {
                    children: 'Deny',
                    emphasis: 'secondary',
                    popoverTarget: 'request',
                    popoverTargetAction: 'hide',
                  },
                },
              ],
            },
          },
        ],
      },
    },
  };
  await page.goto('/');
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: 'request.kui.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(withRequest)),
    });
  await expect(page.getByText(/· 5 nodes · valid$/)).toBeVisible();

  // The canvas shows the closed popover in flow; its content selects.
  const canvas = page.locator('[data-editor-canvas]');
  const shown = canvas.locator('section#request');
  await expect(shown).toBeVisible();
  await expect(shown).toHaveAttribute('data-presentation', 'embedded');
  await expect(shown).not.toHaveAttribute('popover');
  await canvas.getByText('The assistant wants to read three files.').click();
  await expect(page.locator('.kui-editor__selection')).toBeVisible();
  await expect(shown).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('popover-dialog-canvas-embedded.png'),
  });

  // In play it is an overlay: closed until its trigger opens it.
  await page.locator('[data-action="editor-play"]').click();
  const played = stage(page);
  const request = played.locator('section#request');
  const trigger = played.getByRole('button', { name: 'Show Request' });
  await expect(trigger).toBeVisible();
  await expect(request).toBeHidden();
  await trigger.click();
  await expect(request).toBeVisible();
  await expect(request).toHaveAttribute('data-presentation', 'overlay');
  await expect(request).toHaveAttribute('popover', 'manual');
  // The placeholder anchor: the element the play page named `--app-main`.
  const docking = await request.evaluate((el) => {
    const anchor = [
      ...el.ownerDocument.querySelectorAll<HTMLElement>('*'),
    ].find(
      (node) => node.style.getPropertyValue('anchor-name') === '--app-main',
    );
    if (!anchor) return null;
    const a = anchor.getBoundingClientRect();
    const p = el.getBoundingClientRect();
    return {
      supported: CSS.supports('anchor-name', '--a'),
      bottomGap: a.bottom - p.bottom,
      leftGap: p.left - a.left,
      rightGap: a.right - p.right,
    };
  });
  expect(docking).not.toBeNull();
  if (docking!.supported) {
    expect(Math.abs(docking!.bottomGap - 16)).toBeLessThan(1);
    expect(Math.abs(docking!.leftGap - docking!.rightGap)).toBeLessThan(1);
  }
  // Manual: Escape leaves the request open; its own control closes it.
  await page.keyboard.press('Escape');
  await expect(request).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('popover-dialog-play-docked.png'),
  });
  await request.getByRole('button', { name: 'Deny' }).click();
  await expect(request).toBeHidden();
});

// KF-963DMT: play mode runs the shipped listbox keyboard: one Tab stop,
// arrows move focus without selecting, and Enter activates the focused
// option through its click. A SummaryRow listbox gets it from
// `wireSummaryRows`, a ContentItem one from `wireContentItems`, whose
// `action` then reaches the action log.
const loadDocument = async (page: Page, name: string, root: object) => {
  await page.goto('/');
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: `${name}.kui.json`,
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          schema: 'kerf-ui-document/v1',
          name,
          catalogs: ['@kerfjs/ui'],
          root,
        }),
      ),
    });
};
const listboxOf = (children: object[]) => ({
  id: '01JB8Z1M6Q8E1X9V4S7K2R3V0A',
  type: '@kerfjs/ui:list',
  props: { selectionMode: 'single', ariaLabel: 'Tickets' },
  zones: { children },
});
/** Tabbing, arrows, and Home/End over three played options. */
const expectListboxKeys = async (page: Page) => {
  const options = stage(page).getByRole('option');
  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toHaveAttribute('tabindex', '0');
  await expect(options.nth(1)).toHaveAttribute('tabindex', '-1');
  await expect(options.nth(2)).toHaveAttribute('tabindex', '-1');
  await options.nth(0).focus();
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(options.nth(2)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(options.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toBeFocused();
  // Only the moved-to option is the Tab stop.
  await expect(options.nth(0)).toHaveAttribute('tabindex', '-1');
  await expect(options.nth(1)).toHaveAttribute('tabindex', '0');
  return options;
};

test('a played SummaryRow listbox is one Tab stop with arrow keys and Enter', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const row = (n: number, title: string) => ({
    id: `01JB8Z1M6Q8E1X9V4S7K2R3V${n}A`,
    type: '@kerfjs/ui:summary-row',
    // KF-YT6A0N: an option's `action` is a document action.
    props: { semanticRole: 'option', action: { $action: `open-row-${n}` } },
    zones: {
      title: [
        {
          id: `01JB8Z1M6Q8E1X9V4S7K2R3V${n}B`,
          type: '@kerfjs/ui:text',
          props: { variant: 'span', children: title },
        },
      ],
    },
  });
  await loadDocument(
    page,
    'Tickets',
    listboxOf([
      row(1, 'First ticket'),
      row(2, 'Second ticket'),
      row(3, 'Third ticket'),
    ]),
  );
  await expect(page.getByText(/· 7 nodes · valid$/)).toBeVisible();
  await play(page);
  await expectListboxKeys(page);
  // Moving focus fires nothing; Enter fires the focused option's action.
  const log = page.locator('[data-action="editor-play-log"]');
  await expect(log).toHaveAttribute('aria-label', 'Action log');
  await page.keyboard.press('Enter');
  await expect(log).toHaveAttribute('aria-label', 'Action log, 1 new');
  await log.click();
  const entries = page
    .locator('[data-component="anchored-surface"]')
    .locator('[data-editor-play-log-entry]');
  await expect(entries).toHaveCount(1);
  await expect(entries.nth(0)).toContainText('open-row-2');
});

test('a played ContentItem listbox moves with the arrows and logs Enter', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const item = (n: number, title: string, action: string) => ({
    id: `01JB8Z1M6Q8E1X9V4S7K2R3V${n}C`,
    type: '@kerfjs/ui:content-item',
    props: {
      interactive: true,
      selectionMode: 'single',
      title,
      action: { $action: action },
    },
  });
  await loadDocument(
    page,
    'Documents',
    listboxOf([
      item(1, 'Brief', 'open-brief'),
      item(2, 'Budget', 'open-budget'),
      item(3, 'Plan', 'open-plan'),
    ]),
  );
  await expect(page.getByText(/· 4 nodes · valid$/)).toBeVisible();
  await play(page);
  await expectListboxKeys(page);
  // Moving focus fires nothing; Enter fires the focused option's action.
  const log = page.locator('[data-action="editor-play-log"]');
  await expect(log).toHaveAttribute('aria-label', 'Action log');
  await page.keyboard.press('Enter');
  await expect(log).toHaveAttribute('aria-label', 'Action log, 1 new');
  await log.click();
  const entries = page
    .locator('[data-component="anchored-surface"]')
    .locator('[data-editor-play-log-entry]');
  await expect(entries).toHaveCount(1);
  await expect(entries.nth(0)).toContainText('open-budget');
});
