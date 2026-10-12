import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/toolbar-density-consumer.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

// styles.css is a list of @imports; inline each one.
const stylesDirectory = resolve(import.meta.dirname, '../../dist/styles');
const css = [
  ...readFileSync(resolve(stylesDirectory, 'styles.css'), 'utf8').matchAll(
    /@import "\.\/([^"]+)";/g,
  ),
]
  .map(([, file]) => file!)
  // The layouts ship their stylesheets on their own subpaths.
  .concat([
    'pane.css',
    'nav-stack.css',
    'collapsible-panel.css',
    'workbench.css',
  ])
  .map((file) => readFileSync(resolve(stylesDirectory, file), 'utf8'))
  .join('\n');

test('compact-density Workbench toolbars are 40px with compact composed toggles', async ({
  page,
}, testInfo) => {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  )!;
  for (const width of [1100, 700]) {
    await page.setViewportSize({ width, height: 800 });
    await page.setContent('<body style="margin:0"><div data-app></div></body>');
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: javascript.text });
    for (const state of ['open', 'closed']) {
      const section = page.locator(`[data-state="${state}"]`);
      const toolbars = await section
        .locator('[data-component="toolbar"]:visible')
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().height),
        );
      expect(toolbars.length).toBeGreaterThan(0);
      for (const height of toolbars) expect(height).toBeCloseTo(40, 0);
      const toggles = await section
        .locator('[data-workbench-toggle]:visible')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const group = element.closest('.kui-toolbar-control-group')!;
            const toolbar = element
              .closest('[data-component="toolbar"]')!
              .getBoundingClientRect();
            const box = group.getBoundingClientRect();
            return {
              size: group.getAttribute('data-size'),
              height: box.height,
              inside:
                box.top >= toolbar.top - 0.5 &&
                box.bottom <= toolbar.bottom + 0.5,
            };
          }),
        );
      expect(toggles.length).toBeGreaterThan(0);
      for (const toggle of toggles)
        expect(toggle).toEqual({ size: 'compact', height: 34, inside: true });
    }
    await page.locator('[data-app]').screenshot({
      path: testInfo.outputPath(`toolbar-density-workbench-${width}.png`),
    });
    await page.locator('[data-app]').screenshot({
      path: `test-results/toolbar-density-workbench-${width}.png`,
    });
  }
});
