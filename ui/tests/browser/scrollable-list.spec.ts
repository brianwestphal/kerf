import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/scrollable-list-consumer.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

const css = ['foundation', 'layout', 'list', 'list-item']
  .map((name) =>
    readFileSync(
      resolve(import.meta.dirname, `../../dist/styles/${name}.css`),
      'utf8',
    ),
  )
  .join('\n');

test('a scrollable List in a max-height column scrolls instead of shrinking multiline rows', async ({
  page,
}) => {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  )!;
  await page.setViewportSize({ width: 800, height: 600 });
  await page.setContent('<body style="margin:0"><div data-app></div></body>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript.text });

  const geometry = await page.evaluate(() => {
    const list = document.querySelector<HTMLElement>('.kui-list')!;
    const rows = [...list.children].map((row) => {
      const box = row.getBoundingClientRect();
      return {
        top: box.top,
        bottom: box.bottom,
        clientHeight: (row as HTMLElement).clientHeight,
        scrollHeight: row.scrollHeight,
      };
    });
    return {
      bounded: document
        .querySelector<HTMLElement>('[data-bounded]')!
        .getBoundingClientRect().height,
      listHeight: list.clientHeight,
      listScrollHeight: list.scrollHeight,
      rows,
    };
  });
  expect(geometry.bounded).toBeLessThanOrEqual(240);
  // The List owns the scroll: its content overflows its bounded height.
  expect(geometry.listScrollHeight).toBeGreaterThan(geometry.listHeight);
  for (const [index, row] of geometry.rows.entries()) {
    // Each row keeps its natural height (nothing clipped inside it)…
    expect(row.scrollHeight, `row ${index} clipped`).toBeLessThanOrEqual(
      row.clientHeight + 1,
    );
    // …and never overlaps the next row.
    const next = geometry.rows[index + 1];
    if (next)
      expect(row.bottom, `row ${index} overlaps`).toBeLessThanOrEqual(
        next.top + 0.5,
      );
  }
});
