import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/state-banner-keyed-consumer.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

test('a keyed StateBanner keeps its focused action when an earlier sibling leaves', async ({
  page,
}) => {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  if (!javascript) throw new Error('StateBanner fixture emitted no JavaScript');
  await page.setContent('<main data-banner-fixture></main>');
  await page.addScriptTag({ content: javascript.text });

  const prepared = page.locator('[data-key="prepared-outcome"]');
  const copy = prepared.getByRole('button', { name: 'Copy' });
  await expect(copy).toBeVisible();
  await copy.focus();
  await expect(copy).toBeFocused();
  await prepared.evaluate((element) => {
    Reflect.set(element, 'preservedIdentity', 'banner');
    Reflect.set(element.querySelector('button')!, 'preservedIdentity', 'copy');
  });

  await page.evaluate(() => {
    (
      globalThis as typeof globalThis & {
        clearClipboardUnavailable: () => void;
      }
    ).clearClipboardUnavailable();
  });

  await expect(page.locator('[data-key="clipboard-unavailable"]')).toHaveCount(
    0,
  );
  await expect(prepared).toHaveCount(1);
  expect(
    await prepared.evaluate((element) =>
      Reflect.get(element, 'preservedIdentity'),
    ),
  ).toBe('banner');
  expect(
    await copy.evaluate((element) => Reflect.get(element, 'preservedIdentity')),
  ).toBe('copy');
  await expect(copy).toBeFocused();
});
