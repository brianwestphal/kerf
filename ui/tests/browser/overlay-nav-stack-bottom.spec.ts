import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

import { contrastRatio } from '../../evaluator/index.mjs';

// KF-Z4NSDF overlay NavStack bottom toolbar: `bottomToolbarPresentation=
// "overlay"` lays the bottom toolbar over the active view on the translucent
// chrome material. `wireNavStack` measures the live toolbar and hands its
// border-box height (bottom safe area included) to the views as the
// block-end edge context, so a plain view, a sole Pane, and a Pane footer all
// rest their last item above the toolbar while content passes visibly
// beneath it mid-scroll, before and after a push, and inside a TabNavigator
// scene above the tab bar.

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/overlay-nav-stack-bottom.tsx'),
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
  await page.setViewportSize({ width: 800, height: 2200 });
  await page.setContent('<body style="margin:0"><div data-app></div></body>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript.text });
  await expect(
    page.locator('[data-region="wired"] .kui-nav-stack'),
  ).toHaveAttribute('data-bottom-toolbar-overlay', 'measured');
}

/** Geometry of a region's bottom toolbar and its active view's scroller and rows. */
async function geometry(
  page: Page,
  name: string,
  scroll?: 'start' | 'middle' | 'end',
) {
  return page
    .locator(`[data-region="${name}"] .kui-nav-stack`)
    .evaluate((stack, position) => {
      const bottom = stack.querySelector<HTMLElement>(
        ':scope > [data-nav-stack-bottom]:not([data-nav-chrome-copy])',
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
      const foot = rect(bottom);
      const toolbar = bottom.querySelector('[data-component="toolbar"]')!;
      const paneFooter = view.querySelector(
        ':scope > .kui-pane > .kui-pane__footer',
      );
      return {
        stackBottom: rect(stack).bottom,
        bottom: { top: foot.top, bottom: foot.bottom, height: foot.height },
        toolbarPaddingBottom: parseFloat(
          globalThis.getComputedStyle(toolbar).paddingBottom,
        ),
        scroller: { top: rect(scroller).top, bottom: rect(scroller).bottom },
        last: rect(rows.at(-1)!).bottom,
        paneFooter: paneFooter
          ? { top: rect(paneFooter).top, bottom: rect(paneFooter).bottom }
          : undefined,
        beneathToolbar: rows.filter(
          (row) => rect(row).top < foot.bottom && rect(row).bottom > foot.top,
        ).length,
        published: parseFloat(
          (stack as HTMLElement).style.getPropertyValue(
            '--_kui-nav-stack-bottom-block-size',
          ),
        ),
        scrollPaddingBottom: parseFloat(
          globalThis.getComputedStyle(scroller).scrollPaddingBottom,
        ),
      };
    }, scroll);
}

/** Let the transition finish and the observers report. */
const settle = (page: Page) => page.waitForTimeout(350);

test.beforeEach(async ({ page }) => {
  await mountFixture(page);
});

test('a plain view rests its last item above the overlay toolbar, and content passes beneath it mid-scroll', async ({
  page,
}) => {
  const end = await geometry(page, 'wired', 'end');
  // The view reaches beneath the toolbar: both end at the stack bottom.
  expect(Math.round(end.scroller.bottom)).toBe(Math.round(end.bottom.bottom));
  expect(Math.round(end.bottom.bottom)).toBe(Math.round(end.stackBottom));
  expect(end.published).toBeCloseTo(end.bottom.height, 1);
  expect(end.scrollPaddingBottom).toBeCloseTo(end.bottom.height, 0);
  expect(end.last).toBeLessThanOrEqual(end.bottom.top + 0.5);
  expect(end.last).toBeGreaterThan(end.bottom.top - 2);

  const middle = await geometry(page, 'wired', 'middle');
  expect(middle.beneathToolbar).toBeGreaterThan(0);
});

test('a pushed sole Pane clears the toolbar too, and a pop restores the root', async ({
  page,
}) => {
  await page.evaluate(() => (globalThis as unknown as { push(): void }).push());
  await settle(page);
  const pushed = await geometry(page, 'wired', 'end');
  // The Pane's content scrolls to the stack bottom, beneath the toolbar.
  expect(Math.round(pushed.scroller.bottom)).toBe(
    Math.round(pushed.bottom.bottom),
  );
  expect(pushed.last).toBeLessThanOrEqual(pushed.bottom.top + 0.5);
  expect(pushed.last).toBeGreaterThan(pushed.bottom.top - 2);
  const middle = await geometry(page, 'wired', 'middle');
  expect(middle.beneathToolbar).toBeGreaterThan(0);
  // Only the live toolbar is measured: the cross-fade copies are gone.
  await expect(
    page.locator('[data-region="wired"] [data-nav-chrome-copy]'),
  ).toHaveCount(0);
  expect(pushed.published).toBeCloseTo(pushed.bottom.height, 1);

  await page.evaluate(() => (globalThis as unknown as { pop(): void }).pop());
  await settle(page);
  const popped = await geometry(page, 'wired', 'end');
  expect(popped.published).toBeCloseTo(popped.bottom.height, 1);
  expect(popped.last).toBeLessThanOrEqual(popped.bottom.top + 0.5);
});

test('a Pane footer rests above the toolbar and its content ends above the footer', async ({
  page,
}) => {
  const end = await geometry(page, 'footer', 'end');
  expect(end.paneFooter).toBeDefined();
  // The footer pads for the toolbar, so its own content sits just above it.
  expect(Math.round(end.paneFooter!.bottom)).toBe(
    Math.round(end.bottom.bottom),
  );
  expect(end.last).toBeLessThanOrEqual(end.paneFooter!.top + 0.5);
  const footerToolbar = await page
    .locator('[data-region="footer"] .kui-pane__footer')
    .evaluate((footer) =>
      parseFloat(globalThis.getComputedStyle(footer).paddingBottom),
    );
  expect(footerToolbar).toBeCloseTo(end.bottom.height, 0);
});

test('the toolbar keeps the bottom safe area, and the views clear it exactly once', async ({
  page,
}) => {
  const safe = await geometry(page, 'safe', 'end');
  const plain = await geometry(page, 'wired', 'end');
  expect(safe.toolbarPaddingBottom - plain.toolbarPaddingBottom).toBe(24);
  expect(Math.round(safe.bottom.bottom)).toBe(Math.round(safe.stackBottom));
  expect(safe.bottom.height - plain.bottom.height).toBeCloseTo(24, 0);
  expect(safe.published).toBeCloseTo(safe.bottom.height, 1);
  expect(safe.last).toBeLessThanOrEqual(safe.bottom.top + 0.5);
  expect(safe.last).toBeGreaterThan(safe.bottom.top - 2);
});

test('inside a TabNavigator scene the toolbar sits above the tab bar and counts no safe area', async ({
  page,
}) => {
  const tabs = await geometry(page, 'tabs', 'end');
  const bar = await page
    .locator('[data-region="tabs"] .kui-tab-scaffold__bar')
    .evaluate((element) => element.getBoundingClientRect().top);
  // The tab bar owns the bottom safe area; the stack ends on top of it.
  expect(Math.round(tabs.bottom.bottom)).toBe(Math.round(bar));
  const plain = await geometry(page, 'wired', 'end');
  expect(tabs.bottom.height).toBeCloseTo(plain.bottom.height, 0);
  expect(tabs.published).toBeCloseTo(tabs.bottom.height, 1);
  expect(tabs.last).toBeLessThanOrEqual(tabs.bottom.top + 0.5);
  const middle = await geometry(page, 'tabs', 'middle');
  expect(middle.beneathToolbar).toBeGreaterThan(0);
});

test('scrollIntoView rests an item clear of the toolbar', async ({ page }) => {
  await page
    .locator('[data-region="wired"] .kui-nav-stack__view')
    .first()
    .evaluate((view) => {
      view.scrollTop = 0;
      view
        .querySelectorAll('.kui-content-item')[20]!
        .scrollIntoView({ block: 'end' });
    });
  const revealed = await page
    .locator('[data-region="wired"] .kui-nav-stack')
    .evaluate((stack) => ({
      item: stack
        .querySelectorAll('.kui-content-item')[20]!
        .getBoundingClientRect().bottom,
      toolbar: stack
        .querySelector(':scope > [data-nav-stack-bottom]')!
        .getBoundingClientRect().top,
    }));
  expect(revealed.item).toBeLessThanOrEqual(revealed.toolbar + 0.5);
});

test('the divider over the toolbar shows only while more content lies below', async ({
  page,
}) => {
  const bottom = page.locator(
    '[data-region="wired"] [data-nav-stack-bottom]:not([data-nav-chrome-copy])',
  );
  await geometry(page, 'wired', 'start');
  await expect(bottom).toHaveAttribute('data-scroll-divider', /t/);
  await geometry(page, 'wired', 'end');
  await expect(bottom).not.toHaveAttribute('data-scroll-divider', /t/);
});

test('an unwired overlay stack keeps its toolbar docked below the view', async ({
  page,
}) => {
  await expect(
    page.locator('[data-region="unwired"] .kui-nav-stack'),
  ).not.toHaveAttribute('data-bottom-toolbar-overlay', /.*/);
  const docked = await geometry(page, 'unwired', 'middle');
  // The view ends above the toolbar, so nothing scrolls beneath it.
  expect(Math.round(docked.scroller.bottom)).toBe(
    Math.round(docked.bottom.top),
  );
  expect(docked.scrollPaddingBottom || 0).toBe(0);
});

test('a re-render that strips the measurement gets it back before paint', async ({
  page,
}) => {
  const restored = await page
    .locator('[data-region="wired"] .kui-nav-stack')
    .evaluate(async (element) => {
      element.removeAttribute('style');
      element.removeAttribute('data-bottom-toolbar-overlay');
      await Promise.resolve();
      return {
        gate: element.getAttribute('data-bottom-toolbar-overlay'),
        size: (element as HTMLElement).style.getPropertyValue(
          '--_kui-nav-stack-bottom-block-size',
        ),
      };
    });
  expect(restored.gate).toBe('measured');
  expect(restored.size).toMatch(/px$/);
});

/** The toolbar's material and a text's contrast over a solid backdrop. */
async function material(
  page: Page,
  backdrop: string,
  text: string,
  edge = '[data-nav-stack-bottom]',
) {
  const painted = await page
    .locator(`[data-region="wired"] ${edge}:not([data-nav-chrome-copy])`)
    .evaluate(
      (bottom, [backdropColor, textSelector]) => {
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
        const style = globalThis.getComputedStyle(bottom);
        const target = bottom.querySelector(textSelector!)!;
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
        // Any fill between the material and the text (a control group's own
        // background) composites over the material, as it paints.
        const fills: string[] = [];
        for (
          let node: Element | null = target;
          node && node !== bottom;
          node = node.parentElement
        )
          fills.unshift(globalThis.getComputedStyle(node).backgroundColor);
        fills.forEach(paint);
        const background = pixel();
        paint(globalThis.getComputedStyle(target).color);
        return {
          background,
          foreground: pixel(),
          filter,
          alpha,
          edge: style.borderTopColor,
        };
      },
      [backdrop, text],
    );
  return {
    ...painted,
    contrast: contrastRatio(painted.foreground, painted.background)!,
  };
}

const STATUS = '.kui-toolbar__center .kui-toolbar-text';

for (const [scheme, backdrop] of [
  ['light', 'black'],
  ['dark', 'white'],
] as const)
  test(`${scheme}: the translucent toolbar keeps its status, description, and control at AA over worst-case content`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const title = await material(page, backdrop, STATUS);
    expect(title.alpha).toBeGreaterThan(195);
    expect(title.alpha).toBeLessThan(215);
    expect(title.filter).toContain('blur');
    expect(title.contrast).toBeGreaterThanOrEqual(4.5);
    const description = await material(
      page,
      backdrop,
      `${STATUS} .kui-toolbar-text__description`,
    );
    expect(description.contrast).toBeGreaterThanOrEqual(4.5);
    expect(description.contrast).toBeLessThan(title.contrast - 2);
    const control = await material(page, backdrop, '[data-compose]');
    expect(control.contrast).toBeGreaterThanOrEqual(4.5);
  });

// The same lift reaches the overlay top chrome's controls: a pushed view's
// back control.
for (const [scheme, backdrop] of [
  ['light', 'black'],
  ['dark', 'white'],
] as const)
  test(`${scheme}: an overlay top chrome's back control stays at AA over worst-case content`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.evaluate(() =>
      (globalThis as unknown as { push(): void }).push(),
    );
    await settle(page);
    const back = await material(
      page,
      backdrop,
      '[data-nav-back]',
      '[data-nav-stack-chrome]',
    );
    expect(back.contrast).toBeGreaterThanOrEqual(4.5);
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
  const result = await material(page, 'black', STATUS);
  expect(result.alpha).toBe(255);
  expect(result.filter).toBe('none');
  await settle(page);
  const end = await geometry(page, 'wired', 'end');
  expect(end.published).toBeCloseTo(end.bottom.height, 1);
  expect(end.last).toBeLessThanOrEqual(end.bottom.top + 0.5);
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
  const reduced = await material(page, 'black', STATUS);
  expect(reduced.alpha).toBe(255);
  expect(reduced.filter).toBe('none');
  const end = await geometry(page, 'wired', 'end');
  expect(end.last).toBeLessThanOrEqual(end.bottom.top + 0.5);
});

test('increased contrast resolves the material to the opaque surface', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'firefox',
    'Playwright does not emulate prefers-contrast in Firefox',
  );
  await page.emulateMedia({ contrast: 'more' });
  const result = await material(page, 'black', STATUS);
  expect(result.alpha).toBe(255);
});

/**
 * Run `step` under a paused page clock and a long transition, so a busy
 * browser cannot settle it between commands; release its first frame, then
 * freeze every running transition halfway and read both overlay bars.
 */
async function midTransitionBars(page: Page, step: 'push' | 'pop') {
  await page.addStyleTag({
    content:
      '[data-region="wired"] .kui-nav-stack { --kui-nav-stack-transition-duration: 5000ms !important; }',
  });
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
  await page.evaluate(
    (name) => (globalThis as unknown as Record<string, () => void>)[name]!(),
    step,
  );
  await page.clock.runFor(100);
  return page
    .locator('[data-region="wired"] .kui-nav-stack')
    .evaluate((stack) => {
      for (const animation of stack.getAnimations({ subtree: true })) {
        animation.pause();
        animation.currentTime =
          Number(animation.effect?.getTiming().duration ?? 0) / 2;
      }
      const read = (bar: HTMLElement) => {
        const style = globalThis.getComputedStyle(bar);
        const toolbar = bar.querySelector('[data-component="toolbar"]')!;
        return {
          opacity: parseFloat(style.opacity),
          filter:
            style.backdropFilter ||
            (style as unknown as { webkitBackdropFilter?: string })
              .webkitBackdropFilter ||
            'none',
          background: style.backgroundColor,
          contents: parseFloat(globalThis.getComputedStyle(toolbar).opacity),
        };
      };
      const bars = (copy: boolean) =>
        [
          ...stack.querySelectorAll<HTMLElement>(
            ':scope > :is([data-nav-stack-chrome], [data-nav-stack-bottom])',
          ),
        ]
          .filter((bar) => bar.hasAttribute('data-nav-chrome-copy') === copy)
          .map(read);
      return { live: bars(false), copies: bars(true) };
    });
}

// KF-H3NNP6 overlay bars mid-transition: fading a bar's own opacity faded its
// backdrop filter with it (WebKit dropped the blur outright), so the sliding
// views showed through the chrome during a push or pop.
for (const step of ['push', 'pop'] as const)
  test(`mid-${step}, both overlay bars keep their material at full opacity and cross-fade only their contents`, async ({
    page,
  }) => {
    await page.clock.install();
    await mountFixture(page);
    if (step === 'pop') {
      await page.evaluate(() =>
        (globalThis as unknown as { push(): void }).push(),
      );
      await settle(page);
    }
    const { live, copies } = await midTransitionBars(page, step);
    expect(live).toHaveLength(2);
    expect(copies).toHaveLength(2);
    for (const bar of live) {
      expect(bar.opacity).toBe(1);
      expect(bar.filter).toContain('blur');
      expect(bar.contents).toBeGreaterThan(0);
      expect(bar.contents).toBeLessThan(1);
    }
    // The outgoing copy above it carries only the old contents.
    for (const copy of copies) {
      expect(copy.filter).toBe('none');
      expect(copy.background).toBe('rgba(0, 0, 0, 0)');
      expect(copy.opacity).toBeGreaterThan(0);
      expect(copy.opacity).toBeLessThan(1);
    }
  });
