import { expect, type Page, test } from '@playwright/test';

import { FIXTURE_EDITOR_URL } from '../../ports.js';
import { area, openLibrary } from './areas.js';
import { addChild } from './build.js';

const library = (page: Page) => page.locator('#editor-library');
const tile = (page: Page, key: string) =>
  library(page).locator(`[data-editor-palette="orders-app:${key}"]`);
async function open(page: Page) {
  await page.goto(FIXTURE_EDITOR_URL);
  await page
    .locator('[data-editor-canvas] [data-editor-empty="root"]')
    .getByRole('button', { name: 'Add', exact: true })
    .click();
  await expect(page.getByText('1 node · valid')).toBeVisible();
}
async function previews(page: Page) {
  await openLibrary(page);
  await library(page)
    .locator(
      '[data-segmented-control-id="editor-palette-view"] [data-segment-value="grid"]',
    )
    .click();
  await library(page).locator('[data-editor-palette-filter]').fill('Order');
}

async function drag(page: Page, key: string) {
  await openLibrary(page);
  const source = tile(page, key);
  await source.scrollIntoViewIfNeeded();
  const from = (await source.boundingBox())!;
  const to = (await page.locator('[data-editor-canvas]').boundingBox())!;
  await page.mouse.move(from.x + 20, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + from.height / 2, { steps: 3 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height * 0.8, {
    steps: 12,
  });
  await page.mouse.up();
}

test('shows downstream JSON samples, package schematics and host icons across viewport sizes', async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1440, height: 900 });
  const assetLoad = page.waitForResponse(
    (response) =>
      response.url().includes('order-preview-badge.svg') &&
      (response.headers()['content-type'] ?? '').includes('image/svg+xml'),
  );
  await open(page);
  await previews(page);
  const card = tile(page, 'order-card').locator('[data-library-order-sample]');
  const schematic = tile(page, 'order-workspace').locator(
    '[data-order-schematic]',
  );
  const marker = tile(page, 'order-marker').locator(
    '[data-editor-palette-thumb]',
  );
  await expect(card).toHaveAttribute('data-status', 'shipped');
  await expect(card).toContainText('Order #1042');
  await expect(card).toContainText('4200');
  await expect(schematic).toBeVisible();
  await expect(
    schematic.locator('image[data-order-asset="inline"]'),
  ).toHaveAttribute(
    'href',
    /(?:order-preview-badge\.svg|^data:image\/svg\+xml)/,
  );
  await expect(
    schematic.locator('image[data-order-asset="uri"]'),
  ).toHaveAttribute('href', /order-preview-badge\.svg/);
  expect((await assetLoad).ok()).toBe(true);
  await expect(marker).toHaveAttribute('data-thumb-empty', '');
  await expect(marker.locator('svg')).toBeVisible();
  const colors = await schematic.evaluate((element) => [
    getComputedStyle(element).color,
    getComputedStyle(
      element.getRootNode() instanceof ShadowRoot
        ? (element.getRootNode() as ShadowRoot).host
        : element,
    ).color,
  ]);
  expect(colors[0]).not.toBe(colors[1]);
  for (const key of ['order-card', 'order-workspace', 'order-marker']) {
    await expect(
      tile(page, key).locator('[data-editor-palette-thumb]'),
    ).toHaveAttribute('inert', '');
    await expect(
      tile(page, key).locator('[data-editor-palette-thumb]'),
    ).toHaveAttribute('aria-hidden', 'true');
  }
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('KF-RQJ15M-library-previews-1440.png'),
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(schematic).toBeVisible();
  const box = await library(page).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: info.outputPath('KF-RQJ15M-library-previews-390.png'),
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(schematic).toBeVisible();
});

test('inserts ordinary components without Library sample props or schematic overrides', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await previews(page);
  const canvas = page.locator('[data-editor-canvas]');
  await drag(page, 'order-card');
  const card = canvas.locator('article[data-status]');
  await expect(card.locator('h3')).toHaveText('OrderCard');
  await expect(card).toHaveAttribute('data-status', 'open');
  await expect(canvas.locator('[data-library-order-sample]')).toHaveCount(0);
  await expect(canvas).not.toContainText('4200');
  await area(page, 'Outline');
  await page.getByRole('treeitem', { name: /Pane/ }).first().click();
  await area(page, 'Children');
  await addChild(page, 'OrderWorkspace', 'content');
  await expect(canvas.locator('[data-order-workspace]')).toBeVisible();
  await expect(canvas).toContainText('Select an order to review it.');
  await expect(canvas.locator('[data-order-schematic]')).toHaveCount(0);
  await area(page, 'Outline');
  await page.getByRole('treeitem', { name: /Pane/ }).first().click();
  await area(page, 'Children');
  await addChild(page, 'OrderMarker', 'content');
  await expect(canvas.locator('[data-order-marker]')).toHaveCount(1);
  await expect(canvas.locator('[data-order-marker]')).toBeHidden();
  await area(page, 'Outline');
  await expect(
    page.getByRole('treeitem', { name: /OrderMarker/ }),
  ).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('KF-RQJ15M-inserted-components-1440.png'),
    animations: 'disabled',
  });
});
