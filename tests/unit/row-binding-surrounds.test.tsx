/**
 * KF-380 — the morph × fine-grained-binding × owned-each()-row interaction
 * matrix, tested adversarially.
 *
 * Why this file exists: KF-374 (morph dropped the static text siblings of a
 * bound text hole) and KF-377 (removing a conditional sibling before a keyed
 * list permanently emptied it) both shipped silently under the 100%-line /
 * 99%-branch coverage gate. Line coverage is structurally blind to a missing
 * state transition — each feature (morph child pairing, binding wiring, list
 * ownership) was fully covered in isolation, but no test walked the
 * *interaction* where one feature's invariant (templates carry only markers;
 * owned rows are invisible to the morph) breaks another's assumption
 * (positional child pairing; binding-marker containment). See
 * docs/ai/test-gap-analysis-kf380.md for the full analysis.
 *
 * Every test here walks a multi-step sequence that crosses at least two of
 * the three subsystems, generalizing the two bug shapes to their neighbors:
 * conditional siblings in every position around bound holes AND lists,
 * container/tag swaps, empty↔refill across a morph move, and the
 * granular ↔ snapshot ↔ self-heal reconciler transitions interleaved with
 * surrounds morphs.
 *
 * Two tests originally pinned real bugs found by this matrix (KF-381 —
 * stranded owned rows duplicated when a conditional sibling shared or
 * shadowed the list container). Both fixes have shipped; every test in this
 * matrix now runs and asserts the corrected behavior.
 */
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { computed,each,mount,signal,toElement } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  root = toElement(<div />) as HTMLElement;
  document.body.appendChild(root);
});

afterEach(() => { document.body.innerHTML = ''; });

describe('KF-380 interaction matrix: row-scoped bindings × surrounds morph', () => {
  it('row-scoped mixed-content holes stay live when a conditional sibling before the list toggles', () => {
    // Rows are owned, so the surrounds morph must skip them individually —
    // their marker comments + inserted text nodes are never re-paired. The
    // external-signal hole must keep updating after BOTH toggle directions,
    // and a granular update afterwards must still re-wire the changed row.
    const banner = signal(false);
    const unit = signal('ms');
    const rows = arraySignal([{ id: 1, label: 'lat' }, { id: 2, label: 'p95' }]);
    const dispose = mount(root, () => (
      <div>
        {banner.value ? <div class="banner">warn</div> : ''}
        <ul>{each(rows, (r) => <li data-key={String(r.id)}>{computed(() => r.label)} in {unit}</li>)}</ul>
      </div>
    ));
    const li = (i: number): HTMLElement => root.querySelectorAll('li')[i] as HTMLElement;
    expect(li(0).textContent).toBe('lat in ms');
    banner.value = true; // surrounds morph with owned rows present
    expect(li(0).textContent).toBe('lat in ms');
    unit.value = 's'; // row holes still live after the morph
    expect(li(0).textContent).toBe('lat in s');
    expect(li(1).textContent).toBe('p95 in s');
    banner.value = false; // the KF-377 direction
    unit.value = 'us';
    expect(li(0).textContent).toBe('lat in us');
    rows.update(0, (r) => ({ ...r, label: 'lat99' })); // granular re-wire still works
    expect(li(0).textContent).toBe('lat99 in us');
    unit.value = 'ns'; // and the re-wired row still tracks the external signal
    expect(li(0).textContent).toBe('lat99 in ns');
    dispose();
  });

  it('a row select-binding keeps working across a conditional toggle and a granular remove', () => {
    // FC-B3's fine-grained select-row × the KF-377 morph shift × a granular
    // structural change, in sequence. The selection flips are pure binding
    // writes (no render re-run), so a broken wire would fail silently.
    const banner = signal(false);
    const sel = signal(-1);
    const rows = arraySignal([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const render = vi.fn(() => (
      <div>
        {banner.value ? <div class="banner">warn</div> : ''}
        <ul>{each(rows, (r) => <li data-key={String(r.id)} class={computed(() => (sel.value === r.id ? 'sel' : ''))}>{String(r.id)}</li>)}</ul>
      </div>
    ));
    const dispose = mount(root, render);
    const selKeys = (): string[] =>
      Array.from(root.querySelectorAll('li.sel')).map((el) => el.getAttribute('data-key') ?? '');
    sel.value = 2;
    expect(selKeys()).toEqual(['2']);
    banner.value = true; // morph over the surrounds; owned rows skipped
    expect(selKeys()).toEqual(['2']);
    sel.value = 3; // binding write after the morph
    expect(selKeys()).toEqual(['3']);
    rows.remove(0); // granular remove disposes row 1's binding only
    expect(selKeys()).toEqual(['3']);
    sel.value = 2; // remaining rows' bindings still live
    expect(selKeys()).toEqual(['2']);
    banner.value = false; // the KF-377 direction
    sel.value = 3;
    expect(selKeys()).toEqual(['3']);
    // Selection flips never re-ran the render: only the initial render, the
    // two banner toggles, and the granular remove (patch drain) did.
    expect(render).toHaveBeenCalledTimes(4);
    dispose();
  });
});
