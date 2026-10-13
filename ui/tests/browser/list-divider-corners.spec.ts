import { expect, type Page, test } from '@playwright/test';

type Corners = [string, string, string, string];

/** Each row's top-left, top-right, bottom-right, bottom-left radius. */
const corners = (page: Page, selector: string) =>
  page.locator(selector).evaluate((list) =>
    [...list.children].map((row) => {
      const style = globalThis.getComputedStyle(row);
      return [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomRightRadius,
        style.borderBottomLeftRadius,
      ] as Corners;
    }),
  );

const round: Corners = ['12px', '12px', '12px', '12px'];
const top: Corners = ['12px', '12px', '0px', '0px'];
const middle: Corners = ['0px', '0px', '0px', '0px'];
const bottom: Corners = ['0px', '0px', '12px', '12px'];

test('divided list rows round only the outer corners of the group', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=list-item');
  const list = '[data-demo-divided-list]';
  // Dividers between rows (after on all but the last row).
  expect(await corners(page, list)).toEqual([top, middle, middle, bottom]);

  // Every row dividing after itself: the trailing line keeps the last row's
  // bottom flat, while its top is flat beside the previous row's line.
  await page.locator(list).evaluate((element) => {
    for (const row of element.children)
      (row as HTMLElement).dataset.divider = 'after';
  });
  expect(await corners(page, list)).toEqual([top, middle, middle, middle]);

  // Dividing before every row mirrors it.
  await page.locator(list).evaluate((element) => {
    for (const row of element.children)
      (row as HTMLElement).dataset.divider = 'before';
  });
  expect(await corners(page, list)).toEqual([middle, middle, middle, bottom]);

  // A lone row with no divider, or a group with no dividers, stays round.
  await page.locator(list).evaluate((element) => {
    for (const row of element.children)
      (row as HTMLElement).dataset.divider = 'none';
  });
  expect(await corners(page, list)).toEqual([round, round, round, round]);

  // Restore the demo and capture hover on each position.
  await page.locator(list).evaluate((element) => {
    const rows = [...element.children] as HTMLElement[];
    rows.forEach((row, index) => {
      row.dataset.divider = index < rows.length - 1 ? 'after' : 'none';
    });
  });
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.locator(list).scrollIntoViewIfNeeded();
    for (const index of [0, 3]) {
      await page.locator(`${list} > :nth-child(${index + 1})`).hover();
      await page.waitForTimeout(250);
      await page.locator(list).screenshot({
        path: testInfo.outputPath(`divided-list-hover-${index}-${width}.png`),
      });
      await page.locator(list).screenshot({
        path: `test-results/divided-list-hover-${index}-${width}.png`,
      });
    }
  }
});

test('ListActionRows and mixed rows share position-aware corners', async ({
  page,
}) => {
  await page.goto('/?component=list');
  const list = '[data-demo-divider-list]';
  // ListHeader, ListItem, and ListActionRow all divide both edges.
  const [, item, action] = await corners(page, list);
  expect(item).toEqual(middle);
  expect(action).toEqual(middle);
  // Without the header's line above it and its own lines, the item's top is round.
  await page.locator(list).evaluate((element) => {
    for (const row of element.children)
      (row as HTMLElement).dataset.divider = 'none';
    (element.children[1] as HTMLElement).dataset.divider = 'after';
  });
  const [, lone, below] = await corners(page, list);
  expect(lone).toEqual(top);
  expect(below[0]).toBe('0px');
  expect(below[2]).not.toBe('0px');
});
