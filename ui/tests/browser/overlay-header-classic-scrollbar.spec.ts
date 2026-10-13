import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-ZZAVRW: with a classic (space-taking) scrollbar, an overlay Pane header
// leaves the content scrollbar's strip uncovered, so its thumb and buttons
// stay visible and usable; an overlay scrollbar still passes beneath the
// material. Chromium and WebKit get classic scrollbars from a styled
// ::-webkit-scrollbar. Headless Chromium hides scrollbars unless its default
// --hide-scrollbars argument is dropped (a launch option, so this lives in
// its own file).
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

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

/** Mounts the overlay-header fixture with classic (styled) scrollbars. */
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
  await expect(page.locator('[data-region="wired"] .kui-pane')).toHaveAttribute(
    'data-header-overlay',
    'measured',
  );
}

test('the overlay header leaves the content scrollbar uncovered', async ({
  page,
  browserName,
}) => {
  // Playwright's Firefox reports a zero-width scrollbar under every scrollbar
  // preference (ui.useOverlayScrollbars, the non-native scrollbar style), so
  // it cannot show a classic one here; the measurement is engine-neutral.
  test.skip(
    browserName === 'firefox',
    "Playwright's Firefox has no classic scrollbars",
  );
  await mountFixture(page);
  const result = await page
    .locator('[data-region="wired"] .kui-pane')
    .evaluate((pane) => {
      const scroller = pane.querySelector<HTMLElement>('.kui-pane__content')!;
      const header = pane.querySelector<HTMLElement>('.kui-pane__header')!;
      const box = scroller.getBoundingClientRect();
      const head = header.getBoundingClientRect();
      const scrollbar = scroller.offsetWidth - scroller.clientWidth;
      const trackStart = box.left + scroller.clientLeft + scroller.clientWidth;
      return {
        scrollbar,
        published: (pane as HTMLElement).style.getPropertyValue(
          '--kui-pane-scrollbar-inline-size',
        ),
        headerRight: head.right,
        trackStart,
        // What a pointer at the top of the scrollbar strip reaches.
        hit:
          document.elementFromPoint(
            trackStart + scrollbar / 2,
            head.top + head.height / 2,
          ) === scroller,
      };
    });
  expect(result.scrollbar).toBeGreaterThan(0);
  expect(result.published).toBe(`${String(result.scrollbar)}px`);
  expect(result.headerRight).toBeLessThanOrEqual(result.trackStart + 0.5);
  expect(result.hit).toBe(true);
  await page.locator('[data-region="wired"]').screenshot({
    path: test.info().outputPath('classic-scrollbar.png'),
  });
});
