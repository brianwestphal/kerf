import { expect, test } from '@playwright/test';

test('TagField adds, refuses, edits, and removes tags from the keyboard and pointer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=tag-field');
  const field = page.locator('[data-tag-field-id="tag-field-demo-labels"]');
  const editor = field.locator('[data-tag-field-editor]');
  const tags = () =>
    field
      .locator('[data-component="search-field-token"]')
      .evaluateAll((chips) =>
        chips.map((chip) => (chip as HTMLElement).dataset.tokenValue),
      );
  await expect(editor).toHaveAccessibleName('Labels');
  await expect(editor).toHaveAccessibleDescription(
    'Press Enter or a comma to add a label.',
  );

  // Enter and a comma add tags, and the caret stays in the rebuilt editor.
  const box = (await editor.boundingBox())!;
  await page.mouse.click(box.x + box.width - 4, box.y + box.height / 2);
  await page.keyboard.type('perf');
  await page.keyboard.press('Enter');
  await page.keyboard.type('ui,');
  await expect.poll(tags).toEqual(['bug', 'docs', 'perf', 'ui']);
  await expect(
    field.locator('input[type="hidden"][name="labels"]'),
  ).toHaveCount(4);

  // A duplicate is refused with an error; typing again clears it.
  await page.keyboard.type('bug');
  await page.keyboard.press('Enter');
  await expect(field.locator('#tag-field-demo-labels-hint')).toHaveText(
    '“bug” is already added.',
  );
  await expect(field).toHaveAttribute('data-invalid', '');
  await expect(field.locator('.kui-search-field')).toHaveAttribute(
    'data-placeholder-visible',
    'false',
  );
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');

  // Backspace at the start removes the last tag.
  await page.keyboard.press('Backspace');
  await expect.poll(tags).toEqual(['bug', 'docs', 'perf']);

  // ArrowLeft reaches the chips; Delete removes the focused one.
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator(':focus')).toHaveAttribute(
    'data-token-value',
    'perf',
  );
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator(':focus')).toHaveAttribute(
    'data-token-value',
    'docs',
  );
  await page.keyboard.press('Delete');
  await expect.poll(tags).toEqual(['bug', 'perf']);

  // A chip's label moves it back into the editor to edit.
  await field.getByRole('button', { name: 'Edit perf' }).click();
  await expect.poll(tags).toEqual(['bug']);
  await expect(editor).toContainText('perf');
  await page.keyboard.type('s');
  await page.keyboard.press('Enter');
  await expect.poll(tags).toEqual(['bug', 'perfs']);

  // The remove button and the clear button.
  await field.getByRole('button', { name: 'Remove bug' }).click();
  await expect.poll(tags).toEqual(['perfs']);
  await field.getByRole('button', { name: 'Clear Tags' }).click();
  await expect.poll(tags).toEqual([]);
});

test('TagField enforces its limit and validation, and leaving the field adds the text', async ({
  page,
}) => {
  await page.goto('/?component=tag-field');
  const field = page.locator('[data-tag-field-id="tag-field-demo-recipients"]');
  const editor = field.locator('[data-tag-field-editor]');
  const box = (await editor.boundingBox())!;
  await page.mouse.click(box.x + box.width - 4, box.y + box.height / 2);
  await page.keyboard.type('notanemail');
  await page.keyboard.press('Enter');
  await expect(field.locator('#tag-field-demo-recipients-hint')).toHaveText(
    '“notanemail” is not an email address.',
  );
  for (let i = 0; i < 10; i += 1) await page.keyboard.press('Backspace');
  await page.keyboard.type('sam@example.com, inez@example.com');
  await page.keyboard.press('Tab');
  const tags = () =>
    field
      .locator('[data-component="search-field-token"]')
      .evaluateAll((chips) =>
        chips.map((chip) => (chip as HTMLElement).dataset.tokenValue),
      );
  await expect
    .poll(tags)
    .toEqual(['mara@example.com', 'sam@example.com', 'inez@example.com']);
  await page.mouse.click(box.x + box.width - 4, box.y + box.height / 2);
  await page.keyboard.type('theo@example.com');
  await page.keyboard.press('Enter');
  await expect(field.locator('#tag-field-demo-recipients-hint')).toHaveText(
    'Remove a recipient to add another.',
  );
  await expect.poll(tags).toHaveLength(3);
});
