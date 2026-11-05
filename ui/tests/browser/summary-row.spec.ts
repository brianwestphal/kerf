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

test('a static diagnostic group keeps visual state while its nested action owns focus', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=summary-row');
    const group = page.getByRole('group', {
      name: 'Unreadable ticket diagnostic',
    });
    await expect(group).toHaveAttribute('data-selected', 'true');
    await expect(group).toHaveAttribute('data-rail', 'danger');
    await expect(group).toHaveAttribute('data-list-edge', 'only');
    await expect(group).not.toHaveAttribute('tabindex');
    await expect(group).not.toHaveAttribute('aria-selected');
    const open = group.getByRole('button', { name: 'Open' });
    await open.focus();
    await expect(open).toBeFocused();
    await expect(group).not.toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.catalog-log')).toHaveText(
      'More actions requested',
    );
    if (testInfo.project.name === 'chromium') {
      await group.screenshot({
        path: testInfo.outputPath(`summary-row-diagnostic-${width}.png`),
      });
    }
  }
});

test('row and card options keep native dragstart after a selection rerender', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto('/?component=summary-row');
    await page.evaluate(() => {
      document.addEventListener('dragstart', (event) => {
        document.body.dataset.dragSource =
          (event.target as HTMLElement)
            .closest('[data-item-id]')
            ?.getAttribute('data-item-id') ?? '';
      });
    });
    for (const [name, presentation] of [
      ['Tickets', 'row'],
      ['Board Column', 'card'],
    ] as const) {
      const options = page.getByRole('listbox', { name }).getByRole('option');
      const first = options.first();
      const second = options.nth(1);
      await expect(first).toHaveAttribute('data-presentation', presentation);
      await expect(first).toHaveAttribute('draggable', 'true');
      // wireSummaryRows keeps one Tab stop per listbox, on the selected row.
      await expect(
        page
          .getByRole('listbox', { name })
          .locator('[role="option"][tabindex="0"]'),
      ).toHaveCount(1);
      await expect(first).toHaveAttribute('data-item-id', 'KF-12');
      await second.click();
      await expect(second).toHaveAttribute('aria-selected', 'true');
      await expect(first).toHaveAttribute('draggable', 'true');
      await page.locator('body').evaluate((element) => {
        delete element.dataset.dragSource;
      });
      await first.dragTo(second);
      await expect(page.locator('body')).toHaveAttribute(
        'data-drag-source',
        'KF-12',
      );
      if (testInfo.project.name === 'chromium')
        await first.screenshot({
          path: testInfo.outputPath(
            `summary-row-draggable-${presentation}-${width}.png`,
          ),
        });
    }
  }
});

// KF-KZNNT2: a title past its line budget clamps with an ellipsis (a line
// clamp, not a bare max-height clip) in row and card form, the trailing meta
// still floats at the first line's end, and a short title is not clamped.
test('a long title clamps with an ellipsis while the trailing meta stays on its first line', async ({
  page,
}, testInfo) => {
  const long =
    ' Toolbar search overflows the trailing zone on narrow rails when the window is resized from wide to narrow and back again, clipping the final control and hiding its label behind the overflow menu for good';
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto('/?component=summary-row');
    for (const [name, lines] of [
      ['Tickets', 2],
      ['Board Column', 4],
    ] as const) {
      const list = page.getByRole('listbox', { name });
      await expect(list.getByRole('option')).toHaveCount(3);
      const measured = await list.evaluate((node, text) => {
        const [first, second] =
          node.querySelectorAll<HTMLElement>('[role="option"]');
        const spans = first!.querySelectorAll(
          '.kui-summary-row__title-text > .kui-text',
        );
        spans[spans.length - 1]!.textContent = text;
        const measure = (row: HTMLElement) => {
          const title = row.querySelector<HTMLElement>(
            '.kui-summary-row__title',
          )!;
          const style = window.getComputedStyle(title);
          const lineHeight = parseFloat(style.lineHeight);
          const box = title.getBoundingClientRect();
          const trailing = row
            .querySelector('.kui-summary-row__trailing')!
            .getBoundingClientRect();
          return {
            clamp: style.webkitLineClamp,
            lines: Math.round(box.height / lineHeight),
            clipped: title.scrollHeight > title.clientHeight + 1,
            trailingTop: trailing.top - box.top,
            trailingEnd: box.right - trailing.right,
          };
        };
        return { long: measure(first!), short: measure(second!) };
      }, long);
      for (const row of [measured.long, measured.short]) {
        expect(row.clamp).toBe(String(lines));
        expect(Math.abs(row.trailingTop)).toBeLessThanOrEqual(2);
        expect(Math.abs(row.trailingEnd)).toBeLessThanOrEqual(1);
      }
      expect(measured.long.lines).toBe(lines);
      expect(measured.long.clipped).toBe(true);
      expect(measured.short.clipped).toBe(false);
    }
    if (testInfo.project.name !== 'firefox')
      await page.locator('[data-demo="summary-row"]').screenshot({
        path: testInfo.outputPath(
          `summary-row-clamp-${testInfo.project.name}-${width}.png`,
        ),
      });
  }
});

// KF-3WS7RR: a SummaryRow listbox is one Tab stop; Up/Down/Home/End move the
// focus ring without selecting, Enter and Space select, and an app keydown
// listener that calls preventDefault() first overrides Kerf's handling.
test('a SummaryRow listbox roves one Tab stop with arrow keys and selects with Enter and Space', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto('/?component=summary-row');
    const list = page.getByRole('listbox', { name: 'Tickets' });
    const options = list.getByRole('option');
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(list.locator('[role="option"][tabindex="0"]')).toHaveCount(1);
    await expect(options.nth(0)).toHaveAttribute('tabindex', '0');

    // Tab enters the listbox once, on the selected option, and leaves it on
    // the next Tab.
    await page.getByRole('listbox', { name: 'Tickets' }).evaluate((node) => {
      const before = document.createElement('button');
      before.id = 'before-tickets';
      before.textContent = 'Before';
      node.before(before);
    });
    await page.locator('#before-tickets').focus();
    await page.keyboard.press('Tab');
    await expect(options.nth(0)).toBeFocused();
    expect(
      await options
        .nth(0)
        .evaluate(
          (row) => window.getComputedStyle(row, '::after').outlineStyle,
        ),
    ).toBe('solid');
    await page.keyboard.press('ArrowDown');
    await expect(options.nth(1)).toBeFocused();
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'false');
    await expect(options.nth(1)).toHaveAttribute('tabindex', '0');
    await expect(options.nth(0)).toHaveAttribute('tabindex', '-1');
    // The keyboard focus ring follows the arrow keys.
    expect(
      await options
        .nth(1)
        .evaluate(
          (row) => window.getComputedStyle(row, '::after').outlineStyle,
        ),
    ).toBe('solid');
    if (testInfo.project.name !== 'firefox')
      await list.screenshot({
        path: testInfo.outputPath(
          `summary-row-listbox-focus-${testInfo.project.name}-${width}.png`,
        ),
      });
    await page.keyboard.press('End');
    await expect(options.nth(2)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(options.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'false');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await expect(options.nth(2)).toHaveAttribute('aria-selected', 'true');
    await expect(options.nth(2)).toBeFocused();
    // Shift+Tab leaves the listbox in one step (no other option is a Tab
    // stop), and Tab comes back to the option last focused.
    await page.keyboard.press('Shift+Tab');
    expect(
      await list.evaluate((node) => node.contains(document.activeElement)),
    ).toBe(false);
    await page.keyboard.press('Tab');
    await expect(options.nth(2)).toBeFocused();

    // An app listener on the option that prevents ArrowUp and Enter wins.
    await options.nth(2).evaluate((node: HTMLElement) => {
      node.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' || event.key === 'Enter')
          event.preventDefault();
      });
    });
    await page.keyboard.press('ArrowUp');
    await expect(options.nth(2)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(options.nth(0)).toBeFocused();
  }
});

// KF-Q1F3FH: a focused SummaryRow draws its keyboard ring inside its own box
// (a solid outline at a negative offset on an overlay drawn after the rail),
// so a middle list row's neighbors, the section's rounded clip, and the
// leading rail never cover it, in row and card presentations.
test('a focused SummaryRow draws a solid focus ring inside its own box', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto('/?component=summary-row');
    for (const [name, presentation] of [
      ['Tickets', 'row'],
      ['Board Column', 'card'],
    ] as const) {
      const list = page.getByRole('listbox', { name });
      const options = list.getByRole('option');
      await expect(options).toHaveCount(3);
      await options.first().focus();
      await page.keyboard.press('ArrowDown');
      const middle = options.nth(1);
      await expect(middle).toBeFocused();
      await expect(middle).toHaveAttribute('data-presentation', presentation);
      const ring = await middle.evaluate((row) => {
        const style = window.getComputedStyle(row, '::after');
        return {
          position: style.position,
          inset: [style.top, style.right, style.bottom, style.left],
          style: style.outlineStyle,
          width: parseFloat(style.outlineWidth),
          offset: parseFloat(style.outlineOffset),
          pointer: style.pointerEvents,
        };
      });
      expect(ring.position).toBe('absolute');
      expect(ring.inset).toEqual(['0px', '0px', '0px', '0px']);
      expect(ring.style).toBe('solid');
      expect(ring.width).toBeGreaterThanOrEqual(2);
      // The ring's outer edge (offset + width) stays at or inside the
      // overlay's edge, so nothing outside the row can paint over or clip it.
      expect(ring.offset + ring.width).toBeLessThanOrEqual(0);
      expect(ring.pointer).toBe('none');
      // A blurred row draws no ring.
      await page.keyboard.press('Shift+Tab');
      expect(
        await middle.evaluate(
          (row) => window.getComputedStyle(row, '::after').content,
        ),
      ).toBe('none');
      await middle.focus();
      if (testInfo.project.name !== 'firefox')
        await list.screenshot({
          path: testInfo.outputPath(
            `summary-row-focus-ring-${presentation}-${testInfo.project.name}-${width}.png`,
          ),
        });
    }
  }
});
