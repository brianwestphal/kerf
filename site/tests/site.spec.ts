import { expect, test } from '@playwright/test';

const preservedRoutes = [
  './',
  'alternatives/',
  'api/',
  'demo/',
  'docs/component-packages/',
  'docs/dev-warnings/',
  'docs/eslint-plugin/',
  'docs/events/',
  'docs/jsx/',
  'docs/overview/',
  'docs/reactivity/',
  'docs/render/',
  'docs/stores/',
  'docs/svg/',
  'docs/ui-package/',
  'examples/basics/',
  'examples/basics/01-counter/',
  'examples/basics/02-computed-totals/',
  'examples/basics/03-store/',
  'examples/basics/04-mount-delegate/',
  'examples/basics/05-keyed-list/',
  'examples/basics/06-capture-delegate/',
  'examples/basics/07-morph-skip/',
  'examples/basics/08-svg-toelement/',
  'examples/basics/09-raw-sanitize/',
  'examples/complete/',
  'examples/complete/chat/',
  'examples/complete/dashboard/',
  'examples/complete/kanban/',
  'examples/complete/live-poll/',
  'examples/complete/markdown-editor/',
  'examples/complete/router/',
  'examples/complete/row-selector/',
  'examples/complete/todomvc/',
  'examples/complete/virtual-list/',
  'getting-started/',
  'migrating/',
  'migrating/alpine/',
  'migrating/angular/',
  'migrating/astro/',
  'migrating/htmx/',
  'migrating/incremental/',
  'migrating/jquery/',
  'migrating/lit/',
  'migrating/preact/',
  'migrating/react/',
  'migrating/redux/',
  'migrating/solid/',
  'migrating/svelte/',
  'migrating/vanjs/',
  'migrating/vue/',
  'run/cart-htmx/',
  'run/chat/',
  'run/counter-store/',
  'run/dashboard/',
  'run/kanban/',
  'run/live-poll/',
  'run/markdown-editor/',
  'run/router/',
  'run/row-selector/',
  'run/todomvc/',
  'run/virtual-list/',
  'use-cases/',
  'why-kerf/',
] as const;

test('keeps every established public page directly loadable', async ({ request }) => {
  for (const route of preservedRoutes) {
    const response = await request.get(route);
    expect(response.ok(), `${route} should remain a direct-load URL`).toBe(true);
  }
  const legacy = await request.get('examples/basics/09-raw-sanitise/', { maxRedirects: 0 });
  expect(legacy.ok()).toBe(true);
  expect(await legacy.text()).toContain('/kerf/examples/basics/09-raw-sanitize/');
});

test('ships prerendered content and upgrades navigation to an SPA', async ({ page, request }, testInfo) => {
  const response = await request.get('./');
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain('Reactive UI that touches only the bytes that changed.');

  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Static at the door. Reactive once you’re inside.' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`homepage-${testInfo.project.name}.png`), fullPage: true });
  await page.evaluate(() => (window as typeof window & { __kerfSpaSentinel?: string }).__kerfSpaSentinel = 'preserved');
  await page.getByRole('link', { name: 'Get started' }).click();
  await expect(page).toHaveURL(/\/kerf\/getting-started\/$/);
  await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible();
  expect(await page.evaluate(() => (window as typeof window & { __kerfSpaSentinel?: string }).__kerfSpaSentinel)).toBe('preserved');
});

test('loads the generated search index only after a query', async ({ page }, testInfo) => {
  const pagefindRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/pagefind/')) pagefindRequests.push(request.url());
  });

  await page.goto('./');
  expect(pagefindRequests).toHaveLength(0);
  await page.getByRole('button', { name: 'Search documentation' }).click();
  await page.getByRole('searchbox', { name: 'Search documentation' }).fill('signals');
  await expect(page.getByRole('option').first()).toBeVisible();
  expect(pagefindRequests.length).toBeGreaterThan(0);
  await expect(page.locator('[data-component="toolbar"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`search-${testInfo.project.name}.png`), fullPage: true });
});

test('reactive showcase switches @kerfjs/ui states in place', async ({ page }) => {
  await page.goto('./');
  const panel = page.locator('.kerf-showcase-host');
  await panel.locator('[data-component="state-banner"]').evaluate((node) => {
    (window as typeof window & { __kerfShowcaseNode?: Element }).__kerfShowcaseNode = node;
  });
  await page.getByRole('button', { name: 'Lazy search' }).click();
  await expect(page.getByText('Search waits until you need it')).toBeVisible();
  expect(await page.evaluate(() => (window as typeof window & { __kerfShowcaseNode?: Element }).__kerfShowcaseNode?.isConnected)).toBe(true);
});
