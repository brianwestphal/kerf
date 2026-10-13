import { expect, type Locator, test } from '@playwright/test';

/** Row, primary-button, and trailing-button heights of each ListActionRow. */
function rowHeights(list: Locator) {
  return list.evaluate((root) =>
    Array.from(root.querySelectorAll('.kui-list-action-row'), (row) => {
      const height = (selector: string) =>
        row.querySelector(selector)?.getBoundingClientRect().height ?? 0;
      return {
        row: row.getBoundingClientRect().height,
        primary: height('.kui-list-action-row__primary'),
        trailing: height('.kui-list-action-row__trailing-action'),
      };
    }),
  );
}

test('compact ListActionRow rows are 36px, the height of a compact ListItem', async ({
  page,
}, testInfo) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=list-action-row');
    const list = page.locator('[data-demo-compact-rows="list-action-row"]');
    await list.scrollIntoViewIfNeeded();

    const compact = await rowHeights(list);
    expect(compact).toHaveLength(3);
    for (const heights of compact)
      expect(heights).toEqual({ row: 36, primary: 36, trailing: 36 });
    await list.screenshot({
      path: testInfo.outputPath(`list-action-row-compact-${width}.png`),
    });

    // An untiled row without an icon keeps the compact height too.
    await list.evaluate((root) => {
      const row = root.querySelector('.kui-list-action-row');
      row?.querySelector('.kui-list-action-row__icon')?.remove();
      row?.setAttribute('data-has-icon', 'false');
    });
    expect((await rowHeights(list))[0]).toEqual({
      row: 36,
      primary: 36,
      trailing: 36,
    });

    // A compact multiline row keeps its icon centered on the first line.
    const centerDelta = await list.evaluate((root) => {
      const row = root.querySelectorAll('.kui-list-action-row')[1];
      if (!row) throw new Error('Expected a second row');
      row.setAttribute('data-multiline', 'true');
      const label = row.querySelector('.kui-list-action-row__primary-label');
      if (!label) throw new Error('Expected a label');
      label.textContent =
        'Run every test suite across the whole workspace '.repeat(3);
      const range = document.createRange();
      range.selectNodeContents(label);
      const firstLine = range.getClientRects()[0];
      const icon = row
        .querySelector('.kui-list-action-row__icon')
        ?.getBoundingClientRect();
      if (!firstLine || !icon) throw new Error('Expected an icon and a line');
      return Math.abs(
        icon.top + icon.height / 2 - (firstLine.top + firstLine.height / 2),
      );
    });
    expect(centerDelta).toBeLessThanOrEqual(1);

    // The standard density is still 44px.
    await list.evaluate((root) => {
      const row = root.querySelectorAll('.kui-list-action-row')[2];
      row?.setAttribute('data-density', 'standard');
    });
    expect((await rowHeights(list))[2]).toEqual({
      row: 44,
      primary: 44,
      trailing: 44,
    });
  }

  // A single-line compact ListItem measures the same 36px.
  await page.goto('/?component=list-item');
  const item = page.locator('[data-demo="list-item"] [data-item-id="status"]');
  const itemHeight = await item.evaluate((element) => {
    element.querySelector('.kui-list-item__description')?.remove();
    element.setAttribute('data-has-description', 'false');
    return element.getBoundingClientRect().height;
  });
  expect(itemHeight).toBe(36);
});
