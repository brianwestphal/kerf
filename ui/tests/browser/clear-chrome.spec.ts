import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-TQ3NHD clear chrome: a Pane header, NavStack chrome and bottom toolbar,
// and a TabNavigator bar can be fully transparent over their content
// (`clear`). With `scrollEdge="material"` the chrome material fades in behind
// a bar (opacity only) while content lies beneath it, as the scroll state
// wiring reports, and out at rest: under the top bars at the top of the
// content, under the bottom bars at its end.

const fixtureBundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/clear-chrome.tsx')],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

const css = [
  'foundation',
  'layout',
  'content-item',
  'pane',
  'nav-stack',
  'tab-navigator',
  'toolbar',
  'toolbar-text',
  'toolbar-control-group',
  'backdrop-image',
]
  .map((name) =>
    readFileSync(
      resolve(import.meta.dirname, `../../dist/styles/${name}.css`),
      'utf8',
    ),
  )
  .join('\n');

async function mountFixture(page: Page): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  )!;
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.setContent('<body style="margin:0"><div data-app></div></body>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript.text });
  await expect(page.locator('[data-region="pane"] .kui-pane')).toHaveAttribute(
    'data-header-overlay',
    'measured',
  );
}

const BARS = {
  paneHeader: [
    '[data-region="pane"] .kui-pane__content',
    '[data-region="pane"] .kui-pane__header',
  ],
  stackChrome: [
    '[data-region="stack"] .kui-nav-stack__view[data-nav-active="true"]',
    '[data-region="stack"] .kui-nav-stack__chrome:not(.kui-nav-stack__chrome-copy)',
  ],
  stackBottom: [
    '[data-region="stack"] .kui-nav-stack__view[data-nav-active="true"]',
    '[data-region="stack"] .kui-nav-stack__bottom:not(.kui-nav-stack__chrome-copy)',
  ],
  tabBar: [
    '[data-region="tabs"] .kui-tab-scaffold__scene[data-active="true"]',
    '[data-region="tabs"] .kui-tab-scaffold__bar',
  ],
} as const;

/** Scroll every region, let the fade settle, and read each bar's paint. */
async function paintAt(page: Page, position: 'start' | 'middle' | 'end') {
  await page.evaluate(
    ({ bars, position }) => {
      for (const [scrollerSelector] of Object.values(bars)) {
        const scroller = document.querySelector<HTMLElement>(scrollerSelector)!;
        const max = scroller.scrollHeight - scroller.clientHeight;
        scroller.scrollTop =
          position === 'start' ? 0 : position === 'middle' ? max / 2 : max;
      }
    },
    { bars: BARS, position },
  );
  await page.waitForTimeout(600);
  return page.evaluate((bars) => {
    const read = (selector: string) => {
      const bar = document.querySelector<HTMLElement>(selector)!;
      const style = window.getComputedStyle(bar);
      const before = window.getComputedStyle(bar, '::before');
      return {
        background: style.backgroundColor,
        filter: style.backdropFilter,
        shadow: style.boxShadow,
        border: style.borderTopColor,
        material: Number(before.opacity),
        materialContent: before.content,
        materialBackground: before.backgroundColor,
      };
    };
    return Object.fromEntries(
      Object.entries(bars).map(([name, [, barSelector]]) => [
        name,
        read(barSelector),
      ]),
    ) as Record<keyof typeof bars, ReturnType<typeof read>>;
  }, BARS);
}

test('clear bars stay transparent and fade the material in only over content', async ({
  page,
}) => {
  await mountFixture(page);
  const start = await paintAt(page, 'start');
  await page.screenshot({ path: test.info().outputPath('clear-start.png') });
  const middle = await paintAt(page, 'middle');
  await page.screenshot({ path: test.info().outputPath('clear-middle.png') });
  const end = await paintAt(page, 'end');

  for (const paint of Object.values(start)) {
    expect(paint.background).toBe('rgba(0, 0, 0, 0)');
    expect(['none', '']).toContain(paint.filter);
  }
  // Top bars: clear at rest, material once content scrolls beneath.
  for (const bar of ['paneHeader', 'stackChrome'] as const) {
    expect(start[bar].material, `${bar} at start`).toBe(0);
    expect(middle[bar].material, `${bar} mid-scroll`).toBe(1);
  }
  // Bottom bars: material while content continues below, clear at the end.
  for (const bar of ['stackBottom', 'tabBar'] as const) {
    expect(start[bar].material, `${bar} at start`).toBe(1);
    expect(end[bar].material, `${bar} at end`).toBe(0);
  }
  // A clear bar draws no scroll divider, even with content beneath it.
  expect(middle.paneHeader.shadow).not.toMatch(/rgb\((?!0, 0, 0)/);
  expect(middle.tabBar.border).toBe('rgba(0, 0, 0, 0)');
});

test('clear bars turn opaque under reduced transparency and paint Canvas in forced colors', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Only Chromium emulates these media.');
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
  await mountFixture(page);
  const reduced = await paintAt(page, 'start');
  for (const [name, paint] of Object.entries(reduced))
    expect(paint.background, name).not.toBe('rgba(0, 0, 0, 0)');

  await session.send('Emulation.setEmulatedMedia', { features: [] });
  await page.emulateMedia({ forcedColors: 'active' });
  const forced = await paintAt(page, 'middle');
  for (const [name, paint] of Object.entries(forced)) {
    expect(paint.background, name).not.toBe('rgba(0, 0, 0, 0)');
    expect(paint.materialContent, name).toBe('none');
  }
});

test('the static-effects switch keeps the scroll-edge fade from animating', async ({
  page,
}) => {
  await mountFixture(page);
  await page.evaluate(() =>
    document.documentElement.setAttribute('data-kui-effects', 'static'),
  );
  const transitions = await page.evaluate(() =>
    [
      '[data-region="pane"] .kui-pane__header',
      '[data-region="tabs"] .kui-tab-scaffold__bar',
    ].map(
      (selector) =>
        window.getComputedStyle(document.querySelector(selector)!, '::before')
          .transitionDuration,
    ),
  );
  expect(transitions).toEqual(['0s', '0s']);
});

test('an underChrome BackdropImage runs up beneath a clear header and keeps its visible height', async ({
  page,
}) => {
  await mountFixture(page);
  const geometry = await page.evaluate(() => {
    const region = document.querySelector('[data-region="under"]')!;
    const rect = (selector: string) =>
      region.querySelector(selector)!.getBoundingClientRect();
    return {
      pane: rect('.kui-pane'),
      header: rect('.kui-pane__header'),
      hero: rect('.kui-backdrop-image__hero'),
      overlay: rect('.kui-backdrop-image__overlay'),
      // At rest the parallax layer has not moved (its view timeline is
      // measured from the scroller's edge, not the chrome's clearance).
      layers: rect('.kui-backdrop-image__layers'),
    };
  });
  // The image starts at the pane's top edge, beneath the header…
  expect(geometry.hero.top).toBeCloseTo(geometry.pane.top, 0);
  // …and keeps its 200px below the header.
  expect(geometry.hero.bottom - geometry.header.bottom).toBeCloseTo(200, 0);
  // The overlay title stays clear of the header.
  expect(geometry.overlay.top).toBeGreaterThanOrEqual(geometry.header.bottom);
  expect(geometry.layers.top).toBeCloseTo(geometry.hero.top, 0);
});
