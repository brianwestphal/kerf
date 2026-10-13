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

test('A multiple ChoiceChips group toggles native checkboxes by pointer and Space and submits every checked value', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=choice-chips');
  const demo = page.locator('[data-demo="choice-chips"]');
  const group = demo.getByRole('group', { name: 'Labels', exact: true });
  await expect(group.getByRole('checkbox')).toHaveCount(5);
  // The controlled value checks several boxes at once.
  await expect(group.getByRole('checkbox', { name: 'Bug' })).toBeChecked();
  await expect(group.getByRole('checkbox', { name: 'Docs' })).toBeChecked();
  await expect(
    group.getByRole('checkbox', { name: 'Feature' }),
  ).not.toBeChecked();

  // Pointer: the pill toggles its checkbox without touching the others.
  await group.locator('[data-choice-value="feature"]').click();
  await expect(group.getByRole('checkbox', { name: 'Feature' })).toBeChecked();
  await expect(group.locator('input:checked')).toHaveCount(3);
  await expect(page.locator('.catalog-log')).toHaveText(
    'Checked: bug, feature, docs',
  );
  await group.locator('[data-choice-value="bug"]').click();
  await expect(group.getByRole('checkbox', { name: 'Bug' })).not.toBeChecked();
  await expect(page.locator('.catalog-log')).toHaveText(
    'Checked: feature, docs',
  );

  // Keyboard: every pill is its own Tab stop and Space toggles it.
  const feature = group.getByRole('checkbox', { name: 'Feature' });
  await feature.focus();
  await page.keyboard.press('Tab');
  const docs = group.getByRole('checkbox', { name: 'Docs' });
  await expect(docs).toBeFocused();
  await page.keyboard.press('Space');
  await expect(docs).not.toBeChecked();
  await page.keyboard.press('Space');
  await expect(docs).toBeChecked();
  await expect(page.locator('.catalog-log')).toHaveText(
    'Checked: feature, docs',
  );
  const focus = await docs.evaluate((input) => {
    const pill = globalThis.getComputedStyle(input.closest('label')!);
    return {
      visible: input.matches(':focus-visible'),
      ring: pill.outlineStyle,
      background: pill.backgroundColor,
    };
  });
  // WebKit never treats a native checkbox as focus-visible by default.
  expect(focus.ring).toBe(focus.visible ? 'solid' : 'none');
  if (browserName !== 'webkit') expect(focus.visible).toBe(true);
  // The checked pill paints its state; the unchecked pill does not.
  const unchecked = await group
    .locator('[data-choice-value="chore"]')
    .evaluate((pill) => globalThis.getComputedStyle(pill).backgroundColor);
  expect(focus.background).not.toBe(unchecked);

  // Every checked value submits under the group's name.
  const submitted = await group.evaluate((element) => {
    const form = document.createElement('form');
    form.append(element.cloneNode(true));
    return new FormData(form).getAll('labels');
  });
  expect(submitted).toEqual(['feature', 'docs']);

  // On dark chrome the chips resolve the dark palette from the scope.
  const intents = demo.getByRole('group', { name: 'Annotation Intents' });
  await expect(intents.getByRole('checkbox')).toHaveCount(7);
  await intents.locator('[data-choice-value="question"]').click();
  await expect(
    intents.getByRole('checkbox', { name: 'Question' }),
  ).toBeChecked();
  await expect(intents.locator('input:checked')).toHaveCount(2);
  const pill = await intents
    .locator('[data-choice-value="move"]')
    .evaluate((element) => ({
      scheme: globalThis.getComputedStyle(element).colorScheme,
      color: globalThis.getComputedStyle(element).color,
    }));
  expect(pill.scheme).toBe('dark');
  // The dark palette's text color, not the light page's.
  expect(pill.color).toBe('rgb(245, 245, 247)');

  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/choice-chips-multiple.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  const narrow = await pillRows(intents);
  expect(narrow.rows).toBeGreaterThan(1);
  expect(narrow.overflow).toBe(false);
});
