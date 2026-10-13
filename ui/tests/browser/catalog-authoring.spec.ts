import { readFile } from 'node:fs/promises';
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
  await expect(catalog.locator('[data-catalog-geometry-overlay]')).toHaveCount(
    0,
  );
  const stack = catalog.locator('[data-catalog-example-stack]');
  await expect(stack).toHaveCount(1);
  await expect(stack).toHaveAttribute('data-demo', 'status');
  await expect(stack).toHaveAttribute('aria-label', 'Status banner states');
  await expect(
    catalog.getByRole('region', { name: 'Status banner states' }),
  ).toHaveCount(1);

  const rows = stack.locator(':scope > [data-catalog-example]');
  await expect(rows).toHaveCount(2);
  await expect(
    stack.getByRole('region', { name: 'Default', exact: true }),
  ).toHaveCount(1);
  await expect(
    rows.first().locator(':scope > [data-component="state-banner"]'),
  ).toHaveCount(1);
  await expect(
    rows.first().locator(':scope > [data-component="list-header"]'),
  ).toHaveText('Default');

  await expect(rows.nth(1)).toContainText('The application owns status copy.');
});

test('published guidance renders a composition without highlight layers', async ({
  page,
}) => {
  await mountFixture(page, 'composition');

  const catalog = page.locator('[data-component="catalog"]');
  await expect(catalog.locator('[data-catalog-geometry-overlay]')).toHaveCount(
    0,
  );
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
});

test('a full-width stack spans the stage instead of the reading measure', async ({
  page,
}) => {
  const css = (
    await Promise.all(
      ['catalog-stage.css', 'catalog-example-stack.css'].map((file) =>
        readFile(
          resolve(import.meta.dirname, '../../src/catalog/components', file),
          'utf8',
        ),
      ),
    )
  ).join('\n');
  await page.setViewportSize({ width: 1600, height: 900 });
  // Each stack sits in the real stage + canvas, on a stage wider than the
  // canvas's 1120px cap, so a cap on either layer shows up.
  const stage = (name: string, width: string) =>
    `<section class="kui-catalog__stage" data-stage="${name}" style="width:1312px"><div class="kui-catalog__canvas"><section class="kui-catalog-example-stack" data-catalog-example-stack ${width} data-stack="${name}"></section></div></section>`;
  await page.setContent(
    `<style>:root { --kui-space-m: 16px; }</style>${stage('reading', '')}${stage('full', 'data-width="full"')}`,
  );
  await page.addStyleTag({
    content: css.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  const box = (selector: string) =>
    page.locator(selector).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    });
  expect((await box('[data-stack="reading"]')).width).toBe(736);
  // The full stack spans the stage less the canvas's 16px padding.
  const fullStage = await box('[data-stage="full"]');
  const full = await box('[data-stack="full"]');
  expect(full.left).toBe(fullStage.left + 16);
  expect(full.right).toBe(fullStage.right - 16);
});

test('a sidebar-width viewport matches a production rail, capped at the stage', async ({
  page,
}) => {
  const css = await readFile(
    resolve(
      import.meta.dirname,
      '../../src/catalog/components/catalog-example.css',
    ),
    'utf8',
  );
  await page.setViewportSize({ width: 1100, height: 600 });
  await page.setContent(
    '<div style="width:900px"><div class="kui-catalog-example__viewport" data-width="sidebar" data-case="roomy"></div></div><div style="width:200px"><div class="kui-catalog-example__viewport" data-width="sidebar" data-case="narrow"></div></div>',
  );
  await page.addStyleTag({
    content: css.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  const width = (name: string) =>
    page
      .locator(`[data-case="${name}"]`)
      .evaluate((element) => element.getBoundingClientRect().width);
  expect(await width('roomy')).toBe(272);
  expect(await width('narrow')).toBe(200);
});
