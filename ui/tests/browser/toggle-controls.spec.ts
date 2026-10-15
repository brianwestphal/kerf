import { expect, type Locator, type Page, test } from '@playwright/test';

// Checkbox, RadioGroup, and Switch are native inputs drawn as Kerf boxes: the
// label names each one, the keyboard works natively, the drawn box shows the
// focus ring, a mixed parent reports the native indeterminate state, and the
// drawn geometry matches the Web Awesome controls they replace.

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

test('a Checkbox toggles from its label and the keyboard and shows the ring on its box', async ({
  page,
  browserName,
}) => {
  const demo = await openDemo(page, 'checkbox');
  const email = demo.getByRole('checkbox', { name: 'Email summaries' });
  await expect(email).not.toBeChecked();
  await expect(email).toHaveAttribute(
    'aria-description',
    'Sent every Monday morning.',
  );
  await demo.getByText('Email summaries').click();
  await expect(email).toBeChecked();
  await expect(page.locator('.catalog-log')).toHaveText(
    'Email summaries: checked',
  );
  // Safari does not focus a checkbox on click, so focus it to type.
  await email.focus();
  await page.keyboard.press('Space');
  await expect(email).not.toBeChecked();

  // Keyboard focus shows the ring on the drawn box. Firefox counts only
  // keyboard navigation as focus-visible for a checkbox, and Safari's
  // default Tab order skips checkboxes, so reach it the way each allows.
  if (browserName !== 'webkit') {
    await demo.getByRole('checkbox', { name: 'Include in release' }).focus();
    await page.keyboard.press('Tab');
    await expect(email).toBeFocused();
  }
  const drawn = demo
    .locator('.kui-checkbox', {
      has: page.getByRole('checkbox', { name: 'Email summaries' }),
    })
    .locator('.kui-checkbox__box');
  const ring = await drawn.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return [style.outlineStyle, style.outlineWidth, style.outlineOffset];
  });
  expect(ring).toEqual(['solid', '3px', '1px']);

  // The invalid checkbox reports it; the disabled one dims and ignores clicks.
  const terms = demo.getByRole('checkbox', {
    name: 'I accept the release terms',
  });
  await expect(terms).toHaveAttribute('aria-invalid', 'true');
  const locked = demo.getByRole('checkbox', { name: 'Locked setting' });
  await expect(locked).toBeDisabled();
  expect(
    await demo
      .locator('.kui-checkbox', {
        has: page.getByRole('checkbox', { name: 'Locked setting' }),
      })
      .locator('.kui-checkbox__row')
      .evaluate((row) => window.getComputedStyle(row).opacity),
  ).toBe('0.5');
});

test('a mixed parent Checkbox reports and resolves its native indeterminate state', async ({
  page,
}) => {
  const demo = await openDemo(page, 'checkbox');
  const all = demo.getByRole('checkbox', { name: 'All tasks' });
  const indeterminate = () =>
    all.evaluate((input) => (input as HTMLInputElement).indeterminate);
  await expect.poll(indeterminate).toBe(true);
  await expect(all).toHaveJSProperty('checked', false);
  const minus = demo
    .locator('.kui-checkbox', {
      has: page.getByRole('checkbox', { name: 'All tasks' }),
    })
    .locator('[data-lucide="minus"]');
  await expect(minus).toBeVisible();

  await all.click();
  await expect.poll(indeterminate).toBe(false);
  await expect(all).toBeChecked();
  for (const name of ['Design review', 'Build release', 'Ship to customers'])
    await expect(demo.getByRole('checkbox', { name })).toBeChecked();

  await demo.getByRole('checkbox', { name: 'Build release' }).click();
  await expect.poll(indeterminate).toBe(true);
  await demo.getByRole('checkbox', { name: 'Design review' }).click();
  await demo.getByRole('checkbox', { name: 'Ship to customers' }).click();
  await expect.poll(indeterminate).toBe(false);
  await expect(all).not.toBeChecked();
});

test('a RadioGroup is one Tab stop whose arrow keys move and select', async ({
  page,
}) => {
  const demo = await openDemo(page, 'radio-group');
  const group = demo.getByRole('radiogroup', { name: 'Layout Density' });
  await expect(group).toHaveAttribute(
    'aria-description',
    'Applies to every list.',
  );
  const balanced = group.getByRole('radio', { name: 'Balanced' });
  await expect(balanced).toBeChecked();
  await balanced.focus();
  await page.keyboard.press('ArrowDown');
  const roomy = group.getByRole('radio', { name: 'Roomy' });
  await expect(roomy).toBeChecked();
  await expect(roomy).toBeFocused();
  await expect(roomy).toHaveAttribute(
    'aria-description',
    'Larger rows for touch screens.',
  );
  await expect(page.locator('.catalog-log')).toHaveText('Choice: roomy');
  await page.keyboard.press('ArrowUp');
  await expect(balanced).toBeChecked();
  await expect(roomy).not.toBeChecked();
  await expect(group.getByRole('radio', { name: 'Custom' })).toBeDisabled();

  const channel = demo.getByRole('radiogroup', { name: 'Release Channel' });
  await expect(channel).toHaveAttribute('aria-invalid', 'true');
  await expect(channel).toHaveAttribute('aria-required', 'true');
  await channel.getByText('Beta').click();
  await expect(channel.getByRole('radio', { name: 'Beta' })).toBeChecked();
});

test('a Switch toggles its setting and slides its thumb', async ({ page }) => {
  const demo = await openDemo(page, 'switch');
  const live = demo.getByRole('switch', { name: 'Live updates' });
  await expect(live).toBeChecked();
  await expect(live).toHaveAttribute(
    'aria-description',
    'The list refreshes as tickets change.',
  );
  const thumb = demo
    .locator('.kui-switch', {
      has: page.getByRole('switch', { name: 'Live updates' }),
    })
    .locator('.kui-switch__thumb');
  const on = await box(thumb);
  await live.click();
  await expect(live).not.toBeChecked();
  await expect(live).toHaveAttribute(
    'aria-description',
    'Refresh the list by hand.',
  );
  await expect(page.locator('.catalog-log')).toHaveText('Live updates: off');
  await expect.poll(async () => (await box(thumb)).x).toBeLessThan(on.x - 10);
  await live.focus();
  await page.keyboard.press('Space');
  await expect(live).toBeChecked();
  await expect(
    demo.getByRole('switch', { name: 'Managed setting' }),
  ).toBeDisabled();
});

test('drawn controls keep the Web Awesome geometry at wide and narrow widths', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    let demo = await openDemo(page, 'checkbox', width);
    const field = (name: string) =>
      demo.locator('.kui-checkbox', {
        has: page.getByRole('checkbox', { name, exact: true }),
      });
    const drawn = await box(
      field('Email summaries').locator('.kui-checkbox__box'),
    );
    expect([drawn.width, drawn.height]).toEqual([20, 20]);
    const label = await box(
      field('Email summaries').locator('.kui-checkbox__label'),
    );
    expect(label.x - drawn.x - drawn.width).toBeCloseTo(8, 0);
    // The hint sits on the label's column.
    const hint = await box(
      field('Email summaries').locator('.kui-checkbox__hint'),
    );
    expect(hint.x).toBeCloseTo(drawn.x, 0);
    expect(
      await field('Email summaries')
        .locator('.kui-checkbox__hint')
        .evaluate((element) =>
          parseFloat(window.getComputedStyle(element).paddingInlineStart),
        ),
    ).toBeCloseTo(28, 0);
    const compact = await box(
      field('Show archived').locator('.kui-checkbox__box'),
    );
    expect([compact.width, compact.height]).toEqual([18, 18]);

    demo = await openDemo(page, 'switch', width);
    const track = await box(
      demo
        .locator('.kui-switch', {
          has: page.getByRole('switch', { name: 'Compact navigation' }),
        })
        .locator('.kui-switch__track'),
    );
    expect([track.width, track.height]).toEqual([35, 20]);

    demo = await openDemo(page, 'radio-group', width);
    const circles = demo
      .getByRole('radiogroup', { name: 'Layout Density' })
      .locator('.kui-radio-group__circle');
    const first = await box(circles.nth(0));
    const second = await box(circles.nth(1));
    expect([first.width, first.height]).toEqual([20, 20]);
    expect(second.y - first.y - first.height).toBeCloseTo(12, 0);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  }
});
