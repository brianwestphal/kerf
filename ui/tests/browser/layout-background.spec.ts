import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-C7GSDQ layout backgrounds: a typed `background` color paints a Pane
// (replacing a sunken fill), a NavStack's views and docked chrome, and a
// TabNavigator's docked bar and per-tab scene, in both color schemes, and
// forced colors paint the system surface instead.

const fixtureBundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/layout-background.tsx')],
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
  await page.setViewportSize({ width: 680, height: 640 });
  await page.setContent('<body style="margin:0"><div data-app></div></body>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript.text });
}

/** The computed background of each painted surface in the fixture. */
function backgrounds(page: Page) {
  return page.evaluate(() => {
    const bg = (selector: string) =>
      window.getComputedStyle(document.querySelector(selector)!)
        .backgroundColor;
    return {
      pane: bg('[data-region="pane"] .kui-pane'),
      paneHeader: bg('[data-region="pane"] .kui-pane__header'),
      sunken: bg('[data-region="sunken"] .kui-pane'),
      sunkenContent: bg('[data-region="sunken"] .kui-pane__content'),
      stack: bg('[data-region="nav-stack"] .kui-nav-stack'),
      stackChrome: bg('[data-region="nav-stack"] .kui-nav-stack__chrome'),
      stackView: bg('[data-region="nav-stack"] .kui-nav-stack__view'),
      tabBar: bg('[data-region="tab-navigator"] .kui-tab-scaffold__bar'),
      activeScene: bg(
        '[data-region="tab-navigator"] [data-tab-scaffold-scene="now"]',
      ),
      plainScene: bg(
        '[data-region="tab-navigator"] [data-tab-scaffold-scene="library"]',
      ),
      raised: (() => {
        const probe = document.createElement('div');
        probe.style.background = 'var(--kui-color-surface-raised)';
        document.body.append(probe);
        const value = window.getComputedStyle(probe).backgroundColor;
        probe.remove();
        return value;
      })(),
    };
  });
}

for (const [scheme, expected] of [
  [
    'light',
    {
      pane: 'rgb(230, 237, 251)',
      sunken: 'rgb(243, 232, 251)',
      stack: 'rgb(232, 245, 236)',
      scene: 'rgb(251, 238, 230)',
    },
  ],
  [
    'dark',
    {
      pane: 'rgb(27, 36, 56)',
      sunken: 'rgb(42, 29, 54)',
      stack: 'rgb(24, 41, 30)',
      scene: 'rgb(54, 35, 26)',
    },
  ],
] as const) {
  test(`app-chosen backgrounds paint each layout surface (${scheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await mountFixture(page);
    const painted = await backgrounds(page);

    expect(painted.pane).toBe(expected.pane);
    // Docked chrome is transparent over the pane's color.
    expect(painted.paneHeader).toBe('rgba(0, 0, 0, 0)');
    // The color replaces the sunken fill rather than layering over it.
    expect(painted.sunken).toBe(expected.sunken);
    expect(painted.sunkenContent).toBe('rgba(0, 0, 0, 0)');
    expect(painted.stack).toBe(expected.stack);
    expect(painted.stackChrome).toBe(expected.stack);
    expect(painted.stackView).toBe(expected.stack);
    expect(painted.tabBar).toBe(painted.raised);
    expect(painted.activeScene).toBe(expected.scene);
    expect(painted.plainScene).toBe('rgba(0, 0, 0, 0)');

    await page.screenshot({
      path: test.info().outputPath(`layout-background-${scheme}.png`),
    });
  });
}

test('forced colors paint the system surface instead of the app color', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Only Chromium emulates forced colors.',
  );
  await page.emulateMedia({ forcedColors: 'active' });
  await mountFixture(page);
  const painted = await backgrounds(page);
  const canvas = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.background = 'Canvas';
    document.body.append(probe);
    const value = window.getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  });
  for (const key of [
    'pane',
    'sunken',
    'stack',
    'stackChrome',
    'stackView',
    'tabBar',
    'activeScene',
  ] as const)
    expect(painted[key], key).toBe(canvas);
  await page.screenshot({
    path: test.info().outputPath('layout-background-forced-colors.png'),
  });
});
