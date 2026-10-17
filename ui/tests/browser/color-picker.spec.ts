import { expect, type Locator, type Page, test } from '@playwright/test';

import { contrastRatio } from '../../evaluator/index.mjs';

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

  // RGB shows red, green, blue, and opacity sliders: native ranges that each
  // change only their own channel.
  const sliders = picker.getByRole('slider');
  await expect(sliders).toHaveCount(5);
  await expect(picker.getByRole('slider', { name: 'Hue' })).toHaveCount(0);
  const green = picker.getByRole('slider', { name: 'Green' });
  await green.focus();
  await page.keyboard.press('End');
  await expect(green).toHaveValue('255');
  await expect(hex).toHaveValue('E6FF00');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await expect(green).toHaveValue('1');
  await expect(green).toHaveAttribute('aria-valuetext', '1');
  await expect(picker.getByRole('textbox', { name: 'Green' })).toHaveValue('1');
  await expect(hex).toHaveValue('E60100');

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

  // HSB shows hue, saturation, and brightness sliders; saturation to gray
  // and back keeps the hue.
  await expect(picker.getByRole('slider', { name: 'Red' })).toHaveCount(0);
  const hue = picker.getByRole('slider', { name: 'Hue' });
  await expect(hue).toHaveAttribute('aria-valuetext', '210°');
  const saturation = picker.getByRole('slider', {
    name: 'Saturation',
    exact: true,
  });
  await saturation.focus();
  await page.keyboard.press('Home');
  await expect(saturation).toHaveAttribute('aria-valuetext', '0%');
  await expect(hex).toHaveValue('FFFFFF80');
  await page.keyboard.press('End');
  await expect(hue).toHaveValue('210');
  await expect(hex).toHaveValue('007FFF80');

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

/** The painted pixels of an element, read from a screenshot of its box. */
async function paintedPixels(page: Page, locator: Locator) {
  const png = await locator.screenshot();
  const { width, height, data } = await page.evaluate(
    async (source) => {
      const image = new window.Image();
      image.src = source;
      await image.decode();
      const context = document
        .createElement('canvas')
        .getContext('2d', { willReadFrequently: true })!;
      context.canvas.width = image.width;
      context.canvas.height = image.height;
      context.drawImage(image, 0, 0);
      return {
        width: image.width,
        height: image.height,
        data: [...context.getImageData(0, 0, image.width, image.height).data],
      };
    },
    `data:image/png;base64,${png.toString('base64')}`,
  );
  return {
    width,
    height,
    at(x: number, y: number): number[] {
      const offset = (Math.round(y) * width + Math.round(x)) * 4;
      return data.slice(offset, offset + 3);
    },
  };
}

const distance = (a: readonly number[], b: readonly number[]) =>
  a.reduce((sum, value, index) => sum + Math.abs(value - b[index]!), 0);

/** Open the demo picker on a plain surface with a color in a model. */
async function openPicker(page: Page, hex: string, mode: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'kerf-ui-ux-demo-display',
      JSON.stringify({ backgroundStyle: 'surface' }),
    );
  });
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.goto('/?component=color-picker');
  const picker = page.locator('#color-picker-demo');
  const field = picker.getByRole('textbox', { name: 'Hex Color' });
  await field.fill(hex);
  await field.press('Enter');
  await picker
    .getByRole('combobox', { name: 'Color Model' })
    .selectOption(mode);
  await page.mouse.move(0, 0);
  return picker;
}

for (const scheme of ['light', 'dark'] as const) {
  test(`ColorPicker slider tracks keep a visible edge on a ${scheme} surface`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    // A color as dark as a dark surface, then one as light as a light one.
    for (const hex of ['1A1A40', 'F4F0D8']) {
      const picker = await openPicker(page, hex, 'hsb');
      const sliders = picker.locator(
        '.kui-color-picker__slider:not([hidden]), .kui-color-picker__opacity',
      );
      await expect(sliders).toHaveCount(4);
      for (const slider of await sliders.all()) {
        const pixels = await paintedPixels(page, slider);
        // In a column clear of the thumb, the 20px input box shows the
        // surface above the 12px track: its first painted row is the edge.
        let measured = false;
        for (const x of [pixels.width * 0.2, pixels.width * 0.8]) {
          const surface = pixels.at(x, 0);
          if (distance(pixels.at(x, pixels.height - 1), surface) > 6) continue;
          const rows = Array.from({ length: pixels.height }, (_, y) =>
            pixels.at(x, y),
          );
          const edge = rows.find((pixel) => distance(pixel, surface) > 6)!;
          expect(contrastRatio(edge, surface)).toBeGreaterThanOrEqual(3);
          measured = true;
          break;
        }
        expect(measured).toBe(true);
      }
    }
  });
}

for (const dir of ['ltr', 'rtl'] as const) {
  test(`ColorPicker slider tracks run in the ${dir} writing direction`, async ({
    page,
  }) => {
    const picker = await openPicker(page, '0A84FF', 'hsb');
    await page.evaluate((value) => {
      document.documentElement.dir = value;
    }, dir);
    // Opacity first, while its track still ends in the opaque blue.
    for (const name of ['Opacity', 'Saturation', 'Brightness']) {
      const slider = picker.getByRole('slider', { name, exact: true });
      await slider.focus();
      await page.keyboard.press('Home');
      await expect(slider).toHaveValue('0');
      await slider.blur();
      const pixels = await paintedPixels(page, slider);
      const y = pixels.height / 2;
      // The native range puts its minimum at the inline start. The thumb
      // there shows the minimum's color, so the track beside it is the
      // gradient's start and the far end is its end.
      const start = (offset: number) =>
        dir === 'rtl' ? pixels.width - 1 - offset : offset;
      const thumb = pixels.at(start(10), y);
      const near = pixels.at(start(32), y);
      const far = pixels.at(start(pixels.width - 8), y);
      expect(distance(near, thumb)).toBeLessThan(distance(far, thumb));
      // A channel's near track is close to its thumb's color; the opacity
      // track's start is the checkerboard, so it is only nearer than the end.
      if (name !== 'Opacity') expect(distance(near, thumb)).toBeLessThan(180);
    }
  });
}
