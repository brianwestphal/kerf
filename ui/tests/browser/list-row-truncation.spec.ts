import { expect, type Locator, type Page, test } from '@playwright/test';

// A long single-word primary label (a component or file name) must stay
// inside its own column. A single-line row ellipsizes it before the trailing
// slot; a multiline row breaks the word onto following lines. Before this
// guard, `text-overflow` sat on the label's grid container, where it never
// reaches the text, so a single-line label was cut mid-glyph and a multiline
// label ran underneath the trailing status.
const LONG_WORD = 'ConnectionStateBanner'.repeat(6);
const VIEWPORTS = [
  { width: 1100, height: 800 },
  { width: 390, height: 844 },
];

type LabelGeometry = {
  labelBoxRight: number;
  textRight: number;
  trailingLeft: number;
  lineCount: number;
  overflow: string;
  textOverflow: string;
  clipped: boolean;
};

async function injectLongLabel(
  row: Locator,
  primarySelector: string,
  trailingSelector: string,
  status?: { selector: string; text: string },
): Promise<LabelGeometry> {
  return row.evaluate(
    (element, args) => {
      const primary = element.querySelector<HTMLElement>(args.primarySelector);
      if (!primary) throw new Error('Expected a primary label');
      primary.textContent = args.word;
      if (args.status) {
        const statusElement = element.querySelector<HTMLElement>(
          args.status.selector,
        );
        if (!statusElement) throw new Error('Expected a status slot');
        statusElement.textContent = args.status.text;
      }
      const trailing = element.querySelector<HTMLElement>(
        args.trailingSelector,
      );
      if (!trailing) throw new Error('Expected a trailing slot');
      const range = document.createRange();
      range.selectNodeContents(primary);
      const lines = [...range.getClientRects()].filter((rect) => rect.width);
      const style = window.getComputedStyle(primary);
      return {
        labelBoxRight: primary.getBoundingClientRect().right,
        textRight: Math.max(...lines.map((rect) => rect.right)),
        trailingLeft: trailing.getBoundingClientRect().left,
        lineCount: new Set(lines.map((rect) => Math.round(rect.top))).size,
        overflow: style.overflowX,
        textOverflow: style.textOverflow,
        clipped: primary.scrollWidth > primary.clientWidth,
      };
    },
    {
      primarySelector,
      trailingSelector,
      status,
      word: LONG_WORD,
    },
  );
}

function expectEllipsized(geometry: LabelGeometry) {
  expect(geometry.overflow).toBe('hidden');
  expect(geometry.textOverflow).toBe('ellipsis');
  expect(geometry.clipped).toBe(true);
  expect(geometry.labelBoxRight).toBeLessThanOrEqual(geometry.trailingLeft);
}

async function openRoute(
  page: Page,
  route: string,
  viewport: (typeof VIEWPORTS)[number],
) {
  await page.setViewportSize(viewport);
  await page.goto(`/?component=${route}`);
}

for (const viewport of VIEWPORTS) {
  test(`single-line ListItem ellipsizes a long single-word label before its trailing slot at ${viewport.width}px`, async ({
    page,
  }) => {
    await openRoute(page, 'list-item', viewport);
    const row = page
      .locator(
        '[data-demo="list-item"] .kui-list-item:not([data-multiline]):has(.kui-list-item__trailing)',
      )
      .first();
    await row.scrollIntoViewIfNeeded();
    expectEllipsized(
      await injectLongLabel(
        row,
        '.kui-list-item__primary-label',
        '.kui-list-item__trailing',
      ),
    );
  });

  test(`single-line ListActionRow ellipsizes a long single-word label before its trailing action at ${viewport.width}px`, async ({
    page,
  }) => {
    await openRoute(page, 'list-action-row', viewport);
    const row = page.locator('[data-demo-action-row="selected"]');
    await row.scrollIntoViewIfNeeded();
    expectEllipsized(
      await injectLongLabel(
        row,
        '.kui-list-action-row__primary-label',
        '.kui-list-action-row__trailing-action',
      ),
    );
  });

  test(`multiline Catalog sidebar entry wraps a long single-word name before its status at ${viewport.width}px`, async ({
    page,
  }) => {
    await openRoute(page, 'list-item', viewport);
    if (viewport.width < 600) {
      await page.getByRole('button', { name: 'Show Kerf catalog' }).click();
    }
    const row = page
      .locator(
        '[data-catalog-section] .kui-list-item[data-multiline="true"]:has(.kui-list-item__status)',
      )
      .first();
    await row.scrollIntoViewIfNeeded();
    await expect(row).toBeVisible();
    const geometry = await injectLongLabel(
      row,
      '.kui-list-item__primary-label',
      '.kui-list-item__trailing',
      { selector: '.kui-list-item__status', text: 'stable · beta' },
    );
    expect(geometry.lineCount).toBeGreaterThan(1);
    expect(geometry.clipped).toBe(false);
    expect(geometry.textRight).toBeLessThanOrEqual(geometry.trailingLeft);
    expect(geometry.labelBoxRight).toBeLessThanOrEqual(geometry.trailingLeft);
  });
}
