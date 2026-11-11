import { expect, type Page, test } from '@playwright/test';

import { FIXTURE_EDITOR_URL } from '../../ports.js';
import { area, openLibrary } from './areas.js';
import { showConfigure, showProp } from './build.js';

// KF-6GT5QY: an application's own dev server hosts the editor through
// `@kerfjs/ui/vite-editor`, and its own component (OrderCard, which lives in
// app source) is placed, previewed with its real function, and inspected.
const EDITOR = FIXTURE_EDITOR_URL;

/**
 * Opens the hosted editor on its first draft, which has no root
 * (KF-PK3GVY), and adds the empty state's default Pane as the root.
 */
async function openWithPane(page: Page) {
  await page.goto(EDITOR);
  const empty = page.locator('[data-editor-canvas] [data-editor-empty="root"]');
  await expect(empty).toContainText('Start with a component');
  await empty.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('1 node · valid')).toBeVisible();
}

test('an app’s dev server hosts the editor with its own components', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWithPane(page);
  const canvas = page.locator('[data-editor-canvas]');

  // The palette lists the app's component under Application.
  await openLibrary(page);
  // The root Pane is selected, so the Inspector's pickers group it too.
  await expect(
    page.getByRole('heading', { name: 'Application', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(
      '[data-action="editor-show-component"][data-item-id="orders-app:order-card"]',
    ),
  ).toBeVisible();

  // Add an OrderCard to the empty Pane's content.
  await area(page, 'Outline');
  await page.getByRole('treeitem', { name: /Pane/ }).click();
  await area(page, 'Children');
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
  await showProp(page, 'status');
  await page.locator('[data-editor-prop="status"]').click();
  await page.getByRole('option', { name: 'shipped' }).click();
  await expect(card).toHaveAttribute('data-status', 'shipped');
  await showProp(page, 'title');
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

// KF-EXA2WH: the app's own field editor, registered through the Vite
// plugin's `fieldEditors` option, edits its ShippingWindow type.
test('an app’s field editor edits its own type', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWithPane(page);
  await area(page, 'Outline');
  await page.getByRole('treeitem', { name: /Pane/ }).click();
  await area(page, 'Children');
  await page.locator('[data-editor-add="zone"]').click();
  await page.getByRole('option', { name: 'content' }).click();
  await page.locator('[data-editor-add="component"]').click();
  await page.getByRole('option', { name: 'OrderCard' }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await area(page, 'Properties');

  await showConfigure(page, 'Configure shipping');
  await page.getByRole('button', { name: 'Configure shipping' }).click();
  const stack = page.locator('#editor-inspector-stack');
  await stack.getByRole('button', { name: 'This week' }).click();
  const shipping = page.locator('[data-editor-canvas] [data-shipping]');
  await expect(shipping).toHaveText('Mon–Fri');
  // The editor's type-driven form sits beside the presets.
  const to = stack
    .locator(`[data-editor-field='{"prop":"shipping","path":["to"]}']`)
    .getByRole('textbox');
  await to.fill('Thu');
  await to.press('Enter');
  await expect(shipping).toHaveText('Mon–Thu');
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-exa2wh-app-field-editor-1440.png'),
    animations: 'disabled',
  });
});

// KF-60BEEJ: play mode's frame loads the plugin's own page as a play page,
// which renders the document the editor sends (an empty Pane, so it is
// attached but has no size).
test('an app’s dev server plays the document in the stage', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWithPane(page);
  await page.locator('[data-action="editor-play"]').click();
  const frame = page.locator('[data-editor-play-frame]');
  await expect(frame).toHaveAttribute(
    'src',
    /\/__kerf-ui-editor\/\?kerf-ui-play/,
  );
  await expect(
    page
      .frameLocator('[data-editor-play-frame]')
      .locator('[data-kerf-node][data-component="pane"]'),
  ).toBeAttached();
  await page.locator('[data-action="editor-play-done"]').click();
  await expect(frame).toHaveCount(0);
});

// KF-RF6RCS: the app's mock handlers (the Vite plugin's `playHandlers`
// module) run in the play frame, and every action fired is logged.
const ordersDocument = {
  schema: 'kerf-ui-document/v1',
  name: 'Orders',
  catalogs: ['@kerfjs/ui'],
  params: {
    orders: {
      type: {
        kind: 'array',
        items: {
          kind: 'object',
          props: [
            { name: 'id', type: { kind: 'string' }, required: true },
            { name: 'title', type: { kind: 'string' }, required: true },
          ],
        },
      },
      default: [
        { id: 'o-1', title: 'Order one' },
        { id: 'o-2', title: 'Order two' },
      ],
    },
    selectedId: { type: { kind: 'string' }, default: 'none' },
  },
  root: {
    id: '01JB8Z1M6Q8E1X9V4S7K2R3T9A',
    name: 'orders',
    type: '@kerfjs/ui:nav-stack',
    props: {
      id: 'orders-stack',
      label: 'Orders',
      views: [
        { key: 'list', toolbar: { title: 'Orders' } },
        { key: 'order', toolbar: { title: 'Order' } },
      ],
    },
    zones: {
      'views.0.content': [
        {
          id: '01JB8Z1M6Q8E1X9V4S7K2R3T9B',
          type: '@kerfjs/ui:list',
          props: { ariaLabel: 'Orders' },
          zones: {
            children: [
              {
                $each: { $param: 'orders' },
                as: 'order',
                key: 'order.id',
                template: {
                  id: '01JB8Z1M6Q8E1X9V4S7K2R3T9C',
                  name: 'orderRow',
                  type: '@kerfjs/ui:list-item',
                  props: {
                    label: { $bind: 'order.title' },
                    action: { $action: 'open-order' },
                  },
                },
              },
            ],
          },
        },
        {
          id: '01JB8Z1M6Q8E1X9V4S7K2R3T9E',
          name: 'refreshButton',
          type: '@kerfjs/ui:button',
          props: { children: 'Refresh', action: { $action: 'refresh' } },
        },
      ],
      'views.1.content': [
        {
          id: '01JB8Z1M6Q8E1X9V4S7K2R3T9F',
          type: '@kerfjs/ui:text',
          props: { children: { $param: 'selectedId' } },
        },
      ],
    },
  },
};

test('an app’s play handler pushes a view from a row, and actions are logged', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(EDITOR);
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: 'orders.kui.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(ordersDocument)),
    });
  await expect(page.getByText(/· 5 nodes · valid$/)).toBeVisible();
  await page.locator('[data-action="editor-play"]').click();
  const view = page.frameLocator('[data-editor-play-frame]');
  // KF-BFE3EC: the stack opens on its root view, the orders, with no Back.
  await expect(view.getByText('Order two')).toBeVisible();
  await expect(view.locator('[data-nav-back]')).toHaveCount(0);
  // The row's action runs the app's handler: it remembers the row and
  // pushes the order's view.
  await view.getByText('Order two').click();
  await expect(view.getByText('o-2', { exact: true })).toBeVisible();
  await view.locator('[data-nav-back]').click();
  // An action with no handler is only logged.
  await view.getByRole('button', { name: 'Refresh' }).click();
  const log = page.locator('[data-action="editor-play-log"]');
  await expect(log).toHaveAttribute('aria-label', 'Action log, 2 new');
  await expect(log.locator('.kui-badge')).toHaveText('2');
  await log.click();
  const surface = page.locator('[data-component="anchored-surface"]');
  const entries = surface.locator('[data-editor-play-log-entry]');
  await expect(entries).toHaveCount(2);
  await expect(entries.nth(0)).toHaveAttribute(
    'data-editor-play-log-entry',
    'missing',
  );
  await expect(entries.nth(0)).toContainText('refresh');
  await expect(entries.nth(0)).toContainText('refreshButton');
  await expect(entries.nth(1)).toHaveAttribute(
    'data-editor-play-log-entry',
    'ran',
  );
  await expect(entries.nth(1)).toContainText('orderRow');
  await expect(log).toHaveAttribute('aria-label', 'Action log');
  // The open log follows new actions live.
  await view.getByText('Order one').click();
  await expect(entries).toHaveCount(3);
  await expect(entries.nth(0)).toContainText('open-order');
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: info.outputPath('kf-rf6rcs-action-log-1440.png'),
    animations: 'disabled',
  });
  // Leaving and playing again starts a fresh log.
  await page.keyboard.press('Escape');
  await page.locator('[data-action="editor-play-done"]').click();
  await page.locator('[data-action="editor-play"]').click();
  await expect(log).toHaveAttribute('aria-label', 'Action log');
  await expect(log.locator('.kui-badge')).toHaveCount(0);
});
