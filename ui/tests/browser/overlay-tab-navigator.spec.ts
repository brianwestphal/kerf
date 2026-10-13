import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

import { contrastRatio } from '../../evaluator/index.mjs';

// KF-C3V8B7 overlay TabNavigator bar: `barPresentation="overlay"` lays the tab
// bar over the active scene on the translucent chrome material.
// `wireTabNavigator` measures the live bar and the scenes hand its
// border-box height (bottom safe area included) to their content as the
// block-end edge context, so a plain scene, a sole Pane, and a NavStack (whose
// own overlay bottom toolbar sits just above the bar) rest their last item
// above the bar while content passes visibly beneath it mid-scroll.

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/overlay-tab-navigator.tsx'),
  ],
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
  'list',
  'pane',
  'nav-stack',
  'tab-navigator',
  'toolbar',
  'toolbar-text',
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
  await page.setViewportSize({ width: 800, height: 2400 });
  await page.setContent('<body style="margin:0"><div data-app></div></body>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript.text });
  for (const name of ['plain', 'pane', 'stack', 'safe'])
    await expect(
      page.locator(`[data-region="${name}"] .kui-tab-scaffold`),
    ).toHaveAttribute('data-bar-overlay', 'measured');
}

test.beforeEach(async ({ page }) => {
  await mountFixture(page);
});

/** The bar, the active scene's scroller and rows, scrolled to `position`. */
async function geometry(
  page: Page,
  name: string,
  position?: 'start' | 'middle' | 'end',
) {
  return page
    .locator(`[data-region="${name}"] .kui-tab-scaffold`)
    .evaluate((scaffold, scroll) => {
      const bar = scaffold.querySelector<HTMLElement>(
        ':scope > .kui-tab-scaffold__bar',
      )!;
      const scene = scaffold.querySelector<HTMLElement>(
        '.kui-tab-scaffold__scene[data-active="true"]',
      )!;
      const scroller =
        scene.querySelector<HTMLElement>(
          ':scope > .kui-pane > .kui-pane__content',
        ) ??
        scene.querySelector<HTMLElement>(
          '.kui-nav-stack__view[data-nav-active="true"]',
        ) ??
        scene;
      const max = scroller.scrollHeight - scroller.clientHeight;
      if (scroll === 'start') scroller.scrollTop = 0;
      if (scroll === 'middle') scroller.scrollTop = max / 2;
      if (scroll === 'end') scroller.scrollTop = max;
      const rect = (node: Element) => node.getBoundingClientRect();
      const rows = [...scroller.querySelectorAll('.kui-content-item')];
      const barBox = rect(bar);
      const bottom = scaffold.querySelector(
        '[data-nav-stack-bottom]:not([data-nav-chrome-copy])',
      );
      // The toolbar's content; the toolbar pads for the bar as for a bottom
      // safe area, so its material runs on beneath the bar.
      const toolbar = bottom?.querySelector('.kui-toolbar-text');
      return {
        scaffoldBottom: rect(scaffold).bottom,
        bar: { top: barBox.top, bottom: barBox.bottom, height: barBox.height },
        barPaddingBottom: parseFloat(
          globalThis.getComputedStyle(bar).paddingBottom,
        ),
        position: globalThis.getComputedStyle(bar).position,
        scrollerBottom: rect(scroller).bottom,
        last: rect(rows.at(-1)!).bottom,
        beneathBar: rows.filter(
          (row) =>
            rect(row).top < barBox.bottom && rect(row).bottom > barBox.top,
        ).length,
        published: parseFloat(
          (scaffold as HTMLElement).style.getPropertyValue(
            '--_kui-tab-scaffold-bar-block-size',
          ),
        ),
        toolbar:
          toolbar && bottom
            ? { top: rect(bottom).top, bottom: rect(toolbar).bottom }
            : undefined,
      };
    }, position);
}

for (const name of ['plain', 'pane', 'stack'])
  test(`${name} scene: content passes beneath the bar mid-scroll and the last item rests above it`, async ({
    page,
  }) => {
    const middle = await geometry(page, name, 'middle');
    expect(middle.position).toBe('absolute');
    expect(middle.bar.bottom).toBeCloseTo(middle.scaffoldBottom, 0);
    expect(middle.published).toBeCloseTo(middle.bar.height, 0);
    // The scroller runs to the scaffold's bottom edge, under the bar...
    if (name !== 'stack')
      expect(middle.scrollerBottom).toBeCloseTo(middle.scaffoldBottom, 0);
    // ...and rows pass visibly beneath it mid-scroll.
    expect(middle.beneathBar).toBeGreaterThan(0);
    const end = await geometry(page, name, 'end');
    if (end.toolbar) {
      // A NavStack's overlay bottom toolbar's controls sit just above the
      // bar, and its last row rests above the toolbar.
      expect(end.toolbar.bottom).toBeLessThanOrEqual(end.bar.top + 0.5);
      expect(end.last).toBeLessThanOrEqual(end.toolbar.top + 0.5);
    } else expect(end.last).toBeLessThanOrEqual(end.bar.top + 0.5);
  });

test('the bar pads for the bottom safe area and publishes it in its height', async ({
  page,
}) => {
  const [safe, plain] = await Promise.all([
    geometry(page, 'safe', 'end'),
    geometry(page, 'plain', 'end'),
  ]);
  expect(safe.barPaddingBottom - plain.barPaddingBottom).toBeCloseTo(24, 0);
  expect(safe.published - plain.published).toBeCloseTo(24, 0);
  expect(safe.last).toBeLessThanOrEqual(safe.bar.top + 0.5);
});

test('an unwired overlay bar stays docked below its scenes', async ({
  page,
}) => {
  const scaffold = page.locator('[data-region="unwired"] .kui-tab-scaffold');
  await expect(scaffold).not.toHaveAttribute('data-bar-overlay');
  const docked = await scaffold.evaluate((element) => {
    const bar = element.querySelector(':scope > .kui-tab-scaffold__bar')!;
    const scenes = element.querySelector(':scope > .kui-tab-scaffold__scenes')!;
    return {
      position: globalThis.getComputedStyle(bar).position,
      barTop: bar.getBoundingClientRect().top,
      scenesBottom: scenes.getBoundingClientRect().bottom,
    };
  });
  expect(docked.position).toBe('static');
  expect(docked.barTop).toBeCloseTo(docked.scenesBottom, 0);
});

test('a re-render that strips the measurement gets it back', async ({
  page,
}) => {
  const scaffold = page.locator('[data-region="plain"] .kui-tab-scaffold');
  await scaffold.evaluate((element) => {
    element.removeAttribute('data-bar-overlay');
    element.removeAttribute('style');
  });
  await expect(scaffold).toHaveAttribute('data-bar-overlay', 'measured');
  const restored = await geometry(page, 'plain', 'end');
  expect(restored.published).toBeCloseTo(restored.bar.height, 0);
});

/** A tab label's contrast over the material composited over a backdrop. */
async function labelContrast(page: Page, backdrop: string, selected: boolean) {
  const painted = await page
    .locator('[data-region="plain"] .kui-tab-scaffold__bar')
    .evaluate(
      (bar, [color, pick]) => {
        const context = document
          .createElement('canvas')
          .getContext('2d', { willReadFrequently: true })!;
        context.canvas.width = 1;
        context.canvas.height = 1;
        const paint = (fill: string) => {
          context.fillStyle = fill;
          context.fillRect(0, 0, 1, 1);
        };
        const pixel = () => [
          ...context.getImageData(0, 0, 1, 1).data.slice(0, 3),
        ];
        const style = globalThis.getComputedStyle(bar);
        context.clearRect(0, 0, 1, 1);
        paint(style.backgroundColor);
        const alpha = context.getImageData(0, 0, 1, 1).data[3]!;
        context.clearRect(0, 0, 1, 1);
        paint(color!);
        paint(style.backgroundColor);
        const background = pixel();
        const tab = bar.querySelector(
          `.kui-tab-scaffold__tab[aria-selected="${pick}"]`,
        )!;
        paint(globalThis.getComputedStyle(tab).color);
        const filter =
          style.backdropFilter ||
          (style as unknown as { webkitBackdropFilter?: string })
            .webkitBackdropFilter ||
          'none';
        return { background, foreground: pixel(), alpha, filter };
      },
      [backdrop, String(selected)] as const,
    );
  return {
    ...painted,
    contrast: contrastRatio(painted.foreground, painted.background)!,
  };
}

for (const [scheme, backdrop] of [
  ['light', 'black'],
  ['dark', 'white'],
] as const)
  test(`${scheme}: the translucent bar keeps its tab labels at AA over worst-case content`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const unselected = await labelContrast(page, backdrop, false);
    expect(unselected.alpha).toBeGreaterThan(195);
    expect(unselected.alpha).toBeLessThan(215);
    expect(unselected.filter).toContain('blur');
    expect(unselected.contrast).toBeGreaterThanOrEqual(4.5);
    const selected = await labelContrast(page, backdrop, true);
    expect(selected.contrast).toBeGreaterThanOrEqual(4.5);
  });

test('forced colors paints an opaque system bar with a visible edge', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'forced-colors emulation is Chromium-only',
  );
  await page.emulateMedia({ forcedColors: 'active' });
  const result = await labelContrast(page, 'black', false);
  expect(result.alpha).toBe(255);
  expect(result.filter).toBe('none');
  const edge = await page
    .locator('[data-region="plain"] .kui-tab-scaffold__bar')
    .evaluate((bar) => globalThis.getComputedStyle(bar).borderTopWidth);
  expect(edge).toBe('1px');
});

test('reduced transparency and increased contrast resolve the bar to the opaque surface', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'prefers-reduced-transparency emulation needs the Chromium DevTools protocol',
  );
  const session = await page.context().newCDPSession(page);
  for (const feature of [
    { name: 'prefers-reduced-transparency', value: 'reduce' },
    { name: 'prefers-contrast', value: 'more' },
  ]) {
    await session.send('Emulation.setEmulatedMedia', { features: [feature] });
    const result = await labelContrast(page, 'black', false);
    expect(result.alpha).toBe(255);
    expect(result.filter).toBe('none');
  }
});
