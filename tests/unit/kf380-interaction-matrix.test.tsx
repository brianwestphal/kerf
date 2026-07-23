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
 * Two tests are `.skip`ped: they pin real bugs found by this matrix (KF-381 —
 * stranded owned rows duplicate when a conditional sibling shares or shadows
 * the list container). Un-skip them when KF-381 lands.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { batch, computed, each, mount, raw, signal, toElement } from '../../src/index.js';

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

describe('KF-380 interaction matrix: morph × global bindings × conditional siblings', () => {
  it('a conditional sibling removed before a bound-hole element keeps identity, statics, and a live binding across toggle cycles', () => {
    // KF-374 × KF-377 cross: the lookahead moves the hole-carrying element up
    // instead of rebuilding it, so the marker comment + its inserted text node
    // travel together and the re-wire retargets the SAME text node.
    const banner = signal(false);
    const v = signal('V');
    const dispose = mount(root, () => (
      <div>
        {banner.value ? <div class="banner">warn</div> : ''}
        <p class="mix">{v} / static</p>
      </div>
    ));
    const p = root.querySelector('p.mix') as HTMLElement;
    expect(p.textContent).toBe('V / static');

    // off → on → off → update → on → update: two full morph cycles with
    // binding writes interleaved on both sides.
    banner.value = true;
    expect(root.querySelector('p.mix')).toBe(p); // trailing insert never touched it
    expect(p.textContent).toBe('V / static');
    banner.value = false; // the KF-377 shape: element shifts one slot left
    expect(root.querySelector('p.mix')).toBe(p); // moved, not rebuilt
    expect(p.textContent).toBe('V / static');
    v.value = 'W';
    expect(p.textContent).toBe('W / static');
    banner.value = true;
    expect(p.textContent).toBe('W / static');
    v.value = 'X';
    expect(p.textContent).toBe('X / static');
    dispose();
  });

  it('a conditional element sharing its parent with a global text hole and static tail survives off, update, on, update', () => {
    // The hole's marker comment is a DIRECT sibling of the conditional. The
    // elements-only lookahead cannot move a comment, so the morph rebuilds the
    // marker; the re-wire must then re-insert the text node with the CURRENT
    // value and keep the static tail (the KF-374 trailing-static invariant)
    // through every cycle.
    const flag = signal(true);
    const v = signal('V');
    const dispose = mount(root, () => (
      <div class="wrap">
        {flag.value ? <b>lead</b> : ''}
        {v} tail
      </div>
    ));
    const wrap = root.querySelector('.wrap') as HTMLElement;
    expect(wrap.textContent).toBe('leadV tail');
    flag.value = false;
    expect(wrap.textContent).toBe('V tail');
    v.value = 'W'; // binding live after the rebuild
    expect(wrap.textContent).toBe('W tail');
    flag.value = true; // and back — current value, not the initial one
    expect(wrap.textContent).toBe('leadW tail');
    v.value = 'Z';
    expect(wrap.textContent).toBe('leadZ tail');
    dispose();
  });

  it('bound attr + text holes on the shifted element both stay live after the lookahead move', () => {
    const banner = signal(true);
    const cls = signal('c1');
    const txt = signal('t1');
    const dispose = mount(root, () => (
      <div>
        {banner.value ? <div class="banner">warn</div> : ''}
        <span class={cls}>{txt} end</span>
      </div>
    ));
    const span = root.querySelector('span') as HTMLElement;
    expect(span.getAttribute('class')).toBe('c1');
    expect(span.textContent).toBe('t1 end');
    banner.value = false; // shift left; morph strips bound attrs → re-wire restores
    expect(root.querySelector('span')).toBe(span);
    expect(span.getAttribute('class')).toBe('c1');
    expect(span.textContent).toBe('t1 end');
    cls.value = 'c2';
    txt.value = 't2';
    expect(span.getAttribute('class')).toBe('c2');
    expect(span.textContent).toBe('t2 end');
    dispose();
  });
});

describe('KF-380 interaction matrix: morph × owned each() rows × conditional siblings', () => {
  it('two leading conditional siblings removed in one render keep every row', () => {
    // The KF-377 lookahead must scan PAST both removed elements to find the
    // list container — a two-slot shift, not the single-slot shape the
    // original regression tests pin.
    const banners = signal(0);
    const dispose = mount(root, () => (
      <div>
        {banners.value >= 1 ? <div class="b1">one</div> : ''}
        {banners.value >= 2 ? <div class="b2">two</div> : ''}
        <ul>{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
      </div>
    ));
    const liA = root.querySelector('li[data-key="a"]');
    banners.value = 2;
    expect(labels()).toEqual(['A', 'B']);
    banners.value = 0; // both removed in ONE render
    expect(root.querySelector('.b1')).toBeNull();
    expect(root.querySelector('.b2')).toBeNull();
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('li[data-key="a"]')).toBe(liA); // container moved, not rebuilt
    banners.value = 1; // partial re-add
    expect(labels()).toEqual(['A', 'B']);
    dispose();
  });

  it('a conditional between two lists: both bindings survive its removal and return', () => {
    const MORE: Item[] = [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }];
    const mid = signal(true);
    const dispose = mount(root, () => (
      <div>
        <ul class="one">{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
        {mid.value ? <p class="mid">between</p> : ''}
        <ul class="two">{each(MORE, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
      </div>
    ));
    const ulTwo = root.querySelector('ul.two');
    mid.value = false; // the second list's container shifts left
    expect(root.querySelector('ul.two')).toBe(ulTwo);
    expect(labels()).toEqual(['A', 'B', 'X', 'Y']);
    mid.value = true;
    expect(root.querySelector('p.mid')).not.toBeNull();
    expect(labels()).toEqual(['A', 'B', 'X', 'Y']);
    dispose();
  });

  it('container tag swap with the list present on both sides (ul to ol) self-heals and rows repopulate', () => {
    // Neighboring shape to the KF-377 ancestor-tag-swap self-heal: the swap
    // hits the list container ITSELF. No same-tag lookahead candidate exists,
    // so the morph clones a fresh container + marker; the stale binding must
    // be dropped and re-bound so the rows come back.
    const ordered = signal(false);
    const dispose = mount(root, () => (
      <div>
        {ordered.value
          ? <ol>{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ol>
          : <ul>{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>}
      </div>
    ));
    expect(labels()).toEqual(['A', 'B']);
    ordered.value = true;
    expect(root.querySelector('ol')).not.toBeNull();
    expect(labels()).toEqual(['A', 'B']);
    ordered.value = false; // and back
    expect(root.querySelector('ul')).not.toBeNull();
    expect(labels()).toEqual(['A', 'B']);
    dispose();
  });

  it('arraySignal: granular patches still apply after a self-heal container rebuild (ancestor tag swap)', () => {
    // The KF-377 suite covers granular-after-LOOKAHEAD (binding survives in
    // place) and self-heal with a plain array. This is the missing third cell:
    // self-heal REBUILDS the binding, and the next granular patch must apply
    // against the re-bound container (mount records the fresh count, so the
    // dispatch state machine stays `bound`).
    const wide = signal(false);
    const rows = arraySignal<Item>([...ROWS]);
    const dispose = mount(root, () => (
      <div>
        {wide.value
          ? <section class="w"><ul>{each(rows, (r) => <li data-key={r.id}>{r.label}</li>)}</ul></section>
          : <article class="n"><ul>{each(rows, (r) => <li data-key={r.id}>{r.label}</li>)}</ul></article>}
      </div>
    ));
    wide.value = true; // replaceChild rebuild → self-heal re-bind
    expect(labels()).toEqual(['A', 'B']);
    rows.push({ id: 'c', label: 'C' }); // granular insert on the healed binding
    expect(labels()).toEqual(['A', 'B', 'C']);
    rows.remove(0); // granular remove too
    expect(labels()).toEqual(['B', 'C']);
    wide.value = false; // second rebuild, then another granular patch
    expect(labels()).toEqual(['B', 'C']);
    rows.push({ id: 'd', label: 'D' });
    expect(labels()).toEqual(['B', 'C', 'D']);
    dispose();
  });

  it('an empty list whose container is shifted by a conditional removal still refills (empty-binding transition after a morph move)', () => {
    // empty ↔ refill × KF-377: the binding is in the `empty` state when the
    // lookahead moves its container. The marker must remain bound (no
    // self-heal) so the refill routes through the empty-binding snapshot path
    // and renders rows on the FIRST insert.
    const banner = signal(false);
    const rows = arraySignal<Item>([]);
    const dispose = mount(root, () => (
      <div>
        {banner.value ? <div class="banner">warn</div> : ''}
        <ul>{each(rows, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
      </div>
    ));
    expect(labels()).toEqual([]);
    banner.value = true;
    banner.value = false; // container (holding only the marker) shifts left
    expect(labels()).toEqual([]);
    batch(() => {
      rows.insert(0, { id: 'a', label: 'A' });
      rows.insert(1, { id: 'b', label: 'B' });
    });
    expect(labels()).toEqual(['A', 'B']);
    // And a full drain-refill cycle afterwards still works.
    rows.replace([]);
    expect(labels()).toEqual([]);
    rows.push({ id: 'c', label: 'C' });
    expect(labels()).toEqual(['C']);
    dispose();
  });

  // KF-381 shape 1 / KF-382: a conditional element sibling INSIDE the each()
  // parent, before the marker. The template's first child is the marker
  // COMMENT. Originally the elements-only lookahead couldn't move it, so the
  // morph cloned the marker, the trailing pass removed the original (owned rows
  // survived), and the self-heal re-inserted fresh rows beside the stranded
  // originals: <ul><!--kf-list:0-->A B A B</ul>. KF-381 stopped the
  // duplication; KF-382's marker-aware lookahead now MOVES the marker (with its
  // owned-row run) instead of cloning it, so the binding never detaches and the
  // rows keep their DOM identity — focus, scroll, and IME survive with them.
  it('a conditional sibling INSIDE the list parent before the marker keeps rows single (KF-381 shape 1)', () => {
    const hd = signal(true);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}
      </ul>
    ));
    expect(labels()).toEqual(['A', 'B']);
    const rowA = root.querySelector('li[data-key="a"]');
    const rowB = root.querySelector('li[data-key="b"]');

    hd.value = false;
    expect(labels()).toEqual(['A', 'B']); // was ['A','B','A','B'] before KF-381
    // KF-382: the marker moved rather than being cloned, so these are the SAME
    // nodes — nothing was re-created.
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    expect(root.querySelector('li[data-key="b"]')).toBe(rowB);

    hd.value = true;
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    dispose();
  });

  it('KF-382: a focused row survives the header toggle that shifts the list marker', () => {
    // Identity preservation is what makes this work — the row node is never
    // re-created, so the browser never has anything to blur.
    const hd = signal(true);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(ROWS, (r) => <li data-key={r.id}><input value={r.label} /></li>)}
      </ul>
    ));
    const input = root.querySelector('li[data-key="a"] input') as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    hd.value = false;
    expect(root.querySelector('li[data-key="a"] input')).toBe(input);
    expect(document.activeElement).toBe(input);
    dispose();
  });

  it('KF-382: the marker lookahead scans past unrelated comments to find its own marker', () => {
    // The scan must skip comments that aren't this list's marker — it matches
    // on exact marker data, which is also what keeps sibling lists in one
    // parent from cross-matching each other's anchors.
    const hd = signal(true);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {raw('<!--note-->')}
        {each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}
      </ul>
    ));
    expect(labels()).toEqual(['A', 'B']);
    const rowA = root.querySelector('li[data-key="a"]');
    hd.value = false;
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA); // still moved, not rebuilt
    dispose();
  });

  it('KF-382: two lists in one parent keep their own rows when a shared conditional sibling toggles', () => {
    // Exact-data marker matching: list 0's lookahead must not latch onto
    // list 1's marker (which would splice the wrong rows into the wrong slot).
    const hd = signal(true);
    const first = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    const second = [{ id: 'c', label: 'C' }];
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(first, (r) => <li data-key={r.id}>{r.label}</li>)}
        {each(second, (r) => <li data-key={r.id}>{r.label}</li>)}
      </ul>
    ));
    expect(labels()).toEqual(['A', 'B', 'C']);
    const rowA = root.querySelector('li[data-key="a"]');
    const rowC = root.querySelector('li[data-key="c"]');
    hd.value = false;
    expect(labels()).toEqual(['A', 'B', 'C']); // order preserved, no cross-splice
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    expect(root.querySelector('li[data-key="c"]')).toBe(rowC);
    hd.value = true;
    expect(labels()).toEqual(['A', 'B', 'C']);
    dispose();
  });

  it('KF-382: a TEXT node before the marker shifts out without rebuilding the list', () => {
    // Deferred neighbor shape from the KF-380 gap analysis. The blocker at the
    // cursor is a text node, not an element — the marker lookahead still has to
    // engage (the element lookahead never would), and the trailing pass removes
    // the orphaned text.
    const cond = signal(true);
    const dispose = mount(root, () => (
      <ul>
        {cond.value ? 'heading text' : ''}
        {each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}
      </ul>
    ));
    expect(labels()).toEqual(['A', 'B']);
    const rowA = root.querySelector('li[data-key="a"]');

    cond.value = false;
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    expect((root.querySelector('ul') as HTMLElement).textContent).not.toContain('heading text');

    cond.value = true;
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    dispose();
  });

  it('a nested each() inside a container moved by the element lookahead keeps its rows', () => {
    // Deferred neighbor shape from the KF-380 gap analysis. The shifted element
    // is an ANCESTOR of the list, so this rides the element lookahead (2.5,
    // KF-377) rather than the marker lookahead: the container is moved whole and
    // the inner list's marker is never re-paired at all. Verified to pass on the
    // pre-marker-lookahead morph, so it guards the 2.5 path specifically.
    const banner = signal(true);
    const dispose = mount(root, () => (
      <div>
        {banner.value ? <p class="banner">warn</p> : ''}
        <section>
          <ul>{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
        </section>
      </div>
    ));
    expect(labels()).toEqual(['A', 'B']);
    const rowA = root.querySelector('li[data-key="a"]');
    const section = root.querySelector('section');

    banner.value = false;
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('section')).toBe(section);   // container moved, not cloned
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA); // rows rode along

    banner.value = true;
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    dispose();
  });

  it('KF-382: a trailing template sibling cannot wedge between the marker and its rows', () => {
    // The marker moves as a UNIT with its owned-row run. Moving it alone would
    // let the trailing <button> (matched by the element lookahead on the next
    // iteration) land ahead of the rows, reordering the list against its JSX.
    const hd = signal(true);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}
        <button class="more">more</button>
      </ul>
    ));
    expect(labels()).toEqual(['A', 'B']);
    hd.value = false;
    expect(labels()).toEqual(['A', 'B']);
    // Rows must still precede the trailing button, matching JSX order.
    const tags = Array.from((root.querySelector('ul') as HTMLElement).children)
      .map((el) => el.tagName.toLowerCase() + (el.className ? `.${el.className}` : ''));
    expect(tags).toEqual(['li', 'li', 'button.more']);
    dispose();
  });

  // KF-381 shape 2: a same-tag conditional sibling positionally hijacks the
  // list container. Toggle off: the banner <ul> is morphed INTO the list (rows
  // rebuilt via self-heal — content OK but identity lost). Toggle back on: the
  // live list container is morphed back into the banner, stranding the
  // still-attached owned rows inside it while the list rebuilds in a fresh
  // container. This used to show visible duplicates (banner A B + list A B).
  // Fixed: the self-heal removes the stranded rows from the banner before the
  // list repopulates, so only the list shows the rows.
  it('a same-tag conditional sibling before the list container never strands rows in the old container (KF-381 shape 2)', () => {
    const banner = signal(true);
    const dispose = mount(root, () => (
      <div>
        {banner.value ? <ul class="banner"><li class="hd">warn</li></ul> : ''}
        <ul class="list">{each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
      </div>
    ));
    expect(labels()).toEqual(['A', 'B']);
    const rowA = root.querySelector('li[data-key="a"]');
    banner.value = false;
    expect(labels()).toEqual(['A', 'B']);
    // BY DESIGN (KF-383, resolved WONTFIX): unlike every other shifted-list
    // shape in this file, this one does NOT keep row identity. A same-tag
    // unkeyed sibling positionally takes the container's place, so the
    // mismatch happens one level ABOVE the marker and the marker-aware
    // lookahead can never engage; the container is rebuilt and mount()
    // self-heals with fresh rows. Correct, announced by
    // KERF_DEV_WARN_LIST_REBIND, and fixable by the author with one attribute
    // (see the next test). Covering it in the reconciler would need a third
    // matching mode in the morph's hottest loop. Pinned so the trade-off is
    // explicit: if this assertion ever flips, the reconciler changed and this
    // comment is stale.
    expect(root.querySelector('li[data-key="a"]')).not.toBe(rowA);
    banner.value = true;
    expect(labels()).toEqual(['A', 'B']); // was ['A','B','A','B'] before KF-381
    expect(labels(root.querySelector('ul.banner') as HTMLElement)).toEqual([]);
    dispose();
  });

  it('KF-383: keying the LIST CONTAINER is the documented fix for the shape above — identity survives both directions', () => {
    // The escape hatch kerf documents for the shape-2 trade-off, guarded here
    // so the guidance can't rot. A key on the list's own container makes it
    // ineligible for positional matching AND findable by key, so neither
    // toggle direction can hijack it.
    //
    // NOTE the asymmetry, verified empirically: keying the CONDITIONAL SIBLING
    // instead only fixes the toggle-OFF direction. On toggle-ON the template's
    // keyed banner has no live counterpart, the keyed lookup misses, and the
    // fallback positional match tests only the LIVE node's key — so the
    // unkeyed live container is hijacked anyway. Key the container, not the
    // sibling. (Wrapping the sibling in an always-present container also
    // works, but costs an element.)
    const banner = signal(true);
    const dispose = mount(root, () => (
      <div>
        {banner.value ? <ul class="banner"><li class="hd">warn</li></ul> : ''}
        <ul class="list" data-key="the-list">
          {each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}
        </ul>
      </div>
    ));
    expect(labels()).toEqual(['A', 'B']);
    const rowA = root.querySelector('li[data-key="a"]');

    banner.value = false;
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);

    banner.value = true;
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    expect(labels(root.querySelector('ul.banner') as HTMLElement)).toEqual([]);

    banner.value = false; // and it holds across repeats
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    dispose();
  });

  it('KF-381 shape 1 survives repeated header toggles without ever duplicating', () => {
    // Walk the toggle several times — each OFF crosses the self-heal, each ON
    // re-inserts the header. The row count must stay pinned at 2 throughout.
    const hd = signal(false);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(ROWS, (r) => <li data-key={r.id}>{r.label}</li>)}
      </ul>
    ));
    for (let i = 0; i < 4; i++) {
      hd.value = true;
      expect(labels()).toEqual(['A', 'B']);
      hd.value = false;
      expect(labels()).toEqual(['A', 'B']);
    }
    dispose();
  });

  it('KF-381 shape 1 recovery leaves an arraySignal list patchable (granular after self-heal)', () => {
    // After the stranded-row removal + repopulate, the re-bound list must
    // accept granular patches — i.e. the binding is healthy, not half-dead.
    const hd = signal(true);
    const rows = arraySignal([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(rows, (r) => <li data-key={r.id}>{r.label}</li>)}
      </ul>
    ));
    expect(labels()).toEqual(['A', 'B']);
    hd.value = false; // crosses the self-heal
    expect(labels()).toEqual(['A', 'B']);
    rows.push({ id: 'c', label: 'C' }); // granular insert onto the re-bound list
    expect(labels()).toEqual(['A', 'B', 'C']);
    rows.remove(0);
    expect(labels()).toEqual(['B', 'C']);
    dispose();
  });
});

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
