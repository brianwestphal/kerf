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
import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { batch,each,mount,signal,toElement } from '../../src/index.js';

interface Item { id: string; label: string }
const ROWS: Item[] = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
];

let root: HTMLElement;

beforeEach(() => {
  root = toElement(<div />) as HTMLElement;
  document.body.appendChild(root);
});

afterEach(() => { document.body.innerHTML = ''; });

function labels(scope: HTMLElement = root): string[] {
  return Array.from(scope.querySelectorAll('li:not(.hd)')).map((li) => li.textContent ?? '');
}

describe('KF-380 interaction matrix: adversarial multi-step walks', () => {
  it('conditional toggle interleaved with granular ops and selection flips across morph, granular, and snapshot states', () => {
    // One realistic long sequence crossing every state boundary at least
    // once: morph (banner) ↔ granular (push/remove) ↔ snapshot-in-place
    // (cacheKey selection drift) ↔ empty ↔ refill.
    const banner = signal(false);
    const sel = signal(-1);
    let nextId = 1;
    const build = (n: number): { id: number; label: string }[] =>
      Array.from({ length: n }, () => { const id = nextId++; return { id, label: `l${id}` }; });
    const rows = arraySignal<{ id: number; label: string }>(build(3)); // ids 1..3
    const dispose = mount(root, () => (
      <div>
        {banner.value ? <div class="banner">warn</div> : ''}
        <ul>
          {each(
            rows,
            (r) => <li data-key={String(r.id)} class={r.id === sel.value ? 'sel' : ''}>{r.label}</li>,
            (r) => r.id === sel.value,
          )}
        </ul>
      </div>
    ));
    const keys = (): string[] =>
      Array.from(root.querySelectorAll('li')).map((el) => el.getAttribute('data-key') ?? '');
    const selKeys = (): string[] =>
      Array.from(root.querySelectorAll('li.sel')).map((el) => el.getAttribute('data-key') ?? '');

    sel.value = 2;                       // snapshot in-place (cacheKey drift)
    expect(selKeys()).toEqual(['2']);
    banner.value = true;                 // morph with a selected row present
    expect(selKeys()).toEqual(['2']);
    rows.push(build(1)[0]);              // granular insert (id 4)
    expect(keys()).toEqual(['1', '2', '3', '4']);
    sel.value = 4;                       // select the appended row
    expect(selKeys()).toEqual(['4']);
    banner.value = false;                // KF-377 shift with selection live
    expect(keys()).toEqual(['1', '2', '3', '4']);
    expect(selKeys()).toEqual(['4']);
    rows.remove(3);                      // granular remove of the SELECTED row
    expect(selKeys()).toEqual([]);
    sel.value = 1;                       // selection still tracked after the remove
    expect(selKeys()).toEqual(['1']);
    batch(() => {                        // structural + selection in one batch → snapshot
      sel.value = 3;
      rows.remove(0);
    });
    expect(keys()).toEqual(['2', '3']);
    expect(selKeys()).toEqual(['3']);
    rows.replace([]);                    // empty
    expect(keys()).toEqual([]);
    banner.value = true;                 // morph while empty
    const refill = build(2);             // ids 5, 6
    batch(() => { rows.insert(0, refill[0]); rows.insert(1, refill[1]); });
    expect(keys()).toEqual(['5', '6']);  // empty-binding refill renders
    sel.value = 6;                       // and selection works on the refilled list
    expect(selKeys()).toEqual(['6']);
    dispose();
  });

  it('kitchen sink: conditionals around a global hole element and a list in one tree survive a full cycle', () => {
    // Everything at once — a leading conditional, a bound-hole element, a
    // keyed arraySignal list, and a trailing conditional in one parent. Each
    // step asserts the whole visible state so any cross-feature interference
    // (not just the axis under test) fails loudly.
    const head = signal(false);
    const foot = signal(true);
    const v = signal('v1');
    const rows = arraySignal<Item>([...ROWS]);
    const dispose = mount(root, () => (
      <div>
        {head.value ? <header class="h">head</header> : ''}
        <p class="status">{v} ready</p>
        <ul>{each(rows, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
        {foot.value ? <footer class="f">foot</footer> : ''}
      </div>
    ));
    const status = root.querySelector('p.status') as HTMLElement;
    const state = (): [boolean, string, string[], boolean] => [
      root.querySelector('header.h') !== null,
      (root.querySelector('p.status') as HTMLElement).textContent ?? '',
      labels(),
      root.querySelector('footer.f') !== null,
    ];
    expect(state()).toEqual([false, 'v1 ready', ['A', 'B'], true]);
    head.value = true;
    expect(state()).toEqual([true, 'v1 ready', ['A', 'B'], true]);
    foot.value = false; // trailing removal with owned rows + hole present
    expect(state()).toEqual([true, 'v1 ready', ['A', 'B'], false]);
    v.value = 'v2';
    rows.push({ id: 'c', label: 'C' });
    expect(state()).toEqual([true, 'v2 ready', ['A', 'B', 'C'], false]);
    head.value = false; // the KF-377 shift moves BOTH the hole element and the list
    expect(state()).toEqual([false, 'v2 ready', ['A', 'B', 'C'], false]);
    expect(root.querySelector('p.status')).toBe(status); // hole element moved, not rebuilt
    v.value = 'v3';
    rows.remove(0);
    foot.value = true;
    expect(state()).toEqual([false, 'v3 ready', ['B', 'C'], true]);
    dispose();
  });
});
