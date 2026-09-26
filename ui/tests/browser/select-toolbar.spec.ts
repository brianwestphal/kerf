import { expect, test } from '@playwright/test';

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
  expect(focusGeometry.width).toBe(34);
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

// The group paints the composed focus ring for an icon-only Select, so the ring
// is only concentric with the visible control when the trigger fills the
// group's control slot exactly: a square group, the combobox inset evenly on
// every side, and the combobox radius equal to the group radius minus that
// inset. Before, a 32px compact trigger grew the group into a 36x34 oval and
// its disclosure caret overflowed the trailing edge.
test('compact toolbar Select focus ring follows the control box in every state and shape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=select');
  const demo = page.locator('[data-demo="select"]');
  const select = demo.locator('[name="toolbar-rendering-balance"]');
  const group = select.locator('xpath=..');
  const ringGeometry = () =>
    group.evaluate((element) => {
      const resolvedRadius = (value: string, box: DOMRect) =>
        Math.min(Number.parseFloat(value), Math.min(box.width, box.height) / 2);
      const style = window.getComputedStyle(element);
      const outer = element.getBoundingClientRect();
      const host = element.querySelector('wa-select')!;
      const combobox =
        host.shadowRoot!.querySelector<HTMLElement>('[part~="combobox"]')!;
      const inner = combobox.getBoundingClientRect();
      const caret = host.shadowRoot!.querySelector<HTMLElement>(
        '[part~="expand-icon"]',
      );
      return {
        caretDisplay: caret ? window.getComputedStyle(caret).display : 'none',
        groupHeight: outer.height,
        groupRadius: resolvedRadius(style.borderTopLeftRadius, outer),
        groupWidth: outer.width,
        insets: [
          inner.left - outer.left,
          inner.top - outer.top,
          outer.right - inner.right,
          outer.bottom - inner.bottom,
        ].map((inset) => Math.round(inset * 100) / 100),
        innerRadius: resolvedRadius(
          window.getComputedStyle(combobox).borderTopLeftRadius,
          inner,
        ),
        ring:
          style.outlineStyle === 'solid'
            ? `outline ${style.outlineWidth} +${style.outlineOffset}`
            : style.boxShadow !== 'none'
              ? 'halo'
              : 'none',
      };
    });
  const expectConcentric = (
    geometry: Awaited<ReturnType<typeof ringGeometry>>,
    size: number,
    inset: number,
    ring: string,
  ) => {
    expect(geometry.ring).toBe(ring);
    expect(geometry.groupWidth).toBe(size);
    expect(geometry.groupHeight).toBe(size);
    expect(geometry.insets).toEqual([inset, inset, inset, inset]);
    expect(geometry.innerRadius).toBeCloseTo(geometry.groupRadius - inset, 1);
    expect(geometry.caretDisplay).toBe('none');
  };

  // Keyboard focus-visible, then the open listbox with a focused option.
  await demo.getByRole('combobox', { name: 'Rendering preference' }).focus();
  await page.keyboard.press('Tab');
  await expect(select).toBeFocused();
  expectConcentric(await ringGeometry(), 34, 1, 'outline 3px +1px');
  await page.keyboard.press('Enter');
  await expect(select).toHaveAttribute('open');
  await page.keyboard.press('ArrowDown');
  expectConcentric(await ringGeometry(), 34, 1, 'outline 3px +1px');
  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open');

  // The same contract holds for the rounded shape, the default size, and the
  // halo ring: the group's typed data attributes drive all of it.
  for (const [size, shape, ring, box, inset] of [
    ['compact', 'rounded', 'outline', 34, 1],
    ['compact', 'pill', 'halo', 34, 1],
    ['default', 'pill', 'outline', 44, 2],
    ['default', 'rounded', 'halo', 44, 2],
  ] as const) {
    await group.evaluate(
      (element, [nextSize, nextShape, nextRing]) => {
        element.setAttribute('data-size', nextSize);
        element.setAttribute('data-shape', nextShape);
        element.setAttribute('data-focus-ring', nextRing);
      },
      [size, shape, ring] as const,
    );
    const expected = ring === 'halo' ? 'halo' : 'outline 3px +1px';
    await select.getByRole('combobox').focus();
    expectConcentric(await ringGeometry(), box, inset, expected);
    await select.click();
    await expect(select).toHaveAttribute('open');
    await page.keyboard.press('ArrowDown');
    expectConcentric(await ringGeometry(), box, inset, expected);
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
