import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

import type { start } from './fixtures/combobox-seed.js';

declare global {
  interface Window {
    seedFixture: ReturnType<typeof start>;
  }
}

const bundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/combobox-seed.tsx')],
  bundle: true,
  platform: 'browser',
  write: false,
  outdir: 'out',
});

test('Combobox value on a mounted input follows changed attributes and preserves edits on unchanged ones', async ({
  page,
}) => {
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({
    content: (await bundle).outputFiles.find((f) => f.path.endsWith('.js'))!
      .text,
  });
  const input = page.getByRole('combobox');
  const state = () =>
    input.evaluate((el: HTMLInputElement) => ({
      value: el.value,
      attribute: el.getAttribute('value'),
      reset: el.defaultValue,
      focused: el === document.activeElement,
      caret: el.selectionStart,
    }));
  const check = async (value: string, seed: string, focused: boolean) =>
    expect(await state()).toMatchObject({
      value,
      attribute: seed,
      reset: seed,
      focused,
    });
  await check('first', 'first', false);
  await input.fill('draft');
  await input.evaluate((el: HTMLInputElement) => el.setSelectionRange(2, 2));
  await page.evaluate(() => window.seedFixture.refresh());
  await check('draft', 'first', true);
  expect((await state()).caret).toBe(2);
  await page.evaluate(() => window.seedFixture.setSeed('second'));
  await check('draft', 'second', true);
  await input.blur();
  await page.evaluate(() => window.seedFixture.setSeed('third'));
  await check('third', 'third', false);
  await input.fill('again');
  await page.getByRole('button', { name: 'Reset' }).click();
  await check('third', 'third', false);
  await input.fill('unsaved');
  await page.evaluate(() => window.seedFixture.remount());
  await check('third', 'third', false);
  await page.evaluate(() => window.seedFixture.dispose());
});
