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
import { beforeEach, describe, expect, it } from 'vitest';

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

  it('a dirty checkbox row is left alone when the update changes no attribute (uncontrolled preservation)', () => {
    // This shape was originally filed as the KF-390 repro, but it does not
    // demonstrate the bug: `done` goes false → false, so the `checked`
    // attribute is absent before AND after and kerf mutates nothing. Leaving
    // the user's state alone is then exactly right — the KF-335 rule is
    // "sync the property only where we actually mutate the attribute", which
    // is what keeps uncontrolled usage working. Pinned so the distinction
    // between "no mutation" and "mutation without sync" stays explicit.
    const rows = arraySignal([{ id: 'a', done: false }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <input type="checkbox" data-key={r.id} checked={r.done} />)}</div>
    ));
    const box = root.querySelector('input') as HTMLInputElement;
    box.checked = true; // user checks — control is dirty
    rows.update(0, (r) => ({ ...r, done: false })); // no attribute change at all
    expect(root.querySelector('input')).toBe(box);
    expect(box.hasAttribute('checked')).toBe(false);
    expect(box.checked).toBe(true); // untouched, by design
    dispose();
  });

  it('a dirty checkbox row DOES follow an attribute-only update that really changes the attribute', () => {
    // The genuine KF-390 shape: the row's top-level element is the control
    // and the attribute actually flips, so the fast path mutates it — and
    // must carry the property along, exactly as the morph route does.
    const rows = arraySignal([{ id: 'a', done: true }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <input type="checkbox" data-key={r.id} checked={r.done} />)}</div>
    ));
    const box = root.querySelector('input') as HTMLInputElement;
    box.checked = false;
    box.checked = true; // dirty
    rows.update(0, (r) => ({ ...r, done: false })); // attribute genuinely removed
    expect(root.querySelector('input')).toBe(box); // same node — fast path ran
    expect(box.hasAttribute('checked')).toBe(false);
    expect(box.checked).toBe(false); // property followed (was stale before KF-390)
    dispose();
  });

  it('a dirty text input row follows an attribute-only value update', () => {
    // The `value` flavor of KF-390, now fixed. The input is NOT focused, so
    // syncFormProp's focused-element exception does not apply and the
    // property follows the mutated attribute — as it always did on the morph
    // route.
    const rows = arraySignal([{ id: 'a', v: 'one' }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <input data-key={r.id} value={r.v} />)}</div>
    ));
    const inp = root.querySelector('input') as HTMLInputElement;
    inp.value = 'user-typed'; // dirty, not focused
    rows.update(0, (r) => ({ ...r, v: 'two' }));
    expect(inp.getAttribute('value')).toBe('two');
    expect(inp.value).toBe('two'); // was left at 'user-typed' before KF-390
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

  it('a batched conditional-toggle + granular patch renders its own list\'s rows', () => {
    // KF-388 (fixed): hiding the panel makes list B the render's FIRST each()
    // call, so it inherits list A's id — and A's binding, whose recorded count
    // used to make B's queued insert patch pass the drift check. The granular
    // path then applied B's patch to A's live rows and ul.b displayed
    // A1 A2 B3. each() now compares the recorded data source for the id and
    // snapshot-rebuilds on a mismatch, so B renders B's rows.
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
    expect(bLabels()).toEqual(['B1', 'B2', 'B3']);
    dispose();
  });

  it('a batched conditional-toggle + granular update keeps the two lists\' rows separate', () => {
    // KF-388 (fixed), update flavor: ul.b used to end up ['B1-upd', 'A2'] —
    // the updated B row patched over A's row 0, with A's row 1 kept.
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
    expect(bLabels()).toEqual(['B1-upd', 'B2']);
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

  it('a nested each() inside a row drifts the id counter with cache hits, and the unrelated sibling list survives it', () => {
    // An each() inside a row render increments the shared list-id counter only
    // on cache-MISS renders of that row, so an unrelated signal bump (outer
    // rows all cache-hit) changes how many each() calls precede the second
    // list — its call-order id flips.
    //
    // That used to rebuild the second list, discarding its row nodes. It no
    // longer does: a changed call count now resets the call-order-keyed state
    // and re-renders, which routes the list through the snapshot path, where
    // the same refs in the same order are morphed in place. Identity survives.
    // (Nested-in-row lists themselves still flatten to static HTML — the inner
    // marker never reaches the segment tree — which is a separate boundary.)
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
    // …and the unrelated sibling list kept its row nodes.
    expect(root.querySelector('ul.second li[data-key="x1"]')).toBe(x1);
    dispose();
  });
});

describe('KF-387 seam: each() rows × table parsing', () => {
  it('each() of tr rows directly under table fails loudly instead of misbinding', () => {
    // KF-391 (fixed): the first-render innerHTML wraps the row run in an
    // implicit <tbody>, so the binding walk used to pair row 0 with the
    // TBODY, the reconcile re-inserted the "missing" rows outside it
    // (visible duplicates), and the missing-row-key warning fired FALSELY
    // against the wrapper. The row-contract guard now compares the bound
    // element's TAG against the row's own top-level tag and rejects the
    // shape with an actionable error naming both tags.
    const rows = [{ id: 'r1' }, { id: 'r2' }];
    expect(() => mount(root, () => (
      <table>{each(rows, (r) => <tr data-key={r.id}><td>{r.id}</td></tr>)}</table>
    ))).toThrow(/parser wrapped the rows in <tbody>/);
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
