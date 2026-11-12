import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-KHTDC2: a relocated control keeps its node and keyboard focus when the
// set of groups a collapsed panel relocates changes around it.
const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/workbench-relocated-focus.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function openFixture(page: Page) {
  const bundle = await fixtureBundle;
  await page.setViewportSize({ width: 1024, height: 700 });
  await page.setContent(
    '<!doctype html><html><body style="margin:0"><div class="kui-app-root" data-fixture-root style="height:100vh"></div></body></html>',
  );
  await page.addStyleTag({
    content: bundle.outputFiles
      .find((file) => file.path.endsWith('.css'))!
      .text.replace(
        /remify\(([\d.]+)px\)/g,
        (_, pixels: string) => `${Number(pixels) / 16}rem`,
      ),
  });
  await page.addScriptTag({
    content: bundle.outputFiles.find((file) => file.path.endsWith('.js'))!.text,
  });
}

const setFiltering = (page: Page, value: boolean) =>
  page.evaluate((next) => {
    (window as unknown as { filtering: { value: boolean } }).filtering.value =
      next;
  }, value);

test('a focused relocated control survives a change to the relocated set', async ({
  page,
}) => {
  await openFixture(page);
  const toolbar = page.locator('.kui-toolbar[aria-label="Tickets"]');
  const announcer = toolbar.getByRole('button', { name: 'Announcer' });
  await expect(toolbar.getByRole('button', { name: 'Filter' })).toBeVisible();
  await announcer.focus();
  await announcer.evaluate((node) => {
    (node as HTMLElement & { marked?: boolean }).marked = true;
  });
  const sameFocusedNode = () =>
    page.evaluate(() => {
      const active = document.activeElement as
        (HTMLElement & { marked?: boolean }) | null;
      return {
        label: active?.getAttribute('aria-label') ?? active?.localName,
        marked: Boolean(active?.marked),
      };
    });

  // A group before it leaves the relocated set.
  await setFiltering(page, false);
  await expect(toolbar.getByRole('button', { name: 'Filter' })).toHaveCount(0);
  expect(await sameFocusedNode()).toEqual({ label: 'Announcer', marked: true });

  // And comes back.
  await setFiltering(page, true);
  await expect(toolbar.getByRole('button', { name: 'Filter' })).toBeVisible();
  expect(await sameFocusedNode()).toEqual({ label: 'Announcer', marked: true });
});
