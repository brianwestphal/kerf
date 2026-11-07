// KF-KN9CPE: the edit canvas previews the selected PopupMenu's or Select's
// popup open at its trigger, in the document (`embedded`), so the items and
// choices edited in the Inspector can be seen; play mode keeps the real
// popup.
import { expect, type Locator, type Page, test } from '@playwright/test';

import { settled } from './settled.js';

const ids = {
  pane: '01JB8Z1M6Q8E1X9V4S7K2R3TDA',
  toolbar: '01JB8Z1M6Q8E1X9V4S7K2R3TDB',
  title: '01JB8Z1M6Q8E1X9V4S7K2R3TDC',
  group: '01JB8Z1M6Q8E1X9V4S7K2R3TDD',
  menu: '01JB8Z1M6Q8E1X9V4S7K2R3TDE',
  icon: '01JB8Z1M6Q8E1X9V4S7K2R3TDF',
  select: '01JB8Z1M6Q8E1X9V4S7K2R3TDG',
  text: '01JB8Z1M6Q8E1X9V4S7K2R3TDH',
};

/**
 * A Pane whose Toolbar's trailing group holds a More Actions PopupMenu,
 * above a form Select and a line of text.
 */
const document = {
  schema: 'kerf-ui-document/v1',
  name: 'Popups',
  catalogs: ['@kerfjs/ui'],
  root: {
    id: ids.pane,
    type: '@kerfjs/ui:pane',
    props: { fill: true },
    zones: {
      content: [
        {
          id: ids.toolbar,
          type: '@kerfjs/ui:toolbar',
          props: { label: 'Ticket View' },
          zones: {
            leading: [
              {
                id: ids.title,
                type: '@kerfjs/ui:toolbar-text',
                props: { text: 'Tickets', size: 'xlarge' },
              },
            ],
            trailing: [
              {
                id: ids.group,
                type: '@kerfjs/ui:toolbar-control-group',
                props: {
                  menuInset: 'compact',
                  single: true,
                  nestedDropdown: true,
                },
                zones: {
                  children: [
                    {
                      id: ids.menu,
                      type: '@kerfjs/ui:popup-menu',
                      props: {
                        label: 'More Actions',
                        placement: 'bottom-end',
                        items: [
                          { label: 'Export', action: 'log-more' },
                          { label: 'Print', action: 'log-more' },
                        ],
                      },
                      zones: {
                        icon: [
                          {
                            id: ids.icon,
                            type: '@kerfjs/ui:lucide-icon',
                            props: {
                              icon: { $icon: 'ellipsis' },
                              name: 'ellipsis',
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          id: ids.select,
          type: '@kerfjs/ui:select',
          props: {
            name: 'priority',
            label: 'Priority',
            hint: 'Sets the order of the queue.',
            value: 'normal',
            choices: [
              { value: 'low', label: 'Low' },
              { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'High' },
            ],
          },
        },
        {
          id: ids.text,
          type: '@kerfjs/ui:text',
          props: { children: 'Tickets assigned to you appear here.' },
        },
      ],
    },
  },
};

const openDocument = async (page: Page, opened: object = document) => {
  await page.goto('/');
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: 'popups.kui.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(opened)),
    });
  await expect(page.getByText(/· 8 nodes · valid$/)).toBeVisible();
};

const canvasNode = (page: Page, id: string) =>
  page.locator(`[data-editor-canvas] [data-kerf-node="${id}"]`);

const capture = async (page: Page, path: string) => {
  await page.mouse.move(1, 1);
  await settled(page);
  await page.screenshot({ path, animations: 'disabled' });
};

/** Whether focus lies outside `locator`. */
const unfocused = (locator: Locator) =>
  locator.evaluate(
    (element) => !element.contains(globalThis.document.activeElement),
  );

/** Whether the element at the center of `locator` is inside it (on top). */
const onTop = (locator: Locator) =>
  locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const hit = globalThis.document.elementFromPoint(
      box.x + box.width / 2,
      box.y + box.height / 2,
    );
    return hit !== null && element.contains(hit);
  });

test("the canvas shows the selected popup's rows at its trigger", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  const menu = canvasNode(page, ids.menu);
  const select = canvasNode(page, ids.select);
  const menuTrigger = menu.locator('.kui-popup-menu__trigger');
  // Closed until selected.
  await expect(menu.locator('.kui-popup-menu__menu')).toBeHidden();
  await expect(select.locator('.kui-select__popup')).toBeHidden();
  const closed = (await menuTrigger.boundingBox())!;

  await menuTrigger.click();
  const rows = menu.locator('.kui-popup-menu__menu');
  await expect(rows).toBeVisible();
  await expect(rows.locator('.kui-popup-menu__item')).toHaveText([
    'Export',
    'Print',
  ]);
  // In the document, not the top layer: below its trigger, end-aligned
  // (bottom-end), over the Select below, and the trigger keeps its place in
  // the toolbar group.
  expect(
    await rows.evaluate((element) => element.hasAttribute('popover')),
  ).toBe(false);
  const [trigger, list] = await Promise.all([
    menuTrigger.boundingBox(),
    rows.boundingBox(),
  ]);
  expect(trigger).toEqual(closed);
  expect(Math.abs(list!.y - (trigger!.y + trigger!.height))).toBeLessThan(2);
  expect(
    Math.abs(list!.x + list!.width - (trigger!.x + trigger!.width)),
  ).toBeLessThan(2);
  expect(list!.height).toBeGreaterThan(40);
  await expect.poll(() => onTop(rows.getByText('Print'))).toBe(true);
  // A row click selects the menu; it runs nothing and opens no popup.
  await rows.getByText('Print').click();
  await expect(rows).toBeVisible();
  // KF-HVJDWF: the clicked row takes no focus, so it paints no current-row
  // fill, and the menu stays selected (only the selected one is embedded).
  await expect(menu).toHaveAttribute('data-embedded', '');
  expect(await unfocused(rows)).toBe(true);
  await page.mouse.move(1, 1);
  await expect(rows.locator('.kui-popup-menu__item').nth(1)).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  );
  await expect(page.locator(':popover-open')).toHaveCount(0);
  await capture(page, info.outputPath('kf-hvjdwf-menu-1440.png'));

  // Selecting the Select closes the menu and shows the Select's listbox.
  await select.locator('.kui-select__trigger').click();
  await expect(rows).toBeHidden();
  const listbox = select.locator('.kui-select__popup');
  await expect(listbox).toBeVisible();
  await expect(listbox.locator('.kui-select__option-label')).toHaveText([
    'Low',
    'Normal',
    'High',
  ]);
  // A choice click selects the Select and leaves its value alone.
  await listbox.getByText('High').click();
  await expect(select.locator('.kui-select__value')).toHaveText('Normal');
  // KF-HVJDWF: the clicked choice takes no focus or current-row fill, and
  // the Select stays selected.
  await expect(select).toHaveAttribute('data-embedded', '');
  expect(await unfocused(listbox)).toBe(true);
  await page.mouse.move(1, 1);
  await expect(listbox.locator('.kui-select__option').nth(2)).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  );
  await expect(page.locator(':popover-open')).toHaveCount(0);
  // Right below the control, over its hint (KF-HVJDWF), as the real
  // listbox opens.
  await expect(select.locator('.kui-select__hint')).toHaveText(
    'Sets the order of the queue.',
  );
  const [field, box] = await Promise.all([
    select.locator('.kui-select__trigger').boundingBox(),
    listbox.boundingBox(),
  ]);
  expect(Math.abs(box!.y - (field!.y + field!.height))).toBeLessThan(2);
  expect(Math.abs(box!.x - field!.x)).toBeLessThan(2);
  // Over the text below it.
  await expect.poll(() => onTop(listbox.getByText('High'))).toBe(true);
  await capture(page, info.outputPath('kf-hvjdwf-select-1440.png'));

  // Selecting another node closes it again.
  await canvasNode(page, ids.text).click();
  await expect(listbox).toBeHidden();
});

test('the narrow canvas shows the selected popups too', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openDocument(page);
  const menu = canvasNode(page, ids.menu);
  await menu.locator('.kui-popup-menu__trigger').click();
  const rows = menu.locator('.kui-popup-menu__menu');
  await expect(rows).toBeVisible();
  // Inside the narrow canvas, over what lies below, without page overflow.
  await expect.poll(() => onTop(rows.getByText('Print'))).toBe(true);
  const fits = () =>
    page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth <=
        globalThis.innerWidth,
    );
  expect(await fits()).toBe(true);
  await capture(page, info.outputPath('kf-hvjdwf-menu-390.png'));
  const select = canvasNode(page, ids.select);
  await select.locator('.kui-select__trigger').click();
  const listbox = select.locator('.kui-select__popup');
  await expect(listbox).toBeVisible();
  await expect.poll(() => onTop(listbox.getByText('High'))).toBe(true);
  expect(await fits()).toBe(true);
  await capture(page, info.outputPath('kf-hvjdwf-select-390.png'));
});

/** The document with a Share item whose submenu holds two commands. */
const withSubmenu = () => {
  interface Node {
    props?: { items?: unknown[] };
    zones?: Record<string, Node[]>;
  }
  const copy = structuredClone(document) as unknown as { root: Node };
  const toolbar = copy.root.zones!.content![0]!;
  const menu = toolbar.zones!.trailing![0]!.zones!.children![0]!;
  menu.props!.items!.push({
    label: 'Share',
    submenu: [
      { label: 'Mail', action: 'log-more' },
      { label: 'Message', action: 'log-more' },
    ],
  });
  return copy;
};

// KF-M2FGPQ: while the Inspector edits an item's submenu, the canvas shows
// that submenu open beside its item, in the document and inert.
for (const width of [1440, 390]) {
  test(`the canvas shows the submenu the Inspector edits at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await openDocument(page, withSubmenu());
    const menu = canvasNode(page, ids.menu);
    await menu.locator('.kui-popup-menu__trigger').click();
    const rows = menu.locator(':scope > .kui-popup-menu__menu');
    await expect(rows).toBeVisible();
    const submenu = menu.locator('[data-submenu]');
    await expect(submenu).toBeHidden();
    // A narrow window collapses the Inspector; its toggle slides it in.
    if (width <= 480)
      await page
        .locator('[data-action="editor-toggle-inspector"]')
        .filter({ visible: true })
        .first()
        .click();
    // The Items row is the Inspector's; an item's rows are in the field
    // dialog it opens.
    const open = async (path: readonly (string | number)[]) => {
      const scope = path.length ? page.locator('dialog[open]') : page;
      const row = scope
        .locator(
          `[data-editor-open='${JSON.stringify({ prop: 'items', path })}']`,
        )
        .filter({ visible: true })
        .first();
      // Once a sliding Inspector has settled across the window.
      await expect
        .poll(async () => {
          const at = await row.boundingBox();
          return at !== null && at.x >= 0 && at.x + at.width <= width;
        })
        .toBe(true);
      await row.click();
    };
    await open([]);
    const asList = page
      .getByRole('button', { name: 'Edit as list' })
      .filter({ visible: true });
    if (await asList.count()) await asList.click();
    await open([2]);
    // The item itself: its submenu stays closed.
    await expect(submenu).toBeHidden();
    await open([2, 'submenu']);
    await expect(submenu).toBeVisible();
    await expect(submenu.locator('.kui-popup-menu__item')).toHaveText([
      'Mail',
      'Message',
    ]);
    await expect(
      rows.locator('.kui-popup-menu__item', { hasText: 'Share' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      await submenu.evaluate((element) => element.hasAttribute('popover')),
    ).toBe(false);
    await expect(page.locator(':popover-open')).toHaveCount(0);
    const [list, sub] = [
      (await rows.boundingBox())!,
      (await submenu.boundingBox())!,
    ];
    if (width > 480) {
      // Beside the item, its first row level with it, and inside the page.
      const share = (await rows
        .locator('.kui-popup-menu__item', { hasText: 'Share' })
        .boundingBox())!;
      const mail = (await submenu
        .locator('.kui-popup-menu__item', { hasText: 'Mail' })
        .boundingBox())!;
      expect(Math.abs(mail.y - share.y)).toBeLessThan(2);
      expect(
        sub.x > list.x + list.width - 8 || sub.x + sub.width < list.x + 8,
      ).toBe(true);
    } else {
      // Below the menu at a phone width.
      expect(sub.y).toBeGreaterThan(list.y + list.height);
    }
    // Inside the canvas: a trailing (bottom-end) menu's submenu opens on the
    // start side, where there is room, as a real one flips there.
    const area = (await page.locator('[data-editor-canvas]').boundingBox())!;
    expect(sub.x).toBeGreaterThanOrEqual(area.x);
    expect(sub.x + sub.width).toBeLessThanOrEqual(area.x + area.width);
    expect(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.innerWidth,
      ),
    ).toBe(true);
    await capture(page, info.outputPath(`kf-m2fgpq-submenu-${width}.png`));
    // Leaving the submenu's field editor closes it again; the menu stays
    // open while it is selected.
    await page
      .locator('dialog[open]')
      .getByRole('button', { name: 'Done' })
      .click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(submenu).toBeHidden();
    await expect(rows).toBeVisible();
  });
}

test('play mode opens the real popups', async ({ page }) => {
  await openDocument(page);
  await canvasNode(page, ids.menu).locator('.kui-popup-menu__trigger').click();
  await expect(
    canvasNode(page, ids.menu).locator('.kui-popup-menu__menu'),
  ).toBeVisible();
  await page.locator('[data-action="editor-play"]').click();
  const stage = page.frameLocator('[data-editor-play-frame]');
  const menu = stage.locator('.kui-popup-menu');
  await expect(menu).toBeVisible();
  // Closed and not embedded, though the edit canvas had it selected.
  await expect(menu).not.toHaveAttribute('data-embedded');
  await expect(menu.locator('.kui-popup-menu__menu')).toBeHidden();
  await menu.locator('.kui-popup-menu__trigger').click();
  await expect(stage.getByRole('menuitem', { name: 'Export' })).toBeVisible();
  expect(
    await menu
      .locator('.kui-popup-menu__menu')
      .evaluate((element) => element.matches(':popover-open')),
  ).toBe(true);
  await page.keyboard.press('Escape');
  const select = stage.locator('.kui-select');
  await select.locator('.kui-select__trigger').click();
  await expect(stage.getByRole('option', { name: 'High' })).toBeVisible();
  await stage.getByRole('option', { name: 'High' }).click();
  await expect(select.locator('.kui-select__value')).toHaveText('High');
});

// KF-A1Y7SY: a PopupMenu or Select placed directly in a Pane (no toolbar)
// shows its embedded popup in flow below its trigger, where the Pane's
// scrolling content cannot clip it: it is painted and hit-testable.
test('a popup outside a toolbar is not clipped by its Pane', async ({
  page,
}) => {
  const bare = {
    schema: 'kerf-ui-document/v1',
    name: 'BarePopups',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3TGA',
      type: '@kerfjs/ui:pane',
      zones: {
        content: [
          {
            id: '01JB8Z1M6Q8E1X9V4S7K2R3TGB',
            type: '@kerfjs/ui:popup-menu',
            props: {
              text: 'Arrange',
              items: [
                { label: 'By Name', action: 'by-name' },
                { label: 'By Size', action: 'by-size' },
              ],
            },
          },
          {
            id: '01JB8Z1M6Q8E1X9V4S7K2R3TGC',
            type: '@kerfjs/ui:select',
            props: {
              name: 'density',
              label: 'Density',
              hint: 'Applies to every list.',
              value: 'comfortable',
              choices: [
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'compact', label: 'Compact' },
              ],
            },
          },
        ],
      },
    },
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: 'bare.kui.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(bare)),
    });
  await expect(page.getByText(/· 3 nodes · valid$/)).toBeVisible();
  const outline = page.locator('[data-action="editor-select-node"]');

  await outline.filter({ hasText: 'PopupMenu' }).first().click();
  const menu = canvasNode(page, '01JB8Z1M6Q8E1X9V4S7K2R3TGB').locator(
    '.kui-popup-menu__menu',
  );
  await expect(menu).toBeVisible();
  await expect.poll(() => onTop(menu)).toBe(true);
  await expect(menu.getByText('By Size')).toBeVisible();

  await outline.filter({ hasText: 'Select' }).first().click();
  const select = canvasNode(page, '01JB8Z1M6Q8E1X9V4S7K2R3TGC');
  const listbox = select.locator('.kui-select__popup');
  await expect(listbox).toBeVisible();
  await expect.poll(() => onTop(listbox)).toBe(true);
  // In flow, right below the control and above the hint.
  const [trigger, list, hint] = await Promise.all(
    ['.kui-select__trigger', '.kui-select__popup', '.kui-select__hint'].map(
      (part) => select.locator(part).boundingBox(),
    ),
  );
  expect(list!.y).toBeGreaterThanOrEqual(trigger!.y + trigger!.height - 1);
  expect(hint!.y).toBeGreaterThanOrEqual(list!.y + list!.height - 1);
  if (process.env.CAP) await capture(page, process.env.CAP);
});
