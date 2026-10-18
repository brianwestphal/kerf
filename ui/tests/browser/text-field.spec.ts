import { expect, type Page, test } from '@playwright/test';

// TextField is a native input or textarea inside a labeled box: its label
// names it, its hint and error describe it, the box shows the focus ring, a
// clearable field clears itself, a counted field counts, and a growing
// textarea grows up to its maximum.

async function openDemo(page: Page, width = 1100) {
  await page.setViewportSize({ width, height: 1200 });
  await page.goto('/?component=text-field');
  return page.locator('[data-demo="text-field"]');
}

test('the label names the field, and the hint and error describe it', async ({
  page,
}) => {
  const demo = await openDemo(page);
  const name = demo.getByRole('textbox', { name: 'Project Name' });
  await expect(name).toHaveValue('Component library');
  await expect(name).toHaveAttribute(
    'aria-description',
    'Visible to collaborators',
  );
  await expect(name).not.toHaveAttribute('aria-invalid', /.*/);

  const email = demo.getByRole('textbox', { name: 'Email' });
  await expect(email).toHaveAttribute('type', 'email');
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toHaveAttribute(
    'aria-description',
    'Used for sign-in. Enter a complete email address.',
  );
  await expect(email).toHaveJSProperty('required', true);
  // The asterisk is visual: the input already reports `required`.
  const field = demo.locator('.kui-text-field', {
    has: page.getByRole('textbox', { name: 'Email' }),
  });
  await expect(field.locator('.kui-text-field__required')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  const colors = await field.evaluate((root) => {
    const read = (selector: string) =>
      window.getComputedStyle(root.querySelector(selector)!);
    return {
      error: read('.kui-text-field__error').color,
      border: read('.kui-text-field__box').borderTopColor,
      hint: read('.kui-text-field__hint').color,
    };
  });
  expect(colors.error).not.toBe(colors.hint);
  expect(colors.border).not.toBe('rgba(0, 0, 28, 0.18)');

  await expect(demo.getByRole('textbox', { name: 'Owner' })).toHaveJSProperty(
    'readOnly',
    true,
  );
});

test('a clearable field clears itself, announces input, and keeps focus', async ({
  page,
}) => {
  const demo = await openDemo(page);
  const search = demo.getByRole('searchbox', { name: 'Search Components' });
  const field = demo.locator('.kui-text-field', {
    has: page.getByRole('searchbox', { name: 'Search Components' }),
  });
  const clear = field.getByRole('button', { name: 'Clear' });
  // An empty field offers nothing to clear.
  await expect(clear).toBeHidden();
  await search.fill('toolbar');
  await expect(clear).toBeVisible();
  // Count only what clearing announces, not the native change on blur.
  await search.blur();
  await search.evaluate((input) => {
    input.addEventListener('input', () => {
      input.dataset.inputs = String(Number(input.dataset.inputs ?? 0) + 1);
    });
    input.addEventListener('change', () => {
      input.dataset.changes = String(Number(input.dataset.changes ?? 0) + 1);
    });
  });
  await clear.click();
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute('data-inputs', '1');
  await expect(search).toHaveAttribute('data-changes', '1');
  await expect(clear).toBeHidden();

  // The clear button works from the keyboard too.
  const name = demo.getByRole('textbox', { name: 'Project Name' });
  const nameClear = demo
    .locator('.kui-text-field', {
      has: page.getByRole('textbox', { name: 'Project Name' }),
    })
    .getByRole('button', { name: 'Clear' });
  await nameClear.focus();
  await page.keyboard.press('Enter');
  await expect(name).toHaveValue('');
  await expect(name).toBeFocused();
});

test('a counted field counts as people type, and a growing one grows', async ({
  page,
}) => {
  const demo = await openDemo(page);
  const note = demo.getByRole('textbox', { name: 'Release Note' });
  const count = demo
    .locator('.kui-text-field', {
      has: page.getByRole('textbox', { name: 'Release Note' }),
    })
    .locator('.kui-text-field__count');
  await expect(count).toHaveText('49 / 200');
  await note.fill('Short');
  await expect(count).toHaveText('5 / 200');
  await expect(note).toHaveAttribute('maxlength', '200');

  const comment = demo.getByRole('textbox', { name: 'Comment' });
  const height = () =>
    comment.evaluate((area) => area.getBoundingClientRect().height);
  const lineHeight = await comment.evaluate((area) =>
    parseFloat(window.getComputedStyle(area).lineHeight),
  );
  const empty = await height();
  // Two rows plus the block padding.
  expect(empty).toBeCloseTo(2 * lineHeight + 8.8, 0);
  await comment.fill('one\ntwo\nthree\nfour');
  await expect.poll(height).toBeCloseTo(4 * lineHeight + 8.8, 0);
  await comment.fill('1\n2\n3\n4\n5\n6\n7\n8\n9\n10');
  // It stops at maxRows (6) and scrolls.
  await expect.poll(height).toBeCloseTo(6 * lineHeight + 8.8, 0);
  expect(
    await comment.evaluate((area) => area.scrollHeight > area.clientHeight),
  ).toBe(true);
});

test('numeric fields preserve native range and step validity', async ({
  page,
}) => {
  const demo = await openDemo(page);
  const duty = demo.getByRole('spinbutton', { name: 'Customs Duty' });
  await expect(duty).toHaveAttribute('min', '0');
  await expect(duty).toHaveAttribute('max', '100');
  await expect(duty).toHaveAttribute('step', '0.01');
  const validity = () =>
    duty.evaluate((input: HTMLInputElement) => ({
      under: input.validity.rangeUnderflow,
      over: input.validity.rangeOverflow,
      step: input.validity.stepMismatch,
      valid: input.validity.valid,
    }));
  await duty.fill('12.53');
  expect(await validity()).toEqual({
    under: false,
    over: false,
    step: false,
    valid: true,
  });
  await duty.fill('-0.01');
  expect((await validity()).under).toBe(true);
  await duty.fill('100.01');
  expect((await validity()).over).toBe(true);
  await duty.fill('12.531');
  expect((await validity()).step).toBe(true);

  const rate = demo.getByRole('spinbutton', { name: 'Exchange Rate' });
  await expect(rate).toHaveAttribute('step', 'any');
  await rate.fill('1.234567');
  expect(
    await rate.evaluate(
      (input: HTMLInputElement) => input.validity.stepMismatch,
    ),
  ).toBe(false);

  const budget = demo.getByRole('spinbutton', { name: 'AI Budget' });
  await expect(budget).toHaveAttribute('min', '0');
  await expect(budget).toHaveAttribute('step', '1');
  await budget.fill('1.5');
  expect(
    await budget.evaluate(
      (input: HTMLInputElement) => input.validity.stepMismatch,
    ),
  ).toBe(true);
});

test('fields are 44px tall, or 33px compact, with the focus ring on the box', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    const demo = await openDemo(page, width);
    const box = (name: string) =>
      demo
        .locator('.kui-text-field', {
          has: page.getByRole('textbox', { name, exact: true }),
        })
        .locator('.kui-text-field__box');
    const height = (name: string) =>
      box(name).evaluate((element) => element.getBoundingClientRect().height);
    expect(await height('Project Name')).toBe(44);
    expect(await height('Quantity')).toBe(33);

    await demo.getByRole('textbox', { name: 'Project Name' }).focus();
    const ring = await box('Project Name').evaluate((element) => {
      const style = window.getComputedStyle(element);
      return [style.outlineStyle, style.outlineWidth, style.outlineOffset];
    });
    expect(ring).toEqual(['solid', '3px', '1px']);

    // A disabled field dims its box, not its label.
    const unit = box('Unit');
    expect(
      await unit.evaluate(
        (element) => window.getComputedStyle(element).opacity,
      ),
    ).toBe('0.5');

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  }
});

test.describe('coarse touch', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('compact text has a 16px floor so focusing does not zoom', async ({
    page,
  }) => {
    await page.goto('/?component=text-field');
    const quantity = page.getByRole('textbox', { name: 'Quantity' });
    await expect(quantity).toBeVisible();
    expect(
      await quantity.evaluate((input) =>
        parseFloat(window.getComputedStyle(input).fontSize),
      ),
    ).toBeGreaterThanOrEqual(16);
  });
});
