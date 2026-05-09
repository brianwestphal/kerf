/**
 * KF-78 — MutationObserver-based "minimum mutations" measurement.
 *
 * For each documented scenario we count the live DOM mutations a re-render
 * produces and compare against the theoretical minimum for that change.
 * The README claims kerf's diff is "near-minimum"; these tests pin numbers
 * to that claim so a future regression that, say, replaces an entire row
 * instead of mutating one attribute fails loudly.
 *
 * Cross-framework comparison (vs Solid / Preact / Lit) is the scope of
 * KF-82; this ticket is scoped to kerf-only mutation counts.
 */

import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
});

interface MutationSummary {
  total: number;
  characterData: number;
  attributes: number;
  childListAdded: number;
  childListRemoved: number;
}

test.beforeEach(async ({ page }) => {
  await page.evaluate(() => {
    (window as any).measure = (setup: (root: HTMLElement) => () => void): MutationSummary => {
      const root = document.getElementById('root') as HTMLElement;
      root.innerHTML = '';
      const post = setup(root);
      const mutations: MutationRecord[] = [];
      const obs = new MutationObserver((records) => mutations.push(...records));
      obs.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
      post();
      obs.takeRecords().forEach((r) => mutations.push(r));
      obs.disconnect();
      let characterData = 0, attributes = 0, childListAdded = 0, childListRemoved = 0;
      for (const m of mutations) {
        if (m.type === 'characterData') characterData++;
        else if (m.type === 'attributes') attributes++;
        else {
          childListAdded += m.addedNodes.length;
          childListRemoved += m.removedNodes.length;
        }
      }
      return { total: mutations.length, characterData, attributes, childListAdded, childListRemoved };
    };
  });
});

test('text node update deep in a static tree → exactly 1 characterData mutation', async ({ page }) => {
  const summary = await page.evaluate<MutationSummary>(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    return (window as any).measure((root: HTMLElement) => {
      const count = signal(0);
      mount(root, () =>
        jsx('div', {
          children: jsx('section', {
            children: jsx('p', { children: jsx('span', { children: count.value }) }),
          }),
        }),
      );
      return () => { count.value = 1; };
    });
  });
  expect(summary.characterData).toBe(1);
  expect(summary.attributes).toBe(0);
  expect(summary.childListAdded).toBe(0);
  expect(summary.childListRemoved).toBe(0);
});

test('attribute change on one element → exactly 1 attributes mutation', async ({ page }) => {
  const summary = await page.evaluate<MutationSummary>(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    return (window as any).measure((root: HTMLElement) => {
      const cls = signal('a');
      mount(root, () =>
        jsx('div', {
          children: jsx('button', { className: cls.value, children: 'click' }),
        }),
      );
      return () => { cls.value = 'b'; };
    });
  });
  expect(summary.attributes).toBe(1);
  expect(summary.characterData).toBe(0);
  expect(summary.childListAdded).toBe(0);
  expect(summary.childListRemoved).toBe(0);
});

test('row insert mid-list via each() → exactly 1 added node, no other mutations', async ({ page }) => {
  const summary = await page.evaluate<MutationSummary>(() => {
    const { mount, signal, each } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    return (window as any).measure((root: HTMLElement) => {
      const a = { id: 'a', label: 'A' };
      const b = { id: 'b', label: 'B' };
      const c = { id: 'c', label: 'C' };
      const rows = signal([a, c]);
      mount(root, () =>
        jsx('ul', {
          children: each(rows.value, (r: any) => jsx('li', { 'data-key': r.id, children: r.label })),
        }),
      );
      return () => { rows.value = [a, b, c]; };
    });
  });
  expect(summary.childListAdded).toBe(1);
  expect(summary.childListRemoved).toBe(0);
  expect(summary.characterData).toBe(0);
  expect(summary.attributes).toBe(0);
});

test('row remove from middle of list via each() → exactly 1 removed node, no other mutations', async ({ page }) => {
  const summary = await page.evaluate<MutationSummary>(() => {
    const { mount, signal, each } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    return (window as any).measure((root: HTMLElement) => {
      const a = { id: 'a', label: 'A' };
      const b = { id: 'b', label: 'B' };
      const c = { id: 'c', label: 'C' };
      const rows = signal([a, b, c]);
      mount(root, () =>
        jsx('ul', {
          children: each(rows.value, (r: any) => jsx('li', { 'data-key': r.id, children: r.label })),
        }),
      );
      return () => { rows.value = [a, c]; };
    });
  });
  expect(summary.childListRemoved).toBe(1);
  expect(summary.childListAdded).toBe(0);
  expect(summary.characterData).toBe(0);
  expect(summary.attributes).toBe(0);
});

test('row reorder via each() (LIS pass): swap two ends → minimum insertBefore moves', async ({ page }) => {
  // For [a,b,c,d,e] → [e,b,c,d,a] (swap ends), the LIS is [b,c,d] (kept in
  // place); only `a` and `e` need to move. `insertBefore` of an existing node
  // produces childListRemoved=1 + childListAdded=1 per move (the engine
  // reports a remove + an add). Two moves → 2 added + 2 removed.
  const summary = await page.evaluate<MutationSummary>(() => {
    const { mount, signal, each } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    return (window as any).measure((root: HTMLElement) => {
      const a = { id: 'a' }; const b = { id: 'b' }; const c = { id: 'c' };
      const d = { id: 'd' }; const e = { id: 'e' };
      const rows = signal([a, b, c, d, e]);
      mount(root, () =>
        jsx('ul', {
          children: each(rows.value, (r: any) => jsx('li', { 'data-key': r.id, children: r.id })),
        }),
      );
      return () => { rows.value = [e, b, c, d, a]; };
    });
  });
  // ≤ 2 moves = ≤ 4 mutations total (each insertBefore is 1 add + 1 remove).
  expect(summary.childListAdded).toBeLessThanOrEqual(2);
  expect(summary.childListRemoved).toBeLessThanOrEqual(2);
  expect(summary.characterData).toBe(0);
  expect(summary.attributes).toBe(0);
});

test('no-op re-render (same JSX, no signal change to read deps) → zero mutations', async ({ page }) => {
  const summary = await page.evaluate<MutationSummary>(() => {
    const { mount, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;
    return (window as any).measure((root: HTMLElement) => {
      const tick = signal(0);
      const unread = signal('hi');  // never read by render → not tracked
      mount(root, () => {
        void tick.value;
        return jsx('div', { children: jsx('span', { children: 'static' }) });
      });
      // Writing to a signal not read by the render fn must NOT trigger
      // anything — render didn't depend on it.
      return () => { unread.value = 'bye'; };
    });
  });
  expect(summary.total).toBe(0);
});
