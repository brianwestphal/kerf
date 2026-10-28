import { expect, test } from '@playwright/test';

// KF-6GT5QY: an application's own dev server hosts the editor through
// `@kerfjs/ui/vite-editor`, and its own component (OrderCard, which lives in
// app source) is placed, previewed with its real function, and inspected.
const EDITOR = 'http://127.0.0.1:42918/__kerf-ui-editor/';

test('an app’s dev server hosts the editor with its own components', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(EDITOR);
  const canvas = page.locator('[data-editor-canvas]');
  // A new document is an empty Pane.
  await expect(page.getByText('1 nodes · valid')).toBeVisible();

  // The palette lists the app's component under Application.
  await expect(page.getByText('Application', { exact: true })).toBeVisible();
  await expect(
    page.locator(
      '[data-action="editor-show-component"][data-item-id="orders-app:order-card"]',
    ),
  ).toBeVisible();

  // Add an OrderCard to the empty Pane's content.
  await page.getByRole('treeitem', { name: /Pane/ }).click();
  await page.locator('[data-editor-add="zone"]').click();
  await page.getByRole('option', { name: 'content' }).click();
  await page.locator('[data-editor-add="component"]').click();
  await page.getByRole('option', { name: 'OrderCard' }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  // It renders through the app's own function, with seeded props.
  const card = canvas.locator('article[data-status]');
  await expect(card).toHaveAttribute('data-status', 'open');
  await expect(card.locator('h3')).toHaveText('OrderCard');

  // The inspector edits its props from the app's prop catalog.
  await page.locator('[data-editor-prop="status"]').click();
  await page.getByRole('option', { name: 'shipped' }).click();
  await expect(card).toHaveAttribute('data-status', 'shipped');
  const title = page.locator('[data-editor-prop="title"]').getByRole('textbox');
  await title.fill('Order 1024');
  await title.press('Enter');
  await expect(card.locator('h3')).toHaveText('Order 1024');
  await expect(page.getByText('2 nodes · valid')).toBeVisible();
  // KF-F29M9E: the card sits flush with the canvas, and the whole selection
  // ring still shows inside it.
  const [ringBox, canvasBox] = await Promise.all([
    page.locator('.kui-editor__selection').boundingBox(),
    canvas.boundingBox(),
  ]);
  expect(ringBox!.x).toBeGreaterThanOrEqual(canvasBox!.x + 4);
  expect(ringBox!.y).toBeGreaterThanOrEqual(canvasBox!.y + 4);
  expect(ringBox!.x + ringBox!.width).toBeLessThanOrEqual(
    canvasBox!.x + canvasBox!.width - 4,
  );
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-6gt5qy-editor-host-app-component-1440.png'),
    animations: 'disabled',
  });
});
