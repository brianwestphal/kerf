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
  await page.addStyleTag({
    content:
      '::-webkit-scrollbar{width:15px}::-webkit-scrollbar-thumb{background:#888}',
  });
  await page.addScriptTag({ content: javascript.text });
  await expect(
    page.locator('[data-region="wired"] .kui-nav-stack'),
  ).toHaveAttribute('data-chrome-overlay', 'measured');
}

/** The active scroller's scrollbar strip against the chrome. */
const strip = (page: Page) =>
  page.locator('[data-region="wired"] .kui-nav-stack').evaluate((stack) => {
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
      ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy])',
    )!;
    const box = scroller.getBoundingClientRect();
    const head = chrome.getBoundingClientRect();
    const scrollbar = scroller.offsetWidth - scroller.clientWidth;
    const trackStart = box.left + scroller.clientLeft + scroller.clientWidth;
    return {
      scrollbar,
      published: (stack as HTMLElement).style.getPropertyValue(
        '--_kui-nav-stack-scrollbar-inline-size',
      ),
      chromeRight: head.right,
      trackStart,
      hit:
        document.elementFromPoint(
          trackStart + scrollbar / 2,
          head.top + head.height / 2,
        ) === scroller,
    };
  });

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
