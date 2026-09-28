import { expect, type Locator, type Page, test } from '@playwright/test';

// A ValueTableRow's label and value share the row as two content-sized
// tracks. Before this guard the value was a `1fr` track beside an `auto`
// label, so a long single-word label (a component or file name) grew to its
// full width first and squeezed the value to 0px: the value wrapped one
// character per line and the label ran underneath it.
const LONG_WORD = 'ConnectionStateBanner'.repeat(2);
const LONG_LABEL = 'Last synchronized from origin';
const LONG_VALUE = 'packages/ui/src/components/value-table/value-table-row.tsx';
const VIEWPORTS = [
  { width: 1100, height: 800 },
  { width: 390, height: 844 },
];

type RowGeometry = {
  rowContentWidth: number;
  labelBoxRight: number;
  labelTextRight: number;
  labelLineCount: number;
  labelOverflow: string;
  labelTextOverflow: string;
  labelClipped: boolean;
  valueLeft: number;
  valueWidth: number;
  valueTextWidth: number;
  valueLineCount: number;
};

async function injectRow(
  row: Locator,
  content: { label: string; value?: string },
): Promise<RowGeometry> {
  return row.evaluate((element, args) => {
    const label = element.querySelector<HTMLElement>('.kui-value-table__label');
    const value = element.querySelector<HTMLElement>('dd');
    if (!label || !value) throw new Error('Expected a label and a value');
    label.textContent = args.label;
    if (args.value !== undefined) value.textContent = args.value;
    const lines = (node: HTMLElement) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return [...range.getClientRects()].filter((rect) => rect.width);
    };
    const labelLines = lines(label);
    const valueLines = lines(value);
    const rowStyle = window.getComputedStyle(element);
    const labelStyle = window.getComputedStyle(label);
    const valueBox = value.getBoundingClientRect();
    return {
      rowContentWidth:
        element.clientWidth -
        parseFloat(rowStyle.paddingLeft) -
        parseFloat(rowStyle.paddingRight),
      labelBoxRight: label.getBoundingClientRect().right,
      labelTextRight: Math.max(...labelLines.map((rect) => rect.right)),
      labelLineCount: new Set(labelLines.map((rect) => Math.round(rect.top)))
        .size,
      labelOverflow: labelStyle.overflowX,
      labelTextOverflow: labelStyle.textOverflow,
      labelClipped: label.scrollWidth > label.clientWidth,
      valueLeft: valueBox.left,
      valueWidth: valueBox.width,
      valueTextWidth: Math.max(...valueLines.map((rect) => rect.width)),
      valueLineCount: new Set(valueLines.map((rect) => Math.round(rect.top)))
        .size,
    };
  }, content);
}

async function populatedRows(page: Page, viewport: (typeof VIEWPORTS)[number]) {
  await page.setViewportSize(viewport);
  await page.goto('/?component=value-table');
  const table = page
    .locator('[data-demo="value-table"] .kui-value-table')
    .first();
  await table.scrollIntoViewIfNeeded();
  await expect(table).toBeVisible();
  return table.locator('.kui-value-table__row');
}

for (const viewport of VIEWPORTS) {
  test(`ValueTableRow keeps a short value whole beside a long single-word label at ${viewport.width}px`, async ({
    page,
  }) => {
    const rows = await populatedRows(page, viewport);
    const geometry = await injectRow(rows.first(), { label: LONG_WORD });

    // The value keeps its content on one line at its natural width.
    expect(geometry.valueLineCount).toBe(1);
    expect(geometry.valueWidth).toBeGreaterThanOrEqual(
      geometry.valueTextWidth - 0.5,
    );
    // The label ends in an ellipsis before the value instead of running under it.
    expect(geometry.labelOverflow).toBe('hidden');
    expect(geometry.labelTextOverflow).toBe('ellipsis');
    expect(geometry.labelBoxRight).toBeLessThanOrEqual(geometry.valueLeft);
    if (viewport.width < 600) expect(geometry.labelClipped).toBe(true);
  });

  test(`ValueTableRow splits the row when both the label and value are long at ${viewport.width}px`, async ({
    page,
  }) => {
    const rows = await populatedRows(page, viewport);
    const geometry = await injectRow(rows.nth(2), {
      label: LONG_LABEL,
      value: LONG_VALUE,
    });

    // Neither side is starved: each keeps a usable share of the row.
    expect(geometry.valueWidth).toBeGreaterThanOrEqual(
      Math.min(geometry.valueTextWidth, geometry.rowContentWidth * 0.4),
    );
    // A multi-word label wraps at its spaces rather than truncating.
    if (viewport.width < 600)
      expect(geometry.labelLineCount).toBeGreaterThan(1);
    expect(geometry.labelClipped).toBe(false);
    expect(geometry.labelTextRight).toBeLessThanOrEqual(geometry.valueLeft);
    expect(geometry.labelBoxRight).toBeLessThanOrEqual(geometry.valueLeft);
  });
}
