import { expect, type Locator, test } from '@playwright/test';

const setting = 'Group new tickets automatically';

function switchRoot(region: Locator, name: string) {
  return region.locator('[data-component="switch"]').filter({
    has: region.page().getByRole('switch', { name, exact: true }),
  });
}

function geometry(root: Locator) {
  return root.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const specimen = element
      .closest('[data-catalog-example]')!
      .getBoundingClientRect();
    const track = element
      .querySelector('.kui-switch__track')!
      .getBoundingClientRect();
    const rtl = window.getComputedStyle(element).direction === 'rtl';
    const start = (rect: DOMRect) => (rtl ? -rect.right : rect.left);
    const end = (rect: DOMRect) => (rtl ? -rect.left : rect.right);
    const fragments = (selector: string) => {
      const range = document.createRange();
      range.selectNodeContents(element.querySelector(selector)!);
      return Array.from(range.getClientRects());
    };
    const label = fragments('.kui-switch__label');
    const hint = fragments('.kui-switch__hint');
    return {
      labelLines: new Set(label.map((rect) => rect.top)).size,
      hintLines: new Set(hint.map((rect) => rect.top)).size,
      trackWidth: track.width,
      // Bidirectional text can split a single line into several Range rectangles.
      alignedHint: Math.abs(
        Math.min(...label.map(start)) - Math.min(...hint.map(start)),
      ),
      trailingSpace: end(box) - end(track),
      specimenTrailingSpace: end(specimen) - end(track),
      textGap: start(track) - Math.max(...[...label, ...hint].map(end)),
      overflow: element.scrollWidth - element.clientWidth,
    };
  });
}

test('settings align their tracks to the logical end and wrap the label and hint together', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/?component=switch');
  const region = page.getByRole('region', {
    name: 'General settings',
    exact: false,
  });
  const first = switchRoot(region, setting);
  const second = switchRoot(region, 'Hide Verified column');
  await expect(first).toBeVisible();
  const wide = await geometry(first);
  expect(wide.labelLines).toBe(1);
  for (const direction of ['ltr', 'rtl']) {
    await region.evaluate((el, dir) => el.setAttribute('dir', dir), direction);
    const actual = await geometry(first);
    expect(actual.trailingSpace).toBeCloseTo(0, 0);
    expect(actual.specimenTrailingSpace).toBeCloseTo(0, 0);
    expect(actual.alignedHint).toBeLessThanOrEqual(1);
    expect(actual.textGap).toBeGreaterThan(0);
    expect(actual.overflow).toBeLessThanOrEqual(1);
    const tracks = await Promise.all(
      [first, second].map((root) =>
        root.locator('.kui-switch__track').boundingBox(),
      ),
    );
    expect(tracks[0]!.x).toBeCloseTo(tracks[1]!.x, 0);
    await region.screenshot({
      path: info.outputPath(
        direction === 'ltr'
          ? 'general-switches-wide.png'
          : 'general-switches-rtl.png',
      ),
      animations: 'disabled',
    });
  }
  await region.evaluate((el) => el.removeAttribute('dir'));
  await page.setViewportSize({ width: 320, height: 780 });
  await region.scrollIntoViewIfNeeded();
  const mobile = await geometry(first);
  expect(mobile.hintLines).toBeGreaterThan(1);
  expect(mobile.trailingSpace).toBeCloseTo(0, 0);
  expect(mobile.specimenTrailingSpace).toBeCloseTo(0, 0);
  expect(mobile.trackWidth).toBeCloseTo(wide.trackWidth, 1);
  await region.screenshot({
    path: info.outputPath('general-switches-narrow.png'),
    animations: 'disabled',
  });
  // A nested pane can be narrower than the phone viewport itself.
  await first.evaluate((el) => {
    el.parentElement!.style.maxInlineSize = '13rem';
  });
  const narrow = await geometry(first);
  expect(narrow.labelLines).toBeGreaterThan(1);
  expect(narrow.hintLines).toBeGreaterThan(1);
  expect(narrow.trackWidth).toBeCloseTo(wide.trackWidth, 1);
  expect(narrow.alignedHint).toBeLessThanOrEqual(1);
  expect(narrow.textGap).toBeGreaterThan(0);
  expect(narrow.overflow).toBeLessThanOrEqual(1);
});

test('a trailing switch keeps its native label, description, keyboard action and track focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/?component=switch');
  const region = page.getByRole('region', {
    name: 'General settings',
    exact: false,
  });
  const field = switchRoot(region, setting);
  const control = field.getByRole('switch', { name: setting, exact: true });
  const hint = 'Keep related tickets together as they arrive.';
  await expect(field.locator('.kui-switch__hint')).toHaveText(hint);
  await expect(control).toHaveAccessibleDescription(hint);
  const checked = await control.isChecked();
  await control.focus();
  await page.keyboard.press('Space');
  await expect(control).toBeChecked({ checked: !checked });
  await expect(control).toBeFocused();
  await expect(field.locator('.kui-switch__track')).toHaveCSS(
    'outline-style',
    'solid',
  );
  await field.getByText(setting, { exact: true }).click();
  await expect(control).toBeChecked({ checked });
  const managed = page.getByRole('switch', {
    name: 'Managed setting',
    exact: true,
  });
  await expect(managed).toBeDisabled();
  await expect(managed).toBeChecked();
});
