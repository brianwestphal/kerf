import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// Web Awesome sets some attributes on its own hosts. kerf's morph removes
// host attributes a template omits, so anything the element sets only once
// (not re-derived on update) is lost for good on the next kerf re-render
// unless the Kerf template renders it. These tests bump a signal the mount
// reads (the template itself never changes) and check what survives.

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/wa-host-attributes.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function mountFixture(page: Page): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Fixture emitted no JS/CSS');
  await page.setContent(
    '<!doctype html><html><body><div data-wa-host-attributes></div></body></html>',
  );
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
  await page.waitForFunction(() =>
    Boolean(
      customElements.get('wa-select') && customElements.get('wa-divider'),
    ),
  );
}

/** Bump the mount's signal (the template is unchanged) and let Lit settle. */
async function rerender(page: Page, times = 1): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await page.evaluate(() =>
      (window as unknown as { rerender(): void }).rerender(),
    );
    await page.evaluate(
      () =>
        new Promise((done) => window.requestAnimationFrame(() => done(null))),
    );
  }
}

test('a Select divider keeps its separator semantics across re-renders', async ({
  page,
}) => {
  await mountFixture(page);
  const divider = page.locator('wa-select[name="divided"] wa-divider');
  await expect(divider).toHaveCount(1);
  const semantics = () =>
    divider.evaluate((host) => ({
      role: host.getAttribute('role'),
      orientation: host.getAttribute('aria-orientation'),
    }));
  const expected = { role: 'separator', orientation: 'horizontal' };
  await expect.poll(semantics).toEqual(expected);

  await rerender(page);
  expect(await semantics()).toEqual(expected);
  await rerender(page, 2);
  expect(await semantics()).toEqual(expected);
  await expect(
    page.getByRole('separator', { includeHidden: true }),
  ).toHaveCount(1);
});
