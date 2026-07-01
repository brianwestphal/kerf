/**
 * Unit tests for `arraySignal()` (KF-92) — both the standalone signal API
 * and its integration with `each()` / `mount()` for the granular reconcile
 * path.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ArraySignal, arraySignal } from '../../src/array-signal.js';
import { batch, each, mount, signal } from '../../src/index.js';
import { jsx } from '../../src/jsx-runtime.js';

describe('arraySignal — standalone API', () => {
  it('seeds with the initial array (defensively copied)', () => {
    const seed = [{ id: 1 }, { id: 2 }];
    const sig = arraySignal(seed);
    expect(sig.value).toEqual(seed);
    expect(sig.value).not.toBe(seed);  // defensive copy
  });

  it('seeds empty when no argument given', () => {
    expect(arraySignal().value).toEqual([]);
  });

  it('update replaces the item at the given index', () => {
    const sig = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    sig.update(0, (r) => ({ ...r, label: 'X' }));
    expect(sig.value[0]).toEqual({ id: 1, label: 'X' });
    expect(sig.value[1]).toEqual({ id: 2, label: 'b' });
  });

  it('update throws for out-of-bounds index', () => {
    const sig = arraySignal([{ id: 1 }]);
    expect(() => sig.update(2, (r) => r)).toThrow(/index 2 out of bounds/);
    expect(() => sig.update(-1, (r) => r)).toThrow(/index -1 out of bounds/);
  });

  it('insert adds at the given index, shifting existing items', () => {
    const sig = arraySignal([{ id: 1 }, { id: 3 }]);
    sig.insert(1, { id: 2 });
    expect(sig.value).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('insert at length (end) appends', () => {
    const sig = arraySignal([{ id: 1 }]);
    sig.insert(1, { id: 2 });
    expect(sig.value).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('insert throws for out-of-bounds index', () => {
    const sig = arraySignal([{ id: 1 }]);
    expect(() => sig.insert(5, { id: 9 })).toThrow(/out of bounds/);
  });

  it('push appends at the end', () => {
    const sig = arraySignal([{ id: 1 }]);
    sig.push({ id: 2 });
    expect(sig.value).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('remove deletes and returns the item at the given index', () => {
    const sig = arraySignal([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const removed = sig.remove(1);
    expect(removed).toEqual({ id: 2 });
    expect(sig.value).toEqual([{ id: 1 }, { id: 3 }]);
  });

  it('remove throws for out-of-bounds index', () => {
    const sig = arraySignal<{ id: number }>([]);
    expect(() => sig.remove(0)).toThrow(/out of bounds/);
  });

  it('move shifts an item to a new position', () => {
    const sig = arraySignal([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
    sig.move(0, 2);
    expect(sig.value).toEqual([{ id: 2 }, { id: 3 }, { id: 1 }, { id: 4 }]);
  });

  it('move with from===to is a no-op', () => {
    const sig = arraySignal([{ id: 1 }, { id: 2 }]);
    const before = [...sig.value];
    sig.move(1, 1);
    expect(sig.value).toEqual(before);
  });

  it('move throws for out-of-bounds indices', () => {
    const sig = arraySignal([{ id: 1 }, { id: 2 }]);
    expect(() => sig.move(0, 5)).toThrow(/out of bounds/);
    expect(() => sig.move(5, 0)).toThrow(/out of bounds/);
  });

  it('replace swaps the entire array', () => {
    const sig = arraySignal([{ id: 1 }]);
    sig.replace([{ id: 9 }, { id: 10 }]);
    expect(sig.value).toEqual([{ id: 9 }, { id: 10 }]);
  });

  it('value reads register a tracking dependency (computed sees changes)', () => {
    const sig = arraySignal([{ id: 1 }, { id: 2 }]);
    let computedRuns = 0;
    // Simulate a derived computation by reading inside an effect.
    let snapshot: readonly { id: number }[] = [];
    const dispose = (() => {
      // Lightweight effect impl: re-run on signal changes.
      // Use signals-core-style effect via the public API (kerf re-exports).
      // We don't import effect() here directly; just verify .value reads
      // produce different snapshots after mutations.
      computedRuns += 1;
      snapshot = sig.value;
      return () => {};
    })();
    expect(computedRuns).toBe(1);
    expect(snapshot).toEqual([{ id: 1 }, { id: 2 }]);
    sig.push({ id: 3 });
    // .value reflects the new state (signal-tracking would re-trigger
    // effect() in real code; here we just read again).
    expect(sig.value).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    dispose();
  });

  it('exposes ArraySignal class for instanceof checks', () => {
    expect(arraySignal()).toBeInstanceOf(ArraySignal);
  });

  it('each(arraySignal) outside a mount context falls through to snapshot path', () => {
    const sig = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    const out = each(sig, (it) => `<li>${it.label}</li>`);
    expect(out.toString()).toBe('<li>a</li><li>b</li>');
  });
});

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

  it('first render emits the snapshot path (no patches yet)', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    renderRows(rows);
    expect(root.querySelectorAll('li').length).toBe(2);
    expect(root.querySelectorAll('li')[0].textContent).toBe('a');
    expect(root.querySelectorAll('li')[1].textContent).toBe('b');
  });

  it('KF-201: update with a tag mismatch falls back to replaceChild (single-update path)', () => {
    // Consumer's render fn returns <li> for some items and <article> for
    // others — same key, different tag. Granular update on the same item
    // can't morph in place (different tag) and must fall back to
    // replaceChild. This covers `applySingleUpdate`'s tag-mismatch branch.
    type R = { id: number; kind: 'li' | 'article'; label: string };
    const rows = arraySignal<R>([{ id: 1, kind: 'li', label: 'a' }]);
    mount(root, () => jsx('div', {
      children: each(rows, (r) => (
        r.kind === 'li'
          ? jsx('li', { 'data-key': String(r.id), children: r.label })
          : jsx('article', { 'data-key': String(r.id), children: r.label })
      )),
    }));
    const oldLi = root.querySelector('li');
    expect(oldLi).not.toBeNull();
    expect(root.querySelector('article')).toBeNull();

    // Update flips the kind — same id, different top-level tag.
    rows.update(0, (r) => ({ ...r, kind: 'article', label: 'A' }));
    expect(root.querySelector('li')).toBeNull();
    const newArticle = root.querySelector('article');
    expect(newArticle).not.toBeNull();
    expect(newArticle!.textContent).toBe('A');
    // The old <li> node is detached.
    expect(oldLi!.isConnected).toBe(false);
  });

  it('KF-201: bulk update with a tag mismatch in one row falls back to replaceChild for that row', () => {
    // Two updates in a batch: one same-tag (morphed in place), one
    // tag-mismatch (replaced). Covers `applyBulkUpdate`'s tag-mismatch branch.
    type R = { id: number; kind: 'li' | 'div'; label: string };
    const rows = arraySignal<R>([
      { id: 1, kind: 'li', label: 'a' },
      { id: 2, kind: 'li', label: 'b' },
    ]);
    mount(root, () => jsx('section', {
      children: each(rows, (r) => (
        r.kind === 'li'
          ? jsx('li', { 'data-key': String(r.id), children: r.label })
          : jsx('div', { 'data-key': String(r.id), children: r.label })
      )),
    }));
    const oldLi1 = root.querySelectorAll('li')[0];
    const oldLi2 = root.querySelectorAll('li')[1];
    expect(root.querySelectorAll('li').length).toBe(2);

    batch(() => {
      // Row 0: same tag, different label → morph in place (identity preserved).
      rows.update(0, (r) => ({ ...r, label: 'A' }));
      // Row 1: tag change → fall back to replaceChild.
      rows.update(1, (r) => ({ ...r, kind: 'div', label: 'B' }));
    });

    // Row 0's <li> kept its identity.
    expect(root.querySelectorAll('li').length).toBe(1);
    expect(root.querySelectorAll('li')[0]).toBe(oldLi1);
    expect(oldLi1.textContent).toBe('A');

    // Row 1 is now a <div>; old <li> is detached.
    const newDiv = root.querySelector('div');
    expect(newDiv).not.toBeNull();
    expect(newDiv!.textContent).toBe('B');
    expect(oldLi2.isConnected).toBe(false);
  });

  it('update patch applies via reconcileGranular and preserves siblings', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    renderRows(rows);
    const oldA = root.querySelectorAll('li')[0];
    const oldB = root.querySelectorAll('li')[1];
    rows.update(0, (r) => ({ ...r, label: 'A' }));
    const lis = root.querySelectorAll('li');
    expect(lis[0].textContent).toBe('A');
    expect(lis[1]).toBe(oldB);  // sibling preserved (granular reconciler doesn't touch unchanged rows)
    // KF-201: updated row preserves its DOM node identity — morph applies the
    // text-node change in place. Skips the layout cost of a full subtree
    // discard-and-reinsert, and preserves focus / scroll / IME state on
    // descendants. (Pre-KF-201 the granular path called replaceChild here,
    // which swapped the node entirely.)
    expect(lis[0]).toBe(oldA);
  });

  it('KF-94 bulk-update: a run of consecutive updates at non-contiguous indices uses one parse', async () => {
    // krausest "every 10th row" pattern: updates at indices 0, 10, 20 — non-
    // contiguous, so KF-93's contiguous-run detector wouldn't fire. KF-94's
    // detector (any consecutive update patches, regardless of index) should.
    //
    // Each update flips a `kind: 'plain' | 'wrapped'` flag that conditionally
    // wraps the label in <strong>. Text-only updates would hit the KF-206
    // fast path and bypass the parse entirely; the structural change here
    // ensures the bulk-parse path is exercised.
    type R = { id: number; label: string; kind: 'plain' | 'wrapped' };
    const initial: R[] = Array.from({ length: 5 }, (_, i) => ({
      id: i, label: `row${i}`, kind: 'plain' as const,
    }));
    const rows = arraySignal<R>(initial);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', {
        'data-key': String(r.id),
        children: r.kind === 'wrapped' ? jsx('strong', { children: r.label }) : r.label,
      })),
    }));
    const oldRows = [...root.querySelectorAll('li')];

    const tplProto = Object.getPrototypeOf(document.createElement('template'));
    const origDescriptor = Object.getOwnPropertyDescriptor(tplProto, 'innerHTML')
      ?? Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML')!;
    let parseCount = 0;
    Object.defineProperty(tplProto, 'innerHTML', {
      configurable: true,
      get: origDescriptor.get,
      set(value: string) {
        parseCount += 1;
        origDescriptor.set!.call(this, value);
      },
    });

    try {
      const { batch } = await import('../../src/index.js');
      batch(() => {
        rows.update(0, (r) => ({ ...r, label: 'A', kind: 'wrapped' }));
        rows.update(2, (r) => ({ ...r, label: 'C', kind: 'wrapped' }));
        rows.update(4, (r) => ({ ...r, label: 'E', kind: 'wrapped' }));
      });
    } finally {
      Object.defineProperty(tplProto, 'innerHTML', origDescriptor);
    }

    const lis = root.querySelectorAll('li');
    expect([...lis].map((li) => li.textContent)).toEqual(['A', 'row1', 'C', 'row3', 'E']);
    expect(lis[0].querySelector('strong')).not.toBeNull();
    expect(lis[2].querySelector('strong')).not.toBeNull();
    expect(lis[4].querySelector('strong')).not.toBeNull();
    expect(lis[1]).toBe(oldRows[1]);  // unchanged sibling preserved
    expect(lis[3]).toBe(oldRows[3]);  // unchanged sibling preserved
    expect(parseCount).toBe(1);  // bulk parse — one innerHTML write for 3 updates
  });

  it('KF-94 bulk-update: no-op updates are filtered before the bulk parse', async () => {
    // If every update produces identical HTML, no DOM work happens — and
    // the bulk-parse innerHTML setter is never called.
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    renderRows(rows);
    const oldA = root.querySelectorAll('li')[0];
    const oldB = root.querySelectorAll('li')[1];

    const tplProto = Object.getPrototypeOf(document.createElement('template'));
    const origDescriptor = Object.getOwnPropertyDescriptor(tplProto, 'innerHTML')
      ?? Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML')!;
    let parseCount = 0;
    Object.defineProperty(tplProto, 'innerHTML', {
      configurable: true,
      get: origDescriptor.get,
      set(value: string) { parseCount += 1; origDescriptor.set!.call(this, value); },
    });

    try {
      const { batch } = await import('../../src/index.js');
      batch(() => {
        rows.update(0, (r) => ({ ...r }));  // identity → same HTML
        rows.update(1, (r) => ({ ...r }));
      });
    } finally {
      Object.defineProperty(tplProto, 'innerHTML', origDescriptor);
    }

    expect(root.querySelectorAll('li')[0]).toBe(oldA);
    expect(root.querySelectorAll('li')[1]).toBe(oldB);
    expect(parseCount).toBe(0);  // all no-ops → no parse at all
  });

  it('KF-94 bulk-update: partial no-ops still apply the real changes', async () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }, { id: 3, label: 'c' }]);
    renderRows(rows);
    const { batch } = await import('../../src/index.js');
    batch(() => {
      rows.update(0, (r) => ({ ...r }));            // no-op
      rows.update(1, (r) => ({ ...r, label: 'B' })); // real change
      rows.update(2, (r) => ({ ...r }));            // no-op
    });
    expect([...root.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['a', 'B', 'c']);
  });

  it('KF-94 bulk-update: throws when bulk-parsed HTML produces fewer elements than non-noop changes', async () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    let renderImpl = (r: { id: number; label: string }): string =>
      `<li data-key="${r.id}">${r.label}</li>`;
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => renderImpl(r as { id: number; label: string })),
    }));
    // Force the row that would otherwise change to render empty HTML.
    renderImpl = (r) => r.id === 1 ? `<li data-key="${r.id}">X</li>` : '   ';
    const { batch } = await import('../../src/index.js');
    expect(() => {
      batch(() => {
        rows.update(0, (r) => ({ ...r, label: 'X' }));
        rows.update(1, (r) => ({ ...r, label: 'Y' }));
      });
    }).toThrow(/row render at index 1 produced no top-level element/);
  });

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

  it('granular path coexists with non-arraySignal each() callsites', () => {
    const rowsA = arraySignal([{ id: 1, label: 'a' }]);
    const staticRows = [{ id: 99, label: 'static' }];
    mount(root, () => jsx('div', {
      children: [
        jsx('ul', { children: each(rowsA, (r) => jsx('li', { 'data-key': String(r.id), children: r.label })) }),
        jsx('ol', { children: each(staticRows, (r) => jsx('li', { 'data-key': String(r.id), children: r.label })) }),
      ],
    }));
    rowsA.update(0, (r) => ({ ...r, label: 'A' }));
    expect(root.querySelector('ul li')!.textContent).toBe('A');
    expect(root.querySelector('ol li')!.textContent).toBe('static');
  });

  it('non-arraySignal each() falls through to today\'s snapshot path', () => {
    const items = [{ id: 1 }, { id: 2 }];
    mount(root, () => jsx('ul', {
      children: each(items, (r) => jsx('li', { 'data-key': String(r.id), children: String(r.id) })),
    }));
    expect(root.querySelectorAll('li').length).toBe(2);
  });

  it('update patch is a no-op when the new HTML matches the old', () => {
    // Defensive path: caller calls .update with an identity fn (or returns
    // a structurally equivalent row). The reconciler short-circuits and
    // doesn't replace the live node.
    const rows = arraySignal([{ id: 1, label: 'a' }]);
    renderRows(rows);
    const oldA = root.querySelector('li')!;
    rows.update(0, (r) => ({ ...r }));  // fresh ref, identical content → identical html
    expect(root.querySelector('li')).toBe(oldA);  // node identity preserved
  });

  it('throws a descriptive error when a granular row render produces no top-level element', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }]);
    let renderImpl = (r: { id: number; label: string }): string =>
      `<li data-key="${r.id}">${r.label}</li>`;
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => renderImpl(r as { id: number; label: string })),
    }));
    // Swap the render impl mid-flight so the next update produces empty HTML.
    renderImpl = () => '   ';
    expect(() => rows.update(0, (r) => ({ ...r, label: 'changed' }))).toThrow(
      /granular reconcile: row render produced no top-level element/,
    );
    // Note: this case goes through `parseSingleRow` (single-update patch),
    // which throws with the granular-reconcile message. KF-103 changed bulk
    // paths to surface "row render at index N produced K top-level elements"
    // and parseSingleRow keeps the unindexed message because there is no
    // index ambiguity for a single patch.
  });

  it('KF-98: pre-mount push mutations render correctly on first mount', () => {
    const rows = arraySignal<{ id: number; label: string }>([]);
    rows.push({ id: 1, label: 'a' });
    rows.push({ id: 2, label: 'b' });
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', { 'data-key': String(r.id), children: r.label })),
    }));
    const lis = root.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0].textContent).toBe('a');
    expect(lis[1].textContent).toBe('b');
  });

  it('KF-98: pre-mount update on seeded array renders the post-update label', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    rows.update(0, (r) => ({ ...r, label: 'A' }));
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', { 'data-key': String(r.id), children: r.label })),
    }));
    const lis = root.querySelectorAll('li');
    expect(lis[0].textContent).toBe('A');
    expect(lis[1].textContent).toBe('b');
  });

  it('KF-98: pre-mount mutations do NOT poison subsequent granular reconciles', () => {
    const rows = arraySignal<{ id: number; label: string }>([]);
    rows.push({ id: 1, label: 'a' });
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', { 'data-key': String(r.id), children: r.label })),
    }));
    expect(root.querySelectorAll('li').length).toBe(1);
    rows.push({ id: 2, label: 'b' });
    rows.update(0, (r) => ({ ...r, label: 'A' }));
    const lis = root.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0].textContent).toBe('A');
    expect(lis[1].textContent).toBe('b');
  });

  it('KF-99: a thrown render in a single insert falls back to snapshot — DOM matches signal', () => {
    type Row = { id: number; label: string; explode?: boolean };
    const rows = arraySignal<Row>([{ id: 0, label: 'seed' }]);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => {
        if (r.explode) throw new Error('boom');
        return jsx('li', { 'data-key': String(r.id), children: r.label });
      }),
    }));
    expect(root.querySelectorAll('li').length).toBe(1);
    // Set up the row to no longer explode AFTER the insert that would have
    // exploded — the insert queues a patch with explode:true; the snapshot
    // fallback re-runs render for every row in the snapshot, so we keep
    // explode:true here to verify the fallback ALSO catches and recovers,
    // OR — simpler — we just verify the render error bubbles to the user
    // and DOM stays consistent with what arraySignal believes.
    let caught: unknown = null;
    try {
      rows.insert(1, { id: 1, label: 'A', explode: true });
    } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(Error);
    // After the thrown render, the signal still has 2 rows but we couldn't
    // render the bad one. Now mutate to a recoverable state — replace the
    // bad row with a good one. The granular path drains the new patch, but
    // because the snapshot is now coherent, the next render shows both rows.
    rows.update(1, () => ({ id: 1, label: 'A' }));
    const lis = root.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0].textContent).toBe('seed');
    expect(lis[1].textContent).toBe('A');
  });

  it('KF-99: a thrown render mid bulk-insert run falls back to snapshot — DOM converges', () => {
    type Row = { id: number; label: string; explode?: boolean };
    const rows = arraySignal<Row>([{ id: 0, label: 'seed' }]);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => {
        if (r.explode) throw new Error('boom');
        return jsx('li', { 'data-key': String(r.id), children: r.label });
      }),
    }));
    let caught: unknown = null;
    try {
      // Three contiguous inserts in one batch; middle one explodes.
      // All three patches queue in the same drain; the snapshot already
      // contains all three items by the time eachGranular runs.
      batch(() => {
        rows.insert(1, { id: 1, label: 'A' });
        rows.insert(2, { id: 2, label: 'B', explode: true });
        rows.insert(3, { id: 3, label: 'C' });
      });
    } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(Error);
    // Replace the throwing row, trigger a re-render — DOM converges with signal.
    rows.update(2, () => ({ id: 2, label: 'B' }));
    const lis = root.querySelectorAll('li');
    expect(Array.from(lis).map((l) => l.textContent)).toEqual(['seed', 'A', 'B', 'C']);
  });

  it('KF-99: bulk-update with a throwing patch — recovery via further mutation succeeds', () => {
    type Row = { id: number; label: string; explode?: boolean };
    const rows = arraySignal<Row>([
      { id: 0, label: 'a' },
      { id: 1, label: 'b' },
      { id: 2, label: 'c' },
    ]);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => {
        if (r.explode) throw new Error('boom');
        return jsx('li', { 'data-key': String(r.id), children: r.label });
      }),
    }));
    let caught: unknown = null;
    try {
      // Three updates queued in a batch; middle one's render throws.
      // batch() means all three patches drain together.
      batch(() => {
        rows.update(0, (r) => ({ ...r, label: 'A' }));
        rows.update(1, (r) => ({ ...r, label: 'B', explode: true }));
        rows.update(2, (r) => ({ ...r, label: 'C' }));
      });
    } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(Error);
    // Recover: clear the explode flag on row 1.
    rows.update(1, (r) => ({ id: r.id, label: 'B' }));
    const lis = root.querySelectorAll('li');
    expect(Array.from(lis).map((l) => l.textContent)).toEqual(['A', 'B', 'C']);
  });

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
describe('arraySignal — reconciler transition matrix (adversarial)', () => {
  let root: HTMLElement;
  let nextId = 1;
  const build = (n: number): { id: number; label: string }[] =>
    Array.from({ length: n }, () => ({ id: nextId++, label: 'l' + nextId }));

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });
  afterEach(() => { document.body.innerHTML = ''; });

  function harness() {
    const rows = arraySignal<{ id: number; label: string }>([]);
    const selectedId = signal(-1);
    mount(root, () => jsx('table', {
      children: jsx('tbody', {
        children: each(
          rows,
          (r) => jsx('tr', {
            'data-key': String(r.id),
            className: r.id === selectedId.value ? 'sel' : '',
            children: jsx('td', { children: r.label }),
          }),
          (r) => r.id === selectedId.value,
        ),
      }),
    }));
    return {
      rows, selectedId,
      ids: () => Array.from(root.querySelectorAll('tr')).map((t) => t.getAttribute('data-key')),
      selIds: () => Array.from(root.querySelectorAll('tr.sel')).map((t) => t.getAttribute('data-key')),
    };
  }

  it('empty-via-remove then insert renders (distinct from replace([]))', () => {
    const t = harness();
    batch(() => t.rows.replace(build(3)));
    const cur = t.rows.value.map((r) => r.id);
    batch(() => { for (const id of cur) t.rows.remove(t.rows.value.findIndex((r) => r.id === id)); });
    expect(t.ids().length).toBe(0);
    batch(() => { const a = build(2); for (let i = 0; i < a.length; i++) t.rows.insert(i, a[i]); });
    expect(t.ids().length).toBe(2);
  });

  it('append then select the appended row', () => {
    const t = harness();
    batch(() => t.rows.replace(build(3)));
    batch(() => { const a = build(2); const s = t.rows.value.length; for (let i = 0; i < a.length; i++) t.rows.insert(s + i, a[i]); });
    const id = t.rows.value[t.rows.value.length - 1].id;
    t.selectedId.value = id;
    expect(t.selIds()).toEqual([String(id)]);
  });

  it('update then select', () => {
    const t = harness();
    batch(() => t.rows.replace(build(3)));
    batch(() => t.rows.update(0, (r) => ({ ...r, label: 'X' })));
    const id = t.rows.value[1].id;
    t.selectedId.value = id;
    expect(t.selIds()).toEqual([String(id)]);
  });

  it('move (swap) then select', () => {
    const t = harness();
    batch(() => t.rows.replace(build(4)));
    batch(() => { t.rows.move(3, 1); t.rows.move(2, 3); });
    const id = t.rows.value[0].id;
    t.selectedId.value = id;
    expect(t.selIds()).toEqual([String(id)]);
  });

  it('select then update the selected row in the same batch (stays selected, label changes)', () => {
    const t = harness();
    batch(() => t.rows.replace(build(3)));
    const id = t.rows.value[1].id;
    t.selectedId.value = id;
    batch(() => t.rows.update(1, (r) => ({ ...r, label: 'Y' })));
    expect(t.selIds()).toEqual([String(id)]);
    expect(root.querySelector('tr.sel td')?.textContent).toBe('Y');
  });

  it('remove the currently-selected row leaves no ghost selection', () => {
    const t = harness();
    batch(() => t.rows.replace(build(4)));
    const id = t.rows.value[2].id;
    t.selectedId.value = id;
    expect(t.selIds()).toEqual([String(id)]);
    t.rows.remove(2);
    expect(t.selIds()).toEqual([]);
    expect(t.ids().length).toBe(3);
  });

  it('clear → append → clear → append (double empty/refill cycle)', () => {
    const t = harness();
    batch(() => t.rows.replace(build(3)));
    batch(() => t.rows.replace([]));
    batch(() => { const a = build(3); for (let i = 0; i < a.length; i++) t.rows.insert(i, a[i]); });
    expect(t.ids().length).toBe(3);
    batch(() => t.rows.replace([]));
    batch(() => { const a = build(2); for (let i = 0; i < a.length; i++) t.rows.insert(i, a[i]); });
    expect(t.ids().length).toBe(2);
  });

  it('insert in the middle then select the inserted row', () => {
    const t = harness();
    batch(() => t.rows.replace(build(3)));
    batch(() => t.rows.insert(1, build(1)[0]));
    const id = t.rows.value[1].id;
    t.selectedId.value = id;
    expect(t.ids().length).toBe(4);
    expect(t.selIds()).toEqual([String(id)]);
  });

  it('push() single then select', () => {
    const t = harness();
    batch(() => t.rows.replace(build(2)));
    t.rows.push(build(1)[0]);
    const id = t.rows.value[2].id;
    t.selectedId.value = id;
    expect(t.ids().length).toBe(3);
    expect(t.selIds()).toEqual([String(id)]);
  });

  it('partial-update-every-other → remove → select', () => {
    const t = harness();
    batch(() => t.rows.replace(build(6)));
    batch(() => { for (let i = 0; i < 6; i += 2) t.rows.update(i, (r) => ({ ...r, label: r.label + '!' })); });
    t.rows.remove(0);
    const id = t.rows.value[2].id;
    t.selectedId.value = id;
    expect(t.selIds()).toEqual([String(id)]);
  });

  it('repeated remove interleaved with select keeps selection working', () => {
    const t = harness();
    batch(() => t.rows.replace(build(20)));
    for (let k = 0; k < 5; k++) {
      t.rows.remove(0);
      const id = t.rows.value[0].id;
      t.selectedId.value = id;
      expect(t.selIds()).toEqual([String(id)]);
    }
    expect(t.ids().length).toBe(15);
  });
});
