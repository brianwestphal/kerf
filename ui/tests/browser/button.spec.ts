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

// The sunken grain and the catalog stage's checkerboard vary pixel to pixel
// under translucent surfaces; sample the flat colors instead (the documented
// --kui-sunken-texture knob and the stage's own plain sunken backdrop) so one
// pixel stands for the surface.
const flatSunken = async (page: Page) => {
  await page.addStyleTag({ content: ':root { --kui-sunken-texture: none; }' });
  await page
    .locator('.kui-catalog__stage')
    .evaluateAll((stages) =>
      stages.forEach((stage) =>
        stage.setAttribute('data-background-style', 'sunken'),
      ),
    );
};

// On a sunken or tinted surface the line paints that surface (the surface
// context, foundation.css), not the base surface color: it matches the
// pixels just outside the button, so it reads as a cut rather than a halo,
// and the ring still clears 3:1 against both.
test('an inset focus ring line matches the sunken surface it sits on', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    const demo = await openDemo(page);
    await flatSunken(page);
    const buttons = demo.locator(
      '[data-demo-section="focus-ring-inset-sunken"] > .kui-button',
    );
    await expect(buttons).toHaveCount(3);
    for (const tone of ['neutral', 'brand', 'danger']) {
      const button = buttons.and(demo.locator(`[data-tone="${tone}"]`));
      const ring = await sampleInsetRing(page, button, 4.5);
      expect(ring.clipped).toBe(true);
      expect(contrastRatio(ring.line, ring.outside)).toBeLessThan(1.1);
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

// Every surface that paints behind its children publishes the context on its
// own element: quiet ContentItem fills, a lowered FramedList and its
// highlighted row, a raised List (opaque, so it resets the tint), a sunken
// panel nested in a raised surface (the lowered tint over the raised color,
// not over the base), a TabBar strip, a Pane's or TabNavigator's app color
// (a sunken Pane's transparent content keeps it), and glass chrome at rest.
const SURFACES = {
  'neutral ContentItem':
    '<div class="kui-content-item" data-appearance="neutral"><div data-slot></div></div>',
  'info ContentItem':
    '<div class="kui-content-item" data-appearance="info"><div data-slot></div></div>',
  'lowered FramedList':
    '<div class="kui-framed-list" style="padding: 8px"><div data-slot></div></div>',
  'raised List':
    '<div class="kui-list" data-surface="raised" style="padding: 8px"><div data-slot></div></div>',
  'sunken panel in a raised List':
    '<div class="kui-list" data-surface="raised" style="padding: 8px"><div class="kui-sunken-panel"><div data-slot></div></div></div>',
  'highlighted FramedList row':
    '<ul class="kui-framed-list"><li class="kui-framed-list__row" data-highlighted="true"><div data-slot></div></li></ul>',
  'segmented TabBar strip':
    '<nav class="kui-tab-bar" data-presentation="segmented"><div class="kui-tab-bar__tabs" style="padding: 8px"><div data-slot></div></div></nav>',
  'Pane app background':
    '<div class="kui-pane" data-background style="--_kui-pane-background: light-dark(#dcebe0, #1e3326)"><div class="kui-pane__content" style="padding: 8px"><div data-slot></div></div></div>',
  'sunken Pane app background':
    '<div class="kui-pane" data-appearance="sunken" data-background style="--_kui-pane-background: light-dark(#dcebe0, #1e3326)"><div class="kui-pane__content" style="padding: 8px"><div data-slot></div></div></div>',
  'TabNavigator app background':
    '<div class="kui-tab-scaffold" data-background style="--_kui-tab-scaffold-background: light-dark(#dcebe0, #1e3326); padding: 8px"><div data-slot></div></div>',
  'Pane glass overlay header':
    '<div class="kui-pane" data-header-presentation="overlay"><div class="kui-pane__header" style="padding: 8px"><div data-slot></div></div></div>',
};

for (const [name, markup] of Object.entries(SURFACES)) {
  test(`an inset focus ring line matches a ${name}`, async ({ page }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      const demo = await openDemo(page);
      await flatSunken(page);
      const frame = demo.locator('[data-demo-section="focus-ring-inset"]');
      // The demo's real inset Buttons, moved onto the surface inside the
      // same clipping frame.
      await frame.evaluate((row, html) => {
        const host = document.createElement('div');
        host.innerHTML = html;
        const surface = host.firstElementChild!;
        const slot = surface.querySelector('[data-slot]')!;
        slot.className = row.className;
        slot.setAttribute('data-demo-section', 'focus-ring-inset-moved');
        slot.append(...row.children);
        row.replaceWith(surface);
      }, markup);
      const buttons = demo.locator(
        '[data-demo-section="focus-ring-inset-moved"] > .kui-button',
      );
      await expect(buttons).toHaveCount(3);
      for (const tone of ['neutral', 'brand', 'danger']) {
        const button = buttons.and(demo.locator(`[data-tone="${tone}"]`));
        const ring = await sampleInsetRing(page, button, 4.5);
        expect(contrastRatio(ring.line, ring.outside)).toBeLessThan(1.1);
        expect(
          contrastRatio(ring.ringOuter, ring.outside),
        ).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(ring.ringInner, ring.line)).toBeGreaterThanOrEqual(
          3,
        );
      }
    }
  });
}

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

// fill spans the button across its parent's inline width: the icon and label
// stay centered as one group 8px apart, the default ring stays clear of any
// clipping ancestor, focusRingInset still draws inside the box, a link fills
// the same way, and a column narrower than the label ellipsizes it.
test('a filled Button spans its column at wide and narrow widths', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    const demo = await openDemo(page, width);
    const button = demo.locator('[data-demo-section="fill"]');
    await expect(button).toHaveAttribute('data-fill', 'true');
    await button.evaluate((element) =>
      element.scrollIntoView({ block: 'center', behavior: 'instant' }),
    );
    const geometry = () =>
      button.evaluate((element) => {
        const parent = element.parentElement!.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        const icon = element
          .querySelector('.kui-button__icon')!
          .getBoundingClientRect();
        const label = element.querySelector('.kui-button__label')!;
        const text = label.getBoundingClientRect();
        let clip: Element | null = element.parentElement;
        while (clip && window.getComputedStyle(clip).overflow === 'visible')
          clip = clip.parentElement;
        const clipBox = clip!.getBoundingClientRect();
        return {
          tag: element.tagName,
          parentLeft: parent.left,
          parentWidth: parent.width,
          left: box.left,
          width: box.width,
          height: box.height,
          contentCenter: (icon.left + text.right) / 2,
          center: box.left + box.width / 2,
          iconGap: text.left - icon.right,
          truncated: label.scrollWidth > label.clientWidth,
          textOverflow: window.getComputedStyle(label).textOverflow,
          // The default ring paints 1px outside, 3px wide: 4px past the box.
          ringClear:
            box.left - 4 >= clipBox.left &&
            box.right + 4 <= clipBox.right &&
            box.top - 4 >= clipBox.top &&
            box.bottom + 4 <= clipBox.bottom,
        };
      });
    const filled = await geometry();
    expect(filled.tag).toBe('BUTTON');
    expect(filled.left).toBeCloseTo(filled.parentLeft, 0);
    expect(filled.width).toBeCloseTo(filled.parentWidth, 0);
    expect(filled.width).toBeLessThanOrEqual(440);
    expect(filled.height).toBe(44);
    expect(Math.abs(filled.contentCenter - filled.center)).toBeLessThan(1);
    expect(filled.iconGap).toBeCloseTo(8, 0);
    expect(filled.truncated).toBe(false);
    if (width === 390) expect(filled.width).toBeLessThan(390);
    else expect(filled.width).toBe(440);

    // The default ring stays outside the box and clear of every clip.
    await page.mouse.move(1, 1);
    await page.keyboard.press('Shift');
    await button.focus();
    await expect(button).toHaveCSS('outline-offset', '1px');
    await expect(button).toHaveCSS('outline-width', '3px');
    expect(filled.ringClear).toBe(true);

    // focusRingInset keeps its two-tone ring inside a filled box.
    await button.evaluate((element) => {
      element.dataset.focusRingInset = 'true';
    });
    const ring = await sampleInsetRing(page, button, 4.5);
    expect(ring.width).toBe(3);
    expect(ring.offset + ring.width).toBeLessThanOrEqual(0);
    expect(contrastRatio(ring.ringOuter, ring.ringInner)).toBeLessThan(1.1);
    expect(contrastRatio(ring.ringInner, ring.line)).toBeGreaterThanOrEqual(3);
    await button.evaluate((element) => {
      delete element.dataset.focusRingInset;
    });

    // A link Button with the same markers fills the same column.
    await button.evaluate((element) => {
      const link = document.createElement('a');
      for (const { name, value } of element.attributes)
        link.setAttribute(name, value);
      link.removeAttribute('type');
      link.setAttribute('href', '#button');
      link.innerHTML = element.innerHTML;
      element.replaceWith(link);
    });
    const linked = await geometry();
    expect(linked.tag).toBe('A');
    expect(linked.width).toBeCloseTo(filled.width, 0);
    expect(linked.height).toBe(44);
    expect(Math.abs(linked.contentCenter - linked.center)).toBeLessThan(1);

    // A column narrower than the label ellipsizes it inside the full width.
    await button.evaluate((element) => {
      element.parentElement!.style.width = '96px';
    });
    const narrow = await geometry();
    expect(narrow.width).toBeCloseTo(96, 0);
    expect(narrow.truncated).toBe(true);
    expect(narrow.textOverflow).toBe('ellipsis');
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
