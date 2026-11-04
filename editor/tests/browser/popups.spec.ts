// KF-KN9CPE: the edit canvas previews the selected PopupMenu's or Select's
// popup open at its trigger, in the document (`embedded`), so the items and
// choices edited in the Inspector can be seen; play mode keeps the real
// popup.
import { expect, type Locator, type Page, test } from '@playwright/test';

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

const openDocument = async (page: Page) => {
  await page.goto('/');
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: 'popups.kui.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(document)),
    });
  await expect(page.getByText(/· 8 nodes · valid$/)).toBeVisible();
};

const canvasNode = (page: Page, id: string) =>
  page.locator(`[data-editor-canvas] [data-kerf-node="${id}"]`);

const capture = async (page: Page, path: string) => {
  await page.mouse.move(1, 1);
  await page.waitForTimeout(250);
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
