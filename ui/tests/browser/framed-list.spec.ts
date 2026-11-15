import { expect, type Page, test } from '@playwright/test';

// FramedList draws ValueTable's frame around arbitrary rows: rows sit flush in
// the frame (a native or document stylesheet's list-item indent is reset),
// own the 17px text column, and draw inset dividers only between rows.
test('FramedList rows sit flush with inset dividers between them', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=framed-list');
    const list = page
      .locator('[data-demo="framed-list"] .kui-framed-list')
      .first();
    await expect(list).toHaveAttribute('aria-label', 'Keyboard Shortcuts');
    const geometry = await list.evaluate((frame) => {
      const box = frame.getBoundingClientRect();
      const rows = [...frame.querySelectorAll(':scope > li')].map((row) => {
        const rect = row.getBoundingClientRect();
        const divider = window.getComputedStyle(row, '::before');
        return {
          left: rect.left - box.left,
          right: box.right - rect.right,
          height: rect.height,
          divider: divider.content !== 'none' && divider.borderTopWidth,
          dividerLeft: parseFloat(divider.left),
          highlighted: row.getAttribute('data-highlighted') === 'true',
          background: window.getComputedStyle(row).backgroundColor,
        };
      });
      return { rows, marker: window.getComputedStyle(frame).listStyleType };
    });
    expect(geometry.marker).toBe('none');
    expect(geometry.rows).toHaveLength(3);
    for (const [index, row] of geometry.rows.entries()) {
      // Inside the 1px frame border, flush on both sides.
      expect(row.left).toBeCloseTo(1, 0);
      expect(row.right).toBeCloseTo(1, 0);
      expect(row.height).toBeGreaterThanOrEqual(44);
      expect(row.divider).toBe(index === 0 ? false : '1px');
      if (index > 0) expect(row.dividerLeft).toBeCloseTo(8, 0);
    }
    expect(geometry.rows[1]!.highlighted).toBe(true);
    expect(geometry.rows[1]!.background).not.toBe(geometry.rows[0]!.background);
  }
});

// KF-D8VK4Y: a row grows with content that wraps onto another line after a
// resize. WebKit kept a grid row's earlier height when an auto-fill Grid
// inside it gained a track row, so the fields spilled under the next row.
test('a FramedListRow grows when a Grid inside it wraps after a resize', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=framed-list');
  const list = page
    .locator('[data-demo="framed-list"] .kui-framed-list')
    .first();
  await expect(list).toBeVisible();
  await list.evaluate((frame) => {
    const row = frame.querySelector(':scope > li')!;
    row.innerHTML =
      '<div class="kui-list" data-probe>' +
      '<span>Account</span>' +
      '<div class="kui-grid" data-auto-fill="true" style="--_kui-grid-min-column-width:9rem">' +
      '<input style="height:32px"><input style="height:32px">' +
      '<input style="height:32px"><input style="height:32px">' +
      '</div></div>';
    (frame as HTMLElement).style.width = '900px';
  });
  const measure = () =>
    list.evaluate((frame) => {
      const row = frame.querySelector(':scope > li')!;
      const content = row.querySelector('[data-probe]')!;
      const padding = parseFloat(window.getComputedStyle(row).paddingBottom);
      return {
        rowBottom: row.getBoundingClientRect().bottom,
        contentBottom: content.getBoundingClientRect().bottom + padding,
        tracks: window
          .getComputedStyle(content.querySelector('.kui-grid')!)
          .gridTemplateRows.split(' ').length,
      };
    });
  const wide = await measure();
  expect(wide.tracks).toBe(1);
  expect(wide.rowBottom).toBeCloseTo(wide.contentBottom, 0);
  // Let the wide layout paint before narrowing, as a window resize would.
  await nextFrames(page);
  await list.evaluate((frame) => {
    (frame as HTMLElement).style.width = '370px';
  });
  // Measure after the narrow layout has painted: a forced synchronous layout
  // right after the change hid the stale height.
  await nextFrames(page);
  const narrow = await measure();
  expect(narrow.tracks).toBeGreaterThan(1);
  expect(narrow.rowBottom).toBeCloseTo(narrow.contentBottom, 0);
});

function nextFrames(page: Page): Promise<unknown> {
  return page.evaluate(
    () =>
      new Promise((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(resolve),
        ),
      ),
  );
}
