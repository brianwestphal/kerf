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

// KF-CW7Z38: the boards and their columns are named regions through
// ColumnTrack `ariaLabel` and List `landmark="region"`, not rootAttributes.
test('ColumnTrack boards and their columns are named regions', async ({
  page,
}) => {
  await page.goto('/?component=column-track');
  for (const name of ['Board', 'Paged Board']) {
    // The catalog example around the paged board shares its name.
    const board = page
      .getByRole('region', { name, exact: true })
      .and(page.locator('.kui-column-track'));
    await expect(board).toBeVisible();
    for (const column of ['To Do', 'In Progress', 'Review', 'Done', 'Later'])
      await expect(
        board.getByRole('region', { name: column, exact: true }),
      ).toHaveAttribute('data-component', 'list');
  }
});

// KF-QHJKA4: start="end" opens the timeline at its far end and returns there
// when the track's width changes, until the person scrolls it; a paged board
// with start={{ column }} opens on that column.
test('ColumnTrack opens at its end or on a named column', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.goto('/?component=column-track');
  const timeline = page.getByRole('region', { name: 'Timeline', exact: true });
  const atEnd = () =>
    timeline.evaluate(
      (track) =>
        Math.abs(track.scrollWidth - track.clientWidth - track.scrollLeft) < 1,
    );
  await expect.poll(atEnd).toBe(true);
  expect(
    await timeline.evaluate((track) => track.scrollWidth > track.clientWidth),
  ).toBe(true);
  // Narrower: still at the end.
  await page.setViewportSize({ width: 700, height: 1000 });
  await expect.poll(atEnd).toBe(true);
  // The person scrolls back; a later resize leaves their position.
  await timeline.hover();
  await page.mouse.wheel(-300, 0);
  await expect.poll(atEnd).toBe(false);
  // Let the wheel scroll settle (WebKit animates it) before reading it.
  const scrollLeft = () => timeline.evaluate((track) => track.scrollLeft);
  let held = await scrollLeft();
  await expect
    .poll(async () => {
      const previous = held;
      held = await scrollLeft();
      return held === previous;
    })
    .toBe(true);
  // Narrower, so the scroll range only grows and nothing clamps the
  // person's position: the track stays where they left it.
  await page.setViewportSize({ width: 600, height: 1000 });
  await expect.poll(scrollLeft).toBeCloseTo(held, 0);
  await expect.poll(atEnd).toBe(false);

  const paged = page.getByRole('region', {
    name: 'Paged Timeline',
    exact: true,
  });
  await expect
    .poll(() =>
      paged.evaluate((track) => {
        const column = track.querySelector('[data-column-id="working"]')!;
        return Math.round(
          column.getBoundingClientRect().left -
            track.getBoundingClientRect().left -
            track.clientLeft,
        );
      }),
    )
    .toBe(0);
});
