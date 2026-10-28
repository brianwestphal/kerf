import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(
    page.locator('[data-editor-canvas] [data-kerf-node]').first(),
  ).toBeVisible();
});

test('selects a canvas node and highlights it without running its action', async ({
  page,
}) => {
  const compose = page.locator(
    `[data-editor-canvas] [data-kerf-node="${COMPOSE}"]`,
  );
  await compose.click();
  await expect(
    page.getByText('composeButton · Button', { exact: false }),
  ).toBeVisible();
  const highlight = page.locator('.editor-selection');
  await expect(highlight).toBeVisible();
  const [box, target] = await Promise.all([
    highlight.boundingBox(),
    compose.boundingBox(),
  ]);
  expect(Math.abs(box!.x - target!.x)).toBeLessThan(2);
  expect(Math.abs(box!.width - target!.width)).toBeLessThan(2);
});

test('selects from the outline and documents a palette component', async ({
  page,
}) => {
  await page
    .locator(
      '[data-action="editor-select-node"][data-item-id="01JB8Z1M6Q8E1X9V4S7K2R3T5E"]',
    )
    .click();
  await expect(
    page.getByText('folderList · List', { exact: false }),
  ).toBeVisible();
  await page
    .locator('[data-action="editor-show-component"]', { hasText: /^Badge$/ })
    .click();
  await expect(page.getByText('Nothing selected')).toBeHidden();
});

test('opens a document file and reports one that is not a view document', async ({
  page,
}) => {
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schema":"x"}'),
  });
  await expect(page.getByText('That file could not be opened')).toBeVisible();
  const document = {
    schema: 'kerf-ui-document/v1',
    name: 'Greeting',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3TXA',
      type: '@kerfjs/ui:button',
      props: { children: 'Hello from a file', tone: 'success' },
    },
  };
  await input.setInputFiles({
    name: 'greeting.kui.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(document)),
  });
  await expect(page.locator('[data-editor-canvas]')).toContainText(
    'Hello from a file',
  );
  await expect(
    page.getByText('greeting.kui.json · 1 nodes · valid'),
  ).toBeVisible();
  await expect(page.getByText('That file could not be opened')).toBeHidden();
});

test('saves the document as a .kui.json download', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-action="editor-save"]').click(),
  ]);
  expect(download.suggestedFilename()).toBe('inbox.kui.json');
  const saved = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(saved).toMatchObject({ schema: 'kerf-ui-document/v1', name: 'Inbox' });
});

for (const [width, height] of [
  [1440, 900],
  [900, 800],
  [390, 800],
] as const) {
  test(`captures the selected state at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    if (width > 600)
      await page
        .locator(`[data-editor-canvas] [data-kerf-node="${COMPOSE}"]`)
        .click();
    await page.mouse.move(1, height - 1);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: info.outputPath(`kf-4nrzcv-editor-selected-${width}.png`),
      animations: 'disabled',
    });
  });
}

test('lists problems and selects the node a problem is about', async ({
  page,
}, info) => {
  const document = JSON.parse(
    await readFile(
      new URL('../../src/sample.kui.json', import.meta.url),
      'utf8',
    ),
  );
  document.root.zones.header[0].zones.trailing[0].props.tone = 'purple';
  document.params.bad = { type: { kind: 'map' } };
  await page.locator('input[type="file"]').setInputFiles({
    name: 'inbox.kui.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(document)),
  });
  const problems = page.locator('[data-action="editor-select-problem"]');
  await expect(problems).toHaveCount(2);
  await expect(page.getByText('2 problems in this document')).toBeVisible();
  await problems.nth(1).click();
  await expect(
    page.getByText('composeButton · Button', { exact: false }),
  ).toBeVisible();
  // An invalid document is not previewed (interpretView refuses it), so the
  // problem list and inspector are how its nodes are reached.
  await expect(page.locator('[data-editor-canvas]')).toContainText(
    'This document cannot be previewed',
  );
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-wc0zg3-editor-problems-1440.png'),
    animations: 'disabled',
  });
});
