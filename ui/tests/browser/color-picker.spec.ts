import { expect, test } from '@playwright/test';

test('ColorPicker follows pointer and keyboard input and reports its value', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.goto('/?component=color-picker');
  const picker = page.locator('#color-picker-demo');
  const hex = picker.getByRole('textbox', { name: 'Hex Color' });
  await expect(hex).toHaveValue('D8D8D8');

  // Dragging to the area's top-right corner gives the full hue (red).
  const area = picker.getByRole('slider', {
    name: 'Saturation and Brightness',
  });
  const box = (await area.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 20, box.y - 20);
  await page.mouse.up();
  await expect(hex).toHaveValue('FF0000');
  await expect(picker).toHaveAttribute('data-value', '#ff0000');
  await expect(area).toHaveAttribute(
    'aria-valuetext',
    'Saturation 100%, brightness 100%',
  );

  // The area takes the arrow keys; Shift steps 10%.
  await area.focus();
  await page.keyboard.press('Shift+ArrowDown');
  await expect(area).toHaveAttribute(
    'aria-valuetext',
    'Saturation 100%, brightness 90%',
  );
  await expect(hex).toHaveValue('E60000');

  // The hue slider is a native range.
  const hue = picker.getByRole('slider', { name: 'Hue' });
  await hue.focus();
  await page.keyboard.press('End');
  await expect(hue).toHaveValue('360');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await expect(hue).toHaveValue('1');
  await expect(picker.getByRole('textbox', { name: 'Green' })).toHaveValue('4');

  // Hex and channel fields commit on Enter; the model menu switches fields.
  await hex.fill('0A84FF');
  await hex.press('Enter');
  await expect(picker.getByRole('textbox', { name: 'Blue' })).toHaveValue(
    '255',
  );
  await picker
    .getByRole('combobox', { name: 'Color Model' })
    .selectOption('hsb');
  await expect(picker.getByRole('textbox', { name: 'Brightness' })).toHaveValue(
    '100',
  );
  const opacity = picker.getByRole('textbox', { name: 'Opacity' });
  await opacity.fill('50');
  await opacity.press('Enter');
  await expect(hex).toHaveValue('0A84FF80');
  await expect(page.locator('input[type="hidden"][name="fill"]')).toHaveValue(
    '#0a84ff80',
  );

  // A preset applies its color; + adds the current color to User Colors.
  await picker.getByRole('radio', { name: '#34C759' }).check({ force: true });
  await expect(hex).toHaveValue('34C759');
  await picker.getByRole('button', { name: 'Add to Samples' }).click();
  await expect(
    picker.getByRole('group', { name: 'User Colors' }).getByRole('radio'),
  ).toHaveCount(3);
  await expect(
    picker
      .getByRole('group', { name: 'User Colors' })
      .getByRole('radio', { name: '#34C759' }),
  ).toBeChecked();
});

test('ColorPicker without opacity reports an opaque value', async ({
  page,
}) => {
  await page.goto('/?component=color-picker');
  const picker = page.locator('#color-picker-demo-opaque');
  await expect(picker.getByRole('slider', { name: 'Opacity' })).toHaveCount(0);
  await expect(picker.getByRole('textbox', { name: 'Hue' })).toHaveValue('210');
  const hex = picker.getByRole('textbox', { name: 'Hex Color' });
  await hex.fill('11223380');
  await hex.press('Enter');
  await expect(hex).toHaveValue('112233');
});
