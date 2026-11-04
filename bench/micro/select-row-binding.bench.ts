/**
 * KF-294 — select-row: coarse (cacheKey) vs fine-grained (signal binding).
 *
 * Measures the JS work of a single-row selection flip on a 1,000-row keyed
 * list, two ways:
 *
 *   - COARSE (current idiom): the row class reads `selectedId.value` during
 *     render and `each()` uses it as the cacheKey. A selection flip re-runs
 *     the whole mount render, re-scans all 1k rows' cacheKeys, and walks the
 *     reconciler to update the 2 changed rows.
 *
 *   - FINE (KF-294): the row class is a `computed(() => id === selectedId.value)`
 *     handed straight to the attribute. A selection flip re-runs NO render and
 *     NO reconcile — only the ~2 bound effects whose value changed fire.
 *
 *   - SELECTOR (KF-J3R1G4): the same binding, read through
 *     `selector(selectedId)`. The selector subscribes to `selectedId` once,
 *     so a flip re-evaluates the 2 changed rows' computeds instead of all
 *     1k of them.
 *
 * Plus the create-path cost of each (the bindings wire 1k effects at mount).
 *
 * happy-dom has no layout engine, so this isolates the JS overhead kerf's
 * coarse path pays (render re-run + O(N) cacheKey scan + reconcile walk) that
 * the binding eliminates — not real-browser relayout (both paths update rows
 * in place and avoid table relayout anyway). Run: `npm run bench:micro`.
 */

import { bench, describe } from 'vitest';

import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { computed, signal } from '../../src/reactive.js';
import { selector } from '../../src/selector.js';

interface Row {
  id: number;
  label: string;
}
const N = 1000;
const makeRows = (): Row[] =>
  Array.from({ length: N }, (_, i) => ({ id: i, label: `row ${i}` }));

describe('select-row flip on 1k rows', () => {
  // --- coarse: read selectedId in render + cacheKey ---
  {
    const rows = makeRows();
    const selectedId = signal<number | null>(null);
    const root = document.createElement('div');
    document.body.appendChild(root);
    mount(root, () =>
      jsx('table', {
        children: jsx('tbody', {
          children: each(
            rows,
            (r) =>
              jsx('tr', {
                'data-key': r.id,
                class: r.id === selectedId.value ? 'danger' : '',
                children: jsx('td', { children: String(r.id) }),
              }),
            (r) => r.id === selectedId.value,
          ),
        }),
      }),
    );
    let t = 0;
    bench('coarse (cacheKey): re-render + reconcile', () => {
      selectedId.value = t++ % 2 === 0 ? 500 : 501;
    });
  }

  // --- fine: computed class bound to the attribute ---
  {
    const rows = makeRows();
    const selectedId = signal<number | null>(null);
    const root = document.createElement('div');
    document.body.appendChild(root);
    mount(root, () =>
      jsx('table', {
        children: jsx('tbody', {
          children: each(
            rows,
            (r) =>
              jsx('tr', {
                'data-key': r.id,
                class: computed(() =>
                  r.id === selectedId.value ? 'danger' : '',
                ),
                children: jsx('td', { children: String(r.id) }),
              }),
            (r) => r.id,
          ),
        }),
      }),
    );
    let t = 0;
    bench('fine (binding): effects only, no re-render', () => {
      selectedId.value = t++ % 2 === 0 ? 500 : 501;
    });
  }

  // --- selector: the binding, read through selector(selectedId) ---
  {
    const rows = makeRows();
    const selectedId = signal<number | null>(null);
    const isSelected = selector(selectedId);
    const root = document.createElement('div');
    document.body.appendChild(root);
    mount(root, () =>
      jsx('table', {
        children: jsx('tbody', {
          children: each(
            rows,
            (r) =>
              jsx('tr', {
                'data-key': r.id,
                class: computed(() => (isSelected(r.id).value ? 'danger' : '')),
                children: jsx('td', { children: String(r.id) }),
              }),
            (r) => r.id,
          ),
        }),
      }),
    );
    let t = 0;
    bench('selector (binding): 2 rows re-evaluate, not 1k', () => {
      selectedId.value = t++ % 2 === 0 ? 500 : 501;
    });
  }
});

describe('create 1k rows (mount + dispose)', () => {
  const rows = makeRows();

  bench('coarse (static class)', () => {
    const root = document.createElement('div');
    const dispose = mount(root, () =>
      jsx('table', {
        children: jsx('tbody', {
          children: each(
            rows,
            (r) =>
              jsx('tr', {
                'data-key': r.id,
                class: '',
                children: jsx('td', { children: String(r.id) }),
              }),
            (r) => r.id,
          ),
        }),
      }),
    );
    dispose();
  });

  bench('fine (binding class: wires 1k effects)', () => {
    const selectedId = signal<number | null>(null);
    const root = document.createElement('div');
    const dispose = mount(root, () =>
      jsx('table', {
        children: jsx('tbody', {
          children: each(
            rows,
            (r) =>
              jsx('tr', {
                'data-key': r.id,
                class: computed(() =>
                  r.id === selectedId.value ? 'danger' : '',
                ),
                children: jsx('td', { children: String(r.id) }),
              }),
            (r) => r.id,
          ),
        }),
      }),
    );
    dispose();
  });

  bench('selector (binding class through selector(): 1k keys)', () => {
    const selectedId = signal<number | null>(null);
    const isSelected = selector(selectedId);
    const root = document.createElement('div');
    const dispose = mount(root, () =>
      jsx('table', {
        children: jsx('tbody', {
          children: each(
            rows,
            (r) =>
              jsx('tr', {
                'data-key': r.id,
                class: computed(() => (isSelected(r.id).value ? 'danger' : '')),
                children: jsx('td', { children: String(r.id) }),
              }),
            (r) => r.id,
          ),
        }),
      }),
    );
    dispose();
  });
});
