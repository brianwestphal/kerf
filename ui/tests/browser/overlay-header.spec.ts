import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

import { contrastRatio } from '../../evaluator/index.mjs';

// KF-DT6C3F overlay Pane header: `headerPresentation="overlay"` lays the
// header over the scrolling content on the translucent chrome material.
// `wireScrollDividers` measures the header and publishes its border-box height
// as `--kui-scroll-clearance-block-start`, which the content clears
// automatically: the first item rests below the header, content passes
// visibly beneath it mid-scroll, and the clearance follows the header's height.

const fixtureBundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/overlay-header.tsx')],
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
  await page.setViewportSize({ width: 800, height: 1000 });
  await page.setContent('<body style="margin:0"><div data-app></div></body>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript.text });
  await expect(page.locator('[data-region="wired"] .kui-pane')).toHaveAttribute(
    'data-header-overlay',
    'measured',
  );
}

/** Geometry of a region's pane: header, scroller, rows, and scroll state. */
async function geometry(
  page: Page,
  name: string,
  scroll?: 'start' | 'middle' | 'end',
) {
  return page
    .locator(`[data-region="${name}"] .kui-pane`)
    .evaluate((pane, position) => {
      const scroller = pane.querySelector<HTMLElement>('.kui-pane__content')!;
      const header = pane.querySelector<HTMLElement>('.kui-pane__header')!;
      const max = scroller.scrollHeight - scroller.clientHeight;
      if (position === 'start') scroller.scrollTop = 0;
      if (position === 'middle') scroller.scrollTop = max / 2;
      if (position === 'end') scroller.scrollTop = max;
      const rect = (node: Element) => node.getBoundingClientRect();
      const rows = [...scroller.children];
      const head = rect(header);
      return {
        header: { top: head.top, bottom: head.bottom, height: head.height },
        scroller: { top: rect(scroller).top, bottom: rect(scroller).bottom },
        first: rect(rows[0]!).top,
        last: rect(rows.at(-1)!).bottom,
        beneathHeader: rows.filter(
          (row) => rect(row).top < head.bottom && rect(row).bottom > head.top,
        ).length,
        clearance: parseFloat(
          (pane as HTMLElement).style.getPropertyValue(
            '--kui-scroll-clearance-block-start',
          ),
        ),
        scrollPaddingTop: parseFloat(
          globalThis.getComputedStyle(scroller).scrollPaddingTop,
        ),
      };
    }, scroll);
}

/** Let the observers report and the next frames lay out. */
const nextFrames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise((done) =>
        globalThis.requestAnimationFrame(() =>
          globalThis.requestAnimationFrame(done),
        ),
      ),
  );

test.beforeEach(async ({ page }) => {
  await mountFixture(page);
});

test('the first item rests below the overlay header, and content passes beneath it mid-scroll', async ({
  page,
}) => {
  const start = await geometry(page, 'wired', 'start');
  // The scroller reaches beneath the header: both start at the pane top.
  expect(Math.round(start.scroller.top)).toBe(Math.round(start.header.top));
  expect(start.clearance).toBeCloseTo(start.header.height, 1);
  expect(start.scrollPaddingTop).toBeCloseTo(start.header.height, 0);
  // At rest, the first item sits just below the header, not under it.
  expect(Math.round(start.first)).toBe(Math.round(start.header.bottom));
  expect(start.beneathHeader).toBe(0);

  const middle = await geometry(page, 'wired', 'middle');
  expect(middle.beneathHeader).toBeGreaterThan(0);

  const end = await geometry(page, 'wired', 'end');
  expect(end.last).toBeLessThanOrEqual(end.scroller.bottom + 0.5);
});

test('the header divider shows only while content is scrolled beneath it', async ({
  page,
}) => {
  const header = page.locator('[data-region="wired"] .kui-pane__header');
  await geometry(page, 'wired', 'start');
  await expect(header).not.toHaveAttribute('data-scroll-divider', /b/);
  await geometry(page, 'wired', 'middle');
  await expect(header).toHaveAttribute('data-scroll-divider', /b/);
  await expect
    .poll(() =>
      header.evaluate(
        (element) => globalThis.getComputedStyle(element).boxShadow,
      ),
    )
    .toContain('inset');
});

test('scrollIntoView rests the first item clear of the header', async ({
  page,
}) => {
  const scroller = page.locator('[data-region="wired"] .kui-pane__content');
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.firstElementChild!.scrollIntoView({ block: 'start' });
  });
  const revealed = await geometry(page, 'wired');
  expect(revealed.first).toBeGreaterThanOrEqual(revealed.header.bottom - 0.5);
});

test('the clearance follows the header as its title wraps and its text grows', async ({
  page,
}) => {
  const before = await geometry(page, 'wired', 'start');
  // A narrower pane wraps a long title onto more lines.
  await page.evaluate(() => {
    document.querySelector<HTMLElement>(
      '[data-region="wired"] .kui-toolbar-text',
    )!.textContent = 'Messages from every project you follow this week';
    document.querySelector<HTMLElement>('[data-region="wired"]')!.style.width =
      '200px';
  });
  await nextFrames(page);
  const wrapped = await geometry(page, 'wired', 'start');
  expect(wrapped.header.height).toBeGreaterThan(before.header.height);
  expect(wrapped.clearance).toBeCloseTo(wrapped.header.height, 1);
  expect(Math.round(wrapped.first)).toBe(Math.round(wrapped.header.bottom));

  // Larger text (a text-size setting scales the rem-based header).
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '24px';
  });
  await nextFrames(page);
  const zoomed = await geometry(page, 'wired', 'start');
  expect(zoomed.header.height).toBeGreaterThan(wrapped.header.height);
  expect(zoomed.clearance).toBeCloseTo(zoomed.header.height, 1);
  expect(Math.round(zoomed.first)).toBe(Math.round(zoomed.header.bottom));
});

test('an unwired overlay header stays docked above its content', async ({
  page,
}) => {
  const pane = page.locator('[data-region="unwired"] .kui-pane');
  await expect(pane).not.toHaveAttribute('data-header-overlay', /.*/);
  const docked = await geometry(page, 'unwired', 'middle');
  expect(Math.round(docked.scroller.top)).toBe(
    Math.round(docked.header.bottom),
  );
  // The scroller starts below the header, so nothing scrolls beneath it.
  expect(docked.scrollPaddingTop || 0).toBe(0);
});

test('a re-render that strips the measurement gets it back before paint', async ({
  page,
}) => {
  const pane = page.locator('[data-region="wired"] .kui-pane');
  const restored = await pane.evaluate(async (element) => {
    element.removeAttribute('style');
    element.removeAttribute('data-header-overlay');
    // Mutation observers run as microtasks, before the next paint.
    await Promise.resolve();
    return {
      gate: element.getAttribute('data-header-overlay'),
      clearance: (element as HTMLElement).style.getPropertyValue(
        '--kui-scroll-clearance-block-start',
      ),
    };
  });
  expect(restored.gate).toBe('measured');
  expect(restored.clearance).toMatch(/px$/);
});

/**
 * The header's material and a text element's contrast over a solid backdrop
 * (by default the wired region's title).
 */
async function material(
  page: Page,
  backdrop: string,
  region = 'wired',
  text = '.kui-toolbar-text',
) {
  const painted = await page
    .locator(`[data-region="${region}"] .kui-pane__header`)
    .evaluate(
      (header, [backdropColor, textSelector]) => {
        const context = document
          .createElement('canvas')
          .getContext('2d', { willReadFrequently: true })!;
        context.canvas.width = 1;
        context.canvas.height = 1;
        const paint = (color: string) => {
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
        };
        const pixel = () => [
          ...context.getImageData(0, 0, 1, 1).data.slice(0, 3),
        ];
        const style = globalThis.getComputedStyle(header);
        const title = header.querySelector(textSelector!)!;
        const filter =
          style.backdropFilter ||
          (style as unknown as { webkitBackdropFilter?: string })
            .webkitBackdropFilter ||
          'none';
        // The material's own opacity.
        context.clearRect(0, 0, 1, 1);
        paint(style.backgroundColor);
        const alpha = context.getImageData(0, 0, 1, 1).data[3]!;
        // Worst-case content passing beneath the header: a solid backdrop.
        context.clearRect(0, 0, 1, 1);
        paint(backdropColor);
        paint(style.backgroundColor);
        const background = pixel();
        paint(globalThis.getComputedStyle(title).color);
        return { background, foreground: pixel(), filter, alpha };
      },
      [backdrop, text],
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
  test(`${scheme}: the translucent material keeps the title at AA over worst-case content`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const result = await material(page, backdrop);
    // Translucent (80% opaque) and blurred.
    expect(result.alpha).toBeGreaterThan(195);
    expect(result.alpha).toBeLessThan(215);
    expect(result.filter).toContain('blur');
    expect(result.contrast).toBeGreaterThanOrEqual(4.5);
  });

// KF-XAEP3W: a default-size title and a ToolbarText description are quiet
// colors that fall below AA over the worst case. Inside an overlay header the
// title takes the normal text color and the description lifts halfway toward
// it, staying visibly quieter than the title.
for (const [scheme, backdrop] of [
  ['light', 'black'],
  ['dark', 'white'],
] as const)
  test(`${scheme}: a default-size title and its description stay at AA over worst-case content`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const title = await material(page, backdrop, 'described');
    const description = await material(
      page,
      backdrop,
      'described',
      '.kui-toolbar-text__description',
    );
    expect(title.contrast).toBeGreaterThanOrEqual(4.5);
    expect(description.contrast).toBeGreaterThanOrEqual(4.5);
    expect(description.contrast).toBeLessThan(title.contrast - 2);
  });

test('forced colors paints an opaque system surface with a visible edge', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'forced-colors emulation is Chromium-only',
  );
  await page.emulateMedia({ forcedColors: 'active' });
  const result = await material(page, 'black');
  expect(result.alpha).toBe(255);
  expect(result.filter).toBe('none');
  const edge = await page
    .locator('[data-region="wired"] .kui-pane__header')
    .evaluate(
      (header) => globalThis.getComputedStyle(header).borderBottomWidth,
    );
  expect(edge).toBe('1px');
});

test('reduced transparency and increased contrast resolve the material to the opaque surface', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'prefers-reduced-transparency emulation needs the Chromium DevTools protocol',
  );
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
  const reduced = await material(page, 'black');
  expect(reduced.alpha).toBe(255);
  expect(reduced.filter).toBe('none');
  // The content still clears the (now opaque) header.
  const start = await geometry(page, 'wired', 'start');
  expect(Math.round(start.first)).toBe(Math.round(start.header.bottom));

  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-contrast', value: 'more' }],
  });
  const contrast = await material(page, 'black');
  expect(contrast.alpha).toBe(255);
  expect(contrast.filter).toBe('none');
});
