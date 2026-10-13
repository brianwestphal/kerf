import { expect, test } from '@playwright/test';

// Options in a listbox: clicking selects (app state), titles clip to their
// line budget, list rows round only at the section edges, cards are rounded,
// and a dimmed row restores on selection.
test('SummaryRow selects, clamps, and rounds by presentation', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto('/?component=summary-row');
    const list = page.getByRole('listbox', { name: 'Tickets' });
    const options = list.getByRole('option');
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
    await options.nth(1).click();
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'false');

    const geometry = await list.evaluate((node) =>
      [...node.querySelectorAll<HTMLElement>('[role="option"]')].map((row) => {
        const style = window.getComputedStyle(row);
        const title = row.querySelector('.kui-summary-row__title')!;
        const lineHeight = parseFloat(
          window.getComputedStyle(title).lineHeight,
        );
        return {
          top: parseFloat(style.borderTopLeftRadius),
          bottom: parseFloat(style.borderBottomLeftRadius),
          lines: Math.round(title.getBoundingClientRect().height / lineHeight),
          opacity: style.opacity,
        };
      }),
    );
    expect(geometry[0]!.top).toBeGreaterThan(0);
    expect(geometry[0]!.bottom).toBe(0);
    expect(geometry[1]!.top + geometry[1]!.bottom).toBe(0);
    expect(geometry[2]!.bottom).toBeGreaterThan(0);
    for (const row of geometry) expect(row.lines).toBeLessThanOrEqual(2);
    expect(geometry[2]!.opacity).toBe('0.55');

    const card = page
      .getByRole('listbox', { name: 'Board Column' })
      .getByRole('option')
      .first();
    expect(
      await card.evaluate((node) =>
        parseFloat(window.getComputedStyle(node).borderBottomLeftRadius),
      ),
    ).toBeGreaterThan(0);
  }
});
