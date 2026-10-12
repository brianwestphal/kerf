import { expect, test } from '@playwright/test';

// A labelWidth table keeps a minimum label column; with stackBelow it stacks
// each value under its label (starting at the label's text, after an icon)
// only while the table is narrower than the preset, and it fills its
// container's width even in a shrink-to-fit parent.
test('ValueTable label column stacks below its preset width', async ({
  page,
}) => {
  const measure = () =>
    page
      .locator('[data-demo="value-table"] .kui-value-table[data-stack-below]')
      .evaluate((table) => {
        const row = table.querySelector('.kui-value-table__row')!;
        const label = row.querySelector('.kui-value-table__label')!;
        const dt = row.querySelector('dt')!.getBoundingClientRect();
        const dd = row.querySelector('dd')!.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(row.querySelector('dd')!);
        return {
          width: table.getBoundingClientRect().width,
          parent: table.parentElement!.getBoundingClientRect().width,
          stacked: dd.top >= dt.bottom - 1,
          valueColumnStart: dd.left - row.getBoundingClientRect().left,
          valueStart: range.getBoundingClientRect().left,
          labelStart: label.getBoundingClientRect().left,
        };
      });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=value-table');
  const wide = await measure();
  expect(wide.width).toBeGreaterThan(512);
  expect(wide.width).toBeCloseTo(wide.parent - 16, 0);
  expect(wide.stacked).toBe(false);
  // 8px row padding + the 160px label track (+ the column gap).
  expect(wide.valueColumnStart).toBeGreaterThanOrEqual(168);

  await page.setViewportSize({ width: 390, height: 844 });
  const narrow = await measure();
  expect(narrow.width).toBeLessThan(512);
  expect(narrow.stacked).toBe(true);
  expect(narrow.valueStart).toBeCloseTo(narrow.labelStart, 0);
});
