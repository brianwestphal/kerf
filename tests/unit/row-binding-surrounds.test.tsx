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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { computed, each, mount, signal, toElement } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  root = toElement(<div />) as HTMLElement;
  document.body.appendChild(root);
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('KF-380 interaction matrix: row-scoped bindings × surrounds morph', () => {
  it('row-scoped mixed-content holes stay live when a conditional sibling before the list toggles', () => {
    // Rows are owned, so the surrounds morph must skip them individually —
    // their marker comments + inserted text nodes are never re-paired. The
    // external-signal hole must keep updating after BOTH toggle directions,
    // and a granular update afterwards must still re-wire the changed row.
    const banner = signal(false);
    const unit = signal('ms');
    const rows = arraySignal([
      { id: 1, label: 'lat' },
      { id: 2, label: 'p95' },
    ]);
    const dispose = mount(root, () => (
      <div>
        {banner.value ? <div class="banner">warn</div> : ''}
        <ul>
          {each(rows, (r) => (
            <li data-key={String(r.id)}>
              {computed(() => r.label)} in {unit}
            </li>
          ))}
        </ul>
      </div>
    ));
    const li = (i: number): HTMLElement =>
      root.querySelectorAll('li')[i] as HTMLElement;
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
        <ul>
          {each(rows, (r) => (
            <li
              data-key={String(r.id)}
              class={computed(() => (sel.value === r.id ? 'sel' : ''))}
            >
              {String(r.id)}
            </li>
          ))}
        </ul>
      </div>
    ));
    const dispose = mount(root, render);
    const selKeys = (): string[] =>
      Array.from(root.querySelectorAll('li.sel')).map(
        (el) => el.getAttribute('data-key') ?? '',
      );
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

describe('global bindings beside keyed rows after a surrounds-changed render', () => {
  // The global marker search steps over bound rows (they only ever carry
  // row-scope markers). These walk the shapes that would break if it skipped
  // too much — markers before, between, and after the rows, in the rows'
  // own container — or too little: an overlay host slot holding another
  // mount's identically-numbered markers.
  it('re-wires attribute and text holes before, after, and around the rows', () => {
    const tone = signal('cool');
    const label = signal('a');
    const tail = signal('x');
    const pane = signal(0);
    const rowTone = signal('r');
    const lines = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const dispose = mount(root, () => (
      <main class={tone}>
        <aside>
          <p>Pane {String(pane.value)}</p>
          <b>{label}</b>
        </aside>
        <ul>
          <li class="head">{label}</li>
          {each(
            lines,
            (line) => (
              <li data-key={String(line.id)} class={rowTone}>
                r{String(line.id)}
              </li>
            ),
            { key: 'lines' },
          )}
          <li class="tail" data-tail={tail}>
            end
          </li>
        </ul>
      </main>
    ));
    const rows = Array.from(root.querySelectorAll('li[data-key]'));
    for (let n = 1; n <= 3; n++) {
      pane.value = n; // surrounds change → global holes re-wired
      tone.value = `t${n}`;
      label.value = `l${n}`;
      tail.value = `x${n}`;
      rowTone.value = `r${n}`;
      expect(root.querySelector('main')!.className).toBe(`t${n}`);
      expect(root.querySelector('aside b')!.textContent).toBe(`l${n}`);
      expect(root.querySelector('.head')!.textContent).toBe(`l${n}`);
      expect(root.querySelector('.tail')!.getAttribute('data-tail')).toBe(
        `x${n}`,
      );
      expect(rows.map((r) => r.className)).toEqual([`r${n}`, `r${n}`, `r${n}`]);
    }
    expect(Array.from(root.querySelectorAll('li[data-key]'))).toEqual(rows);
    dispose();
  });

  // The search steps over the slot whether or not there are rows to skip.
  it.each([
    ['with', 2],
    ['without', 0],
  ])(
    "does not take an overlay host slot's markers for its own, %s rows",
    (_, count) => {
      const outer = signal('outer-a');
      const inner = signal('inner-a');
      const pane = signal(0);
      const lines = Array.from({ length: count }, (_, k) => ({ id: k + 1 }));
      const dispose = mount(root, () => (
        <main>
          <p>Pane {String(pane.value)}</p>
          {/* Before the slot: a later same-id marker inside it would win. */}
          <span class={outer}>o</span>
          <div data-kerf-overlay-host data-morph-skip />
          <ul>
            {each(
              lines,
              (line) => (
                <li data-key={String(line.id)}>{String(line.id)}</li>
              ),
              { key: 'lines' },
            )}
          </ul>
        </main>
      ));
      const slot = root.querySelector(
        '[data-kerf-overlay-host]',
      ) as HTMLElement;
      // A surface mounted inside the slot numbers its global holes from zero too.
      const surface = document.createElement('div');
      slot.appendChild(surface);
      const disposeInner = mount(surface, () => <span class={inner}>i</span>);
      pane.value = 1; // outer surrounds change → outer re-wires
      outer.value = 'outer-b';
      inner.value = 'inner-b';
      expect(root.querySelector('main > span')!.className).toBe('outer-b');
      expect(slot.querySelector('span')!.className).toBe('inner-b');
      disposeInner();
      dispose();
    },
  );
});
