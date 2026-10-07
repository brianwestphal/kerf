import { expect, test } from '@playwright/test';

/**
 * A non-interactive icon placed directly in a ToolbarControlGroup (a heading's
 * identity glyph) is an icon tile: it takes an icon button's 40px slot and
 * 16px visual, so it centers in the 44px group without being wrapped in a
 * focusable button that does nothing. Unwrapped, it sat at the group's start
 * edge; wrapped, it became an unlabeled no-op control.
 */
test('a direct icon tile centers in its group without a control', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/?component=headers');
  const group = page
    .locator('.kui-toolbar-control-group:has(> svg[data-lucide="wrench"])')
    .first();
  await group.scrollIntoViewIfNeeded();
  await expect(group.locator('button, wa-button, a, [tabindex]')).toHaveCount(
    0,
  );
  const geometry = await group.evaluate((element) => {
    const groupRect = element.getBoundingClientRect();
    const icon = element.querySelector(':scope > svg')!.getBoundingClientRect();
    const style = window.globalThis.getComputedStyle(
      element.querySelector(':scope > svg')!,
    );
    return {
      dx: icon.left + icon.width / 2 - (groupRect.left + groupRect.width / 2),
      dy: icon.top + icon.height / 2 - (groupRect.top + groupRect.height / 2),
      tile: icon.width,
      visual: parseFloat(style.width),
      groupWidth: groupRect.width,
    };
  });
  expect(Math.abs(geometry.dx)).toBeLessThan(0.75);
  expect(Math.abs(geometry.dy)).toBeLessThan(0.75);
  expect(geometry.tile).toBeCloseTo(40, 0);
  expect(geometry.visual).toBeCloseTo(16, 0);
  expect(geometry.groupWidth).toBeCloseTo(44, 0);
});

test('quiet icon tile tones preserve geometry and do not recolor interactive groups', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=toolbar-control-group');
  const section = page.locator('[data-demo-section="icon-tile-tones"]');
  const tones = ['neutral', 'brand', 'success', 'warning', 'danger'];
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark')
        await page.locator('[data-action="toggle-theme"]').click();
      for (const tone of tones) {
        const group = section.getByRole('group', { name: `${tone} icon tile` });
        await expect(
          group.locator('button, wa-button, a, [tabindex]'),
        ).toHaveCount(0);
        await expect(group.locator('svg')).toHaveAttribute(
          'aria-hidden',
          'true',
        );
        const paint = await group.evaluate((el, value) => {
          const css = globalThis.getComputedStyle(el);
          const actual = [css.backgroundColor, css.borderTopColor, css.color];
          const probe = document.createElement('span');
          el.append(probe);
          probe.style.background = `var(--kui-color-${value}-fill-quiet)`;
          probe.style.border = `1px solid var(--kui-color-${value}-border-quiet)`;
          probe.style.color = `var(--kui-color-${value}-on-quiet)`;
          const expected = globalThis.getComputedStyle(probe);
          const result = {
            actual,
            expected: [
              expected.backgroundColor,
              expected.borderTopColor,
              expected.color,
            ],
          };
          probe.remove();
          return result;
        }, tone);
        expect(paint.actual).toEqual(paint.expected);
        const geometry = await group.evaluate((el) => {
          const box = el.getBoundingClientRect();
          const icon = el.querySelector('svg')!.getBoundingClientRect();
          return {
            width: box.width,
            height: box.height,
            dx: icon.x + icon.width / 2 - box.x - box.width / 2,
            dy: icon.y + icon.height / 2 - box.y - box.height / 2,
          };
        });
        expect(geometry.width).toBe(44);
        expect(geometry.height).toBe(44);
        expect(Math.abs(geometry.dx)).toBeLessThan(0.75);
        expect(Math.abs(geometry.dy)).toBeLessThan(0.75);
      }
      await section.screenshot({
        path: testInfo.outputPath(`icon-tile-tones-${theme}-${width}.png`),
      });
      if (theme === 'dark')
        await page.locator('[data-action="toggle-theme"]').click();
    }
  }
  const action = page.locator('button[data-action="log-pin"]').first();
  const interactive = action.locator('..');
  const paint = () =>
    interactive.evaluate((el) => {
      const css = globalThis.getComputedStyle(el);
      return [css.backgroundColor, css.borderTopColor, css.color];
    });
  const before = await paint();
  await interactive.evaluate((el) =>
    el.setAttribute('data-tile-tone', 'danger'),
  );
  expect(await paint()).toEqual(before);
  await action.click();
  await expect(page.getByText('Pin requested', { exact: true })).toBeVisible();
  await action.focus();
  await expect(action).toBeFocused();
  await action.press('Enter');
  await expect(page.getByText('Pin requested', { exact: true })).toBeVisible();
  const tile = section.getByRole('group', { name: 'brand icon tile' });
  const eligiblePaint = await tile.evaluate(
    (el) => globalThis.getComputedStyle(el).backgroundColor,
  );
  const icon = tile.locator(':scope > svg');
  await icon.evaluate((el) => el.setAttribute('aria-hidden', 'false'));
  await expect
    .poll(() =>
      tile.evaluate((el) => globalThis.getComputedStyle(el).backgroundColor),
    )
    .not.toBe(eligiblePaint);
  await icon.evaluate((el) => el.setAttribute('aria-hidden', 'true'));
  await expect
    .poll(() =>
      tile.evaluate((el) => globalThis.getComputedStyle(el).backgroundColor),
    )
    .toBe(eligiblePaint);
  await tile.evaluate((el) => {
    const copy = document.createElement('span');
    copy.textContent = 'Mixed';
    el.append(copy);
  });
  await expect
    .poll(() =>
      tile.evaluate((el) => globalThis.getComputedStyle(el).backgroundColor),
    )
    .not.toBe(eligiblePaint);
  await tile.locator(':scope > span').evaluate((el) => el.remove());
  await expect
    .poll(() =>
      tile.evaluate((el) => globalThis.getComputedStyle(el).backgroundColor),
    )
    .toBe(eligiblePaint);

  await tile.evaluate((el) =>
    el.append(el.querySelector('svg')!.cloneNode(true)),
  );
  await expect
    .poll(() =>
      tile.evaluate((el) => globalThis.getComputedStyle(el).backgroundColor),
    )
    .not.toBe(eligiblePaint);
  await tile
    .locator(':scope > svg')
    .nth(1)
    .evaluate((el) => el.remove());
  await expect
    .poll(() =>
      tile.evaluate((el) => globalThis.getComputedStyle(el).backgroundColor),
    )
    .toBe(eligiblePaint);

  for (const [attribute, value] of [
    ['data-single', 'false'],
    ['data-appearance', 'borderless'],
  ]) {
    await tile.evaluate(
      (el, pair) => el.setAttribute(pair[0], pair[1]),
      [attribute, value],
    );
    expect(
      await tile.evaluate(
        (el) => globalThis.getComputedStyle(el).backgroundColor,
      ),
    ).not.toBe(
      await tile.evaluate((el) => {
        const probe = document.createElement('span');
        probe.style.background = 'var(--kui-color-brand-fill-quiet)';
        el.after(probe);
        const color = globalThis.getComputedStyle(probe).backgroundColor;
        probe.remove();
        return color;
      }),
    );
    await tile.evaluate(
      (el, pair) => el.setAttribute(pair[0], pair[1]),
      [attribute, attribute === 'data-single' ? 'true' : 'contained'],
    );
  }
});
