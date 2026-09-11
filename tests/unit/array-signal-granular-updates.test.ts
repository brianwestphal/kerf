/**
 * Unit tests for `arraySignal()` (KF-92) — both the standalone signal API
 * and its integration with `each()` / `mount()` for the granular reconcile
 * path.
 */

import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import type { ArraySignal } from '../../src/array-signal.js';
import { arraySignal } from '../../src/array-signal.js';
import { batch,each,mount } from '../../src/index.js';
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

  it('first render emits the snapshot path (no patches yet)', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    renderRows(rows);
    expect(root.querySelectorAll('li').length).toBe(2);
    expect(root.querySelectorAll('li')[0].textContent).toBe('a');
    expect(root.querySelectorAll('li')[1].textContent).toBe('b');
  });

  it('KF-426: a function item inserted via the granular path throws at THAT insert, not a later render', () => {
    // A function is a valid WeakMap key, so before KF-426 the granular insert
    // rendered it and only a later unrelated snapshot render threw. Now the item
    // contract is enforced on the granular path too, so the throw lands on the
    // render this insert triggered.
    const rows = arraySignal<{ id: number; label: string }>([{ id: 1, label: 'a' }]);
    renderRows(rows);
    const fnItem = Object.assign(() => 'hi', { id: 2, label: 'f' }) as unknown as { id: number; label: string };
    expect(() => rows.insert(1, fnItem)).toThrow(/items must be objects.*got function/);
  });

  it('KF-426: a primitive item inserted via the granular path also throws at that insert (control)', () => {
    const rows = arraySignal<{ id: number; label: string }>([{ id: 1, label: 'a' }]);
    renderRows(rows);
    expect(() => rows.insert(1, 42 as unknown as { id: number; label: string }))
      .toThrow(/items must be objects.*got number/);
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
