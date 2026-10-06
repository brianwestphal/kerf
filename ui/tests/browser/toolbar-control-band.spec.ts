import { expect, type Page, test } from '@playwright/test';

/**
 * A Toolbar reserves one group-height control band at its top. ToolbarText,
 * ToolbarControlGroup, and standalone wa-button keep their first-band axis
 * even when a taller sibling grows the zone. Other direct content centers in
 * the zone by default.
 */
type BandItem = {
  label: string;
  top: number;
  height: number;
  center: number;
};

async function bandGeometry(page: Page, toolbarSelector: string) {
  return page.locator(toolbarSelector).evaluateAll((toolbars) =>
    toolbars.map((toolbar) => {
      const style = window.getComputedStyle(toolbar);
      const bandTop =
        toolbar.getBoundingClientRect().top +
        parseFloat(style.paddingTop) +
        parseFloat(style.borderTopWidth);
      // The band is a calc() custom property, so read it resolved to pixels
      // from the zone minimum height it sets.
      const band = parseFloat(
        window.getComputedStyle(
          toolbar.querySelector(':scope > .kui-toolbar__leading')!,
        ).minHeight,
      );
      const items: BandItem[] = [];
      for (const zone of toolbar.querySelectorAll(
        ':scope > :is(.kui-toolbar__leading, .kui-toolbar__center, .kui-toolbar__trailing)',
      )) {
        if (window.getComputedStyle(zone).display === 'none') continue;
        for (const item of zone.children) {
          const rect = item.getBoundingClientRect();
          if (rect.height === 0) continue;
          // Items on a wrapped second trailing row start below the band.
          if (rect.top - bandTop >= band) continue;
          items.push({
            label: `${item.className} in ${zone.className}`,
            top: rect.top - bandTop,
            height: rect.height,
            center: rect.top + rect.height / 2 - bandTop,
          });
        }
      }
      return { band, items };
    }),
  );
}

test('every toolbar item is centered in, or starts at the top of, the control band', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of ['toolbar', 'toolbar-control-group']) {
    await page.goto(`/?component=${route}`);
    const toolbars = await bandGeometry(page, '.kui-toolbar');
    expect(toolbars.length, route).toBeGreaterThan(0);
    for (const [toolbarIndex, { band, items }] of toolbars.entries()) {
      expect(band, route).toBeGreaterThan(0);
      for (const item of items) {
        if (item.height <= band + 0.5) {
          expect(
            Math.abs(item.center - band / 2),
            `${route} toolbar ${toolbarIndex}: ${item.label}, top=${item.top}, height=${item.height}, band=${band}`,
          ).toBeLessThan(0.75);
        } else {
          expect(Math.abs(item.top), item.label).toBeLessThan(0.75);
        }
      }
    }
  }
});

test('a wrapped heading keeps the trailing controls in its first line band', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/?component=recipe-workspace-header');
  const toolbar = page.locator(
    '[data-recipe="recipe-workspace-header"] .kui-toolbar',
  );
  await toolbar.scrollIntoViewIfNeeded();
  const geometry = await toolbar.evaluate((element) => {
    const toolbarTop =
      element.getBoundingClientRect().top +
      parseFloat(window.getComputedStyle(element).paddingTop);
    const text = element.querySelector('.kui-toolbar-text__text')!;
    const range = document.createRange();
    range.selectNodeContents(text);
    const lines = [...range.getClientRects()];
    const group = element
      .querySelector('.kui-toolbar__trailing > .kui-toolbar-control-group')!
      .getBoundingClientRect();
    return {
      lineCount: new Set(lines.map((line) => Math.round(line.top))).size,
      firstLineCenter: lines[0]!.top + lines[0]!.height / 2 - toolbarTop,
      groupTop: group.top - toolbarTop,
      groupCenter: group.top + group.height / 2 - toolbarTop,
    };
  });
  expect(geometry.lineCount).toBe(2);
  expect(Math.abs(geometry.groupTop)).toBeLessThan(0.75);
  expect(
    Math.abs(geometry.groupCenter - geometry.firstLineCenter),
  ).toBeLessThan(1.5);
});

test('direct custom children center in a zone without shifting its control group', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=toolbar');
  const zone = page
    .locator('.kui-toolbar__trailing:has(> .kui-toolbar-control-group)')
    .first();
  const geometry = await zone.evaluate((element) => {
    const tall = document.createElement('span');
    tall.style.cssText = 'display:block; flex:none; width:20px; height:64px';
    const short = document.createElement('span');
    short.style.cssText = 'display:block; flex:none; width:20px; height:20px';
    element.append(tall, short);
    const bounds = element.getBoundingClientRect();
    const group = element.querySelector('.kui-toolbar-control-group')!;
    const center = (node: Element) => {
      const rect = node.getBoundingClientRect();
      return rect.top + rect.height / 2 - bounds.top;
    };
    return {
      zoneCenter: bounds.height / 2,
      tallCenter: center(tall),
      shortCenter: center(short),
      groupCenter: center(group),
      band: parseFloat(window.getComputedStyle(element).minHeight),
    };
  });
  expect(geometry.tallCenter).toBeCloseTo(geometry.zoneCenter, 0);
  expect(geometry.shortCenter).toBeCloseTo(geometry.zoneCenter, 0);
  expect(geometry.groupCenter).toBeCloseTo(geometry.band / 2, 0);
});
