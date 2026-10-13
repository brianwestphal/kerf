import { expect, type Page, test } from '@playwright/test';

/** Resolve a theme color token to the computed color it paints. */
async function tokenColor(page: Page, token: string) {
  return page.evaluate((name) => {
    const probe = document.createElement('div');
    probe.style.borderTopColor = `var(${name})`;
    probe.style.borderTopStyle = 'solid';
    document.body.append(probe);
    const color = window.getComputedStyle(probe).borderTopColor;
    probe.remove();
    return color;
  }, token);
}

test('Composer frames a growing field above a hint and a trailing send action', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=composer');
    const root = page.locator('[data-demo="composer"] .kui-composer').first();
    const field = root.getByRole('textbox', { name: 'Message' });
    await expect(field).toHaveAccessibleDescription(
      'Answers use the latest nightly build.',
    );

    const frame = () =>
      root.evaluate((element) => {
        const style = window.getComputedStyle(element);
        const textarea = element.querySelector('textarea')!;
        const box = element.getBoundingClientRect();
        const fieldBox = textarea.getBoundingClientRect();
        const hint = element
          .querySelector('.kui-composer__hint')!
          .getBoundingClientRect();
        const send = element
          .querySelector('.kui-composer__trailing > *')!
          .getBoundingClientRect();
        const fieldStyle = window.getComputedStyle(textarea);
        return {
          border: style.borderTopColor,
          borderWidth: style.borderTopWidth,
          radius: style.borderTopLeftRadius,
          shadow: style.boxShadow,
          fieldBorder: fieldStyle.borderTopWidth,
          fieldHeight: fieldBox.height,
          fieldScrolls: textarea.scrollHeight > textarea.clientHeight + 1,
          lineHeight: Number.parseFloat(fieldStyle.lineHeight),
          textStart: Math.round(fieldBox.left - box.left),
          hintStart: Math.round(hint.left - box.left),
          sendEnd: Math.round(box.right - send.right),
          rowBelowField:
            hint.top >= fieldBox.bottom && send.top >= fieldBox.bottom,
        };
      });

    // Raised frame: the standard border, large radius, and a shadow; the
    // field itself is borderless and its text starts at the frame padding.
    const rest = await frame();
    expect(rest.border).toBe(
      await tokenColor(page, '--kui-color-neutral-border-normal'),
    );
    expect(rest.borderWidth).toBe('1px');
    expect(rest.radius).toBe('12px');
    expect(rest.shadow).not.toBe('none');
    expect(rest.fieldBorder).toBe('0px');
    expect(rest.textStart).toBe(9);
    expect(rest.hintStart).toBe(9);
    expect(rest.sendEnd).toBe(9);
    expect(rest.rowBelowField).toBe(true);

    // Focus within turns the frame's border brand.
    await field.focus();
    await expect
      .poll(async () => (await frame()).border)
      .toBe(await tokenColor(page, '--kui-color-brand-border-loud'));

    // One line at rest; it grows with each line up to eight, then scrolls.
    const oneLine = rest.fieldHeight;
    await field.fill('One\nTwo\nThree');
    const three = await frame();
    expect(three.fieldHeight).toBeCloseTo(oneLine + 2 * rest.lineHeight, 0);
    expect(three.fieldScrolls).toBe(false);
    await field.fill(
      Array.from({ length: 14 }, (_, index) => `Line ${index}`).join('\n'),
    );
    const capped = await frame();
    expect(capped.fieldHeight).toBeCloseTo(oneLine + 7 * rest.lineHeight, 0);
    expect(capped.fieldScrolls).toBe(true);

    // Send reads the field, clears it, and the field shrinks back.
    await root.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Sent: Line 0')).toBeVisible();
    await expect(field).toHaveValue('');
    await expect
      .poll(async () => Math.round((await frame()).fieldHeight))
      .toBe(Math.round(oneLine));

    // Leaving the composer restores the neutral border.
    await page.mouse.click(4, 4);
    await expect
      .poll(async () => (await frame()).border)
      .toBe(await tokenColor(page, '--kui-color-neutral-border-normal'));
  }
});

test('Composer minRows starts the field taller', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=composer');
  const field = page.getByRole('textbox', { name: 'Prompt' });
  const metrics = await field.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    line: Number.parseFloat(window.getComputedStyle(element).lineHeight),
  }));
  // Three lines plus the field's 4px block padding on each side.
  expect(metrics.height).toBeCloseTo(3 * metrics.line + 8, 0);
});
