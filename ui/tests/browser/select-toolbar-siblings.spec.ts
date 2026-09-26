import { expect, type Locator, test } from '@playwright/test';

// An icon-only Select beside other controls in one ToolbarControlGroup must
// read as one more segment: the same block inset, height, and radius as its
// button and dropdown siblings, the group's gap on both sides (a lone trigger's
// padding overlap must not leak into a shared row), a circular selected
// sibling, a hover pill like its siblings', and a per-control focus ring that
// matches theirs. Before, a compact Select ate 1px of the gap on each side, a
// compact rounded Select took the lone-slot radius instead of the siblings'
// item radius, a compact pressed button was a 34x32 oval, the Select had no
// hover state, and a Select told that the group owns its ring showed no ring
// at all in a per-control-ring group.
function groupGeometry(select: Locator) {
  return select.evaluate((host) => {
    const group = host.closest<HTMLElement>('.kui-toolbar-control-group')!;
    const outer = group.getBoundingClientRect();
    const visual = (child: Element) => {
      if (child.tagName === 'WA-SELECT')
        return child.shadowRoot!.querySelector<HTMLElement>(
          '[part~="combobox"]',
        )!;
      if (child.tagName === 'WA-DROPDOWN')
        return child
          .querySelector('wa-button')!
          .shadowRoot!.querySelector<HTMLElement>('[part~="base"]')!;
      return child as HTMLElement;
    };
    const segments = [...group.children].map((child) => {
      const element = visual(child);
      const box = element.getBoundingClientRect();
      return {
        tag: child.tagName,
        left: box.left - outer.left,
        right: box.right - outer.left,
        top: box.top - outer.top,
        bottom: outer.bottom - box.bottom,
        width: box.width,
        height: box.height,
        radius: window.getComputedStyle(element).borderTopLeftRadius,
      };
    });
    return { groupWidth: outer.width, groupHeight: outer.height, segments };
  });
}

function ringOf(element: Locator, part?: string) {
  return element.evaluate((host, partName) => {
    const target = partName
      ? host.shadowRoot!.querySelector<HTMLElement>(`[part~="${partName}"]`)!
      : (host as HTMLElement);
    const style = window.getComputedStyle(target);
    return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor} +${style.outlineOffset}`;
  }, part);
}

test('icon-only Select shares inset, gaps, radius, hover, and focus ring with sibling controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=toolbar-control-group');
  const select = page.locator('wa-select[name="toolbar-group-sort"]');
  const group = select.locator('xpath=..');
  const pressed = group.locator('> button[aria-pressed="true"]');
  const trigger = group.locator('wa-dropdown > wa-button');
  await expect(select).toBeVisible();

  for (const [size, shape] of [
    ['default', 'pill'],
    ['default', 'rounded'],
    ['compact', 'pill'],
    ['compact', 'rounded'],
  ] as const) {
    await group.evaluate(
      (element, [nextSize, nextShape]) => {
        element.setAttribute('data-size', nextSize);
        element.setAttribute('data-shape', nextShape);
        element.querySelector('wa-select')!.setAttribute('data-size', nextSize);
      },
      [size, shape] as const,
    );
    const { groupHeight, segments } = await groupGeometry(select);
    const height = size === 'compact' ? 32 : 40;
    const blockInset = size === 'compact' ? 1 : 2;
    const gap = size === 'compact' ? 4 : 0;
    expect(groupHeight).toBe(height + blockInset * 2);
    expect(segments.map((segment) => segment.tag)).toEqual([
      'BUTTON',
      'WA-SELECT',
      'WA-DROPDOWN',
    ]);
    for (const segment of segments) {
      expect(segment.height).toBe(height);
      expect(segment.top).toBe(blockInset);
      expect(segment.bottom).toBe(blockInset);
      expect(segment.radius).toBe(segments[0]!.radius);
    }
    // The selected sibling is a circle (or concentric rounded square), not an
    // oval, at both sizes.
    expect(segments[0]!.width).toBe(segments[0]!.height);
    // Neighbors neither overlap nor drift: the group's gap on both sides of
    // the Select, and matching end insets.
    expect(segments[1]!.left - segments[0]!.right).toBe(gap);
    expect(segments[2]!.left - segments[1]!.right).toBe(gap);
    const { groupWidth } = await groupGeometry(select);
    expect(groupWidth - segments[2]!.right).toBe(segments[0]!.left);

    // Hovering the Select lifts only its own pill, with the sibling hover fill.
    await trigger.hover();
    const siblingHover = await group.evaluate((element) => {
      const probe = document.createElement('span');
      probe.style.background = 'var(--kui-toolbar-control-hover-background)';
      element.append(probe);
      const color = window.getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    });
    await expect
      .poll(() =>
        trigger.evaluate(
          (host) =>
            window.getComputedStyle(
              host.shadowRoot!.querySelector('[part~="base"]')!,
            ).backgroundColor,
        ),
      )
      .toBe(siblingHover);
    await select.hover();
    await expect
      .poll(() =>
        select.evaluate(
          (host) =>
            window.getComputedStyle(
              host.shadowRoot!.querySelector('[part~="combobox"]')!,
            ).backgroundColor,
        ),
      )
      .toBe(siblingHover);
    expect(
      await group.evaluate(
        (element) => window.getComputedStyle(element).backgroundColor,
      ),
    ).not.toBe(siblingHover);
    await page.mouse.move(0, 0);

    // Keyboard focus: every control paints the same per-control ring, and the
    // group paints none. The Select's ring color animates, so poll it.
    await page.keyboard.press('Shift');
    await pressed.focus();
    const buttonRing = await ringOf(pressed);
    expect(buttonRing).toMatch(/^solid 3px .* \+1px$/);
    await select.getByRole('combobox').focus();
    await expect.poll(() => ringOf(select, 'combobox')).toBe(buttonRing);
    expect(
      await group.evaluate(
        (element) => window.getComputedStyle(element).outlineStyle,
      ),
    ).toBe('none');
    await select.click();
    await expect(select).toHaveAttribute('open');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => ringOf(select, 'combobox')).toBe(buttonRing);
    await page.keyboard.press('Escape');
    await expect(select).not.toHaveAttribute('open');

    // A Select told that the group owns its ring still paints one when the
    // group only paints per-control rings; nothing else would show focus.
    await select.evaluate((host) =>
      host.setAttribute('data-focus-ring-owner', 'group'),
    );
    await trigger.focus();
    await select.getByRole('combobox').focus();
    await expect.poll(() => ringOf(select, 'combobox')).toBe(buttonRing);
    await select.evaluate((host) =>
      host.setAttribute('data-focus-ring-owner', 'select'),
    );
    await trigger.focus();
  }
});
