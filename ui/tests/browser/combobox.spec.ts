import { expect, test } from '@playwright/test';

// Real keyboard and pointer use of the ARIA combobox: typing filters, the
// arrows move the active option, Enter and comma commit (creating new text),
// a click commits an option, and Escape closes.
test('Combobox filters, highlights, creates, and commits', async ({ page }) => {
  await page.goto('/?component=combobox');
  const demo = page.locator('[data-demo="combobox"]');
  const input = demo.getByRole('combobox', { name: 'Tag Name' });
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

// The listbox is a top-layer popover, so a clipping or scrolling ancestor (an
// AnchoredSurface, a dialog, a scrolling List) cannot cut it off.
test('the Combobox listbox escapes a clipping ancestor', async ({ page }) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=combobox');
    const demo = page.locator('[data-demo="combobox"]');
    const input = demo.getByRole('combobox', { name: 'Tag Name' });
    // Clip the field's surroundings to just the field, as a fitted popup does.
    await input.evaluate((element) => {
      const field = element.closest<HTMLElement>(
        '[data-component="combobox"]',
      )!;
      const clip = field.parentElement!;
      clip.style.overflow = 'hidden';
      clip.style.maxHeight = `${field.getBoundingClientRect().height + 4}px`;
    });
    await input.click();
    await input.pressSequentially('d');
    const listbox = demo.getByRole('listbox');
    await expect(listbox).toBeVisible();
    expect(await listbox.evaluate((el) => el.matches(':popover-open'))).toBe(
      true,
    );
    const [field, list] = await Promise.all([
      input.boundingBox(),
      listbox.boundingBox(),
    ]);
    // Below the field, as wide as its box, and hit-testable outside the clip.
    expect(list!.y).toBeGreaterThanOrEqual(field!.y + field!.height);
    expect(list!.height).toBeGreaterThan(60);
    const hit = await listbox.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const target = document.elementFromPoint(
        box.left + box.width / 2,
        box.bottom - 8,
      );
      return el.contains(target);
    });
    expect(hit).toBe(true);
    await page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
  }
});
