import { expect, test } from '@playwright/test';

import { catalog } from '../../ux-demo/catalog.js';

test('catalog routes every production component family and supports its stateful controls', async ({ page, browserName }) => {
  await page.goto('/');
  await expect(page.locator('.catalog-sidebar [data-component="menu-header"]')).toHaveCount(5);
  await expect(page.locator('.catalog-sidebar [data-component="menu-item"]')).toHaveCount(catalog.length);
  await expect(page.locator('[data-demo="lucide-icon"]')).toBeVisible();
  for (const entry of catalog) {
    await page.goto(`/?component=${entry.id}`);
    await expect(page.locator(`[data-demo="${entry.id}"]`)).toBeVisible();
  }

  await page.locator('.catalog-sidebar [data-item-id="menu"]').click();
  await expect(page).toHaveURL(/component=menu/);
  await expect(page.locator('[data-demo="menu"]')).toBeVisible();
  await expect(page.locator('.catalog-sidebar [data-item-id="menu"]')).toHaveAttribute('aria-current', 'page');
  const menuRelationships = page.locator('[data-relationships-for="menu"]');
  await expect(menuRelationships.locator('[name="related-component"]')).toHaveCount(1);
  await expect(page.getByText('Related components', { exact: true })).toHaveCount(1);
  await menuRelationships.locator('[name="related-component"]').click();
  await expect(page.getByRole('group', { name: 'Uses' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('[name="related-component"]').evaluate((element) => {
    const select = element as HTMLElement & { value: string };
    select.value = 'menu-item';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page).toHaveURL(/component=menu-item/);
  await expect(page.locator('[data-demo="menu-item"]')).toBeVisible();
  await page.locator('[name="related-component"]').click();
  await expect(page.getByRole('group', { name: 'Used by' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/?component=resize');
  await expect(page.locator('[data-relationships-for="resize"]')).toHaveCount(0);

  const themeButton = page.locator('[data-action="toggle-theme"]');
  await themeButton.click();
  await expect(themeButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveClass(/demo-dark/);
  await page.locator('[data-action="toggle-contrast"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-contrast/);
  await page.locator('[data-action="toggle-motion"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-reduced-motion/);

  await page.locator('.catalog-sidebar [data-item-id="tabs"]').click();
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').click();
  await expect(page.locator('[data-action="select-tab"][data-tab-id="guidelines"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').press('Backspace');
  await expect(page.locator('.catalog-log')).toHaveText('Close requested for guidelines');
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').press('ArrowRight');
  await expect(page.locator('[data-action="select-tab"][data-tab-id="catalog"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('[data-action="select-tab"][data-tab-id="catalog"]').press('Home');
  await expect(page.locator('[data-action="select-tab"][data-tab-id="library"]')).toHaveAttribute('aria-selected', 'true');

  await page.locator('.catalog-sidebar [data-item-id="feedback"]').click();
  await page.locator('[data-action="cycle-tone"]').click();
  await page.locator('[data-action="cycle-tone"]').click();
  await page.locator('[data-action="cycle-tone"]').click();
  await expect(page.locator('[data-component="state-banner"]')).toHaveAttribute('data-tone', 'danger');
  await expect(page.locator('[data-component="state-banner"]')).toHaveAttribute('role', 'alert');

  await page.goto('/?component=resize');
  const handle = page.locator('[data-kui-resize-handle]');
  await handle.focus();
  await handle.press('ArrowRight');
  await expect(page.locator('[data-region-size]')).toHaveText('292px');
  await handle.press('End');
  await expect(page.locator('[data-region-size]')).toHaveText('420px');

  await page.goto('/?component=select');
  await page.locator('[name="rendering-balance"]').evaluate((element) => {
    const select = element as HTMLElement & { value: string };
    select.value = 'explicit';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('[data-select-value]')).toHaveText('explicit');

  if (browserName === 'chromium') {
    await page.goto('/?component=toolbar');
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.screenshot({ path: 'test-results/ux-demo-wide.png', fullPage: true });
    await page.locator('[data-action="toggle-theme"]').click();
    await page.screenshot({ path: 'test-results/ux-demo-dark.png', fullPage: true });
    await page.goto('/?component=toolbar');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/ux-demo-narrow.png', fullPage: true });
  }
});

test('matches Hot Sheet menu and toolbar control geometry', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=menu');
  const menu = page.locator('[data-demo="menu"]');
  const alignment = await menu.evaluate((node) => {
    const action = node.querySelector<HTMLElement>('.kui-menu-header button')!.getBoundingClientRect();
    const row = node.querySelector<HTMLElement>('[data-item-id="projects"]')!.getBoundingClientRect();
    const plus = node.querySelector<HTMLElement>('.kui-menu-header [data-lucide="plus"]')!.getBoundingClientRect();
    const disclosure = node.querySelector<HTMLElement>('[data-item-id="projects"] [data-lucide="chevron-right"]')!.getBoundingClientRect();
    return {
      rightEdge: Math.abs(action.right - row.right),
      iconCenter: Math.abs((plus.left + plus.width / 2) - (disclosure.left + disclosure.width / 2)),
    };
  });
  expect(alignment.rightEdge).toBeLessThanOrEqual(1);
  expect(alignment.iconCenter).toBeLessThanOrEqual(1);
  if (browserName === 'chromium') {
    await menu.screenshot({ path: 'test-results/menu-action-alignment-wide.png' });
    await page.locator('[data-relationships-for="menu"]').screenshot({ path: 'test-results/related-components-selector-wide.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-relationships-for="menu"]').screenshot({ path: 'test-results/related-components-selector-narrow.png' });
    await page.setViewportSize({ width: 1440, height: 900 });
  }

  await page.goto('/?component=toolbar-control-group');
  const demo = page.getByRole('region', { name: 'ToolbarControlGroup demo' });
  await expect(demo.getByRole('heading', { level: 3 })).toHaveText([
    'Segmented choices', 'Popup menu', 'Button group', 'Single button', 'Borderless group',
    'Push button, resting', 'Push button, pressed', 'Dark group',
  ]);
  const groups = demo.locator('[data-component="toolbar-control-group"]');
  await expect(groups).toHaveCount(8);
  const heights = await groups.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  expect(new Set(heights).size).toBe(1);
  await demo.getByRole('button', { name: 'Columns view' }).click();
  await expect(demo.getByRole('button', { name: 'Columns view' })).toHaveAttribute('aria-pressed', 'true');
  await expect(demo.getByRole('button', { name: 'Columns view' })).toHaveCSS('color', 'rgb(30, 110, 244)');
  await demo.locator('wa-button[aria-label="Sort tickets"]').click();
  await expect(demo.getByText('Recently updated', { exact: true })).toBeVisible();
  await demo.getByText('Priority', { exact: true }).click();
  await expect(page.locator('.catalog-log')).toHaveText('Sorted by priority');
  await expect(demo.getByRole('button', { name: 'Pressed comparison' }).locator('..')).toHaveCSS('background-color', 'rgb(72, 72, 74)');
  await expect(demo.getByRole('group', { name: 'Dark navigation' })).toHaveCSS('border-color', 'rgb(53, 53, 54)');
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/toolbar-control-groups-wide.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(groups).toHaveCount(8);
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/toolbar-control-groups-narrow.png', fullPage: true });
});

test('ships semantic banner palettes with scoped overrides', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=state-banner');
  const banners = page.locator('[data-demo="state-banner"] [data-component="state-banner"]');
  await expect(banners).toHaveCount(6);
  const styles = await banners.evaluateAll((nodes) => nodes.map((node) => {
    const style = window.getComputedStyle(node);
    return { tone: node.getAttribute('data-tone'), color: style.color, background: style.backgroundColor, border: style.borderColor };
  }));
  expect(styles.slice(0, 5).map(({ color }) => color)).toEqual([
    'rgb(29, 29, 31)', 'rgb(30, 110, 244)', 'rgb(0, 137, 50)', 'rgb(161, 106, 0)', 'rgb(194, 11, 32)',
  ]);
  expect(new Set(styles.slice(0, 5).map(({ background }) => background)).size).toBe(5);
  expect(new Set(styles.slice(0, 5).map(({ border }) => border)).size).toBe(5);
  expect(styles[5]!.color).toBe('rgb(109, 63, 156)');
  expect(styles[1]!.color).toBe('rgb(30, 110, 244)');
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/state-banner-palettes-wide.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(banners.last()).toBeVisible();
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/state-banner-palettes-narrow.png', fullPage: true });
});

test('reorders and horizontally scrolls controlled TabBars', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto('/?component=tab-bar');
  const bar = page.locator('[data-component="tab-bar"]');
  const strip = bar.locator('[data-kui-tab-list]');
  await expect(bar.getByRole('tab')).toHaveCount(7);
  expect(await strip.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  const integration = bar.getByRole('tab', { name: 'Integration patterns' });
  await integration.click();
  await expect(integration).toHaveAttribute('aria-selected', 'true');
  await integration.press('Alt+Shift+ArrowRight');
  await expect(page.locator('[data-tab-order]')).toContainText('Release notes · Integration patterns');
  await expect(bar.getByRole('tab', { name: 'Integration patterns' })).toBeFocused();
  await bar.getByRole('button', { name: 'Add tab' }).click();
  await expect(bar.getByRole('tab')).toHaveCount(8);
  const added = bar.getByRole('tab', { name: 'New tab 8' });
  await expect(added).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => strip.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await added.press('Backspace');
  await expect(bar.getByRole('tab')).toHaveCount(7);
  const source = bar.locator('.kui-app-tab[data-tab-id="components"]');
  const target = bar.locator('.kui-app-tab[data-tab-id="design-guidance"]');
  await source.dragTo(target, { targetPosition: { x: 100, y: 16 } });
  await expect(page.locator('[data-tab-order]')).toContainText('Design guidance · Components');
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/tab-bar-overflow-wide.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await strip.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/tab-bar-overflow-narrow.png', fullPage: true });
});

test('autoscrolls the TabBar while a dragged tab rests near either scroll edge', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=tab-bar');
  const frame = page.locator('.demo-tab-bar-frame');
  const bar = frame.locator('[data-component="tab-bar"]');
  const strip = bar.locator('[data-kui-tab-list]');
  const source = bar.locator('.kui-app-tab').first();
  const stripBounds = await strip.boundingBox();
  expect(stripBounds).not.toBeNull();
  await source.dispatchEvent('dragstart');
  await strip.dispatchEvent('dragover', { clientX: stripBounds!.x + stripBounds!.width - 3, clientY: stripBounds!.y + stripBounds!.height / 2 });
  await expect.poll(() => strip.evaluate((node) => node.scrollLeft)).toBeGreaterThan(24);
  if (browserName === 'chromium') await frame.screenshot({ path: 'test-results/tab-bar-edge-autoscroll-end.png' });
  await source.dispatchEvent('dragend');
  await expect(bar.locator('[data-tab-autoscroll]')).toHaveCount(0);

  const startScroll = await strip.evaluate((node) => {
    node.scrollLeft = node.scrollWidth - node.clientWidth;
    return node.scrollLeft;
  });
  await source.dispatchEvent('dragstart');
  await strip.dispatchEvent('dragover', { clientX: stripBounds!.x + 3, clientY: stripBounds!.y + stripBounds!.height / 2 });
  await expect.poll(() => strip.evaluate((node) => node.scrollLeft)).toBeLessThan(startScroll - 24);
  if (browserName === 'chromium') await frame.screenshot({ path: 'test-results/tab-bar-edge-autoscroll-start.png' });
  await source.dispatchEvent('dragend');
  await expect(bar.locator('[data-tab-autoscroll]')).toHaveCount(0);
});
