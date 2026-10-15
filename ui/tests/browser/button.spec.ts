import { expect, type Page, test } from '@playwright/test';

// Button is a native button (or link): it activates from the keyboard, never
// submits a form by default, shows the focus ring on keyboard focus, keeps
// its accessible name while busy, and dims when disabled.

const log = (page: Page) => page.locator('.catalog-log');

async function openDemo(page: Page, width = 1100) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/?component=button');
  return page.locator('[data-demo="button"]');
}

test('Enter and Space activate a Button, which shows the focus ring', async ({
  page,
}) => {
  const demo = await openDemo(page);
  const cancel = demo.getByRole('button', { name: 'Cancel' });
  await cancel.evaluate((button) => {
    button.addEventListener('click', () => {
      button.dataset.clicks = String(Number(button.dataset.clicks ?? 0) + 1);
    });
  });
  await cancel.focus();
  await page.keyboard.press('Enter');
  await expect(log(page)).toHaveText('More actions requested');
  await page.keyboard.press('Space');
  await expect(cancel).toHaveAttribute('data-clicks', '2');
  // Keyboard focus draws the 3px focus ring 1px outside the button. (Focus
  // follows a key press rather than Tab: Safari's default Tab order skips
  // every native button, a platform setting a Button keeps.)
  await page.mouse.click(1, 1);
  await page.keyboard.press('Shift');
  await cancel.focus();
  await expect(cancel).toBeFocused();
  const ring = await cancel.evaluate((button) => {
    const style = window.getComputedStyle(button);
    return [style.outlineStyle, style.outlineWidth, style.outlineOffset];
  });
  expect(ring).toEqual(['solid', '3px', '1px']);
});

test('a Button never submits its form unless its type says so', async ({
  page,
}) => {
  const demo = await openDemo(page);
  // The demo's real Button markup, moved into a form.
  const submitted = await demo
    .getByRole('button', { name: 'Cancel' })
    .evaluate(async (button) => {
      const form = document.createElement('form');
      let count = 0;
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        count += 1;
      });
      const copy = button.cloneNode(true) as HTMLButtonElement;
      form.append(copy);
      document.body.append(form);
      copy.click();
      const asSubmit = copy.cloneNode(true) as HTMLButtonElement;
      asSubmit.type = 'submit';
      form.append(asSubmit);
      asSubmit.click();
      form.remove();
      return [copy.type, count];
    });
  expect(submitted).toEqual(['button', 1]);
});

test('a link Button navigates, a busy one keeps its name, a disabled one dims', async ({
  page,
}) => {
  const demo = await openDemo(page);
  const link = demo.getByRole('link', { name: 'Download' });
  await expect(link).toHaveClass(/kui-button/);
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#button$/);

  const busy = demo.getByRole('button', { name: 'Saving' });
  await expect(busy).toHaveAttribute('aria-busy', 'true');
  await expect(busy.locator('.kui-button__spinner')).toBeVisible();
  // The label is transparent, not hidden: it still names the button.
  expect(
    await busy
      .locator('.kui-button__label')
      .evaluate((label) => window.getComputedStyle(label).opacity),
  ).toBe('0');
  // The hidden label keeps the button's width.
  const widths = await busy.evaluate((button) => ({
    button: button.getBoundingClientRect().width,
    label: button.querySelector('.kui-button__label')!.getBoundingClientRect()
      .width,
  }));
  expect(widths.label).toBeGreaterThan(0);
  expect(widths.button).toBeGreaterThan(widths.label);

  const disabled = demo.getByRole('button', { name: 'Unavailable' }).first();
  await expect(disabled).toBeDisabled();
  const dim = await disabled.evaluate((button) => {
    const style = window.getComputedStyle(button);
    return [style.opacity, style.cursor];
  });
  expect(dim).toEqual(['0.5', 'not-allowed']);
  await disabled.click({ force: true });
  await expect(log(page)).not.toHaveText('More actions requested');
});

test('Buttons are 44px tall, or 33px compact, at wide and narrow widths', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    const demo = await openDemo(page, width);
    const height = (name: string) =>
      demo
        .getByRole('button', { name })
        .evaluate((button) => button.getBoundingClientRect().height);
    expect(await height('Save')).toBe(44);
    expect(await height('New Item')).toBe(33);
    // Nothing in the demo overflows a phone-width viewport.
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  }
});
