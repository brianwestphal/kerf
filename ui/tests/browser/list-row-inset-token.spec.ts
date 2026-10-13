import { expect, type Locator, test } from '@playwright/test';

async function leftEdges(list: Locator) {
  return list.evaluate((root) => {
    const listLeft = root.getBoundingClientRect().left;
    const offset = (selector: string) =>
      Array.from(
        root.querySelectorAll(selector),
        (element) =>
          Math.round((element.getBoundingClientRect().left - listLeft) * 100) /
          100,
      );
    return {
      itemIcons: offset('.kui-list-item .kui-list-item__icon'),
      actionIcons: offset('.kui-list-action-row .kui-list-action-row__icon'),
      itemLabels: offset(
        '.kui-list-item[data-has-icon="true"] .kui-list-item__label',
      ),
      actionLabels: offset('.kui-list-action-row .kui-list-action-row__label'),
    };
  });
}

async function expectOneEdge(list: Locator, expected: number) {
  const edges = await leftEdges(list);
  expect(edges.itemIcons.length).toBeGreaterThan(0);
  expect(edges.actionIcons.length).toBeGreaterThan(0);
  for (const x of [...edges.itemIcons, ...edges.actionIcons])
    expect(x).toBeCloseTo(expected, 1);
  // Labels follow the shared inset too. ListItem icons are 18px and
  // ListActionRow icons 24px, so the label columns keep that fixed difference.
  for (const x of edges.itemLabels) expect(x).toBeCloseTo(expected + 18 + 8, 1);
  for (const x of edges.actionLabels)
    expect(x).toBeCloseTo(expected + 24 + 8, 1);
}

test('ListItem and ListActionRow share the List row inline inset token', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=list');
  const list = page.locator('[data-demo-row-inset-list]');
  await list.scrollIntoViewIfNeeded();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    // The demo scopes 12px: 8px row margin + 1px border + 12px inset.
    await expectOneEdge(list, 21);
    await list.screenshot({
      path: testInfo.outputPath(`list-row-inset-${width}.png`),
    });

    await list.evaluate((element) =>
      (element as HTMLElement).style.setProperty(
        '--kui-list-row-padding-inline',
        '20px',
      ),
    );
    await expectOneEdge(list, 29);

    // An unset token falls back to the 8px item padding, unchanged from
    // before the shared token existed.
    await list.evaluate((element) =>
      (element as HTMLElement).style.setProperty(
        '--kui-list-row-padding-inline',
        'initial',
      ),
    );
    await expectOneEdge(list, 17);

    // ListItem's own token still wins over the shared one for its rows.
    await list.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.setProperty('--kui-list-row-padding-inline', '20px');
      style.setProperty('--kui-list-item-padding-inline', '4px');
    });
    const edges = await leftEdges(list);
    for (const x of edges.itemIcons) expect(x).toBeCloseTo(13, 1);
    for (const x of edges.actionIcons) expect(x).toBeCloseTo(29, 1);

    await list.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.removeProperty('--kui-list-row-padding-inline');
      style.removeProperty('--kui-list-item-padding-inline');
    });
  }
});
