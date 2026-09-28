import { expect, type Page, test } from '@playwright/test';

/**
 * A Toolbar reserves one group-height control band at its top. Each zone item
 * no taller than the band is centered in it by its own size, and a taller
 * item (a wrapped title, a second trailing row) starts at the band's top and
 * grows down, so it never moves the other items. Centering the zones in the
 * toolbar row instead dropped every trailing control to the middle of a
 * two-line title.
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
    for (const { band, items } of toolbars) {
      expect(band, route).toBeGreaterThan(0);
      for (const item of items) {
        if (item.height <= band + 0.5) {
          expect(Math.abs(item.center - band / 2), item.label).toBeLessThan(
            0.75,
          );
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
