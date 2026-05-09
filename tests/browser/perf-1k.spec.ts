/**
 * KF-82 (kerf-side, partial) — krausest-style perf scenarios.
 *
 * Measures the same scenarios as the krausest js-framework-benchmark suite
 * but kerf-only, against the published `dist/`. Cross-framework comparison
 * (Solid / Preact+signals / Lit / van.js) lives in `bench/setup.sh` +
 * `bench/run.sh`; this test exists as a regression pin for kerf's own
 * numbers and as a Playwright-friendly probe that doesn't require the
 * krausest webdriver-ts harness.
 *
 * Tests are time-noisy (Playwright doesn't suppress CPU jitter), so the
 * assertions are loose upper bounds — they catch order-of-magnitude
 * regressions, not micro-fluctuations. Refine with multiple runs +
 * percentiles if you need tighter numbers.
 */

import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
});

interface PerfResult {
  createMs: number;
  partialUpdateMs: number;
  selectRowMs: number;
  swapRowsMs: number;
  clearMs: number;
  rows: number;
}

test('1000-row keyed list — create / partial-update / select / swap / clear timings', async ({ page }, testInfo) => {
  const result = await page.evaluate(() => {
    const { mount, signal, each } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    const root = document.getElementById('root')!;

    interface Row { id: number; label: string }
    let nextId = 1;
    const labels = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint'];
    const colors = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black'];
    const nouns = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger'];
    const rng = () => Math.floor(Math.random() * 10);
    const buildRows = (count: number): Row[] => {
      const out: Row[] = new Array(count);
      for (let i = 0; i < count; i++) {
        out[i] = { id: nextId++, label: `${labels[rng()]} ${colors[rng()]} ${nouns[rng()]}` };
      }
      return out;
    };

    const rows = signal([] as Row[]);
    const selectedId = signal(null as number | null);

    mount(root, () =>
      jsx('table', {
        children: jsx('tbody', {
          children: each(
            rows.value,
            (r: Row) =>
              jsx('tr', {
                'data-key': r.id,
                className: r.id === selectedId.value ? 'danger' : '',
                children: [
                  jsx('td', { className: 'col-md-1', children: r.id }),
                  jsx('td', { className: 'col-md-4', children: jsx('a', { 'data-action': 'select', 'data-id': r.id, children: r.label }) }),
                ],
              }),
            (r: Row) => (r.id === selectedId.value ? 1 : 0),
          ),
        }),
      }),
    );

    const time = (fn: () => void): number => {
      const start = performance.now();
      fn();
      return performance.now() - start;
    };

    // create 1000 rows
    const createMs = time(() => { rows.value = buildRows(1000); });

    // partial-update — every 10th row's label
    const partialUpdateMs = time(() => {
      rows.value = (rows.value as Row[]).map((r: Row, i: number) => i % 10 === 0 ? { ...r, label: r.label + '!!!' } : r);
    });

    // select row 500 (toggles className via the cacheKey pattern)
    const selectRowMs = time(() => { selectedId.value = (rows.value as Row[])[500].id; });

    // swap rows 1 and 998
    const swapRowsMs = time(() => {
      const next = [...(rows.value as Row[])];
      const t = next[1]; next[1] = next[998]; next[998] = t;
      rows.value = next;
    });

    // clear
    const clearMs = time(() => { rows.value = []; });

    return { createMs, partialUpdateMs, selectRowMs, swapRowsMs, clearMs, rows: 1000 } as PerfResult;
  });

  // Generous bounds (Playwright + happy-dom-like environment timing is noisy).
  // These pin order-of-magnitude regressions, not micro-fluctuations.
  expect(result.createMs).toBeLessThan(2000);
  expect(result.partialUpdateMs).toBeLessThan(500);
  expect(result.selectRowMs).toBeLessThan(50);
  expect(result.swapRowsMs).toBeLessThan(100);
  expect(result.clearMs).toBeLessThan(500);

  testInfo.annotations.push({
    type: 'kerf-1k-perf',
    description: JSON.stringify(result),
  });
  console.log(`[${testInfo.project.name}] kerf 1k:`, result);
});
