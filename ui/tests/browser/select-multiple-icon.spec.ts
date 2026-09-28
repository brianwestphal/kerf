import { expect, type Locator, test } from '@playwright/test';

// A multiple Select drawn as an icon-only toolbar trigger (a "Filter by
// label" funnel) shows a fixed trigger icon, a count badge while any choice is
// chosen, and ends its accessible name with the chosen labels; its popup stays
// open while choices toggle, like any multiple Select. Both demo filters share
// one application value, so toggling one re-renders the other.

function trigger(select: Locator) {
  return select.evaluate((host) => {
    const box = (element: Element) => element.getBoundingClientRect();
    const combobox = host.shadowRoot!.querySelector('[part~="combobox"]')!;
    const caret = host.shadowRoot!.querySelector('[part~="expand-icon"]')!;
    const icon = host.querySelector(
      '.kui-select__trigger-icon, .kui-select__icon--selected',
    )!;
    const count = host.querySelector('.kui-select__count');
    return {
      display: host.shadowRoot!.querySelector<HTMLInputElement>(
        '[part~="display-input"]',
      )!.value,
      count: count?.textContent ?? null,
      icon: icon.querySelector('svg')!.getAttribute('data-lucide'),
      combobox: box(combobox),
      iconBox: box(icon),
      countBox: count ? box(count) : null,
      caret: box(caret),
    };
  });
}

test('an icon-only multiple Select names its selection, counts it, and stays open while toggling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=select');
  const select = page.locator('wa-select[name="ticket-label-filter"]');
  const sibling = page.locator('wa-select[name="toolbar-ticket-label-filter"]');
  await expect(select).toBeVisible();
  await select.scrollIntoViewIfNeeded();
  const combobox = select.getByRole('combobox');

  await expect(combobox).toHaveAccessibleName('Filter by label: Bug, Docs');
  let current = await trigger(select);
  expect(current.icon).toBe('funnel');
  expect(current.count).toBe('2');
  // The value text is hidden, and the name already carries the summary.
  expect(current.display).toBe('');
  // Icon, count, caret: 4px from the icon to the count, then the same
  // icon-to-caret spacing and inline padding as a single icon-only
  // trigger, all vertically centered in the pill.
  const single = await trigger(
    page.locator('wa-select[name="toolbar-default-rendering-balance"]'),
  );
  const caretGap = single.caret.left - single.iconBox.right;
  expect(current.countBox!.left - current.iconBox.right).toBeCloseTo(4, 0);
  expect(current.caret.left - current.countBox!.right).toBeCloseTo(caretGap, 0);
  expect(current.iconBox.left - current.combobox.left).toBeCloseTo(
    single.iconBox.left - single.combobox.left,
    0,
  );
  expect(current.combobox.height).toBeCloseTo(single.combobox.height, 0);
  const middle = current.combobox.top + current.combobox.height / 2;
  for (const part of [current.iconBox, current.countBox!])
    expect(part.top + part.height / 2).toBeCloseTo(middle, 0);

  await select.click();
  await expect(select).toHaveAttribute('open', '');
  await select.locator('wa-option[value="bug"]').click();
  await expect(combobox).toHaveAccessibleName('Filter by label: Docs');
  expect((await trigger(select)).count).toBe('1');
  await expect(select).toHaveAttribute('open', '');
  // The other filter renders the same application value.
  await expect(sibling.getByRole('combobox')).toHaveAccessibleName(
    'Filter by label: Docs',
  );

  await select.locator('wa-option[value="docs"]').click();
  await expect(combobox).toHaveAccessibleName('Filter by label');
  current = await trigger(select);
  expect(current.count).toBe(null);
  expect(current.caret.left - current.iconBox.right).toBeCloseTo(caretGap, 0);
  await expect(select).toHaveAttribute('open', '');

  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open', '');
  await expect(combobox).toBeFocused();
});

test('an icon-only multiple Select beside actions toggles from the keyboard and matches its siblings', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=select');
  const select = page.locator('wa-select[name="toolbar-ticket-label-filter"]');
  await expect(select).toBeVisible();
  await select.scrollIntoViewIfNeeded();
  const pin = page.locator(
    '[data-demo="select"] button[aria-label="Pin view"]',
  );
  await pin.focus();
  await page.keyboard.press('Tab');
  const combobox = select.getByRole('combobox');
  await expect(combobox).toBeFocused();

  // One segment of the group: the same height as the sibling button.
  const heights = await select.evaluate((host) => {
    const group = host.closest('.kui-toolbar-control-group')!;
    return {
      select: host
        .shadowRoot!.querySelector('[part~="combobox"]')!
        .getBoundingClientRect().height,
      button: group.querySelector('button')!.getBoundingClientRect().height,
    };
  });
  expect(heights.select).toBeCloseTo(heights.button, 0);

  await page.keyboard.press('Enter');
  await expect(select).toHaveAttribute('open', '');
  await expect(select.getByRole('listbox')).toHaveAttribute(
    'aria-multiselectable',
    'true',
  );
  // The first chosen option (Bug) is current; ArrowDown to Feature.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(combobox).toHaveAccessibleName(
    'Filter by label: Bug, Feature, Docs',
  );
  expect((await trigger(select)).count).toBe('3');
  await expect(select).toHaveAttribute('open', '');

  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open', '');
  await expect(combobox).toBeFocused();
});
