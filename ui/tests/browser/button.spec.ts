import { expect, type Page, test } from '@playwright/test';

import { contrastRatio } from '../../evaluator/index.mjs';
import { sampleInsetRing } from './fixtures/focus-ring-inset.js';

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
  // Without focusRingInset the ring stays outside, with no inner line.
  await expect(cancel).not.toHaveAttribute('data-focus-ring-inset');
  await expect(cancel).toHaveCSS('box-shadow', 'none');
});

// focusRingInset moves the ring inside the box so a clipping ancestor (the
// specimen frame clips overflow) cannot crop it. A loud fill can share the
// ring's hue, so a surface-colored line runs inside the ring: the ring meets
// a surface color on both edges and clears 3:1 against each, on every tone,
// in both schemes.
test('an inset focus ring stays inside a clipping container on every tone', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    const demo = await openDemo(page);
    const buttons = demo.locator(
      '[data-demo-section="focus-ring-inset"] > .kui-button',
    );
    await expect(buttons).toHaveCount(3);
    for (const tone of ['neutral', 'brand', 'danger']) {
      const button = buttons.and(demo.locator(`[data-tone="${tone}"]`));
      await expect(button).toHaveAttribute('data-focus-ring-inset', 'true');
      // Button's line runs inside its 1px border, 3px to 6px in.
      const ring = await sampleInsetRing(page, button, 4.5);
      expect(ring.clipOverflow).toBe('hidden');
      expect(ring.clipped).toBe(true);
      expect(ring.width).toBe(3);
      expect(ring.offset + ring.width).toBeLessThanOrEqual(0);
      // The ring paints from the box's very edge, so nothing is cropped.
      expect(contrastRatio(ring.ringOuter, ring.ringInner)).toBeLessThan(1.1);
      expect(
        contrastRatio(ring.ringOuter, ring.outside),
      ).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(ring.ringInner, ring.line)).toBeGreaterThanOrEqual(
        3,
      );
      expect(contrastRatio(ring.line, ring.fill)).toBeGreaterThan(1.5);
    }
  }
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

test('a pressed Button toggles, stays legible, and an icon-only one shows its help tag', async ({
  page,
}) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/?component=button');
    const demo = page.locator('[data-demo="button"]');
    const icon = demo.getByRole('button', { name: 'Show Conversation' });
    const labeled = demo.getByRole('button', {
      name: 'Conversation',
      exact: true,
    });
    await expect(icon).toHaveAttribute('aria-pressed', 'false');
    await icon.click();
    await expect(icon).toHaveAttribute('aria-pressed', 'true');
    await expect(labeled).toHaveAttribute('aria-pressed', 'true');
    // The pressed label keeps its quiet-tone text, never the loud on-fill
    // color over a pale fill.
    const colors = await labeled.evaluate((element) => {
      const style = globalThis.getComputedStyle(element);
      return { text: style.color, fill: style.backgroundColor };
    });
    expect(colors.text).not.toBe(colors.fill);
    expect(colors.text).not.toBe('rgb(255, 255, 255)');
    expect(
      await demo
        .getByRole('button', { name: 'Inspector (Pill, Pressed)' })
        .evaluate(
          (element) => globalThis.getComputedStyle(element).borderTopLeftRadius,
        ),
    ).not.toBe('12px');
  }
  const refresh = page
    .locator('[data-demo="button"]')
    .getByRole('button', { name: 'Refresh', exact: true });
  await refresh.hover();
  await expect(page.locator('.kui-help-tag')).toHaveText('Refresh');
  // A disabled toggle (the old IconToggleButton) shows the not-allowed cursor.
  await expect(
    page
      .locator('[data-demo="button"]')
      .getByRole('button', { name: 'Inspector (Disabled)' }),
  ).toHaveCSS('cursor', 'not-allowed');
  // A title replaces the help tag with native hover text.
  const remove = page.locator(
    '[data-demo="button"] [title="Delete the Selected Draft"]',
  );
  await expect(remove).toHaveAccessibleName('Delete');
  await expect(remove).toHaveAttribute('title', 'Delete the Selected Draft');
  await remove.hover();
  await page.waitForTimeout(800);
  await expect(
    page.locator('.kui-help-tag', { hasText: 'Delete' }),
  ).toHaveCount(0);
});
