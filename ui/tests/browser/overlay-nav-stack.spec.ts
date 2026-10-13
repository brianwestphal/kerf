import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

import { contrastRatio } from '../../evaluator/index.mjs';

// KF-1N0S19 overlay NavStack chrome: `chromePresentation="overlay"` lays the
// top chrome over the active view on the translucent chrome material.
// `wireNavStack` measures the live chrome and hands its border-box height (top
// safe area included) to the views as the block-start edge context, so a plain
// view and a sole Pane both rest their first item below the chrome while
// content passes visibly beneath it mid-scroll, before and after a push.

const fixtureBundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/overlay-nav-stack.tsx')],
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
  'toolbar',
  'toolbar-control-group',
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
  await page.setViewportSize({ width: 800, height: 1300 });
  await page.setContent('<body style="margin:0"><div data-app></div></body>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript.text });
  await expect(
    page.locator('[data-region="wired"] .kui-nav-stack'),
  ).toHaveAttribute('data-chrome-overlay', 'measured');
}

/** Geometry of a region's chrome and its active view's scroller and rows. */
async function geometry(
  page: Page,
  name: string,
  scroll?: 'start' | 'middle' | 'end',
) {
  return page
    .locator(`[data-region="${name}"] .kui-nav-stack`)
    .evaluate((stack, position) => {
      const chrome = stack.querySelector<HTMLElement>(
        ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy])',
      )!;
      const view = [
        ...stack.querySelectorAll<HTMLElement>(
          '.kui-nav-stack__view[data-nav-active="true"]',
        ),
      ].at(-1)!;
      const scroller =
        view.querySelector<HTMLElement>(
          ':scope > .kui-pane > .kui-pane__content',
        ) ?? view;
      const max = scroller.scrollHeight - scroller.clientHeight;
      if (position === 'start') scroller.scrollTop = 0;
      if (position === 'middle') scroller.scrollTop = max / 2;
      if (position === 'end') scroller.scrollTop = max;
      const rect = (node: Element) => node.getBoundingClientRect();
      const rows = [...scroller.querySelectorAll('.kui-content-item')];
      const head = rect(chrome);
      const toolbar = chrome.querySelector('[data-component="toolbar"]')!;
      return {
        stackTop: rect(stack).top,
        chrome: { top: head.top, bottom: head.bottom, height: head.height },
        toolbarPaddingTop: parseFloat(
          globalThis.getComputedStyle(toolbar).paddingTop,
        ),
        scroller: { top: rect(scroller).top, bottom: rect(scroller).bottom },
        first: rect(rows[0]!).top,
        last: rect(rows.at(-1)!).bottom,
        beneathChrome: rows.filter(
          (row) => rect(row).top < head.bottom && rect(row).bottom > head.top,
        ).length,
        published: parseFloat(
          (stack as HTMLElement).style.getPropertyValue(
            '--_kui-nav-stack-chrome-block-size',
          ),
        ),
        scrollPaddingTop: parseFloat(
          globalThis.getComputedStyle(scroller).scrollPaddingTop,
        ),
      };
    }, scroll);
}

/** Let the transition finish and the observers report. */
const settle = (page: Page) => page.waitForTimeout(350);

test.beforeEach(async ({ page }) => {
  await mountFixture(page);
});

test('a plain view rests its first item below the overlay chrome, and content passes beneath it mid-scroll', async ({
  page,
}) => {
  const start = await geometry(page, 'wired', 'start');
  // The view reaches beneath the chrome: both start at the stack top.
  expect(Math.round(start.scroller.top)).toBe(Math.round(start.chrome.top));
  expect(start.published).toBeCloseTo(start.chrome.height, 1);
  expect(start.scrollPaddingTop).toBeCloseTo(start.chrome.height, 0);
  expect(Math.round(start.first)).toBe(Math.round(start.chrome.bottom));
  expect(start.beneathChrome).toBe(0);

  const middle = await geometry(page, 'wired', 'middle');
  expect(middle.beneathChrome).toBeGreaterThan(0);

  const end = await geometry(page, 'wired', 'end');
  expect(end.last).toBeLessThanOrEqual(end.scroller.bottom + 0.5);
});

test('a pushed sole Pane clears the chrome too, and a pop restores the root', async ({
  page,
}) => {
  await page.evaluate(() => (globalThis as unknown as { push(): void }).push());
  await settle(page);
  const pushed = await geometry(page, 'wired', 'start');
  // The Pane's content scrolls from the stack top, beneath the chrome.
  expect(Math.round(pushed.scroller.top)).toBe(Math.round(pushed.chrome.top));
  expect(Math.round(pushed.first)).toBe(Math.round(pushed.chrome.bottom));
  expect(pushed.beneathChrome).toBe(0);
  const middle = await geometry(page, 'wired', 'middle');
  expect(middle.beneathChrome).toBeGreaterThan(0);
  // Only the live chrome is measured: the cross-fade copies are gone.
  await expect(
    page.locator('[data-region="wired"] [data-nav-chrome-copy]'),
  ).toHaveCount(0);
  expect(pushed.published).toBeCloseTo(pushed.chrome.height, 1);

  await page.evaluate(() => (globalThis as unknown as { pop(): void }).pop());
  await settle(page);
  const popped = await geometry(page, 'wired', 'start');
  expect(popped.published).toBeCloseTo(popped.chrome.height, 1);
  expect(Math.round(popped.first)).toBe(Math.round(popped.chrome.bottom));
});

test('mid-push, the incoming view already clears the live chrome', async ({
  page,
}) => {
  const midPush = await page.evaluate(async () => {
    (globalThis as unknown as { push(): void }).push();
    await new Promise((done) => globalThis.setTimeout(done, 100));
    const stack = document.querySelector<HTMLElement>(
      '[data-region="wired"] .kui-nav-stack',
    )!;
    const chrome = stack.querySelector<HTMLElement>(
      ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy])',
    )!;
    const incoming = stack.querySelector<HTMLElement>(
      '.kui-nav-stack__view[data-nav-key="detail"] .kui-content-item',
    )!;
    return {
      copies: stack.querySelectorAll('[data-nav-chrome-copy]').length,
      chromeBottom: chrome.getBoundingClientRect().bottom,
      incomingTop: incoming.getBoundingClientRect().top,
    };
  });
  expect(midPush.copies).toBeGreaterThan(0);
  expect(Math.round(midPush.incomingTop)).toBe(
    Math.round(midPush.chromeBottom),
  );
});

test('the chrome keeps the top safe area, and the views clear it exactly once', async ({
  page,
}) => {
  const safe = await geometry(page, 'safe', 'start');
  const plain = await geometry(page, 'wired', 'start');
  // The chrome's toolbar pads for the safe area, painting through it.
  expect(safe.toolbarPaddingTop - plain.toolbarPaddingTop).toBe(24);
  expect(Math.round(safe.chrome.top)).toBe(Math.round(safe.stackTop));
  expect(safe.chrome.height - plain.chrome.height).toBeCloseTo(24, 0);
  // The measured chrome includes the safe area; the view does not add it again.
  expect(safe.published).toBeCloseTo(safe.chrome.height, 1);
  expect(Math.round(safe.first)).toBe(Math.round(safe.chrome.bottom));
});

test('scrollIntoView rests an item clear of the chrome', async ({ page }) => {
  await page
    .locator('[data-region="wired"] .kui-nav-stack__view')
    .first()
    .evaluate((view) => {
      view.scrollTop = view.scrollHeight;
      view.querySelector('.kui-content-item')!.scrollIntoView({
        block: 'start',
      });
    });
  const revealed = await geometry(page, 'wired');
  expect(revealed.first).toBeGreaterThanOrEqual(revealed.chrome.bottom - 0.5);
});

test('the divider under the chrome shows only while content is scrolled beneath it', async ({
  page,
}) => {
  const chrome = page.locator(
    '[data-region="wired"] [data-nav-stack-chrome]:not([data-nav-chrome-copy])',
  );
  await geometry(page, 'wired', 'start');
  await expect(chrome).not.toHaveAttribute('data-scroll-divider', /b/);
  await geometry(page, 'wired', 'middle');
  await expect(chrome).toHaveAttribute('data-scroll-divider', /b/);
});

test('an unwired overlay stack keeps its chrome docked above the view', async ({
  page,
}) => {
  await expect(
    page.locator('[data-region="unwired"] .kui-nav-stack'),
  ).not.toHaveAttribute('data-chrome-overlay', /.*/);
  const docked = await geometry(page, 'unwired', 'middle');
  // The view starts below the chrome, so nothing scrolls beneath it.
  expect(Math.round(docked.scroller.top)).toBe(
    Math.round(docked.chrome.bottom),
  );
  expect(docked.scrollPaddingTop || 0).toBe(0);
});

test('a re-render that strips the measurement gets it back before paint', async ({
  page,
}) => {
  const restored = await page
    .locator('[data-region="wired"] .kui-nav-stack')
    .evaluate(async (element) => {
      element.removeAttribute('style');
      element.removeAttribute('data-chrome-overlay');
      await Promise.resolve();
      return {
        gate: element.getAttribute('data-chrome-overlay'),
        size: (element as HTMLElement).style.getPropertyValue(
          '--_kui-nav-stack-chrome-block-size',
        ),
      };
    });
  expect(restored.gate).toBe('measured');
  expect(restored.size).toMatch(/px$/);
});

/** The chrome's material and the title's contrast over a solid backdrop. */
async function material(
  page: Page,
  backdrop: string,
  text = '.kui-toolbar-text',
) {
  const painted = await page
    .locator(
      '[data-region="wired"] [data-nav-stack-chrome]:not([data-nav-chrome-copy])',
    )
    .evaluate(
      (chrome, [backdropColor, textSelector]) => {
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
        const style = globalThis.getComputedStyle(chrome);
        const title = chrome.querySelector(textSelector!)!;
        const filter =
          style.backdropFilter ||
          (style as unknown as { webkitBackdropFilter?: string })
            .webkitBackdropFilter ||
          'none';
        context.clearRect(0, 0, 1, 1);
        paint(style.backgroundColor);
        const alpha = context.getImageData(0, 0, 1, 1).data[3]!;
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
  test(`${scheme}: the translucent chrome keeps the title at AA over worst-case content`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const result = await material(page, backdrop);
    expect(result.alpha).toBeGreaterThan(195);
    expect(result.alpha).toBeLessThan(215);
    expect(result.filter).toContain('blur');
    expect(result.contrast).toBeGreaterThanOrEqual(4.5);
  });

// A default-size title and a ToolbarText description are quiet colors that
// fall below AA over the worst case. In overlay chrome the title takes the
// normal text color and the description lifts halfway toward it, staying
// visibly quieter than the title.
for (const [scheme, backdrop] of [
  ['light', 'black'],
  ['dark', 'white'],
] as const)
  test(`${scheme}: a default-size chrome title and its description stay at AA over worst-case content`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const status = '.kui-toolbar__trailing .kui-toolbar-text';
    const title = await material(page, backdrop, status);
    const description = await material(
      page,
      backdrop,
      `${status} .kui-toolbar-text__description`,
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
  // The edge adds to the measured chrome, and the view still clears it.
  await settle(page);
  const start = await geometry(page, 'wired', 'start');
  expect(start.published).toBeCloseTo(start.chrome.height, 1);
  expect(Math.round(start.first)).toBe(Math.round(start.chrome.bottom));
});

test('reduced transparency resolves the material to the opaque surface', async ({
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
  const start = await geometry(page, 'wired', 'start');
  expect(Math.round(start.first)).toBe(Math.round(start.chrome.bottom));
});
