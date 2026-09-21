import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/catalog-authoring-consumer.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function mountFixture(
  page: Page,
  mode: 'component' | 'composition',
): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  if (!javascript) throw new Error('Catalog authoring fixture emitted no JS');
  await page.setContent(
    `<div data-catalog-authoring-fixture data-mode="${mode}"></div>`,
  );
  await page.addScriptTag({ content: javascript.text });
}

test('published guidance produces the sanctioned focused-component structure', async ({
  page,
}) => {
  await mountFixture(page, 'component');

  const catalog = page.locator('[data-component="catalog"]');
  await expect(catalog).toHaveAttribute('data-geometry-overlay', 'true');
  const stack = catalog.locator('[data-catalog-example-stack]');
  await expect(stack).toHaveCount(1);
  await expect(stack).toHaveAttribute('data-demo', 'status');
  await expect(stack).toHaveAttribute('aria-label', 'Status banner states');

  const rows = stack.locator(':scope > [data-catalog-example]');
  await expect(rows).toHaveCount(2);
  await expect(
    rows.first().locator(':scope > [data-component="state-banner"]'),
  ).toHaveCount(1);
  await expect(
    rows.first().locator(':scope > [data-component="list-header"]'),
  ).toHaveText('Default');

  const skipped = rows.nth(1);
  await expect(skipped).toHaveAttribute(
    'data-catalog-geometry-overlay-skip',
    '',
  );
  await expect(skipped).toContainText('The application owns status copy.');
});

test('published guidance disables the global overlay for a composition', async ({
  page,
}) => {
  await mountFixture(page, 'composition');

  const catalog = page.locator('[data-component="catalog"]');
  await expect(catalog).toHaveAttribute('data-geometry-overlay', 'false');
  const stack = catalog.locator(
    '[data-catalog-example-stack][data-demo="workspace"]',
  );
  await expect(stack).toHaveCount(1);
  const row = stack.locator(':scope > [data-catalog-example]');
  await expect(row).toHaveCount(1);
  await expect(
    row.locator(
      ':scope > [data-component="state-banner"], :scope > [data-component="list-item"]',
    ),
  ).toHaveCount(2);
  await expect(
    catalog.locator('[data-catalog-geometry-overlay-skip]'),
  ).toHaveCount(0);
});
