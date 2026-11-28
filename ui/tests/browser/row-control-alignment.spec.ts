import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

import { animationsSettled } from '../helpers/animations-settled.js';

const fixture = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/row-control-alignment.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

test('Row aligns control boxes with an action on each wrapped line', async ({
  page,
}, testInfo) => {
  const bundle = await fixture;
  await page.setViewportSize({ width: 1100, height: 400 });
  await page.setContent(
    '<!doctype html><html><body><main class="kui-app-root" data-fixture-root></main></body></html>',
  );
  await page.addStyleTag({
    content:
      bundle.outputFiles
        .find(({ path }) => path.endsWith('.css'))!
        .text.replace(
          /remify\((-?[\d.]+)px\)/g,
          (_, pixels: string) => `${Number(pixels) / 16}rem`,
        ) +
      '\n[data-fixture-root] {padding: 16px; max-width: 525px} .fixture-field {flex: 1 1 190px; min-width: 0}',
  });
  await page.addScriptTag({
    content: bundle.outputFiles.find(({ path }) => path.endsWith('.js'))!.text,
  });

  const root = page.locator('[data-fixture-root]');
  const rule = root.getByRole('group', { name: 'Workflow rule' });
  const boxes = rule.locator('[data-row-control]');
  const remove = rule.getByRole('button', { name: 'Remove rule' });
  const centers = async () => {
    const bounds = await Promise.all([
      boxes.nth(0).boundingBox(),
      boxes.nth(1).boundingBox(),
      remove.boundingBox(),
    ]);
    return bounds.map((rect) => rect!.y + rect!.height / 2);
  };
  const error = root.getByText('Choose a step before saving.');
  await expect(error).toBeVisible();
  await expect
    .poll(async () => {
      const positions = await centers();
      return Math.max(...positions) - Math.min(...positions);
    })
    .toBeLessThanOrEqual(1);
  const nameField = root.getByRole('group', { name: 'Rule name' });
  const fieldBox = await nameField.locator('[data-row-control]').boundingBox();
  const rename = await nameField
    .getByRole('button', { name: 'Rename' })
    .boundingBox();
  expect(
    Math.abs(
      fieldBox!.y + fieldBox!.height / 2 - rename!.y - rename!.height / 2,
    ),
  ).toBeLessThanOrEqual(1);
  await animationsSettled(page);
  await rule.screenshot({
    path: testInfo.outputPath('row-control-alignment-wide.png'),
  });

  await page.setViewportSize({ width: 390, height: 400 });
  await expect
    .poll(async () => {
      const [first, second, action] = await centers();
      return second - first > 30 && Math.abs(second - action) <= 1;
    })
    .toBe(true);
  await animationsSettled(page);
  await rule.screenshot({
    path: testInfo.outputPath('row-control-alignment-narrow.png'),
  });

  await root.evaluate((element) =>
    element.dispatchEvent(new Event('fixture:clear-error')),
  );
  await expect(error).toHaveCount(0);
  await expect(
    root.getByText('Choose the step that starts the workflow.'),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const [, field, action] = await centers();
      return Math.abs(field - action);
    })
    .toBeLessThanOrEqual(1);
});
