import { expect, type Page, test } from '@playwright/test';

// KF-SHW2J9: a framed, height-bounded, scrollable List of ListItem rows (a
// result picker such as Hot Sheet's duplicate candidates): `frame` draws the
// border and radius with a 4px inset, `minHeight` / `maxHeight` bound the
// List without an app-owned scroller, and the first and last rows' focus
// rings stay inside the scroll clip.

const picker = '[data-demo-result-picker]';

async function openDemo(page: Page, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/?component=list');
  await expect(page.locator(picker)).toBeVisible();
}

/** The picker's frame box, its clip (padding box), and scroll state. */
async function frameGeometry(page: Page) {
  return page.locator(picker).evaluate((list) => {
    const style = globalThis.getComputedStyle(list);
    const box = list.getBoundingClientRect();
    const border = Number.parseFloat(style.borderTopWidth);
    return {
      height: box.height,
      minHeight: style.minHeight,
      maxHeight: style.maxHeight,
      overflowY: style.overflowY,
      border: `${style.borderTopWidth} ${style.borderTopStyle}`,
      radius: style.borderTopLeftRadius,
      padding: style.padding,
      scrolls: list.scrollHeight > list.clientHeight + 1,
      clip: {
        top: box.top + border,
        left: box.left + border,
        bottom: box.top + border + list.clientHeight,
        right: box.left + border + list.clientWidth,
      },
    };
  });
}

/** The focused row's focus ring box (border box grown by width + offset). */
async function focusedRing(page: Page) {
  return page.evaluate(() => {
    const row = document.activeElement as HTMLElement;
    const style = globalThis.getComputedStyle(row);
    const reach =
      Number.parseFloat(style.outlineWidth) +
      Number.parseFloat(style.outlineOffset);
    const box = row.getBoundingClientRect();
    return {
      style: style.outlineStyle,
      top: box.top - reach,
      bottom: box.bottom + reach,
      left: box.left - reach,
      right: box.right + reach,
    };
  });
}

function expectInside(
  ring: Awaited<ReturnType<typeof focusedRing>>,
  clip: Awaited<ReturnType<typeof frameGeometry>>['clip'],
) {
  expect(ring.style).not.toBe('none');
  expect(ring.top).toBeGreaterThanOrEqual(clip.top - 0.5);
  expect(ring.bottom).toBeLessThanOrEqual(clip.bottom + 0.5);
  expect(ring.left).toBeGreaterThanOrEqual(clip.left - 0.5);
  expect(ring.right).toBeLessThanOrEqual(clip.right + 0.5);
}

test('a framed result picker is bordered, rounded, inset 4px, and bounded by maxHeight', async ({
  page,
}) => {
  await openDemo(page);
  const geometry = await frameGeometry(page);
  expect(geometry.border).toBe('1px solid');
  expect(geometry.radius).toBe(
    await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.borderRadius = 'var(--kui-radius-m)';
      document.body.append(probe);
      const radius = globalThis.getComputedStyle(probe).borderTopLeftRadius;
      probe.remove();
      return radius;
    }),
  );
  expect(geometry.padding).toBe('4px');
  expect(geometry.minHeight).toBe('68px');
  expect(geometry.maxHeight).toBe('224px');
  expect(Math.round(geometry.height)).toBe(224);
  expect(geometry.overflowY).toBe('auto');
  expect(geometry.scrolls).toBe(true);
});

test('minHeight keeps a short result picker at a stable size', async ({
  page,
}) => {
  await openDemo(page);
  // One remaining candidate: the frame keeps its 68px minimum.
  await page.locator(picker).evaluate((list) => {
    while (list.children.length > 1) list.lastElementChild!.remove();
  });
  expect(Math.round((await frameGeometry(page)).height)).toBe(68);
});

for (const width of [1280, 390]) {
  test(`the first and last rows' focus rings stay inside the clip at ${width}px`, async ({
    page,
  }) => {
    await openDemo(page, width);
    const rows = page.locator(`${picker} > .kui-list-item`);
    // A key press first gives later focus the keyboard (focus-visible)
    // modality in every engine; WebKit keeps buttons out of the Tab order by
    // default, so focus each row directly. Focusing scrolls the row into
    // view, which is where a ring meets the clip.
    await page.keyboard.press('Shift');
    for (const row of [rows.first(), rows.last(), rows.first()]) {
      await row.focus();
      await expect(row).toBeFocused();
      expectInside(await focusedRing(page), (await frameGeometry(page)).clip);
    }
  });
}

/**
 * Scrolls the picker to one extreme and returns the index of the first row
 * that the opposite edge cuts partly off: the middle row a focus or
 * scroll-into-view must bring in, where the scroll stop decides whether its
 * ring meets the clip.
 */
async function partlyHiddenRow(page: Page, edge: 'top' | 'bottom') {
  return page.locator(picker).evaluate((list, hiddenAt) => {
    list.scrollTop = hiddenAt === 'bottom' ? 0 : list.scrollHeight;
    const style = globalThis.getComputedStyle(list);
    const box = list.getBoundingClientRect();
    const top = box.top + Number.parseFloat(style.borderTopWidth);
    const bottom = top + list.clientHeight;
    const rows = [...list.children] as HTMLElement[];
    const order = hiddenAt === 'bottom' ? rows : [...rows].reverse();
    const row = order.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return hiddenAt === 'bottom'
        ? rect.bottom > bottom && rect.top < bottom
        : rect.top < top && rect.bottom > top;
    });
    return row === undefined ? -1 : rows.indexOf(row);
  }, edge);
}

// KF-7CMHET (scroll padding = ring reach + 2px slack): Chromium's focus
// scroll stops 1px short of the padded target, so with padding equal to the
// ring reach a middle row's ring was cut by about 1px.
for (const width of [1280, 390]) {
  for (const edge of ['bottom', 'top'] as const) {
    test(`a middle row focused from the ${edge} edge keeps its ring inside the clip at ${width}px`, async ({
      page,
      browserName,
    }) => {
      // Only Chromium's focus() scrolls a partly visible row to the nearest
      // edge. Firefox scrolls only once about half the row is hidden, and
      // then centers it; WebKit leaves a partly visible row where it is
      // (KF-Z5M10V). The scroll-into-view case below covers every engine.
      test.skip(
        browserName !== 'chromium',
        'only Chromium focus scrolls a partly visible row to the nearest edge',
      );
      await openDemo(page, width);
      await page.keyboard.press('Shift');
      const index = await partlyHiddenRow(page, edge);
      expect(index).toBeGreaterThan(0);
      const row = page.locator(`${picker} > .kui-list-item`).nth(index);
      // The DOM focus(): Playwright's locator.focus() scrolls the element
      // into view itself, which would hide the engine's own focus scroll.
      await row.evaluate((element) => element.focus());
      await expect(row).toBeFocused();
      expectInside(await focusedRing(page), (await frameGeometry(page)).clip);
    });

    test(`a middle row scrolled into view from the ${edge} edge keeps its ring inside the clip at ${width}px`, async ({
      page,
    }) => {
      await openDemo(page, width);
      await page.keyboard.press('Shift');
      const index = await partlyHiddenRow(page, edge);
      expect(index).toBeGreaterThan(0);
      const row = page.locator(`${picker} > .kui-list-item`).nth(index);
      // Focus without scrolling, then scroll the nearest edge into view: the
      // frame's scroll padding alone decides where the row stops.
      await row.evaluate((element) => {
        element.focus({ preventScroll: true });
        element.scrollIntoView({ block: 'nearest' });
      });
      await expect(row).toBeFocused();
      expectInside(await focusedRing(page), (await frameGeometry(page)).clip);
    });
  }
}

test('activating a candidate runs its action', async ({ page }) => {
  await openDemo(page);
  await page.locator(`${picker} > .kui-list-item`).nth(1).click();
  await expect(
    page.getByText('Duplicate candidate result-2 selected'),
  ).toBeVisible();
});
