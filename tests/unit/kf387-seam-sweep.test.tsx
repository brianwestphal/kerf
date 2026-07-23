/**
 * KF-387 — second adversarial sweep: the cross-subsystem seams NOBODY had
 * walked (the KF-380 matrix swept only morph × bindings × owned rows).
 *
 * Each describe below is one seam from the KF-387 seam inventory
 * (docs/ai/test-gap-analysis-kf387.md), probed through the public API only.
 * Four seams turned out to be broken, not merely untested; their current
 * behavior is pinned ASSERTING (never `.skip`) with a `KNOWN BUG KF-NNN`
 * comment, so the assertions flip loudly when the fix lands:
 *
 *   - KF-388 — each() list identity is its call-order index: a conditional
 *     each() shifts sibling list ids (silent rebuild; a batched granular
 *     patch renders the WRONG list's rows).
 *   - KF-389 — each() rows inside <svg> lose the SVG namespace on every
 *     post-first-render parse.
 *   - KF-390 — the attribute-only row fast path skips form-state property
 *     sync (dirty checkbox/input rows go visibly stale).
 *   - KF-391 — each() of <tr> directly under <table> silently misbinds
 *     (parser-inserted tbody), duplicating rows.
 *
 * The rest pin documented claims verified true by execution (the KF-383
 * lesson: run the claim, don't read the code).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { batch, delegate, each, mount, signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

describe('KF-387 seam: delegate() × morph node replacement', () => {
  it('a delegated handler keeps firing after the morph rebuilds and after it moves the target subtree', () => {
    // docs/5's core claim: the listener lives on the stable root, so no
    // rebuild/move of descendants can detach it. Walk BOTH diff outcomes —
    // a replaceChild rebuild (tag swap) and a lookahead move (sibling
    // removal) — and both toggle directions.
    const mode = signal('a');
    const lead = signal(true);
    const hits: string[] = [];
    const dispose = mount(root, () => (
      <div>
        {lead.value ? <p class="lead">lead</p> : ''}
        {mode.value === 'a'
          ? <section><button class="go">A</button></section>
          : <article><button class="go">B</button></article>}
      </div>
    ));
    const off = delegate(root, 'click', '.go', (_e, el) => hits.push(el.textContent ?? ''));
    (root.querySelector('.go') as HTMLElement).click();
    mode.value = 'b'; // replaceChild rebuild of the subtree hosting the target
    (root.querySelector('.go') as HTMLElement).click();
    lead.value = false; // lookahead moves the <article> up a slot
    (root.querySelector('.go') as HTMLElement).click();
    mode.value = 'a'; // rebuild back
    (root.querySelector('.go') as HTMLElement).click();
    expect(hits).toEqual(['A', 'B', 'B', 'A']);
    off();
    dispose();
  });
});

describe('KF-387 seam: fine-grained bindings × data-morph-skip', () => {
  it('bound text and attr holes inside a data-morph-skip subtree stay live across a surrounds morph', () => {
    // The skip subtree is invisible to the morph, but wireBindings re-wires
    // over the whole root each surrounds-changed render — the hole's marker
    // (from the first render) must keep resolving and the inserted text node
    // must be reused, not stacked.
    const flag = signal(false);
    const v = signal('V');
    const cls = signal('c1');
    const dispose = mount(root, () => (
      <div>
        {flag.value ? <p class="x">extra</p> : ''}
        <div data-morph-skip class="lib">
          <span class={cls}>{v} tail</span>
        </div>
      </div>
    ));
    const span = root.querySelector('span') as HTMLElement;
    expect(span.textContent).toBe('V tail');
    flag.value = true; // surrounds change; the skipped subtree is untouched
    expect(root.querySelector('span')).toBe(span);
    v.value = 'W';
    cls.value = 'c2';
    expect(span.textContent).toBe('W tail'); // exactly one inserted text node — no stacking
    expect(span.getAttribute('class')).toBe('c2');
    flag.value = false; // and the return direction
    v.value = 'X';
    expect(span.textContent).toBe('X tail');
    dispose();
  });

  it('switching the bound signal INSTANCE re-binds when the surrounds change in the same render', () => {
    // docs/2 §2.9 scopes the stale-binding hazard to the BYTE-EQUAL fast
    // path. The complement claim — a render that switches instances while
    // also changing the surrounds re-wires cleanly — was never asserted.
    const use2 = signal(false);
    const s1 = signal('one');
    const s2 = signal('two');
    const dispose = mount(root, () => (
      <div>
        <p class={use2.value ? 'v2' : 'v1'}>{use2.value ? s2 : s1}</p>
      </div>
    ));
    expect((root.querySelector('p') as HTMLElement).textContent).toBe('one');
    use2.value = true; // surrounds changed (class) → morph + re-wire → binds s2
    expect((root.querySelector('p') as HTMLElement).textContent).toBe('two');
    s2.value = 'TWO'; // the new instance is live
    expect((root.querySelector('p') as HTMLElement).textContent).toBe('TWO');
    s1.value = 'ONE'; // the old instance is fully detached — no ghost write
    expect((root.querySelector('p') as HTMLElement).textContent).toBe('TWO');
    dispose();
  });
});

describe('KF-387 seam: form-state sync × list reconcile', () => {
  it('a dirty checkbox row follows arraySignal updates when the diff routes through the morph path', () => {
    // The KF-335 contract holding on the morph route: attribute mutation
    // syncs the live property even after user interaction dirtied the
    // control. The label text changes alongside `done`, so the attr-only
    // fast path bails and _morphElement runs.
    const rows = arraySignal([{ id: 'a', done: false, label: 'one' }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <label data-key={r.id}><input type="checkbox" checked={r.done} />{r.label}</label>)}</div>
    ));
    const box = root.querySelector('input') as HTMLInputElement;
    box.checked = true; // user checks — control is dirty
    rows.update(0, (r) => ({ ...r, done: true, label: 'one!' }));
    expect(root.querySelector('input')).toBe(box);
    expect(box.checked).toBe(true);
    rows.update(0, (r) => ({ ...r, done: false, label: 'one!!' }));
    expect(box.hasAttribute('checked')).toBe(false);
    expect(box.checked).toBe(false); // property followed the attribute removal
    dispose();
  });

  it('a dirty checkbox row does NOT follow an attribute-only arraySignal update (fast path skips the property sync)', () => {
    // KNOWN BUG KF-390 (attribute-only row fast path skips form-state
    // property sync). When the row's TOP-LEVEL element is the control and
    // the update changes only its attributes, tryAttributeOnlyFastPath
    // mutates the attribute raw — the dirty control's visible state stays
    // stale, unlike the identical operation through the morph path above.
    // This test asserts the CURRENT (wrong) behavior; when KF-390 lands,
    // flip the final expectation to `false`.
    const rows = arraySignal([{ id: 'a', done: false }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <input type="checkbox" data-key={r.id} checked={r.done} />)}</div>
    ));
    const box = root.querySelector('input') as HTMLInputElement;
    box.checked = true; // user checks — control is dirty
    rows.update(0, (r) => ({ ...r, done: false })); // app unchecks; attr-only diff
    expect(root.querySelector('input')).toBe(box);
    expect(box.hasAttribute('checked')).toBe(false); // the attribute obeyed
    expect(box.checked).toBe(true); // KNOWN BUG KF-390: property left stale — should be false
    dispose();
  });

  it('a dirty text input row keeps the stale user value on an attribute-only value update (fast path skips the sync)', () => {
    // KNOWN BUG KF-390 — the `value` flavor. The input is NOT focused, so
    // syncFormProp's focused-element exception does not apply; the morph
    // path would write the property. Flip both final expectations when
    // KF-390 lands (prop should become 'two').
    const rows = arraySignal([{ id: 'a', v: 'one' }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <input data-key={r.id} value={r.v} />)}</div>
    ));
    const inp = root.querySelector('input') as HTMLInputElement;
    inp.value = 'user-typed'; // dirty, not focused
    rows.update(0, (r) => ({ ...r, v: 'two' }));
    expect(inp.getAttribute('value')).toBe('two');
    expect(inp.value).toBe('user-typed'); // KNOWN BUG KF-390: should be 'two'
    dispose();
  });
});

describe('KF-387 seam: SVG × list reconcile', () => {
  it('a conditional SVG element in the static surrounds gets the SVG namespace when the morph inserts it', () => {
    // docs/7's "mount() is enough with an <svg> root" claim, verified true
    // for the static-surrounds diff: the template parse sees the <svg>
    // context, so foreign-content mode applies.
    const on = signal(false);
    const dispose = mount(root, () => (
      <svg viewBox="0 0 10 10">
        {on.value ? <circle class="dot" cx="1" cy="1" r="1" /> : ''}
        <rect x="0" y="0" width="2" height="2" />
      </svg>
    ));
    on.value = true;
    expect((root.querySelector('.dot') as Element).namespaceURI).toBe('http://www.w3.org/2000/svg');
    on.value = false;
    on.value = true; // round trip: still correctly namespaced
    expect((root.querySelector('.dot') as Element).namespaceURI).toBe('http://www.w3.org/2000/svg');
    dispose();
  });

  it('each() rows inside an svg root keep the SVG namespace through every post-first-render parse', () => {
    // KF-389 (fixed): each() rows inside <svg> keep the SVG namespace on
    // EVERY parse, not just the first render. Rows used to be re-parsed
    // through a bare HTML <template> that never saw the <svg> context, so a
    // granular insert, a snapshot append, and a structural update each
    // produced HTML-namespace nodes a real browser will not paint — and
    // because first render was correct, it presented as a flake. Row parsing
    // is now namespace-aware (utils/rowContract.ts).
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Granular insert.
    const pts = arraySignal([{ id: 'p1' }]);
    const dispose1 = mount(root, () => (
      <svg viewBox="0 0 10 10">{each(pts, (p) => <circle data-key={p.id} cx="1" cy="1" r="1" />)}</svg>
    ));
    expect((root.querySelector('circle[data-key="p1"]') as Element).namespaceURI).toBe(SVG_NS);
    pts.push({ id: 'p2' });
    expect((root.querySelector('circle[data-key="p2"]') as Element).namespaceURI)
      .toBe(SVG_NS);
    dispose1();
    root.innerHTML = '';

    // Snapshot append (plain array, new row identity).
    const list = signal([{ id: 's1' }]);
    const dispose2 = mount(root, () => (
      <svg viewBox="0 0 10 10">{each(list.value, (p) => <circle data-key={p.id} cx="1" cy="1" r="1" />)}</svg>
    ));
    list.value = [...list.value, { id: 's2' }];
    expect((root.querySelector('circle[data-key="s2"]') as Element).namespaceURI)
      .toBe(SVG_NS);
    dispose2();
    root.innerHTML = '';

    // Granular structural update (row replaced).
    const shapes = arraySignal([{ id: 'g1', big: false }]);
    const dispose3 = mount(root, () => (
      <svg viewBox="0 0 10 10">
        {each(shapes, (p) => (p.big
          ? <g data-key={p.id}><circle cx="1" cy="1" r="5" /></g>
          : <circle data-key={p.id} cx="1" cy="1" r="1" />))}
      </svg>
    ));
    shapes.update(0, (r) => ({ ...r, big: true }));
    expect((root.querySelector('g') as Element).namespaceURI)
      .toBe(SVG_NS);
    dispose3();
  });
});

describe('KF-387 seam: each() list identity across a varying call count', () => {
  interface Row { id: string; t: string }
  const A_ROWS = (): Row[] => [{ id: 'a1', t: 'A1' }, { id: 'a2', t: 'A2' }];
  const B_ROWS = (): Row[] => [{ id: 'b1', t: 'B1' }, { id: 'b2', t: 'B2' }];
  const bLabels = (): string[] =>
    Array.from(root.querySelectorAll('ul.b li')).map((li) => li.textContent ?? '');

  it('a batched conditional-toggle + granular patch renders the WRONG list\'s rows', () => {
    // KNOWN BUG KF-388 shape A (each() list identity is its call-order
    // index). Hiding the panel makes list B the render's FIRST each() call,
    // so it inherits list A's id — and A's binding, whose recorded count
    // makes B's queued insert patch pass the drift check. The granular path
    // then applies B's patch against A's live rows: ul.b displays A1 A2 B3.
    // This test asserts the CURRENT (corrupt) output; when KF-388 lands,
    // change it to ['B1', 'B2', 'B3'].
    const cond = signal(true);
    const a = arraySignal(A_ROWS());
    const b = arraySignal(B_ROWS());
    const dispose = mount(root, () => (
      <div>
        {cond.value ? <ul class="a">{each(a, (r) => <li data-key={r.id}>{r.t}</li>)}</ul> : ''}
        <ul class="b">{each(b, (r) => <li data-key={r.id}>{r.t}</li>)}</ul>
      </div>
    ));
    expect(bLabels()).toEqual(['B1', 'B2']);
    batch(() => {
      cond.value = false;
      b.push({ id: 'b3', t: 'B3' });
    });
    // KNOWN BUG KF-388: list B shows list A's rows plus the pushed item.
    expect(bLabels()).toEqual(['A1', 'A2', 'B3']);
    dispose();
  });

  it('a batched conditional-toggle + granular update splices the two lists\' rows together', () => {
    // KNOWN BUG KF-388 shape A, update flavor: ul.b ends up ['B1-upd', 'A2']
    // — the updated B row patched over A's row 0, with A's row 1 kept.
    // Change to ['B1-upd', 'B2'] when KF-388 lands.
    const cond = signal(true);
    const a = arraySignal(A_ROWS());
    const b = arraySignal(B_ROWS());
    const dispose = mount(root, () => (
      <div>
        {cond.value ? <ul class="a">{each(a, (r) => <li data-key={r.id}>{r.t}</li>)}</ul> : ''}
        <ul class="b">{each(b, (r) => <li data-key={r.id}>{r.t}</li>)}</ul>
      </div>
    ));
    batch(() => {
      cond.value = false;
      b.update(0, (r) => ({ ...r, t: 'B1-upd' }));
    });
    // KNOWN BUG KF-388: a spliced hybrid of the two lists.
    expect(bLabels()).toEqual(['B1-upd', 'A2']);
    dispose();
  });

  it('an unbatched conditional each() toggle keeps content correct but silently rebuilds the sibling list', () => {
    // KNOWN BUG KF-388 shape B: content survives (the id-shifted list looks
    // like 100% item turnover to the snapshot classify), but row identity is
    // lost in BOTH toggle directions and no dev warning fires — even
    // KERF_DEV_WARN_LIST_REBIND is blind, because the rebuild routes through
    // the ordinary classify pass, not the self-heal. When KF-388 lands the
    // identity assertions should flip to `toBe(...)`.
    const cond = signal(true);
    const a = A_ROWS();
    const b = B_ROWS();
    const dispose = mount(root, () => (
      <div>
        {cond.value ? <ul class="a">{each(a, (r) => <li data-key={r.id}>{r.t}</li>)}</ul> : ''}
        <ul class="b">{each(b, (r) => <li data-key={r.id}>{r.t}</li>)}</ul>
      </div>
    ));
    const b1 = root.querySelector('ul.b li[data-key="b1"]');
    cond.value = false;
    expect(bLabels()).toEqual(['B1', 'B2']); // content correct
    // KNOWN BUG KF-388: rebuilt from scratch — focus/scroll/IME on B's rows are lost.
    expect(root.querySelector('ul.b li[data-key="b1"]')).not.toBe(b1);
    const b1After = root.querySelector('ul.b li[data-key="b1"]');
    cond.value = true; // return direction shifts the id back — rebuilt AGAIN
    expect(bLabels()).toEqual(['B1', 'B2']);
    expect(root.querySelector('ul.b li[data-key="b1"]')).not.toBe(b1After);
    dispose();
  });

  it('a nested each() inside a row drifts the id counter with cache hits, rebuilding an unrelated sibling list', () => {
    // KNOWN BUG KF-388 shape C: an each() inside a row render increments the
    // shared list-id counter only on cache-MISS renders of that row, so an
    // unrelated signal bump (outer rows all cache-hit) changes how many
    // each() calls precede the second list — its id flips and it rebuilds.
    // (Nested-in-row lists themselves flatten to static HTML — the inner
    // marker never reaches the segment tree — which is a separate boundary
    // noted on KF-388.) Flip the identity assertion when KF-388 lands.
    interface Outer { id: string; subs: { id: string; t: string }[] }
    const outer: Outer[] = [{ id: 'o1', subs: [{ id: 's1', t: 'S1' }] }];
    const others = [{ id: 'x1', t: 'X1' }, { id: 'x2', t: 'X2' }];
    const bump = signal(0);
    const dispose = mount(root, () => (
      <div>
        <p>{String(bump.value)}</p>
        <ul class="outer">
          {each(outer, (o) => (
            <li data-key={o.id}>
              <ol>{each(o.subs, (s) => <li data-key={s.id}>{s.t}</li>)}</ol>
            </li>
          ))}
        </ul>
        <ul class="second">{each(others, (r) => <li data-key={r.id}>{r.t}</li>)}</ul>
      </div>
    ));
    const x1 = root.querySelector('ul.second li[data-key="x1"]');
    bump.value = 1; // outer rows cache-hit → inner each() not called → ids shift
    const second = Array.from(root.querySelectorAll('ul.second li')).map((li) => li.textContent);
    expect(second).toEqual(['X1', 'X2']); // content correct
    // KNOWN BUG KF-388: the unrelated sibling list was rebuilt.
    expect(root.querySelector('ul.second li[data-key="x1"]')).not.toBe(x1);
    dispose();
  });
});

describe('KF-387 seam: each() rows × table parsing', () => {
  it('each() of tr rows directly under table misbinds through the parser-inserted tbody and duplicates rows', () => {
    // KNOWN BUG KF-391 (each() of <tr> directly under <table> silently
    // misbinds). The first-render innerHTML wraps the row run in an implicit
    // <tbody>; the binding walk pairs row 0 with the TBODY, the KF-103
    // misalignment guard is defeated (the row re-parse alone counts 1
    // element), the reconcile inserts the "missing" rows outside the tbody —
    // visible duplicates — and the missing-row-key warning fires FALSELY
    // (it inspects the tbody, which has no data-key). Asserting current
    // behavior; when KF-391 lands this shape should throw a row-contract
    // error instead (or bind through the tbody — update per the fix chosen).
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const rows = [{ id: 'r1' }, { id: 'r2' }];
      const dispose = mount(root, () => (
        <table>{each(rows, (r) => <tr data-key={r.id}><td>{r.id}</td></tr>)}</table>
      ));
      // KNOWN BUG KF-391: r2 exists twice — inside the implicit tbody and as
      // a reconciler-inserted duplicate outside it.
      expect(root.querySelectorAll('tr[data-key="r2"]').length).toBe(2);
      expect(root.querySelector('tbody')).not.toBeNull();
      // The false-positive diagnostic: rows DO carry data-key, but the
      // warning inspects the mis-bound tbody and claims they don't.
      expect(warn.mock.calls.some((c) => String(c[0]).includes('no `id` or `data-key`'))).toBe(true);
      dispose();
    } finally {
      warn.mockRestore();
    }
  });

  it('each() of tr rows inside an explicit tbody binds and reconciles cleanly', () => {
    // The documented shape (the krausest bench uses it) — pinned as the
    // counterpart of the KF-391 defect above.
    const rows = arraySignal([{ id: 'r1', t: 'one' }]);
    const dispose = mount(root, () => (
      <table><tbody>{each(rows, (r) => <tr data-key={r.id}><td>{r.t}</td></tr>)}</tbody></table>
    ));
    rows.push({ id: 'r2', t: 'two' });
    rows.update(0, (r) => ({ ...r, t: 'ONE' }));
    const texts = Array.from(root.querySelectorAll('tbody tr')).map((tr) => tr.textContent);
    expect(texts).toEqual(['ONE', 'two']);
    expect(root.querySelectorAll('tr').length).toBe(2);
    dispose();
  });
});
