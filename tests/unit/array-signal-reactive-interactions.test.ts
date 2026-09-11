/**
 * Unit tests for `arraySignal()` (KF-92) — both the standalone signal API
 * and its integration with `each()` / `mount()` for the granular reconcile
 * path.
 */

import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import type { ArraySignal } from '../../src/array-signal.js';
import { arraySignal } from '../../src/array-signal.js';
import { batch,each,mount,signal } from '../../src/index.js';
import { jsx } from '../../src/jsx-runtime.js';

describe('arraySignal — each() granular integration via mount()', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function renderRows(rows: ArraySignal<{ id: number; label: string }>): void {
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', { 'data-key': String(r.id), children: r.label })),
    }));
  }

  it('arraySignal value reads inside the mount closure trigger re-renders for non-granular consumers', () => {
    // Length-derived state — reads .value, not granular events. Should
    // still re-render when the array changes.
    const rows = arraySignal([{ id: 1 }, { id: 2 }]);
    const tick = signal(0);
    let renders = 0;
    mount(root, () => {
      void tick.value;
      renders += 1;
      return jsx('span', { children: `count: ${rows.value.length}` });
    });
    expect(renders).toBe(1);
    expect(root.querySelector('span')!.textContent).toBe('count: 2');
    rows.push({ id: 3 });
    expect(renders).toBe(2);
    expect(root.querySelector('span')!.textContent).toBe('count: 3');
  });

  // A signal read ONLY inside `cacheKey` (the "external state drives the row"
  // pattern — e.g. a selected-id flipping a row class) must stay tracked by
  // the mount effect across a granular-only render. The granular path never
  // re-renders unchanged rows, so before the fix `selectedId` dropped out of
  // the effect's dependency set after a remove and selection stopped working.
  function selectableRows(
    rows: ArraySignal<{ id: number; label: string }>,
    selectedId: { value: number },
  ): void {
    mount(root, () => jsx('ul', {
      children: each(
        rows,
        (r) => jsx('li', {
          'data-key': String(r.id),
          className: r.id === selectedId.value ? 'sel' : '',
          children: r.label,
        }),
        (r) => r.id === selectedId.value,
      ),
    }));
  }

  it('select-row keeps working after a granular remove (cacheKey signal stays tracked)', () => {
    const rows = arraySignal([
      { id: 1, label: 'a' }, { id: 2, label: 'b' },
      { id: 3, label: 'c' }, { id: 4, label: 'd' },
    ]);
    const selectedId = signal(-1);
    selectableRows(rows, selectedId);
    const cls = (id: number) => root.querySelector(`li[data-key="${id}"]`)?.className;

    selectedId.value = 2;
    expect(cls(2)).toBe('sel');

    // Granular remove of a *different* row.
    rows.remove(rows.value.findIndex((r) => r.id === 4));
    expect(root.querySelector('li[data-key="4"]')).toBeNull();

    // Selecting another row must still flip classes — the bug was that
    // `selectedId` was no longer a dependency, so this did nothing.
    selectedId.value = 3;
    expect(cls(3)).toBe('sel');
    expect(cls(2)).toBe('');
  });

  it('a selection flip batched with a granular remove falls back to the snapshot path', () => {
    const rows = arraySignal([
      { id: 1, label: 'a' }, { id: 2, label: 'b' },
      { id: 3, label: 'c' }, { id: 4, label: 'd' },
    ]);
    const selectedId = signal(-1);
    selectableRows(rows, selectedId);
    const cls = (id: number) => root.querySelector(`li[data-key="${id}"]`)?.className;

    selectedId.value = 2;
    expect(cls(2)).toBe('sel');

    // One batch changes selection (cacheKey drift on rows 2 and 3) AND removes
    // a row (structural). The granular patches alone can't express the class
    // flips, so eachGranular detects the drift and hands off to the snapshot
    // path, which reconciles structure + content together.
    batch(() => {
      selectedId.value = 3;
      rows.remove(rows.value.findIndex((r) => r.id === 4));
    });
    expect(root.querySelector('li[data-key="4"]')).toBeNull();
    expect(cls(3)).toBe('sel');
    expect(cls(2)).toBe('');
  });

  // Repopulating an emptied list. After a clear, the binding is empty but its
  // recorded count is 0 (not undefined), so the granular path used to emit a
  // segment with an empty `items` array that the dispatcher routed to the
  // snapshot path — which then rendered nothing. Inserting into an empty
  // binding is effectively a first render, so it must take the snapshot path.
  it('append after clear renders the rows (empty-binding insert)', () => {
    let nextId = 1;
    const rows = arraySignal<{ id: number; label: string }>([]);
    const build = (n: number) =>
      Array.from({ length: n }, () => ({ id: nextId++, label: 'l' }));
    renderRows(rows);
    const count = () => root.querySelectorAll('li').length;

    batch(() => { rows.replace(build(3)); });
    expect(count()).toBe(3);

    // Clear empties the binding (count recorded as 0).
    batch(() => { rows.replace([]); });
    expect(count()).toBe(0);

    // First append after clear must show the rows — not nothing.
    batch(() => {
      const adds = build(3);
      const start = rows.value.length;
      for (let i = 0; i < adds.length; i++) rows.insert(start + i, adds[i]);
    });
    expect(count()).toBe(3);

    // A second append then extends to 6 (granular, binding now non-empty).
    batch(() => {
      const adds = build(3);
      const start = rows.value.length;
      for (let i = 0; i < adds.length; i++) rows.insert(start + i, adds[i]);
    });
    expect(count()).toBe(6);
  });
});

/**
 * Adversarial transition-matrix suite. The two bugs behind this suite
 * (select-after-delete losing the `cacheKey` dependency; append-after-clear
 * rendering nothing) both escaped 100% line/branch coverage because they are
 * *sequence* bugs — each individual operation worked, but a transition between
 * reconciler states (granular ↔ snapshot, empty ↔ non-empty binding, external-
 * state change interleaved with a structural change) was never exercised. This
 * suite walks realistic multi-step sequences that cross those state boundaries.
 * Add a case here whenever a new reconciler state or transition is introduced.
 */
