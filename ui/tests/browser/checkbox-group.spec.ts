import { expect, type Locator, type Page, test } from '@playwright/test';

// CheckboxGroup is a native fieldset of Kerf Checkboxes laid out exactly like
// a RadioGroup: the group label names it, every checked value submits under
// one name, an error marks the group, and the box column, label gap, 28px
// pitch, and hint columns match RadioGroup's in every engine.

async function openDemo(page: Page, component: string, width = 1100) {
  await page.setViewportSize({ width, height: 1200 });
  await page.goto(`/?component=${component}`);
  return page.locator(`[data-demo="${component}"]`);
}

const box = (locator: Locator) =>
  locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

const paddingStart = (locator: Locator) =>
  locator.evaluate((element) =>
    parseFloat(window.getComputedStyle(element).paddingInlineStart),
  );

test('a CheckboxGroup toggles each choice, submits every checked value, and clears its error', async ({
  page,
}) => {
  const demo = await openDemo(page, 'checkbox-group');
  const group = demo.getByRole('group', { name: 'Notification Channels' });
  await expect(group).toHaveAttribute(
    'aria-description',
    'Sent to your work account.',
  );
  const email = group.getByRole('checkbox', { name: 'Email' });
  const digest = group.getByRole('checkbox', { name: 'Weekly digest' });
  await expect(email).toBeChecked();
  await expect(digest).not.toBeChecked();
  await group.getByText('Weekly digest').click();
  await expect(digest).toBeChecked();
  await expect(page.locator('.catalog-log')).toHaveText(
    'Weekly digest: checked',
  );
  // Each checkbox is its own control; Space toggles the focused one.
  await email.focus();
  await page.keyboard.press('Space');
  await expect(email).not.toBeChecked();
  await expect(digest).toBeChecked();
  expect(
    await group.evaluate((fieldset) => {
      const form = document.createElement('form');
      const clone = fieldset.cloneNode(true) as HTMLElement;
      // A clone does not carry live checkedness; copy it.
      const live = fieldset.querySelectorAll('input');
      clone.querySelectorAll('input').forEach((input, index) => {
        input.checked = live[index]!.checked;
      });
      form.append(clone);
      return new FormData(form).getAll('notification-channels');
    }),
  ).toEqual(['digest']);
  await expect(
    group.getByRole('checkbox', { name: 'Push notifications' }),
  ).toHaveAttribute('aria-description', 'On devices where you are signed in.');
  const sms = group.getByRole('checkbox', { name: 'Text messages' });
  await expect(sms).toBeDisabled();
  expect(
    await demo
      .locator('.kui-checkbox', {
        has: page.getByRole('checkbox', { name: 'Text messages' }),
      })
      .locator('.kui-checkbox__row')
      .evaluate((row) => window.getComputedStyle(row).opacity),
  ).toBe('0.5');

  // The empty horizontal group is invalid and draws danger boxes until a
  // platform is checked.
  const platforms = demo.getByRole('group', { name: 'Platforms' });
  await expect(platforms).toHaveAttribute('aria-invalid', 'true');
  const firstBox = platforms.locator('.kui-checkbox__box').first();
  const danger = await firstBox.evaluate(
    (element) => window.getComputedStyle(element).borderTopColor,
  );
  await platforms.getByText('Linux').click();
  await expect(
    platforms.getByRole('checkbox', { name: 'Linux' }),
  ).toBeChecked();
  await expect(platforms).not.toHaveAttribute('aria-invalid');
  await expect(platforms.locator('.kui-checkbox-group__error')).toHaveCount(0);
  expect(
    await firstBox.evaluate(
      (element) => window.getComputedStyle(element).borderTopColor,
    ),
  ).not.toBe(danger);
});

test('a CheckboxGroup matches RadioGroup geometry at wide and narrow widths', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    let demo = await openDemo(page, 'radio-group', width);
    const radios = demo.getByRole('radiogroup', { name: 'Layout Density' });
    const radio = {
      group: await box(radios),
      legend: await box(radios.locator('legend')),
      circles: [
        await box(radios.locator('.kui-radio-group__circle').nth(0)),
        await box(radios.locator('.kui-radio-group__circle').nth(1)),
      ],
      label: await box(radios.locator('.kui-radio-group__choice-label').nth(0)),
      roomy: await box(radios.locator('.kui-radio-group__circle').nth(2)),
      choiceHint: await box(radios.locator('.kui-radio-group__choice-hint')),
      hint: await box(radios.locator('.kui-radio-group__hint')),
    };

    demo = await openDemo(page, 'checkbox-group', width);
    const group = demo.getByRole('group', { name: 'Notification Channels' });
    const boxes = group.locator('.kui-checkbox__box');
    const first = await box(boxes.nth(0));
    const second = await box(boxes.nth(1));
    const third = await box(boxes.nth(2));
    expect([first.width, first.height]).toEqual([20, 20]);
    // Each box sits on the group's inline-start edge, at the same x as a
    // RadioGroup circle in the same catalog column, 8px before its label.
    expect(first.x).toBeCloseTo((await box(group)).x, 0);
    expect(first.x).toBeCloseTo(radio.circles[0]!.x, 0);
    const label = await box(group.locator('.kui-checkbox__label').nth(0));
    expect(label.x - first.x - first.width).toBeCloseTo(8, 0);
    expect(label.x - first.x).toBeCloseTo(
      radio.label.x - radio.circles[0]!.x,
      0,
    );
    // Choices stack at the shared 28px pitch.
    expect(second.y - first.y).toBeCloseTo(28, 0);
    expect(second.y - first.y).toBeCloseTo(
      radio.circles[1]!.y - radio.circles[0]!.y,
      0,
    );
    // A choice hint sits on the label's column directly under its label,
    // exactly as a RadioGroup choice hint does.
    const hint = group.locator('.kui-checkbox__hint');
    const choiceHint = await box(hint);
    expect(choiceHint.x).toBeCloseTo(second.x, 0);
    expect(await paddingStart(hint)).toBeCloseTo(28, 0);
    expect(choiceHint.y - second.y).toBeCloseTo(
      radio.choiceHint.y - radio.roomy.y,
      0,
    );
    expect(third.y - choiceHint.y - choiceHint.height).toBeCloseTo(8, 0);
    // The group label and hint share the 9px text column with RadioGroup's.
    const legend = await box(group.locator('legend'));
    expect(legend.x).toBeCloseTo(radio.legend.x, 0);
    expect(
      await paddingStart(group.locator('.kui-checkbox-group__label')),
    ).toBeCloseTo(9, 0);
    expect(first.y - legend.y).toBeCloseTo(
      radio.circles[0]!.y - radio.legend.y,
      0,
    );
    const groupHint = group.locator('.kui-checkbox-group__hint');
    expect((await box(groupHint)).x).toBeCloseTo(radio.hint.x, 0);
    expect(await paddingStart(groupHint)).toBeCloseTo(9, 0);

    // Compact boxes are 18px, and horizontal choices sit in a wrapping row.
    const platforms = demo.getByRole('group', { name: 'Platforms' });
    const compact = platforms.locator('.kui-checkbox__box');
    const compactFirst = await box(compact.nth(0));
    const compactSecond = await box(compact.nth(1));
    expect([compactFirst.width, compactFirst.height]).toEqual([18, 18]);
    expect(compactFirst.x).toBeCloseTo(first.x, 0);
    expect(compactSecond.y).toBeCloseTo(compactFirst.y, 0);
    expect(compactSecond.x).toBeGreaterThan(compactFirst.x);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  }
});
