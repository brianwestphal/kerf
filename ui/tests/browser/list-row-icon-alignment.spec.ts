import { expect, type Locator, type Page, test } from '@playwright/test';

type RowGeometry = {
  centerDelta: number;
  firstLineHeight: number;
  iconHeight: number;
  lineCount: number;
};

async function rowGeometry(
  row: Locator,
  iconSelector: string,
  labelSelector: string,
): Promise<RowGeometry> {
  return row.evaluate(
    (element, selectors) => {
      const icon = element.querySelector<HTMLElement>(selectors.iconSelector);
      const label = element.querySelector<HTMLElement>(selectors.labelSelector);
      const text = label?.firstChild;
      if (!icon || !label || !text)
        throw new Error('Expected an icon and a text label');

      const range = document.createRange();
      range.selectNodeContents(text);
      const lineRects = [...range.getClientRects()];
      const firstLine = lineRects[0];
      if (!firstLine)
        throw new Error('Expected the label to produce a line box');
      const iconRect = icon.getBoundingClientRect();

      return {
        centerDelta: Math.abs(
          iconRect.top +
            iconRect.height / 2 -
            (firstLine.top + firstLine.height / 2),
        ),
        firstLineHeight: firstLine.height,
        iconHeight: iconRect.height,
        lineCount: lineRects.length,
      };
    },
    { iconSelector, labelSelector },
  );
}

async function expectFirstLineAlignment(
  page: Page,
  route: string,
  rowSelector: string,
  iconSelector: string,
  labelSelector: string,
  viewport: { width: number; height: number },
  expectWrapped = true,
) {
  await page.setViewportSize(viewport);
  await page.goto(`/?component=${route}`);
  const row = page.locator(rowSelector);
  await row.scrollIntoViewIfNeeded();
  const geometry = await rowGeometry(row, iconSelector, labelSelector);
  if (expectWrapped) expect(geometry.lineCount).toBeGreaterThan(1);
  expect(geometry.iconHeight).toBeGreaterThan(0);
  expect(geometry.firstLineHeight).toBeGreaterThan(0);
  expect(geometry.centerDelta).toBeLessThanOrEqual(1);
  return row;
}

test('aligns multiline ListItem and ListActionRow icons with the first text line', async ({
  page,
  browserName,
}) => {
  const wideListItem = await expectFirstLineAlignment(
    page,
    'list-item',
    '[data-demo="list-item"] [data-item-id="multiline"]',
    '.kui-list-item__icon',
    '.kui-list-item__label',
    { width: 1100, height: 760 },
    false,
  );
  if (browserName === 'chromium') {
    await wideListItem.hover();
    await wideListItem.screenshot({
      path: 'test-results/list-item-first-line-alignment-wide.png',
    });
  }
  const menuItem = await expectFirstLineAlignment(
    page,
    'list-item',
    '[data-demo="list-item"] [data-item-id="multiline"]',
    '.kui-list-item__icon',
    '.kui-list-item__label',
    { width: 390, height: 844 },
  );
  if (browserName === 'chromium') {
    await menuItem.hover();
    await menuItem.screenshot({
      path: 'test-results/list-item-first-line-alignment-narrow.png',
    });
  }

  const wideActionRow = await expectFirstLineAlignment(
    page,
    'list-action-row',
    '[data-demo-action-row="multiline"]',
    '.kui-list-action-row__icon',
    '.kui-list-action-row__label',
    { width: 1100, height: 760 },
    false,
  );
  if (browserName === 'chromium') {
    await wideActionRow.locator('.kui-list-action-row__primary').hover();
    await wideActionRow.screenshot({
      path: 'test-results/list-action-row-first-line-alignment-wide.png',
    });
  }
  const actionRow = await expectFirstLineAlignment(
    page,
    'list-action-row',
    '[data-demo-action-row="multiline"]',
    '.kui-list-action-row__icon',
    '.kui-list-action-row__label',
    { width: 390, height: 844 },
  );
  if (browserName === 'chromium') {
    await actionRow.locator('.kui-list-action-row__primary').hover();
    await actionRow.screenshot({
      path: 'test-results/list-action-row-first-line-alignment-narrow.png',
    });
  }

  await page.setViewportSize({ width: 720, height: 900 });
  await page.locator('html').evaluate((element) => {
    element.style.fontSize = '200%';
  });
  const zoomGeometry = await rowGeometry(
    actionRow,
    '.kui-list-action-row__icon',
    '.kui-list-action-row__label',
  );
  expect(zoomGeometry.lineCount).toBeGreaterThan(1);
  expect(zoomGeometry.centerDelta).toBeLessThanOrEqual(1);
});
