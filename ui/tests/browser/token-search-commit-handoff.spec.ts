import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/token-search-commit-consumer.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

const css = ['foundation', 'token-search-field']
  .map((name) =>
    readFileSync(
      resolve(import.meta.dirname, `../../dist/styles/${name}.css`),
      'utf8',
    ),
  )
  .join('\n');

async function mountFixture(page: Page) {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  )!;
  await page.setContent(
    '<body style="margin:16px"><div data-app></div></body>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript.text });
}

const state = (page: Page) =>
  page.evaluate(() =>
    (
      globalThis as unknown as {
        commitState(): { tokens: string[]; query: string };
      }
    ).commitState(),
  );

// When onEdit commits typed grammar to a chip, the controlled render replaces
// the focused editor. Keys typed before the app refocuses used to be lost
// ("site:north site:annex" became `[site:north] ite:annex`).
test('typing at full speed across app-committed chips keeps every key and the caret', async ({
  page,
}) => {
  await mountFixture(page);
  const editor = page.getByRole('searchbox', { name: 'Search' });
  await editor.focus();
  await editor.pressSequentially('site:north site:annex pump', { delay: 0 });
  await expect
    .poll(() => state(page))
    .toEqual({
      tokens: ['site:north', 'site:annex'],
      query: 'pump',
    });
  await expect(page.locator('[data-token-search-editor]')).toBeFocused();
  // The caret stayed after the last chip, at the end of the query.
  await page.keyboard.type('s');
  await expect
    .poll(() => state(page))
    .toEqual({
      tokens: ['site:north', 'site:annex'],
      query: 'pumps',
    });

  // An app-owned chip removal hands the caret to the rebuilt editor too.
  // Put the caret at the start of the query, right after the last chip.
  for (let index = 0; index < 'pumps'.length; index += 1)
    await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Backspace');
  await expect
    .poll(() => state(page))
    .toEqual({
      tokens: ['site:north'],
      query: 'pumps',
    });
  await expect(page.locator('[data-token-search-editor]')).toBeFocused();
  await page.keyboard.type('x', { delay: 0 });
  await expect.poll(async () => (await state(page)).query).toBe('xpumps');
});
