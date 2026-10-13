import { expect, type Locator, test } from '@playwright/test';

/** Row tops of the pills, in order: one entry per distinct visual row. */
async function pillRows(group: Locator) {
  return group.evaluate((element) => {
    const pills = [
      ...element.querySelectorAll<HTMLElement>('.kui-choice-chips__chip'),
    ].map((pill) => pill.getBoundingClientRect());
    const rows = [...new Set(pills.map((box) => Math.round(box.top)))];
    const groupBox = element.getBoundingClientRect();
    return {
      rows: rows.length,
      overflow: pills.some((box) => box.right > groupBox.right + 0.5),
      // Separated pills: neighbors on a row never touch or share a border.
      minGap: Math.min(
        ...pills.flatMap((box, index) => {
          const next = pills[index + 1];
          return next && Math.round(next.top) === Math.round(box.top)
            ? [next.left - box.right]
            : [];
        }),
      ),
    };
  });
}

test('ChoiceChips selects with native radio keyboard semantics and wraps as separate pills', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=choice-chips');
  const demo = page.locator('[data-demo="choice-chips"]');
  const group = demo.getByRole('radiogroup', { name: 'Command Color' });
  await expect(group.getByRole('radio')).toHaveCount(9);
  await expect(group.getByRole('radio', { name: 'Blue' })).toBeChecked();

  // One Tab stop: the checked radio. Arrow keys move and select.
  await group.getByRole('radio', { name: 'Blue' }).focus();
  await page.keyboard.press('ArrowRight');
  const green = group.getByRole('radio', { name: 'Green' });
  await expect(green).toBeFocused();
  await expect(green).toBeChecked();
  await expect(page.locator('.catalog-log')).toHaveText('Choice: green');
  await expect(group.locator('input:checked')).toHaveCount(1);
  const focus = await green.evaluate((input) => ({
    visible: input.matches(':focus-visible'),
    ring: globalThis.getComputedStyle(input.closest('label')!).outlineStyle,
  }));
  // WebKit (like Safari's default keyboard settings) never treats a native
  // radio as focus-visible, so the pill's ring follows :focus-visible there.
  expect(focus.ring).toBe(focus.visible ? 'solid' : 'none');
  if (browserName !== 'webkit') expect(focus.visible).toBe(true);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  const transparent = group.getByRole('radio', { name: 'Transparent' });
  await expect(transparent).toBeChecked();
  await expect(
    group.locator('[data-choice-value="transparent"] [data-swatch]'),
  ).toHaveAttribute('data-swatch', 'transparent');

  // Pointer selection lands on the native radio under the pill.
  await group.locator('[data-choice-value="purple"]').click();
  await expect(group.getByRole('radio', { name: 'Purple' })).toBeChecked();
  await expect(page.locator('.catalog-log')).toHaveText('Choice: purple');

  // A disabled choice is skipped and cannot be chosen.
  const view = demo.getByRole('radiogroup', { name: 'Board View' });
  await expect(view.getByRole('radio', { name: 'Calendar' })).toBeDisabled();

  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/choice-chips-wide.png' });

  // The 560px dialog: the palette wraps inside it and Save reads the form value.
  await demo
    .locator(
      'wa-button[data-action="show-wa-dialog"][data-dialog-id="choice-chips-dialog"]',
    )
    .click();
  const dialogGroup = page.getByRole('radiogroup', {
    name: 'Color',
    exact: true,
  });
  await expect(dialogGroup).toBeVisible();
  await dialogGroup.locator('[data-choice-value="teal"]').click();
  const dialogLayout = await pillRows(dialogGroup);
  expect(dialogLayout.rows).toBeGreaterThan(1);
  expect(dialogLayout.overflow).toBe(false);
  expect(dialogLayout.minGap).toBeGreaterThanOrEqual(7.5);
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/choice-chips-dialog.png' });
  await page.locator('[data-action="save-choice-chips-dialog"]').click();
  await expect(page.locator('.catalog-log')).toHaveText('Saved color: teal');

  await page.setViewportSize({ width: 390, height: 844 });
  const narrow = await pillRows(group);
  expect(narrow.rows).toBeGreaterThan(1);
  expect(narrow.overflow).toBe(false);
  expect(narrow.minGap).toBeGreaterThanOrEqual(7.5);
  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/choice-chips-narrow.png' });
});
