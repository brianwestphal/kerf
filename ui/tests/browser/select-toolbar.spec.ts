import { expect, type Locator, type Page, test } from '@playwright/test';

test('compact toolbar Select uses group focus geometry and spaced option icons', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=select');
  const demo = page.locator('[data-demo="select"]');
  const select = demo.locator('[name="toolbar-rendering-balance"]');
  const group = select.locator('xpath=..');

  await select.click();
  await expect(select).toHaveAttribute('open');
  const focusGeometry = await group.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      borderRadius: Number.parseFloat(style.borderTopLeftRadius),
      height: bounds.height,
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      width: bounds.width,
    };
  });
  expect(focusGeometry).toMatchObject({
    height: 34,
    outlineStyle: 'solid',
    outlineWidth: 3,
  });
  expect(focusGeometry.width).toBe(68);
  expect(focusGeometry.borderRadius).toBeGreaterThanOrEqual(17);

  const gaps = await select.locator('wa-option').evaluateAll((options) =>
    options.map((option) => {
      const icon = option.querySelector<HTMLElement>('.kui-select__icon');
      const label = [...option.childNodes].find(
        (node) =>
          node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
      );
      if (!icon || !label) return -1;
      const range = document.createRange();
      range.selectNodeContents(label);
      return (
        range.getBoundingClientRect().left - icon.getBoundingClientRect().right
      );
    }),
  );
  expect(gaps).toHaveLength(3);
  for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(8);

  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/select-toolbar-wide.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  const popupBounds = await select.evaluate((element) =>
    element.shadowRoot
      ?.querySelector<HTMLElement>('[part~="listbox"]')
      ?.getBoundingClientRect(),
  );
  expect(popupBounds?.left).toBeGreaterThanOrEqual(10);
  expect(popupBounds?.right).toBeLessThanOrEqual(380);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/select-toolbar-narrow.png' });
});

// An icon-only Select shows its icon plus a visible disclosure caret, as one
// pill in the same control family as the ToolbarControlGroup popup-menu
// dropdown (an icon + caret wa-button). The group paints the composed focus
// ring, so the ring only follows the visible control when the trigger is inset
// evenly on every side with a concentric radius; the group then sizes to the
// trigger and is wider than tall. Before, a lone default-size trigger was a
// 32px square left-aligned in a 44px group, and the caret was hidden.
type TriggerGeometry = {
  triggerWidth: number;
  triggerHeight: number;
  iconStart: number;
  iconCenter: number;
  caretCenter: number;
  caretHeight: number;
  caretVisible: boolean;
};

const round = (value: number) => Math.round(value * 100) / 100;

async function popupMenuTrigger(page: Page, size: 'default' | 'compact') {
  await page.goto('/?component=toolbar-control-group');
  const dropdown = page
    .locator('[data-demo="toolbar-control-group"] wa-dropdown')
    .first();
  await dropdown.evaluate(
    (element, nextSize) =>
      element.parentElement!.setAttribute('data-size', nextSize),
    size,
  );
  return dropdown.locator('wa-button').evaluate((button): TriggerGeometry => {
    const base = button.shadowRoot!.querySelector('[part~="base"]')!;
    const trigger = base.getBoundingClientRect();
    const icon = button.querySelector('svg')!.getBoundingClientRect();
    const caret =
      button.shadowRoot!.querySelector<HTMLElement>('[part~="caret"]')!;
    const glyph = caret
      .shadowRoot!.querySelector('svg')!
      .getBoundingClientRect();
    return {
      triggerWidth: trigger.width,
      triggerHeight: trigger.height,
      iconStart: icon.left - trigger.left,
      iconCenter: icon.left + icon.width / 2 - trigger.left,
      caretCenter: glyph.left + glyph.width / 2 - trigger.left,
      caretHeight: Number.parseFloat(
        window.getComputedStyle(caret.shadowRoot!.querySelector('svg')!).height,
      ),
      caretVisible:
        window.getComputedStyle(caret).display !== 'none' && glyph.width > 0,
    };
  });
}

function selectGeometry(select: Locator) {
  return select.evaluate((host) => {
    const group = host.closest<HTMLElement>('.kui-toolbar-control-group')!;
    const resolvedRadius = (value: string, box: DOMRect) =>
      Math.min(Number.parseFloat(value), Math.min(box.width, box.height) / 2);
    const style = window.getComputedStyle(group);
    const outer = group.getBoundingClientRect();
    const combobox =
      host.shadowRoot!.querySelector<HTMLElement>('[part~="combobox"]')!;
    const inner = combobox.getBoundingClientRect();
    const icon = host
      .querySelector('.kui-select__icon--selected')!
      .getBoundingClientRect();
    const caret = host.shadowRoot!.querySelector<HTMLElement>(
      '[part~="expand-icon"]',
    )!;
    const glyphSvg = caret
      .querySelector('wa-icon')!
      .shadowRoot!.querySelector('svg')!;
    const glyph = glyphSvg.getBoundingClientRect();
    const trigger: TriggerGeometry = {
      triggerWidth: inner.width,
      triggerHeight: inner.height,
      iconStart: icon.left - inner.left,
      iconCenter: icon.left + icon.width / 2 - inner.left,
      caretCenter: glyph.left + glyph.width / 2 - inner.left,
      // The open caret rotates with a transition, so measure the glyph's
      // layout height times the part's scale rather than its rotating box.
      caretHeight:
        Number.parseFloat(window.getComputedStyle(glyphSvg).height) *
        new DOMMatrix(window.getComputedStyle(caret).transform).a,
      caretVisible:
        window.getComputedStyle(caret).display !== 'none' &&
        Number(window.getComputedStyle(caret).opacity) === 1 &&
        glyph.width > 0,
    };
    return {
      trigger,
      groupWidth: outer.width,
      groupHeight: outer.height,
      groupRadius: resolvedRadius(style.borderTopLeftRadius, outer),
      innerRadius: resolvedRadius(
        window.getComputedStyle(combobox).borderTopLeftRadius,
        inner,
      ),
      insets: [
        inner.left - outer.left,
        inner.top - outer.top,
        outer.right - inner.right,
        outer.bottom - inner.bottom,
      ],
      ring:
        style.outlineStyle === 'solid'
          ? `outline ${style.outlineWidth} +${style.outlineOffset}`
          : style.boxShadow !== 'none'
            ? 'halo'
            : 'none',
    };
  });
}

function expectSameTrigger(actual: TriggerGeometry, popup: TriggerGeometry) {
  expect(actual.caretVisible).toBe(true);
  expect(popup.caretVisible).toBe(true);
  expect(round(actual.triggerHeight)).toBe(round(popup.triggerHeight));
  expect(Math.abs(actual.triggerWidth - popup.triggerWidth)).toBeLessThan(0.5);
  expect(Math.abs(actual.iconStart - popup.iconStart)).toBeLessThan(0.5);
  expect(Math.abs(actual.caretCenter - popup.caretCenter)).toBeLessThan(0.5);
  expect(Math.abs(actual.caretHeight - popup.caretHeight)).toBeLessThan(0.5);
  // Symmetric inline padding: the icon's leading gap equals the caret glyph
  // box's trailing gap, so the icon sits left of center to balance the caret.
  expect(actual.iconCenter).toBeLessThan(actual.triggerWidth / 2);
  expect(actual.caretCenter).toBeGreaterThan(actual.triggerWidth / 2);
}

test('icon-only toolbar Select is a caret pill matching the popup-menu dropdown in every size, shape, and ring state', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  const popup = {
    default: await popupMenuTrigger(page, 'default'),
    compact: await popupMenuTrigger(page, 'compact'),
  };
  expect(popup.default.triggerHeight).toBe(40);
  expect(popup.compact.triggerHeight).toBe(32);

  await page.goto('/?component=select');
  const demo = page.locator('[data-demo="select"]');
  const expectPill = (
    geometry: Awaited<ReturnType<typeof selectGeometry>>,
    size: 'default' | 'compact',
    ring: string,
  ) => {
    const inset = size === 'compact' ? 1 : 2;
    expect(geometry.ring).toBe(ring);
    expectSameTrigger(geometry.trigger, popup[size]);
    expect(geometry.groupHeight).toBe(size === 'compact' ? 34 : 44);
    expect(geometry.groupWidth).toBeGreaterThan(geometry.groupHeight);
    expect(geometry.insets.map(round)).toEqual([inset, inset, inset, inset]);
    expect(geometry.innerRadius).toBeCloseTo(geometry.groupRadius - inset, 1);
  };

  // The catalog shows both sizes: a default-size group (the reported case)
  // and a compact one. Walk keyboard focus-visible and the open listbox with a
  // focused option for each.
  for (const [name, size] of [
    ['toolbar-default-rendering-balance', 'default'],
    ['toolbar-rendering-balance', 'compact'],
  ] as const) {
    const select = demo.locator(`[name="${name}"]`);
    await page.keyboard.press('Shift');
    await select.getByRole('combobox').focus();
    await expect(select).toBeFocused();
    expectPill(await selectGeometry(select), size, 'outline 3px +1px');
    await page.keyboard.press('Enter');
    await expect(select).toHaveAttribute('open');
    await page.keyboard.press('ArrowDown');
    expectPill(await selectGeometry(select), size, 'outline 3px +1px');
    await page.keyboard.press('Escape');
    await expect(select).not.toHaveAttribute('open');
  }

  // The rounded shape, both sizes, and the halo ring follow the group's typed
  // data attributes.
  const select = demo.locator('[name="toolbar-rendering-balance"]');
  const group = select.locator('xpath=..');
  for (const [size, shape, ring] of [
    ['compact', 'rounded', 'outline'],
    ['compact', 'pill', 'halo'],
    ['default', 'pill', 'halo'],
    ['default', 'rounded', 'outline'],
    ['default', 'rounded', 'halo'],
  ] as const) {
    await group.evaluate(
      (element, [nextSize, nextShape, nextRing]) => {
        element.setAttribute('data-size', nextSize);
        element.setAttribute('data-shape', nextShape);
        element.setAttribute('data-focus-ring', nextRing);
        element.querySelector('wa-select')!.setAttribute('data-size', nextSize);
      },
      [size, shape, ring] as const,
    );
    const expected = ring === 'halo' ? 'halo' : 'outline 3px +1px';
    await select.getByRole('combobox').focus();
    expectPill(await selectGeometry(select), size, expected);
    await select.click();
    await expect(select).toHaveAttribute('open');
    await page.keyboard.press('ArrowDown');
    expectPill(await selectGeometry(select), size, expected);
    await page.keyboard.press('Escape');
    await expect(select).not.toHaveAttribute('open');
  }
});

// A choice icon colored with a foreground token must stay legible in the open
// menu. The demo's Quiet icon was colored with the success *fill* alias (a 14%
// tint of the surface), which rendered at about 1.2:1 against the listbox.
test('Select option icon colors keep non-text contrast in light and dark themes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=select');
  const select = page.locator(
    '[data-demo="select"] [name="rendering-balance"]',
  );
  const iconContrast = () =>
    select.evaluate((element) => {
      const channels = (color: string) => {
        const probe = document.createElement('canvas').getContext('2d')!;
        probe.fillStyle = color;
        probe.fillRect(0, 0, 1, 1);
        return [...probe.getImageData(0, 0, 1, 1).data];
      };
      const luminance = (color: string) => {
        const [red, green, blue] = channels(color)
          .slice(0, 3)
          .map((channel) => {
            const value = channel / 255;
            return value <= 0.04045
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4;
          });
        return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
      };
      const icon = element.querySelector<HTMLElement>(
        'wa-option[value="quiet"] .kui-select__icon',
      )!;
      const listbox =
        element.shadowRoot!.querySelector<HTMLElement>('[part~="listbox"]')!;
      const iconColor = window.getComputedStyle(icon).color;
      const foreground = luminance(iconColor);
      const background = luminance(
        window.getComputedStyle(listbox).backgroundColor,
      );
      const lighter = Math.max(foreground, background);
      const darker = Math.min(foreground, background);
      return {
        alpha: channels(iconColor)[3],
        contrast: (lighter + 0.05) / (darker + 0.05),
        opacity: Number(window.getComputedStyle(icon).opacity),
      };
    });

  for (const theme of ['initial', 'toggled']) {
    if (theme === 'toggled')
      await page.locator('[data-action="toggle-theme"]').click();
    await select.click();
    await expect(select).toHaveAttribute('open');
    const measured = await iconContrast();
    expect(measured.opacity).toBe(1);
    expect(measured.alpha).toBe(255);
    expect(measured.contrast).toBeGreaterThanOrEqual(3);
    await page.keyboard.press('Escape');
    await expect(select).not.toHaveAttribute('open');
  }
});
