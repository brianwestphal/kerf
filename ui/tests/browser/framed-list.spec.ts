import { expect, test } from '@playwright/test';

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
    await expect(list).toHaveAttribute('aria-label', 'Keyboard shortcuts');
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
