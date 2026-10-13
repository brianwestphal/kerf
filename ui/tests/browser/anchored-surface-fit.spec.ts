import { expect, type Locator, test } from '@playwright/test';

const GUTTER = 8;

const geometry = (surface: Locator) =>
  surface.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = globalThis.getComputedStyle(element);
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportWidth: globalThis.innerWidth,
      viewportHeight: globalThis.innerHeight,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowY: style.overflowY,
      available: style
        .getPropertyValue('--kui-anchored-surface-available-height')
        .trim(),
    };
  });

// The token search help surface is taller than the room on either side of
// its field on a short phone. It must stay inside an 8px viewport gutter, cap
// itself to the room beside the field, scroll the rest, and refit as the
// viewport changes, with no application media queries.
const fits = async (surface: Locator) => {
  const box = await geometry(surface);
  return (
    box.left >= GUTTER - 0.5 &&
    box.right <= box.viewportWidth - GUTTER + 0.5 &&
    box.top >= GUTTER - 0.5 &&
    box.bottom <= box.viewportHeight - GUTTER + 0.5
  );
};

test('an anchored surface fits the room beside its anchor inside the viewport gutter', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 520 });
  await page.goto('/?component=token-search-field');
  const button = page
    .locator('[data-demo="token-search-field"]')
    .getByRole('button', { name: 'Search Help' });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  const surface = page.getByRole('dialog', { name: 'Search Syntax' });
  await expect(surface).toBeVisible();

  // Taller than the room on either side: capped, scrolling, inside the gutter.
  await expect.poll(() => fits(surface)).toBe(true);
  const first = await geometry(surface);
  expect(first.overflowY).toBe('auto');
  expect(first.scrollHeight).toBeGreaterThan(first.clientHeight);
  expect(first.available).toMatch(/^\d+(\.\d+)?px$/);
  // Glued to its anchor on the side it opened.
  const anchor = await button.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom };
  });
  expect(
    Math.abs(first.top - (anchor.bottom + 4)) < 1 ||
      Math.abs(first.bottom - (anchor.top - 4)) < 1,
  ).toBe(true);

  // A shorter viewport refits on resize and scroll, still with no app CSS.
  await page.setViewportSize({ width: 390, height: 460 });
  await button.scrollIntoViewIfNeeded();
  await expect.poll(() => fits(surface)).toBe(true);
  const second = await geometry(surface);
  expect(second.available).not.toBe(first.available);

  await surface.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    surface.getByText('The exact phrase', { exact: true }),
  ).toBeInViewport();
});

// An app that caps the surface below its content height (here through an
// inline `max-height` that still honors the published room) must be measured
// at that cap: a capped surface that fits below its field stays below, even
// when the room above is larger and its full content fits neither side.
test('an app-capped surface that fits the preferred side stays there', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 520 });
  await page.goto('/?component=token-search-field');
  const button = page
    .locator('[data-demo="token-search-field"]')
    .getByRole('button', { name: 'Search Help' });
  // Put the field a little below the middle so the room above is larger.
  await button.evaluate((element) => {
    element.scrollIntoView({ block: 'center' });
    let scroller = element.parentElement;
    while (scroller && scroller.scrollHeight <= scroller.clientHeight)
      scroller = scroller.parentElement;
    (scroller ?? document.scrollingElement)?.scrollBy(0, -60);
  });
  await button.click();
  const surface = page.getByRole('dialog', { name: 'Search Syntax' });
  await expect(surface).toBeVisible();

  const rooms = await button.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      below: globalThis.innerHeight - 8 - (rect.bottom + 4),
      above: rect.top - 4 - 8,
      anchorBottom: rect.bottom,
    };
  });
  expect(rooms.above).toBeGreaterThan(rooms.below);
  const cap = Math.floor(rooms.below - 20);
  const full = await surface.evaluate((element) => element.scrollHeight);
  expect(full).toBeGreaterThan(rooms.below);

  // Apply the app cap, then reposition (a resize event refits the surface).
  await surface.evaluate((element, px) => {
    element.style.maxHeight = `min(${px}px, var(--kerf-anchor-available-height))`;
    globalThis.dispatchEvent(new Event('resize'));
  }, cap);
  await expect
    .poll(() =>
      surface.evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeCloseTo(rooms.anchorBottom + 4, 0);
  const box = await geometry(surface);
  expect(box.bottom - box.top).toBeLessThanOrEqual(cap + 0.5);
  expect(box.bottom).toBeLessThanOrEqual(box.viewportHeight - GUTTER + 0.5);

  // Reading that cap never lifts it: a scrolled surface keeps its position
  // across repositions.
  const scrolled = await surface.evaluate((element) => {
    element.scrollTop = 40;
    globalThis.dispatchEvent(new Event('resize'));
    return element.scrollTop;
  });
  expect(scrolled).toBe(40);
});
