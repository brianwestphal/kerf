import { expect, test } from '@playwright/test';

// KF-59BF6C: a Select's popup note. Quiet text below the choices, announced as
// the listbox's description, wrapped to the choices' width rather than widening
// the popup. The Select catalog entry's Popup Note example shows it, and its
// Settings pane hides it and resets it.

const NOTE = 'Touch input and the on-screen keyboard aren’t emulated.';

test('a toolbar Select shows its popup note below the choices', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=select');
  const select = page.locator('kui-select[name="popup-note-device"]');
  await select.scrollIntoViewIfNeeded();
  await select.getByRole('combobox').click();
  await expect(select).toHaveAttribute('open', '');
  const listbox = select.getByRole('listbox');
  await expect(listbox).toHaveAttribute('aria-description', NOTE);
  const note = select.locator('.kui-select__note');
  await expect(note).toBeVisible();
  await expect(note).toHaveText(NOTE);
  await expect(note).toHaveAttribute('aria-hidden', 'true');
  // The note is the popup's last part, below every choice, and wraps to the
  // choices' width instead of widening the popup.
  const geometry = await select.evaluate((host) => {
    const popup = host.querySelector<HTMLElement>('.kui-select__popup')!;
    const box = (element: Element) => element.getBoundingClientRect();
    const options = [
      ...host.querySelectorAll<HTMLElement>('.kui-select__option'),
    ];
    const noteBox = box(host.querySelector('.kui-select__note')!);
    return {
      last: popup.lastElementChild!.className,
      below: options.every((option) => box(option).bottom <= noteBox.top),
      noteWidth: noteBox.width,
      listWidth: box(host.querySelector('.kui-select__listbox')!).width,
      lines: (() => {
        const style = window.getComputedStyle(
          host.querySelector('.kui-select__note')!,
        );
        const text =
          noteBox.height -
          Number.parseFloat(style.paddingTop) -
          Number.parseFloat(style.paddingBottom) -
          Number.parseFloat(style.borderTopWidth);
        return Math.round(text / Number.parseFloat(style.lineHeight));
      })(),
    };
  });
  expect(geometry.last).toBe('kui-select__note');
  expect(geometry.below).toBe(true);
  expect(geometry.noteWidth).toBeLessThanOrEqual(geometry.listWidth + 1);
  expect(geometry.lines).toBeGreaterThan(1);
  // Choosing still works with the note in the popup.
  await select.getByRole('option', { name: 'Tablet' }).click();
  await expect(select.getByRole('combobox')).toContainText('Tablet');

  // The Settings pane hides the note, and Reset brings it back.
  const setting = page.locator('kui-select[name="select-popup-note"]');
  await setting.getByRole('combobox').click();
  await setting.getByRole('option', { name: 'Hidden' }).click();
  await expect(select.locator('.kui-select__note')).toHaveCount(0);
  await expect(select.locator('.kui-select__listbox')).not.toHaveAttribute(
    'aria-description',
    /.*/,
  );
  await page.locator('[data-action="select-reset"]').click();
  await expect(select.locator('.kui-select__note')).toHaveCount(1);
  await expect(select.getByRole('combobox')).toContainText('Phone');
});
