import { expect, type Locator, type Page, test } from '@playwright/test';

// A Select and a PopupMenu are the same popup control, one storing a value and
// one dispatching a command. Before, the PopupMenu drew its own Web Awesome
// dropdown geometry (8px menu inset, 35px rows with no check column, a scaling
// entrance, a static caret) beside the Select's cleaner listbox. Both now read
// one popup-choice contract, so their rows, surface inset, caret motion, and
// current-row fill must stay identical. The Select trigger also no longer
// paints its focus ring while its listbox is open, like the PopupMenu trigger.

interface Metrics {
  inset: string;
  rowHeight: number;
  rowPaddingBlock: string;
  rowPaddingInlineEnd: string;
  contentStart: number;
  labelPaddingBlock: string;
  labelLineHeight: string;
  caretRotate: string;
  caretTransition: string;
  surfaceScale: string;
}

function selectMetrics(select: Locator): Promise<Metrics> {
  return select.evaluate((host) => {
    const root = host.shadowRoot!;
    const listbox = root.querySelector<HTMLElement>('[part~="listbox"]')!;
    const option = host.querySelector('wa-option')!;
    const label =
      option.shadowRoot!.querySelector<HTMLElement>('[part~="label"]')!;
    const start =
      option.shadowRoot!.querySelector<HTMLSlotElement>('[part~="start"]')!;
    const expand = root.querySelector<HTMLElement>('[part~="expand-icon"]')!;
    const row = window.getComputedStyle(option);
    const firstContent = (
      start.assignedElements().length > 0 ? start : label
    ).getBoundingClientRect().left;
    return {
      inset: window.getComputedStyle(listbox).padding,
      rowHeight: Math.round(option.getBoundingClientRect().height * 10) / 10,
      rowPaddingBlock: `${row.paddingTop} ${row.paddingBottom}`,
      rowPaddingInlineEnd: row.paddingRight,
      contentStart: Math.round(
        firstContent - option.getBoundingClientRect().left,
      ),
      labelPaddingBlock: window.getComputedStyle(label).paddingTop,
      labelLineHeight: window.getComputedStyle(label).lineHeight,
      caretRotate: window.getComputedStyle(expand).rotate,
      caretTransition: window.getComputedStyle(expand).transition,
      surfaceScale: window.getComputedStyle(listbox).scale,
    };
  });
}

function menuMetrics(menu: Locator): Promise<Metrics> {
  return menu.evaluate((host) => {
    const surface =
      host.shadowRoot!.querySelector<HTMLElement>('[part~="menu"]')!;
    const item = host.querySelector('wa-dropdown-item')!;
    const label =
      item.shadowRoot!.querySelector<HTMLElement>('[part~="label"]')!;
    const icon = item.querySelector<HTMLElement>('[slot="icon"]');
    const caret = host
      .querySelector('wa-button')!
      .shadowRoot!.querySelector<HTMLElement>('[part~="caret"]')!;
    const row = window.getComputedStyle(item);
    return {
      inset: window.getComputedStyle(surface).padding,
      rowHeight: Math.round(item.getBoundingClientRect().height * 10) / 10,
      rowPaddingBlock: `${row.paddingTop} ${row.paddingBottom}`,
      rowPaddingInlineEnd: row.paddingRight,
      contentStart: Math.round(
        (icon ?? label).getBoundingClientRect().left -
          item.getBoundingClientRect().left,
      ),
      labelPaddingBlock: window.getComputedStyle(label).paddingTop,
      labelLineHeight: window.getComputedStyle(label).lineHeight,
      caretRotate: window.getComputedStyle(caret).rotate,
      caretTransition: window.getComputedStyle(caret).transition,
      surfaceScale: window.getComputedStyle(surface).scale,
    };
  });
}

function comboboxOutline(select: Locator) {
  return select.evaluate((host) => {
    const combobox =
      host.shadowRoot!.querySelector<HTMLElement>('[part~="combobox"]')!;
    const style = window.getComputedStyle(combobox);
    return { style: style.outlineStyle, color: style.outlineColor };
  });
}

const transparent = /rgba\(0, 0, 0, 0\)|transparent/;

async function openDemo(page: Page) {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=toolbar-control-group');
  const select = page.locator('wa-select[name="toolbar-group-sort"]');
  const group = select.locator('xpath=..');
  const menu = group.locator('> wa-dropdown');
  await expect(select).toBeVisible();
  await select.scrollIntoViewIfNeeded();
  return { select, group, menu };
}

test('PopupMenu draws the same popup, rows, and caret motion as Select', async ({
  page,
}) => {
  const { select, menu } = await openDemo(page);

  const closedSelect = await selectMetrics(select);
  const closedMenu = await menuMetrics(menu);
  expect(closedMenu.caretRotate).toBe(closedSelect.caretRotate);
  expect(closedMenu.caretTransition).toBe(closedSelect.caretTransition);
  expect(closedMenu.caretTransition).toContain('rotate');

  await select.click();
  await expect(select).toHaveAttribute('open', '');
  await expect
    .poll(async () => (await selectMetrics(select)).caretRotate)
    .toBe('-180deg');
  const openSelect = await selectMetrics(select);
  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open', '');

  await menu.locator('> wa-button').click();
  await expect(menu).toHaveAttribute('open', '');
  await expect
    .poll(async () => (await menuMetrics(menu)).caretRotate)
    .toBe('-180deg');
  const openMenu = await menuMetrics(menu);

  // The open caret turns to face the popup in both controls.
  expect(openSelect.caretRotate).toBe('-180deg');
  expect(openMenu.caretRotate).toBe(openSelect.caretRotate);
  // One surface inset and row geometry. The checked choice test in
  // popup-menu.spec.ts covers the reserved check column; this menu contains
  // a plain Archive command, which starts at the checkmark's leading edge.
  expect(openMenu.inset).toBe(openSelect.inset);
  expect(openMenu.rowHeight).toBe(openSelect.rowHeight);
  expect(openMenu.rowPaddingBlock).toBe(openSelect.rowPaddingBlock);
  expect(openMenu.rowPaddingInlineEnd).toBe(openSelect.rowPaddingInlineEnd);
  expect(openMenu.labelPaddingBlock).toBe(openSelect.labelPaddingBlock);
  expect(openMenu.labelLineHeight).toBe(openSelect.labelLineHeight);
  expect(openMenu.contentStart).toBeGreaterThanOrEqual(8);
  expect(openMenu.contentStart).toBeLessThan(openSelect.contentStart);
  // The PopupMenu fades like the Select's popup instead of scaling in.
  expect(openMenu.surfaceScale).toBe('none');
  await page.keyboard.press('Escape');
});

test('a keyboard-current PopupMenu item takes the Select current-row fill', async ({
  page,
}) => {
  const { select, menu } = await openDemo(page);
  await select.getByRole('combobox').focus();
  await page.keyboard.press('Enter');
  await expect(select).toHaveAttribute('open', '');
  const current = select.locator('wa-option').first();
  const currentFill = () =>
    current.evaluate((option) => {
      const style = window.getComputedStyle(option);
      return { color: style.color, background: style.backgroundColor };
    });
  // Wait out the option's background transition before sampling it.
  let previous = '';
  await expect
    .poll(async () => {
      const sample = JSON.stringify(await currentFill());
      const settled = sample === previous;
      previous = sample;
      return settled;
    })
    .toBe(true);
  const selectCurrent = await currentFill();
  await page.keyboard.press('Escape');

  await menu.locator('> wa-button').focus();
  await page.keyboard.press('Enter');
  const item = menu.locator('wa-dropdown-item').first();
  await expect(item).toBeFocused();
  // Color and fill transition in; poll for the settled current row.
  await expect
    .poll(() =>
      item.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          color: style.color,
          background: style.backgroundColor,
          outline: style.outlineStyle,
        };
      }),
    )
    .toEqual({ ...selectCurrent, outline: 'none' });
  await page.keyboard.press('Escape');
});

test('an open Select hides its trigger focus ring and restores it on close', async ({
  page,
}) => {
  const { select, group } = await openDemo(page);
  const neighbor = group.locator('> button').first();
  await neighbor.focus();
  await page.keyboard.press('Tab');

  // Closed with keyboard focus: the per-control ring is visible.
  await expect
    .poll(async () => (await comboboxOutline(select)).color)
    .not.toMatch(transparent);
  expect((await comboboxOutline(select)).style).toBe('solid');

  // Open, by keyboard or pointer: the listbox shows focus, not the trigger.
  await page.keyboard.press('Enter');
  await expect(select).toHaveAttribute('open', '');
  await expect
    .poll(async () => (await comboboxOutline(select)).color)
    .toMatch(transparent);
  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open', '');
  await expect
    .poll(async () => (await comboboxOutline(select)).color)
    .not.toMatch(transparent);

  await select.click();
  await expect(select).toHaveAttribute('open', '');
  await expect
    .poll(async () => (await comboboxOutline(select)).color)
    .toMatch(transparent);
  await page.keyboard.press('Escape');
});
