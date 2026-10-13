import { expect, type Locator, type Page, test } from '@playwright/test';

type Kind = 'list-item' | 'list-action-row';

type TileGeometry = {
  tileWidth: number;
  tileHeight: number;
  glyphWidth: number;
  glyphHeight: number;
  glyphCenterDx: number;
  glyphCenterDy: number;
  tileCenterToRowCenter: number;
  topClearance: number;
  bottomClearance: number;
  tileInlineStart: number;
  labelGap: number;
  rowHeight: number;
  radius: string;
  fill: string;
  foreground: string;
};

/** Drop a demo row's description so it measures as a single-line row. */
function singleLine(row: Locator) {
  return row.evaluate((element) =>
    element
      .querySelector(
        '.kui-list-action-row__description, .kui-list-item__description',
      )
      ?.remove(),
  );
}

const iconSelector = (kind: Kind) => `.kui-${kind}__icon`;
const labelSelector = (kind: Kind) => `.kui-${kind}__label`;

async function openTiles(page: Page, kind: Kind) {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto(`/?component=${kind}`);
  const list = page.locator(`[data-demo-icon-tiles="${kind}"]`);
  await list.scrollIntoViewIfNeeded();
  return list;
}

function tileGeometry(row: Locator, kind: Kind): Promise<TileGeometry> {
  return row.evaluate(
    (element, selectors) => {
      const icon = element.querySelector<HTMLElement>(selectors.icon);
      const glyph = icon?.querySelector('svg');
      const label = element.querySelector<HTMLElement>(selectors.label);
      if (!icon || !glyph || !label) throw new Error('Expected a tiled icon');
      const rowRect = element.getBoundingClientRect();
      const tile = icon.getBoundingClientRect();
      const svg = glyph.getBoundingClientRect();
      const text = label.getBoundingClientRect();
      const style = window.getComputedStyle(icon);
      return {
        tileWidth: tile.width,
        tileHeight: tile.height,
        glyphWidth: svg.width,
        glyphHeight: svg.height,
        glyphCenterDx: Math.abs(
          svg.left + svg.width / 2 - (tile.left + tile.width / 2),
        ),
        glyphCenterDy: Math.abs(
          svg.top + svg.height / 2 - (tile.top + tile.height / 2),
        ),
        tileCenterToRowCenter: Math.abs(
          tile.top + tile.height / 2 - (rowRect.top + rowRect.height / 2),
        ),
        topClearance: tile.top - rowRect.top,
        bottomClearance: rowRect.bottom - tile.bottom,
        tileInlineStart: tile.left - rowRect.left,
        labelGap: text.left - tile.right,
        rowHeight: rowRect.height,
        radius: style.borderTopLeftRadius,
        fill: style.backgroundColor,
        foreground: window.getComputedStyle(glyph).color,
      };
    },
    { icon: iconSelector(kind), label: labelSelector(kind) },
  );
}

function expectTileBox(geometry: TileGeometry) {
  expect(geometry.tileWidth).toBeCloseTo(32, 0);
  expect(geometry.tileHeight).toBeCloseTo(32, 0);
  expect(geometry.glyphWidth).toBeCloseTo(18, 0);
  expect(geometry.glyphHeight).toBeCloseTo(18, 0);
  expect(geometry.glyphCenterDx).toBeLessThanOrEqual(0.5);
  expect(geometry.glyphCenterDy).toBeLessThanOrEqual(0.5);
  expect(geometry.tileCenterToRowCenter).toBeLessThanOrEqual(0.5);
  expect(geometry.radius).toBe('6px');
  expect(geometry.labelGap).toBeCloseTo(8, 0);
}

test.describe('filled leading icon tiles', () => {
  test('ListActionRow tiles a 32px fill around an 18px glyph in a 44px row', async ({
    page,
  }) => {
    const list = await openTiles(page, 'list-action-row');
    const rows = list.locator('.kui-list-action-row');
    await expect(rows).toHaveCount(5);
    // A described row grows with its label stack; the tile stays centered.
    const described = await tileGeometry(rows.nth(1), 'list-action-row');
    expectTileBox(described);
    expect(described.rowHeight).toBeGreaterThan(44);
    await singleLine(rows.nth(0));
    const runTests = await tileGeometry(rows.nth(0), 'list-action-row');
    expectTileBox(runTests);
    expect(runTests.rowHeight).toBeCloseTo(44, 0);
    expect(runTests.topClearance).toBeCloseTo(6, 0);
    expect(runTests.bottomClearance).toBeCloseTo(6, 0);
    expect(runTests.tileInlineStart).toBeCloseTo(9, 0);
    expect(runTests.fill).toBe('rgb(48, 164, 108)');
    // A dark fill takes a white glyph; a light fill takes a black one.
    expect(runTests.foreground).toMatch(
      /^(rgb\(255, 255, 255\)|oklch\(1 0 0\))$/,
    );
    const format = await tileGeometry(rows.nth(2), 'list-action-row');
    expect(format.fill).toBe('rgb(255, 197, 61)');
    expect(format.foreground).toMatch(/^(rgb\(0, 0, 0\)|oklch\(0 0 0\))$/);
    // An explicit foreground wins over the automatic contrast.
    const docs = await tileGeometry(rows.nth(4), 'list-action-row');
    const brandOnLoud = await rows.nth(4).evaluate((element) => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--kui-color-brand-on-loud)';
      element.append(probe);
      const color = window.getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    expect(docs.foreground).toBe(brandOnLoud);
  });

  test('ListItem tiles share the ListActionRow tile edge, size, and clearance', async ({
    page,
  }) => {
    const list = await openTiles(page, 'list-item');
    const rows = list.locator('.kui-list-item');
    await expect(rows).toHaveCount(5);
    const general = await tileGeometry(rows.nth(0), 'list-item');
    expectTileBox(general);
    expect(general.rowHeight).toBeCloseTo(44, 0);
    expect(general.topClearance).toBeCloseTo(6, 0);
    expect(general.tileInlineStart).toBeCloseTo(9, 0);
    const brandFill = await rows.nth(1).evaluate((element) => {
      const probe = document.createElement('span');
      probe.style.background = 'var(--kui-color-brand-fill-quiet)';
      element.append(probe);
      const color = window.getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    });
    const brand = await tileGeometry(rows.nth(1), 'list-item');
    expect(brand.fill).toBe(brandFill);
    // A description keeps the row's untiled height: the tile overhangs the
    // padding instead of shortening it.
    const heights = await rows.nth(2).evaluate((element) => {
      const label = element.querySelector('.kui-list-item__label');
      const description = document.createElement('span');
      description.className = 'kui-list-item__description';
      description.textContent = 'Last backup an hour ago';
      label?.append(description);
      element.setAttribute('data-has-description', 'true');
      const tiled = element.getBoundingClientRect().height;
      element.removeAttribute('data-icon-tile');
      element.removeAttribute('data-icon-tile-tone');
      const plain = element.getBoundingClientRect().height;
      return { tiled, plain };
    });
    expect(heights.tiled).toBeCloseTo(heights.plain, 1);
  });

  test('hover and selection never recolor a tile', async ({ page }) => {
    for (const kind of ['list-action-row', 'list-item'] as const) {
      const list = await openTiles(page, kind);
      const row = list.locator(`.kui-${kind}`).nth(3);
      const rest = await tileGeometry(row, kind);
      await row.hover();
      const hovered = await tileGeometry(row, kind);
      await (
        kind === 'list-item'
          ? row
          : row.locator('.kui-list-action-row__primary')
      ).click();
      await page.mouse.move(0, 0);
      await expect(row).toHaveAttribute(
        kind === 'list-item' ? 'aria-current' : 'data-selected',
        kind === 'list-item' ? 'page' : 'true',
      );
      const selected = await tileGeometry(row, kind);
      for (const state of [hovered, selected]) {
        expect(state.fill).toBe(rest.fill);
        expect(state.foreground).toBe(rest.foreground);
        expect(state.tileWidth).toBe(rest.tileWidth);
      }
    }
  });

  test('compact tile rows hold at least 42px and keep the tile centered', async ({
    page,
  }) => {
    for (const kind of ['list-action-row', 'list-item'] as const) {
      const list = await openTiles(page, kind);
      const row = list.locator(`.kui-${kind}`).first();
      await singleLine(row);
      await row.evaluate((element) =>
        element.setAttribute('data-density', 'compact'),
      );
      const geometry = await tileGeometry(row, kind);
      expectTileBox(geometry);
      if (kind === 'list-item') {
        expect(geometry.rowHeight).toBeCloseTo(42, 0);
        expect(geometry.topClearance).toBeCloseTo(5, 0);
      } else {
        // A compact ListActionRow's label stack still holds the row at 44px
        // (tracked separately); the tile rule guarantees at least 42px.
        expect(geometry.rowHeight).toBeGreaterThanOrEqual(42);
        expect(geometry.topClearance).toBeGreaterThanOrEqual(5);
      }
    }
  });

  test('a token fill without a foreground still resolves a contrasting glyph', async ({
    page,
  }) => {
    const list = await openTiles(page, 'list-action-row');
    const icon = list.locator('.kui-list-action-row__icon').first();
    const colors = await icon.evaluate((element) => {
      element.setAttribute(
        'style',
        '--_kui-list-action-row-icon-tile-fill: var(--kui-color-neutral-fill-loud)',
      );
      const glyph = element.querySelector('svg');
      if (!glyph) throw new Error('Expected a glyph');
      return {
        glyph: window.getComputedStyle(glyph).color,
        row: window.getComputedStyle(element.parentElement as Element).color,
      };
    });
    expect(colors.glyph).toMatch(
      /^(rgb\((0, 0, 0|255, 255, 255)\)|oklch\([01] 0 0\))$/,
    );
    expect(colors.glyph).not.toBe(colors.row);
  });

  test('a wrapped label centers its first line on the tile inside the row', async ({
    page,
  }) => {
    for (const kind of ['list-action-row', 'list-item'] as const) {
      const list = await openTiles(page, kind);
      await page.setViewportSize({ width: 390, height: 900 });
      const row = list.locator(`.kui-${kind}`).first();
      await singleLine(row);
      const geometry = await row.evaluate(
        (element, selectors) => {
          element.setAttribute('data-multiline', 'true');
          const primary = element.querySelector<HTMLElement>(selectors.primary);
          if (!primary) throw new Error('Expected a primary label');
          primary.textContent =
            'A long command name that wraps onto several lines at a narrow width';
          const icon = element.querySelector(selectors.icon);
          if (!icon) throw new Error('Expected a tile');
          const range = document.createRange();
          range.selectNodeContents(primary);
          const lines = [...range.getClientRects()];
          const first = lines[0];
          const tile = icon.getBoundingClientRect();
          const rowRect = element.getBoundingClientRect();
          return {
            lineCount: new Set(lines.map((line) => Math.round(line.top))).size,
            delta: Math.abs(
              tile.top + tile.height / 2 - (first.top + first.height / 2),
            ),
            topClearance: tile.top - rowRect.top,
          };
        },
        {
          primary: `.kui-${kind}__primary-label`,
          icon: `.kui-${kind}__icon`,
        },
      );
      expect(geometry.lineCount).toBeGreaterThan(1);
      expect(geometry.delta).toBeLessThanOrEqual(1);
      expect(geometry.topClearance).toBeCloseTo(6, 0);
    }
  });
});
