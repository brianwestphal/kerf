import { expect, test } from '@playwright/test';

// Scroll columns keep their minimum width and the track scrolls sideways;
// paged columns fill the visible width minus the peek and snap to starts.
test('ColumnTrack scrolls min-width columns and snaps paged columns', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.goto('/?component=column-track');
  const tracks = page.locator('[data-demo="column-track"] .kui-column-track');
  const measure = (index: number) =>
    tracks.nth(index).evaluate((track) => {
      const style = window.getComputedStyle(track);
      return {
        client: track.clientWidth,
        scroll: track.scrollWidth,
        padding: parseFloat(style.paddingInlineStart),
        snap: style.scrollSnapType,
        columns: [...track.firstElementChild!.children].map(
          (column) => column.getBoundingClientRect().width,
        ),
      };
    });
  const scroll = await measure(0);
  expect(scroll.snap).toBe('none');
  expect(scroll.scroll).toBeGreaterThan(scroll.client);
  for (const width of scroll.columns) expect(width).toBeCloseTo(250, 0);

  const paged = await measure(1);
  expect(paged.snap).toContain('mandatory');
  for (const width of paged.columns)
    expect(width).toBeCloseTo(paged.client - 2 * paged.padding - 24, 0);
  // A partial swipe settles on a column start.
  const track = tracks.nth(1);
  await track.evaluate((node) => {
    node.style.scrollBehavior = 'auto';
    node.scrollLeft = 150;
  });
  await expect
    .poll(() =>
      track.evaluate((node) => {
        const column =
          node.firstElementChild!.children[
            Math.round(node.scrollLeft / 100) > 2 ? 1 : 0
          ]!.getBoundingClientRect();
        return Math.round(
          column.left - node.getBoundingClientRect().left - node.clientLeft,
        );
      }),
    )
    .toBe(paged.padding);
});
