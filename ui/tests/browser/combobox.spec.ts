import { expect, test } from '@playwright/test';

// Real keyboard and pointer use of the ARIA combobox: typing filters, the
// arrows move the active option, Enter and comma commit (creating new text),
// a click commits an option, and Escape closes.
test('Combobox filters, highlights, creates, and commits', async ({ page }) => {
  await page.goto('/?component=combobox');
  const demo = page.locator('[data-demo="combobox"]');
  const input = demo.getByRole('combobox', { name: 'Tag name' });
  const listbox = demo.getByRole('listbox');
  const chips = demo.locator('.kui-chip');
  await expect(chips).toHaveText(['bug']);

  await input.click();
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await input.pressSequentially('d');
  await expect(listbox.getByRole('option')).toHaveText([
    'design',
    'docs',
    'Create “d”',
  ]);
  await page.keyboard.press('ArrowDown');
  await expect(listbox.getByRole('option', { name: 'design' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Enter');
  await expect(chips).toHaveText(['bug', 'design']);
  await expect(input).toHaveValue('');

  await input.pressSequentially('ux polish');
  await page.keyboard.press(',');
  await expect(chips).toHaveText(['bug', 'design', 'ux-polish']);

  await input.pressSequentially('re');
  await listbox.getByRole('option', { name: 'regression' }).click();
  await expect(chips).toHaveText(['bug', 'design', 'ux-polish', 'regression']);
  await expect(input).toBeFocused();

  await input.pressSequentially('zz');
  await expect(listbox).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(listbox).toBeHidden();
  await expect(input).toHaveAttribute('aria-expanded', 'false');
});
