import { expect, type Page, test } from '@playwright/test';

// A Select inside a scrolling dialog body must not leave its closed listbox
// behind as scrollable overflow. WebKit kept the popup's last box in the
// body's scroll extent after the popover left the top layer, so the body
// scrolled into a blank band below its content (Karwan's questions dialog: a
// wa-dialog in a positioned section of a scrolling pane).

async function mountDialog(page: Page) {
  await page.setViewportSize({ width: 480, height: 700 });
  await page.goto('/?component=select');
  await page.locator('[name="rendering-balance"]').evaluate((select) => {
    const pane = select.closest('.kui-pane__content')!;
    select.setAttribute('label', 'Required packing');
    const dialog = document.createElement('wa-dialog');
    dialog.setAttribute('label', 'A few details');
    dialog.dataset.overflowFixture = '';
    const input = document.createElement('wa-input');
    input.setAttribute('label', 'Quantity');
    input.setAttribute('type', 'number');
    const stack = document.createElement('div');
    stack.style.cssText = 'display:flex;flex-direction:column;gap:24px';
    stack.append(select, input);
    dialog.append(stack);
    const section = document.createElement('section');
    section.style.position = 'relative';
    section.append(dialog);
    pane.prepend(section);
    (dialog as HTMLElement & { open: boolean }).open = true;
  });
  const dialog = page.locator('[data-overflow-fixture]');
  await expect(dialog).toHaveAttribute('open', '');
  // Let the dialog's show animation settle before measuring.
  await page.waitForTimeout(500);
  return dialog;
}

function scrollExtent(page: Page) {
  return page.locator('[data-overflow-fixture]').evaluate((dialog) => {
    const body = dialog.shadowRoot!.querySelector('[part~="body"]')!;
    return { client: body.clientHeight, scroll: body.scrollHeight };
  });
}

async function openSelect(page: Page) {
  const select = page.locator('[data-overflow-fixture] .kui-select');
  await select.evaluate((element) => {
    element.addEventListener(
      'wa-after-show',
      () => element.setAttribute('data-qa-shown', ''),
      { once: true },
    );
  });
  await select.click();
  await expect(select).toHaveAttribute('data-qa-shown', '');
  await select.evaluate((element) => element.removeAttribute('data-qa-shown'));
  return select;
}

test('closing a Select in a scrolling dialog leaves no blank scroll space', async ({
  page,
}, testInfo) => {
  await mountDialog(page);
  const initial = await scrollExtent(page);

  // Close with Escape: the body keeps its extent and focus stays on the Select.
  const select = await openSelect(page);
  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open');
  await page.waitForTimeout(300);
  expect(await scrollExtent(page)).toEqual(initial);
  expect(
    await select.evaluate((element) => document.activeElement === element),
  ).toBe(true);

  // The keyboard still drives the Select after the relayout.
  await page.keyboard.press('ArrowDown');
  await expect(select).toHaveAttribute('open');
  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open');

  // Close by picking a value.
  await openSelect(page);
  await page
    .locator('[data-overflow-fixture] .kui-select wa-option')
    .nth(1)
    .click();
  await expect(select).not.toHaveAttribute('open');
  await page.waitForTimeout(300);
  expect(await scrollExtent(page)).toEqual(initial);
  await expect(page.locator('[data-overflow-fixture]')).toHaveAttribute(
    'open',
    '',
  );

  await page.locator('[data-overflow-fixture]').evaluate((dialog) => {
    dialog.shadowRoot!.querySelector('[part~="body"]')!.scrollTop = 10_000;
  });
  await page.screenshot({
    path: testInfo.outputPath('select-dialog-overflow-scrolled.png'),
  });
});
