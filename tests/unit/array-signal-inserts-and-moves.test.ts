/**
 * Unit tests for `arraySignal()` (KF-92) — both the standalone signal API
 * and its integration with `each()` / `mount()` for the granular reconcile
 * path.
 */

import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import type { ArraySignal } from '../../src/array-signal.js';
import { arraySignal } from '../../src/array-signal.js';
import { each,mount } from '../../src/index.js';
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

  it('insert patch adds a single row without re-rendering siblings', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 3, label: 'c' }]);
    renderRows(rows);
    const oldA = root.querySelectorAll('li')[0];
    const oldC = root.querySelectorAll('li')[1];
    rows.insert(1, { id: 2, label: 'b' });
    const lis = root.querySelectorAll('li');
    expect(lis.length).toBe(3);
    expect([...lis].map((li) => li.textContent)).toEqual(['a', 'b', 'c']);
    expect(lis[0]).toBe(oldA);
    expect(lis[2]).toBe(oldC);
  });

  it('insert at end (push) appends without re-rendering siblings', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }]);
    renderRows(rows);
    const oldA = root.querySelector('li')!;
    rows.push({ id: 2, label: 'b' });
    const lis = root.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0]).toBe(oldA);
    expect(lis[1].textContent).toBe('b');
  });

  it('remove patch deletes a single row without re-rendering siblings', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }, { id: 3, label: 'c' }]);
    renderRows(rows);
    const oldA = root.querySelectorAll('li')[0];
    const oldC = root.querySelectorAll('li')[2];
    rows.remove(1);
    const lis = root.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0]).toBe(oldA);
    expect(lis[1]).toBe(oldC);
  });

  it('KF-93 bulk-insert: contiguous run of inserts is parsed once and inserted as a fragment', async () => {
    // Append-1k pattern: insert(N, x), insert(N+1, y), insert(N+2, z) — every
    // patch at the previous one's index + 1. The reconciler should detect
    // the run and bulk-parse instead of doing 3 individual parses.
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 9, label: 'tail' }]);
    renderRows(rows);
    const oldHead = root.querySelector('li')!;
    const oldTail = root.querySelectorAll('li')[1];

    // Spy on template.innerHTML setter calls — bulk-parse should invoke it
    // exactly ONCE for a 3-insert run, not 3 times.
    const origDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(document.createElement('template')),
      'innerHTML',
    ) ?? Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML')!;
    let templateInnerHTMLSetCount = 0;
    const tplProto = Object.getPrototypeOf(document.createElement('template'));
    Object.defineProperty(tplProto, 'innerHTML', {
      configurable: true,
      get: origDescriptor.get,
      set(value: string) {
        templateInnerHTMLSetCount += 1;
        origDescriptor.set!.call(this, value);
      },
    });

    try {
      const { batch } = await import('../../src/index.js');
      batch(() => {
        rows.insert(1, { id: 2, label: 'b' });
        rows.insert(2, { id: 3, label: 'c' });
        rows.insert(3, { id: 4, label: 'd' });
      });
    } finally {
      Object.defineProperty(tplProto, 'innerHTML', origDescriptor);
    }

    const lis = root.querySelectorAll('li');
    expect([...lis].map((li) => li.textContent)).toEqual(['a', 'b', 'c', 'd', 'tail']);
    expect(lis[0]).toBe(oldHead);
    expect(lis[4]).toBe(oldTail);
    expect(templateInnerHTMLSetCount).toBe(1);  // bulk parse
  });

  it('KF-93 bulk-insert: append-at-end run inserts before nothing (anchor null) without crashing', async () => {
    const rows = arraySignal([{ id: 1, label: 'a' }]);
    renderRows(rows);
    const { batch } = await import('../../src/index.js');
    batch(() => {
      rows.push({ id: 2, label: 'b' });
      rows.push({ id: 3, label: 'c' });
      rows.push({ id: 4, label: 'd' });
    });
    expect([...root.querySelectorAll('li')].map((li) => li.textContent))
      .toEqual(['a', 'b', 'c', 'd']);
  });

  it('KF-93 bulk-insert: non-contiguous inserts fall back to per-patch (run-detector requires +1 stride)', async () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    renderRows(rows);
    const { batch } = await import('../../src/index.js');
    batch(() => {
      rows.insert(0, { id: 0, label: 'before' });   // index 0
      rows.insert(3, { id: 99, label: 'after' });   // not contiguous with the prior 0
    });
    expect([...root.querySelectorAll('li')].map((li) => li.textContent))
      .toEqual(['before', 'a', 'b', 'after']);
  });

  it('KF-93 bulk-insert: throws if the bulk-parsed HTML produced fewer elements than patches', async () => {
    // Each row's render must produce exactly one top-level element. If one
    // row in a bulk run produces empty HTML, the children-count mismatch
    // surfaces as a descriptive error.
    const rows = arraySignal([{ id: 1, label: 'a' }]);
    let renderImpl = (r: { id: number; label: string }): string =>
      `<li data-key="${r.id}">${r.label}</li>`;
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => renderImpl(r as { id: number; label: string })),
    }));
    // Swap the render impl for the next batch so two of three rows produce empty HTML.
    renderImpl = (r) => r.id === 3 ? `<li>${r.label}</li>` : '   ';
    const { batch } = await import('../../src/index.js');
    expect(() => {
      batch(() => {
        rows.insert(1, { id: 2, label: 'b' });
        rows.insert(2, { id: 3, label: 'c' });
        rows.insert(3, { id: 4, label: 'd' });
      });
    }).toThrow(/row render at index \d+ produced no top-level element/);
  });

  it('move patch reorders a single row via insertBefore (preserves node identity)', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }, { id: 3, label: 'c' }]);
    renderRows(rows);
    const oldA = root.querySelectorAll('li')[0];
    const oldB = root.querySelectorAll('li')[1];
    const oldC = root.querySelectorAll('li')[2];
    rows.move(0, 2);  // [b, c, a]
    const lis = root.querySelectorAll('li');
    expect([...lis]).toEqual([oldB, oldC, oldA]);
  });

  it('move backwards (n→0) inserts at the front', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }, { id: 3, label: 'c' }]);
    renderRows(rows);
    const oldA = root.querySelectorAll('li')[0];
    const oldB = root.querySelectorAll('li')[1];
    const oldC = root.querySelectorAll('li')[2];
    rows.move(2, 0);  // [c, a, b]
    const lis = root.querySelectorAll('li');
    expect([...lis]).toEqual([oldC, oldA, oldB]);
  });

  it('replace patch falls through to the snapshot reconciler', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    renderRows(rows);
    rows.replace([{ id: 9, label: 'x' }, { id: 10, label: 'y' }]);
    const lis = root.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect([...lis].map((li) => li.textContent)).toEqual(['x', 'y']);
  });

  it('multiple granular events in sequence apply in order', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    renderRows(rows);
    rows.push({ id: 3, label: 'c' });
    rows.update(0, (r) => ({ ...r, label: 'A' }));
    rows.remove(1);  // remove 'b' (after the update, items are [A, b, c])
    const lis = root.querySelectorAll('li');
    expect([...lis].map((li) => li.textContent)).toEqual(['A', 'c']);
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
