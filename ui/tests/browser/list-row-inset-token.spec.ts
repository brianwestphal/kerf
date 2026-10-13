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

async function expectOneEdge(list: Locator, expected: number, iconSize = 18) {
  const edges = await leftEdges(list);
  expect(edges.itemIcons.length).toBeGreaterThan(0);
  expect(edges.actionIcons.length).toBeGreaterThan(0);
  expect(edges.itemLabels.length).toBeGreaterThan(0);
  expect(edges.actionLabels.length).toBeGreaterThan(0);
  for (const x of [...edges.itemIcons, ...edges.actionIcons])
    expect(x).toBeCloseTo(expected, 1);
  // Both row kinds share one leading icon size (18px by default), so their
  // labels share an edge too: inset + icon + the 8px gap.
  for (const x of [...edges.itemLabels, ...edges.actionLabels])
    expect(x).toBeCloseTo(expected + iconSize + 8, 1);
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

test('ListItem and ListActionRow share the List row icon size token', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=list');
  const list = page.locator('[data-demo-row-inset-list]');
  await list.scrollIntoViewIfNeeded();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const iconBoxes = () =>
      list.evaluate((root) =>
        Array.from(
          root.querySelectorAll(
            '.kui-list-item__icon, .kui-list-action-row__icon',
          ),
          (element) => {
            const box = element.getBoundingClientRect();
            const glyph = element.querySelector('svg')?.getBoundingClientRect();
            return [box.width, box.height, glyph?.width, glyph?.height];
          },
        ),
      );
    // Default: both row kinds draw the 18px row icon.
    for (const sizes of await iconBoxes())
      expect(sizes).toEqual([18, 18, 18, 18]);
    await expectOneEdge(list, 21);

    // One shared token resizes both kinds together, keeping one label edge.
    await list.evaluate((element) =>
      (element as HTMLElement).style.setProperty(
        '--kui-list-row-icon-size',
        '24px',
      ),
    );
    for (const sizes of await iconBoxes())
      expect(sizes).toEqual([24, 24, 24, 24]);
    await expectOneEdge(list, 21, 24);
    await list.screenshot({
      path: testInfo.outputPath(`list-row-icon-size-${width}.png`),
    });

    // ListItem's own token still wins over the shared one for its rows.
    await list.evaluate((element) =>
      (element as HTMLElement).style.setProperty(
        '--kui-list-item-icon-size',
        '20px',
      ),
    );
    const edges = await leftEdges(list);
    for (const x of edges.itemLabels) expect(x).toBeCloseTo(21 + 20 + 8, 1);
    for (const x of edges.actionLabels) expect(x).toBeCloseTo(21 + 24 + 8, 1);

    await list.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.removeProperty('--kui-list-row-icon-size');
      style.removeProperty('--kui-list-item-icon-size');
    });
  }
});
