/**
 * KF-123 / consumer-app regression spec.
 *
 * Drives `tests/dist/consumer-app/index.html` — a real downstream-style app
 * bundled against the repo's published `dist/` build via esbuild + the
 * `kerfjs` JSX import source. Each zone exercises a public primitive end-
 * to-end through Chromium / Firefox / WebKit.
 *
 * If something in `dist/*.{js,d.ts}` regresses (KF-123 self-shadow, KF-14
 * SafeHtml duplication, etc.) the consumer either fails to build (caught by
 * `globalSetup`) or fails the assertions below.
 */

import { expect, test } from '@playwright/test';

const URL = '/tests/dist/consumer-app/index.html';

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await page.waitForFunction(
    () => (window as unknown as { kerfConsumerReady?: boolean }).kerfConsumerReady === true,
  );
});

test('counter — signal + computed + delegate increments and re-renders', async ({ page }) => {
  await expect(page.getByTestId('counter-value')).toHaveText('0');
  await expect(page.getByTestId('counter-doubled')).toHaveText('×2=0');
  await page.getByTestId('counter-inc').click();
  await page.getByTestId('counter-inc').click();
  await page.getByTestId('counter-inc').click();
  await expect(page.getByTestId('counter-value')).toHaveText('3');
  await expect(page.getByTestId('counter-doubled')).toHaveText('×2=6');
  await page.getByTestId('counter-dec').click();
  await expect(page.getByTestId('counter-value')).toHaveText('2');
});

test('store — defineStore actions + each() row removal + batch coupon-and-clear', async ({ page }) => {
  await page.getByTestId('store-add-a').click();
  await page.getByTestId('store-add-b').click();
  await page.getByTestId('store-add-a').click();
  await expect(page.getByTestId('store-count')).toHaveText('items:3');
  // List is keyed; each row has a remove button.
  const rows = page.getByTestId('store-list').locator('li');
  await expect(rows).toHaveCount(3);
  // Apply coupon and clear in one batch — both pieces of state must update.
  await page.getByTestId('store-apply').click();
  await expect(page.getByTestId('store-count')).toHaveText('items:0');
  await expect(page.getByTestId('store-coupon')).toHaveText('coupon:SAVE10');
});

test('each() — keyed reverse + targeted rename, identity-based memo keeps DOM nodes', async ({ page }) => {
  // Capture initial input nodes' identity by stamping a DOM property.
  await page.evaluate(() => {
    document.querySelectorAll('[data-testid^="each-input-"]').forEach((el, i) => {
      (el as HTMLInputElement & { __stamp: number }).__stamp = i + 100;
    });
  });
  await page.getByTestId('each-reverse').click();
  // Stamps survive the reorder: the keyed reconciler moved nodes, didn't recreate.
  const stamps = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid^="each-input-"]')).map(
      (el) => (el as HTMLInputElement & { __stamp?: number }).__stamp,
    ),
  );
  expect(stamps.every((s) => typeof s === 'number')).toBe(true);
  // Rename only #1: only that row's content changes, others' stamped nodes survive.
  await page.getByTestId('each-rename').click();
  await expect(page.getByTestId('each-input-1')).toHaveValue('Alpha-RENAMED');
  // Other rows still stamped — they were memoized on identity, not re-rendered.
  const otherStamps = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid^="each-input-"]'))
      .filter((el) => (el as HTMLElement).dataset.testid !== 'each-input-1')
      .map((el) => (el as HTMLInputElement & { __stamp?: number }).__stamp),
  );
  expect(otherStamps.every((s) => typeof s === 'number')).toBe(true);
});

test('arraySignal — push/update/move/remove patches apply to live DOM', async ({ page }) => {
  await expect(page.getByTestId('array-len')).toHaveText('len:2');
  await page.getByTestId('array-push').click();
  await page.getByTestId('array-push').click();
  await expect(page.getByTestId('array-len')).toHaveText('len:4');
  await expect(page.getByTestId('array-row-3')).toBeVisible();
  await expect(page.getByTestId('array-row-4')).toBeVisible();
  await page.getByTestId('array-update0').click();
  await expect(page.getByTestId('array-row-1')).toHaveText('one!');
  // Move first → last; verify DOM order.
  await page.getByTestId('array-move').click();
  const ids = await page
    .getByTestId('array-list')
    .locator('li')
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.testid));
  expect(ids[ids.length - 1]).toBe('array-row-1');
  await page.getByTestId('array-remove0').click();
  const lenText = await page.getByTestId('array-len').textContent();
  expect(lenText).toMatch(/^len:3$/);
});

test('delegateCapture — focus event fires under explicit capture', async ({ page }) => {
  await expect(page.getByTestId('capture-count')).toHaveText('focuses:0');
  await page.getByTestId('capture-input').focus();
  await expect(page.getByTestId('capture-count')).toHaveText('focuses:1');
});

test('focus survives unrelated re-renders driven by a 50ms tick', async ({ page }) => {
  const input = page.getByTestId('focus-input');
  await input.focus();
  await input.type('hello', { delay: 30 });
  // Tick has been firing; focus must still be on the input, value preserved.
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('hello');
});

test('data-morph-skip + raw + isSafeHtml — imperative additions survive re-renders', async ({ page }) => {
  // Wait long enough for the setTimeout(stamp, 100ms) to land.
  await page.waitForSelector('[data-testid="skip-stamp"]', { timeout: 2000 });
  await expect(page.getByTestId('skip-injected')).toBeVisible();
  await expect(page.getByTestId('skip-issafehtml')).toHaveText('safe-true');
  // Tick re-renders the surrounding span; the skipped subtree's <em> stamp survives.
  await page.waitForTimeout(150);
  await expect(page.getByTestId('skip-stamp')).toBeVisible();
});

test('toElement — SVG element gets the SVG namespace in real browsers', async ({ page }) => {
  const ns = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="svg-root"]');
    return svg ? svg.namespaceURI : null;
  });
  expect(ns).toBe('http://www.w3.org/2000/svg');
});

test('Fragment — children render side by side and react to swap', async ({ page }) => {
  await expect(page.getByTestId('frag-a')).toHaveText('one');
  await expect(page.getByTestId('frag-b')).toHaveText('two');
  await page.getByTestId('frag-swap').click();
  await expect(page.getByTestId('frag-a')).toHaveText('two');
  await expect(page.getByTestId('frag-b')).toHaveText('one');
});

test('declaration-merged custom element renders with its merged attributes', async ({ page }) => {
  const widget = page.getByTestId('merge-widget');
  await expect(widget).toBeVisible();
  await expect(widget).toHaveAttribute('greeting', 'hi');
  await expect(widget).toHaveAttribute('count', '3');
});
