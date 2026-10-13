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
