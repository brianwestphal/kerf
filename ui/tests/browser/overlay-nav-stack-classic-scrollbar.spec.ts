import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-1N0S19: with a classic (space-taking) scrollbar, overlay NavStack chrome
// leaves the active view's scrollbar strip uncovered, so its thumb and buttons
// stay visible and usable, for a plain view and for a pushed sole Pane alike.
// Chromium and WebKit get classic scrollbars from a styled ::-webkit-scrollbar;
// headless Chromium hides scrollbars unless its default --hide-scrollbars
// argument is dropped (a launch option, so this lives in its own file).
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

const bundle = (fixture: string) =>
  build({
    entryPoints: [resolve(import.meta.dirname, `fixtures/${fixture}`)],
    bundle: true,
    format: 'iife',
    outdir: 'out',
    platform: 'browser',
    write: false,
  });
const fixtureBundle = bundle('overlay-nav-stack.tsx');
// KF-Z4NSDF: an overlay bottom toolbar leaves the strip uncovered the same way.
const bottomBundle = bundle('overlay-nav-stack-bottom.tsx');
// KF-D5CBFH: an overlay TabNavigator bar leaves the strip uncovered too.
const tabBundle = bundle('overlay-tab-navigator.tsx');

const css = [
  'foundation',
  'layout',
  'content-item',
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

async function mountFixture(
  page: Page,
  fixture = fixtureBundle,
  gate = 'data-chrome-overlay',
): Promise<void> {
  const result = await fixture;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  )!;
  await page.setViewportSize({ width: 800, height: 2200 });
  await page.setContent('<body style="margin:0"><div data-app></div></body>');
  await page.addStyleTag({ content: css });
  await page.addStyleTag({
    content:
      '::-webkit-scrollbar{width:15px}::-webkit-scrollbar-thumb{background:#888}',
  });
  await page.addScriptTag({ content: javascript.text });
  await expect(
    page.locator('[data-region="wired"] .kui-nav-stack'),
  ).toHaveAttribute(gate, 'measured');
}

/** The active scroller's scrollbar strip against the chrome (or bottom toolbar). */
const strip = (page: Page, edge: 'top' | 'bottom' = 'top', region = 'wired') =>
  page
    .locator(`[data-region="${region}"] .kui-nav-stack`)
    .evaluate((stack, side) => {
      const view = [
        ...stack.querySelectorAll<HTMLElement>(
          '.kui-nav-stack__view[data-nav-active="true"]',
        ),
      ].at(-1)!;
      const scroller =
        view.querySelector<HTMLElement>(
          ':scope > .kui-pane > .kui-pane__content',
        ) ?? view;
      const chrome = stack.querySelector<HTMLElement>(
        side === 'top'
          ? ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy])'
          : ':scope > [data-nav-stack-bottom]:not([data-nav-chrome-copy])',
      )!;
      const box = scroller.getBoundingClientRect();
      const head = chrome.getBoundingClientRect();
      const scrollbar = scroller.offsetWidth - scroller.clientWidth;
      const trackStart = box.left + scroller.clientLeft + scroller.clientWidth;
      return {
        scrollbar,
        published: (stack as HTMLElement).style.getPropertyValue(
          side === 'top'
            ? '--_kui-nav-stack-scrollbar-inline-size'
            : '--_kui-nav-stack-bottom-scrollbar-inline-size',
        ),
        chromeRight: head.right,
        trackStart,
        hit:
          document.elementFromPoint(
            trackStart + scrollbar / 2,
            head.top + head.height / 2,
          ) === scroller,
      };
    }, edge);

test('the overlay chrome leaves the active view scrollbar uncovered, before and after a push', async ({
  page,
  browserName,
}) => {
  // Playwright's Firefox reports a zero-width scrollbar under every scrollbar
  // preference, so it cannot show a classic one here.
  test.skip(
    browserName === 'firefox',
    "Playwright's Firefox has no classic scrollbars",
  );
  await mountFixture(page);
  for (const step of ['root', 'pushed'] as const) {
    if (step === 'pushed') {
      await page.evaluate(() =>
        (globalThis as unknown as { push(): void }).push(),
      );
      await page.waitForTimeout(350);
    }
    const result = await strip(page);
    expect(result.scrollbar).toBeGreaterThan(0);
    expect(result.published).toBe(`${String(result.scrollbar)}px`);
    expect(result.chromeRight).toBeLessThanOrEqual(result.trackStart + 0.5);
    expect(result.hit).toBe(true);
  }
  await page.locator('[data-region="wired"]').screenshot({
    path: test.info().outputPath('classic-scrollbar.png'),
  });
});

test('the overlay bottom toolbar leaves the active view scrollbar uncovered, before and after a push', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'firefox',
    "Playwright's Firefox has no classic scrollbars",
  );
  await mountFixture(page, bottomBundle, 'data-bottom-toolbar-overlay');
  for (const step of ['root', 'pushed'] as const) {
    if (step === 'pushed') {
      await page.evaluate(() =>
        (globalThis as unknown as { push(): void }).push(),
      );
      await page.waitForTimeout(350);
    }
    for (const edge of ['top', 'bottom'] as const) {
      const result = await strip(page, edge);
      expect(result.scrollbar).toBeGreaterThan(0);
      expect(result.published).toBe(`${String(result.scrollbar)}px`);
      expect(result.chromeRight).toBeLessThanOrEqual(result.trackStart + 0.5);
      expect(result.hit).toBe(true);
    }
  }
  // A Pane footer ends its content above the toolbar: nothing to leave.
  const footer = await strip(page, 'bottom', 'footer');
  expect(footer.published).toBe('');
});

test('the overlay tab bar leaves the active scene scrollbar uncovered in a plain, Pane, and NavStack scene', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'firefox',
    "Playwright's Firefox has no classic scrollbars",
  );
  const result = await tabBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  )!;
  await page.setViewportSize({ width: 800, height: 2400 });
  await page.setContent('<body style="margin:0"><div data-app></div></body>');
  await page.addStyleTag({ content: css });
  await page.addStyleTag({
    content:
      '::-webkit-scrollbar{width:15px}::-webkit-scrollbar-thumb{background:#888}',
  });
  await page.addScriptTag({ content: javascript.text });
  for (const region of ['plain', 'pane', 'stack']) {
    const scaffold = page.locator(
      `[data-region="${region}"] .kui-tab-scaffold`,
    );
    await expect(scaffold).toHaveAttribute('data-bar-overlay', 'measured');
    const measured = await scaffold.evaluate((element) => {
      const scene = element.querySelector<HTMLElement>(
        '.kui-tab-scaffold__scene[data-active="true"]',
      )!;
      const scroller =
        scene.querySelector<HTMLElement>(
          ':scope > .kui-pane > .kui-pane__content',
        ) ??
        [
          ...scene.querySelectorAll<HTMLElement>(
            '.kui-nav-stack__view[data-nav-active="true"]',
          ),
        ].at(-1) ??
        scene;
      const bar = element
        .querySelector(':scope > .kui-tab-scaffold__bar')!
        .getBoundingClientRect();
      const box = scroller.getBoundingClientRect();
      const scrollbar = scroller.offsetWidth - scroller.clientWidth;
      const trackStart = box.left + scroller.clientLeft + scroller.clientWidth;
      return {
        scrollbar,
        published: (element as HTMLElement).style.getPropertyValue(
          '--_kui-tab-scaffold-bar-scrollbar-inline-size',
        ),
        barRight: bar.right,
        trackStart,
        hit:
          document.elementFromPoint(
            trackStart + scrollbar / 2,
            bar.top + bar.height / 2,
          ) === scroller,
      };
    });
    expect(measured.scrollbar, region).toBeGreaterThan(0);
    expect(measured.published, region).toBe(`${String(measured.scrollbar)}px`);
    expect(measured.barRight, region).toBeLessThanOrEqual(
      measured.trackStart + 0.5,
    );
    expect(measured.hit, region).toBe(true);
  }
  await page.locator('[data-region="plain"]').screenshot({
    path: test.info().outputPath('tab-bar-classic-scrollbar.png'),
  });
});
