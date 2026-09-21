import { expect, test } from '@playwright/test';

// KF-17GS8R: the "Adoption knobs" TokenSearchField demo exercises the opt-in
// wireTokenSearchFields hooks a real app reaches for — a focusout keep-open
// exception, the atomic-chip keyboard, and the onEdit readout — across all three
// engines.
test('the adoption-knobs demo drives keep-open, chip keyboard, and onEdit', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=token-search-field');

  const field = page.locator(
    '.token-search-adoption [data-component="token-search-field"]',
  );
  const editor = field.getByRole('searchbox', { name: 'Filter records' });
  const readout = page.locator('[data-demo-adoption-readout]');
  const chips = field.locator('[data-component="token-search-token"]');
  const suggestion = (name: string) =>
    page.locator('.token-search-adoption__suggestion', { hasText: name });

  // Starts expanded and empty (the app owns `expanded`).
  await expect(field).toHaveAttribute('data-expanded', 'true');
  await expect(chips).toHaveCount(0);

  // onEdit fires on input and drives the readout.
  await editor.click();
  await editor.pressSequentially('urgent');
  await expect(readout).toContainText('Editing');
  await expect(readout).toContainText('urgent');

  // Empty the field so collapse-on-empty-blur is armed.
  await editor.evaluate((element) => {
    element.textContent = '';
    element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'deleteContentBackward',
      }),
    );
  });
  await expect(field).toHaveAttribute('data-expanded', 'true');

  // Keep-open exception: focus moving into the data-token-search-keep-open
  // suggestions surface does NOT collapse the empty field.
  await editor.click();
  await suggestion('status:open').focus();
  await expect(field).toHaveAttribute('data-expanded', 'true');
  await expect(chips).toHaveCount(0);

  // Contrast: focus moving to a non-exempt control DOES collapse the empty field.
  await editor.click();
  await page.locator('[data-action="toggle-theme"]').first().focus();
  await expect(field).toHaveAttribute('data-expanded', 'false');

  // Clicking a suggestion adds a chip (and re-expands via the token).
  await field.getByRole('button', { name: 'Open filter' }).click();
  await suggestion('status:open').click();
  await expect(chips).toHaveCount(1);
  await suggestion('owner:me').click();
  await expect(chips).toHaveCount(2);

  // Chip keyboard: caret at the end (after the last chip) → Backspace removes it.
  await editor.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    (element as HTMLElement).focus();
  });
  await page.keyboard.press('Backspace');
  await expect(chips).toHaveCount(1);
  await expect(readout).toContainText('Removed');

  // ArrowRight moves the caret past a leading chip: from the editor start it hops
  // over the chip, so the chip then sits before the caret.
  await editor.evaluate((element) => {
    const range = document.createRange();
    range.setStart(element, 0);
    range.collapse(true);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    (element as HTMLElement).focus();
  });
  await page.keyboard.press('ArrowRight');
  const chipBehindCaret = await editor.evaluate((element) => {
    const selection = document.getSelection()!;
    const caret = selection.getRangeAt(0);
    const before = document.createRange();
    before.setStart(element, 0);
    before.setEnd(caret.startContainer, caret.startOffset);
    return (
      before
        .cloneContents()
        .querySelector('[data-component="token-search-token"]') !== null
    );
  });
  expect(chipBehindCaret).toBe(true);
});
