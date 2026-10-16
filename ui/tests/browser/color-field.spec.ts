import { expect, test } from '@playwright/test';

test('ColorField opens a picker below its trigger, previews edits, and returns focus', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=color-field');
    const trigger = page.getByRole('button', { name: 'Fill 0A84FF' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAccessibleDescription(
      'Applies to the selected shapes.',
    );
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const picker = page.getByRole('group', { name: 'Fill' }).last();
    await expect(picker).toBeVisible();
    // The picker opens beside the trigger (below, or above when there is
    // no room below) without covering it, and stays on screen.
    const t = (await trigger.boundingBox())!;
    // The surface scrolls its picker when the viewport is short.
    const p = (await page.getByRole('dialog', { name: 'Fill' }).boundingBox())!;
    expect(p.y >= t.y + t.height - 1 || p.y + p.height <= t.y + 1).toBe(true);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x + p.width).toBeLessThanOrEqual(width);

    // A preset previews and commits on the trigger at once.
    await picker.getByRole('radio', { name: '#34C759' }).click({ force: true });
    await expect(
      page.getByRole('button', { name: 'Fill 34C759' }),
    ).toBeVisible();
    const hex = picker.getByRole('textbox', { name: 'Hex Color' });
    await hex.fill('FF950080');
    await hex.press('Enter');
    await expect(
      page.getByRole('button', { name: 'Fill FF950080' }),
    ).toBeVisible();

    // Escape closes it and focus returns to the trigger.
    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();
    const after = page.getByRole('button', { name: 'Fill FF950080' });
    await expect(after).toBeFocused();
    await expect(after).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('input[name="fill"]')).toHaveValue('#ff950080');

    // The compact field opens in its model; the locked one stays shut.
    await page.getByRole('button', { name: 'Border 1C1C1E80' }).click();
    await expect(
      page.getByRole('group', { name: 'Border' }).getByRole('combobox', {
        name: 'Color Model',
      }),
    ).toHaveValue('hsl');
    await page.mouse.click(5, 5);
    await expect(page.getByRole('group', { name: 'Border' })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Theme Accent BF5AF2' }),
    ).toBeDisabled();
  }
});
