import { expect, test } from '@playwright/test';

test('ColorSwatches is one Tab stop whose arrows move a hue-independent ring', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/?component=color-swatches');
    const group = page.getByRole('group', { name: 'Command Color' });
    await expect(group.getByRole('radio')).toHaveCount(10);
    const blue = group.getByRole('radio', { name: 'Blue' });
    await expect(blue).toBeChecked();
    await blue.focus();
    await page.keyboard.press('ArrowRight');
    const indigo = group.getByRole('radio', { name: 'Indigo' });
    await expect(indigo).toBeChecked();
    await expect(indigo).toBeFocused();
    await expect(
      page.locator('input[name="command-color"]:checked'),
    ).toHaveValue('#5e5ce6');

    // The ring is drawn in the text color, not the swatch's hue.
    const ring = await indigo.evaluate((input) => {
      const dot = input.nextElementSibling!;
      const style = window.getComputedStyle(dot);
      return {
        width: style.outlineWidth,
        color: style.outlineColor,
        text: window.getComputedStyle(document.body).color,
      };
    });
    expect(ring.width).toBe('2px');
    expect(ring.color).toBe(ring.text);
    // A pointer press picks too, and each swatch names its color as a hint.
    await group.getByRole('radio', { name: 'Green' }).click({ force: true });
    await expect(group.getByRole('radio', { name: 'Green' })).toBeChecked();
    await expect(group.locator('label[title="Green"]')).toHaveCount(1);
    await expect(
      page
        .getByRole('group', { name: 'Locked Color' })
        .getByRole('radio')
        .first(),
    ).toBeDisabled();
  }
});
