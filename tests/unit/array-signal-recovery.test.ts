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
      /each\(\): row render at index \d+ produced no top-level element/,
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
