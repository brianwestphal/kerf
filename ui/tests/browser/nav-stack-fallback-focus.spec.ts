import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-ADYAY9: fallback focus on a pushed view with nothing focusable survives
// a consumer re-render that morphs the generated tabindex away, and moves to
// the content once it loads.

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/nav-stack-fallback-focus.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

const css = ['foundation', 'layout', 'nav-stack', 'toolbar', 'toolbar-text']
  .map((name) =>
    readFileSync(
      resolve(import.meta.dirname, `../../dist/styles/${name}.css`),
      'utf8',
    ),
  )
  .join('\n');

test('fallback focus survives a re-render and moves to arriving content', async ({
  page,
}) => {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  )!;
  await page.setContent(
    '<body style="margin:0"><div data-app style="height:400px"></div></body>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript.text });
  const ticket = page.locator('[data-nav-key="ticket"]');
  const focused = () =>
    page.evaluate(() => {
      const active = document.activeElement;
      return (
        active?.id || active?.getAttribute('data-nav-key') || active?.tagName
      );
    });

  await page.evaluate(() => (globalThis as unknown as { push(): void }).push());
  await expect.poll(focused).toBe('ticket');
  await page.evaluate(() =>
    (globalThis as unknown as { relabel(): void }).relabel(),
  );
  await expect(ticket).toHaveAttribute('tabindex', '-1');
  await expect.poll(focused).toBe('ticket');
  await page.evaluate(() => (globalThis as unknown as { load(): void }).load());
  await expect.poll(focused).toBe('loaded');
});
