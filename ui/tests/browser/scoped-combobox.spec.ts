import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

import type { start } from './fixtures/scoped-combobox.js';

declare global {
  interface Window {
    scopedFixture: ReturnType<typeof start>;
  }
}

const bundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/scoped-combobox.tsx')],
  bundle: true,
  platform: 'browser',
  write: false,
  outdir: 'out',
  tsconfigRaw: {
    compilerOptions: { jsx: 'react-jsx', jsxImportSource: 'kerfjs' },
  },
});

test.beforeEach(async ({ page }) => {
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({
    content: (await bundle).outputFiles.find((f) => f.path.endsWith('.js'))!
      .text,
  });
});

test('routes IME, keyboard and pointer commits once across sibling apps and nested fields', async ({
  page,
}) => {
  const a = page.locator('#one');
  const b = page.locator('#two');
  const commits = () => page.evaluate(() => window.scopedFixture.commits);
  await a.fill('bl');
  await a.press('ArrowDown');
  await page.evaluate(() => window.scopedFixture.a.refresh());
  await expect(a).toHaveAccessibleName('one edited');
  await expect(a).toHaveAccessibleDescription('updated');
  await expect(a).toHaveAttribute('aria-expanded', 'true');
  await expect(a).toHaveAttribute('aria-activedescendant', 'one-option-1');
  expect(
    await a.evaluate((el) =>
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          isComposing: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    ),
  ).toBe(true);
  expect(await commits()).toEqual([]);
  await a.press('Enter');
  await b.fill('bl');
  await page.getByRole('option', { name: 'blue', exact: true }).click();
  await page.evaluate(() => window.scopedFixture.a.add('nested seed'));
  const nested = page.locator('#one-nested');
  await expect(nested).toHaveValue('nested seed');
  await nested.fill('fresh');
  await nested.press(';');
  expect(await commits()).toEqual([
    'one/one/blue/false',
    'two/two/blue/false',
    'one/nested-1/fresh/true',
  ]);
  const oldInput = await nested.elementHandle();
  await page.evaluate(() => window.scopedFixture.a.remove());
  await expect(nested).toHaveCount(0);
  await page.evaluate(() => window.scopedFixture.a.add('second seed'));
  await expect(nested).toHaveValue('second seed');
  await oldInput!.dispatchEvent('keydown', { key: 'Enter', bubbles: true });
  await oldInput!.dispose();
  await nested.fill('next');
  await nested.press('Enter');
  await page.evaluate(() => {
    window.scopedFixture.a.release();
    window.scopedFixture.a.release();
  });
  await nested.fill('silent');
  await nested.press('Enter');
  await b.fill('still active');
  await b.press(',');
  expect(await commits()).toEqual([
    'one/one/blue/false',
    'two/two/blue/false',
    'one/nested-1/fresh/true',
    'one/nested-2/next/true',
    'two/two/still active/true',
  ]);
});

test('captures a seed independently of rerenders, native reset and field remount', async ({
  page,
}) => {
  const a = page.locator('#one');
  await a.fill('typed');
  await a.evaluate((el: HTMLInputElement) => el.setSelectionRange(2, 2));
  await page.evaluate(() => window.scopedFixture.a.refresh());
  await expect(a).toHaveValue('typed');
  expect(await a.evaluate((el: HTMLInputElement) => el.selectionStart)).toBe(2);
  await a.blur();
  await page.evaluate(() => window.scopedFixture.a.refresh());
  await expect(a).toHaveAccessibleName('one edited edited');
  await expect(a).toHaveValue('typed');
  await page.getByRole('button', { name: 'Reset' }).first().click();
  await expect(a).toHaveValue('seed');
});

test('a manual installation on the same root delivers a second callback', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { a, commits } = window.scopedFixture;
    const stop = a.mixManual();
    const input = document.querySelector<HTMLInputElement>('#one')!;
    input.value = 'mixed';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    stop();
    a.unmount();
    return commits;
  });
  expect(result).toEqual(['one/one/mixed/true', 'manual/mixed']);
});
