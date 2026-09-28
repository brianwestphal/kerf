import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// A Toolbar whose leading identity, center group, and trailing group do not
// all fit truncates the leading title first; the center zone keeps its whole
// content width and never paints over the title. When everything fits, the
// center group stays centered in its zone and the title stays whole.

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/toolbar-center-overflow.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

const CASES = [
  ...['none', 'wrap', 'stack', 'center-priority'].flatMap((policy) =>
    ['center', 'stretch'].map((align) => `${policy}-${align}`),
  ),
  'nav-stack',
  'workbench',
];

async function mountFixture(page: Page, width: number): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Toolbar fixture emitted no JS');
  await page.setViewportSize({ width, height: 1400 });
  await page.setContent(
    '<!doctype html><html><body><div class="kui-app-root" data-fixture-root></div></body></html>',
  );
  // The fixture resolves package CSS from source, so apply the pixel-first
  // remify() authoring transform the package build performs.
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
  await page
    .locator('[data-case="workbench"] [data-component="toolbar"]')
    .waitFor();
}

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Measure {
  toolbar: Rect;
  leading: Rect;
  center: Rect;
  group: Rect;
  trailing: Rect;
  title: { whole: boolean; ellipsis: boolean; width: number };
}

function measure(page: Page, name: string): Promise<Measure> {
  return page
    .locator(`[data-case="${name}"] [data-component="toolbar"]`)
    .first()
    .evaluate((toolbar) => {
      const rect = (element: Element): Rect => {
        const box = element.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
        };
      };
      const zone = (suffix: string) =>
        toolbar.querySelector(`:scope > .kui-toolbar__${suffix}`)!;
      const title = zone('leading').querySelector(
        '[data-component="toolbar-text"] .kui-toolbar-text__text',
      )!;
      return {
        toolbar: rect(toolbar),
        leading: rect(zone('leading')),
        center: rect(zone('center')),
        group: rect(zone('center').firstElementChild!),
        trailing: rect(zone('trailing')),
        title: {
          whole: title.scrollWidth <= title.clientWidth + 0.5,
          ellipsis: window.getComputedStyle(title).textOverflow === 'ellipsis',
          width: title.getBoundingClientRect().width,
        },
      };
    });
}

const intersects = (a: Rect, b: Rect) =>
  a.left < b.right - 0.5 &&
  b.left < a.right - 0.5 &&
  a.top < b.bottom - 0.5 &&
  b.top < a.bottom - 0.5;

for (const width of [320, 360, 390, 480]) {
  test(`the leading title truncates instead of the center group covering it at ${String(width)}px`, async ({
    page,
  }) => {
    await mountFixture(page, width);
    for (const name of CASES) {
      const m = await measure(page, name);
      // The center group keeps its whole width inside its own zone …
      expect(
        m.group.left,
        `${name}: center group clipped`,
      ).toBeGreaterThanOrEqual(m.center.left - 0.5);
      expect(
        m.group.right,
        `${name}: center group clipped`,
      ).toBeLessThanOrEqual(m.center.right + 0.5);
      // … and never paints over the leading identity or the trailing actions.
      expect(
        intersects(m.group, m.leading),
        `${name}: center over leading`,
      ).toBe(false);
      expect(
        intersects(m.group, m.trailing),
        `${name}: center over trailing`,
      ).toBe(false);
      expect(m.group.right, `${name}: center past toolbar`).toBeLessThanOrEqual(
        m.toolbar.right + 0.5,
      );
      // A title that does not fit ends in an ellipsis rather than clipping.
      if (!m.title.whole)
        expect(m.title.ellipsis, `${name}: title not ellipsized`).toBe(true);
      expect(m.title.width, `${name}: title vanished`).toBeGreaterThan(0);
    }
    // The single-row policies share the row, so the title is what gives way.
    if (width > 390) return;
    for (const name of ['none-center', 'none-stretch', 'nav-stack']) {
      const m = await measure(page, name);
      expect(m.group.top, `${name}: not one row`).toBeLessThan(
        m.leading.bottom,
      );
      expect(m.title.whole, `${name}: title should truncate`).toBe(false);
    }
  });
}

test('a toolbar that fits keeps a whole title and a centered center group', async ({
  page,
  browserName,
}) => {
  await mountFixture(page, 1100);
  for (const name of CASES) {
    const m = await measure(page, name);
    expect(m.title.whole, `${name}: title truncated`).toBe(true);
    expect(intersects(m.group, m.leading), `${name}: center over leading`).toBe(
      false,
    );
    expect(m.group.top, `${name}: not one row`).toBeLessThan(m.leading.bottom);
    if (name.endsWith('-stretch')) {
      // A stretched center fills its zone.
      expect(m.group.left).toBeCloseTo(m.center.left, 0);
      expect(m.group.right).toBeCloseTo(m.center.right, 0);
    } else {
      // A centered group sits in the middle of the zone between the others.
      expect((m.group.left + m.group.right) / 2).toBeCloseTo(
        (m.center.left + m.center.right) / 2,
        0,
      );
    }
  }
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/toolbar-center-overflow-1100.png',
      fullPage: true,
    });
});
