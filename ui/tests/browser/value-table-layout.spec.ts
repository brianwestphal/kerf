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

// KF-PY1SN2 (WebKit kept a stale row height when a stacked table narrowed):
// as a stackBelow table narrows step by step, every row must keep enclosing
// its value, including a value that fit on one line a step earlier and now
// wraps. With the table as a grid, WebKit kept each row track's earlier
// height, so the newly wrapped line drew over the next row.
test('ValueTable rows grow to fit values that wrap as the table narrows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=value-table');
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'kf-py1sn2';
    const rows = [
      ['Max Workers', '4'],
      ['AI Tools', 'Claude, Codex, Antigravity, OpenCode'],
      ['Toolchains', 'node, cargo, git, python, docker, xcode, java'],
      ['Admission', 'No AI tool is allowed here yet'],
    ]
      .map(
        ([label, value]) =>
          `<div class="kui-value-table__row" data-has-icon="false"><dt><span class="kui-value-table__label">${label}</span></dt><dd>${value}</dd></div>`,
      )
      .join('');
    host.innerHTML = `<dl class="kui-value-table" data-density="compact" data-presentation="columns" data-stack-below="compact" aria-label="Capacity">${rows}</dl>`;
    document.body.prepend(host);
  });
  const overflows: string[] = [];
  for (let width = 720; width >= 260; width -= 7) {
    const worst = await page.evaluate(async (next) => {
      const host = document.getElementById('kf-py1sn2')!;
      host.style.width = `${next}px`;
      await new Promise((resolve) => globalThis.requestAnimationFrame(resolve));
      return Math.min(
        ...[...host.querySelectorAll('.kui-value-table__row')].map(
          (row) =>
            row.getBoundingClientRect().bottom -
            row.querySelector('dd')!.getBoundingClientRect().bottom,
        ),
      );
    }, width);
    if (worst < -0.5) overflows.push(`${width}px: ${worst.toFixed(1)}px`);
  }
  expect(overflows).toEqual([]);
});
