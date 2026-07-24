/**
 * KF-393 — third adversarial sweep: the KF-385…KF-392 fix cadence audited as a
 * body of new code, plus the brand-new `each(items, render, { cacheKey, key })`
 * public surface probed adversarially.
 *
 * Layout mirrors the sweep's six areas (see
 * `docs/ai/test-gap-analysis-kf393.md`):
 *
 *  - options-API adversarial probes (empty options, colliding keys, mutation,
 *    SSR, `html` templates, multi-mount, later-render duplicates);
 *  - the identity-shift warning's false positives — pinned as KNOWN BUG KF-394;
 *  - the marker-comment key injection — pinned as KNOWN BUG KF-395;
 *  - the row-structure tag check × SVG cross — pinned as KNOWN BUG KF-396;
 *  - the textarea text-content fast path's missing form-state sync — pinned as
 *    KNOWN BUG KF-397;
 *  - whole-morph focus capture/restore edges and row-region bounds — all
 *    correct, pinned asserting.
 *
 * Every KNOWN BUG test ASSERTS current behavior (never `.skip`), so it fails
 * loudly in either direction of change and flips to the correct assertion when
 * its ticket lands.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { _resetWarnedForTests } from '../../src/dev-list-key-warn.js';
import { html } from '../../src/html.js';
import { batch, each, mount, signal } from '../../src/index.js';

let root: HTMLElement;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  _resetWarnedForTests();
  root = document.createElement('div');
  document.body.appendChild(root);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
  warnSpy.mockRestore();
});

const shiftWarnings = (): string[] =>
  warnSpy.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('is now a different list'));

describe('KF-393: each() options API adversarial probes', () => {
  it('an empty options object behaves exactly like the bare form', () => {
    const rows = arraySignal([{ id: 'a' }]);
    const dispose = mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, {})}</ul>
    ));
    const rowA = root.querySelector('li[data-key="a"]');
    rows.push({ id: 'b' });
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA); // granular path kept
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['a', 'b']);
    dispose();
  });

  it('an empty-string key is accepted as a distinct identity and reconciles granularly', () => {
    const rows = arraySignal([{ id: 'a' }]);
    const dispose = mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: '' })}</ul>
    ));
    const rowA = root.querySelector('li[data-key="a"]');
    rows.push({ id: 'b' });
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    expect(root.innerHTML).toContain('<!--kf-list:k:-->');
    dispose();
  });

  it('an author key of "0" cannot collide with the call-order id 0 (namespacing holds)', () => {
    const x = arraySignal([{ id: 'x1' }]);
    const y = arraySignal([{ id: 'y1' }]);
    const dispose = mount(root, () => (
      <div>
        <ul data-key="ux">{each(x, (r) => <li data-key={r.id}>{r.id}</li>)}</ul>
        <ul data-key="uy">{each(y, (r) => <li data-key={r.id}>{r.id}</li>, { key: '0' })}</ul>
      </div>
    ));
    // Distinct marker namespaces for the two lists.
    expect(root.innerHTML).toContain('<!--kf-list:0-->');
    expect(root.innerHTML).toContain('<!--kf-list:k:0-->');
    // Both lists reconcile independently against their own signals.
    batch(() => { x.push({ id: 'x2' }); y.push({ id: 'y2' }); });
    expect(Array.from(root.querySelectorAll('ul[data-key="ux"] li')).map((l) => l.textContent))
      .toEqual(x.value.map((r) => r.id));
    expect(Array.from(root.querySelectorAll('ul[data-key="uy"] li')).map((l) => l.textContent))
      .toEqual(y.value.map((r) => r.id));
    dispose();
  });

  it('a keyed conditional list that is hidden, mutated, and re-shown renders its own current rows', () => {
    const cond = signal(true);
    const a = arraySignal([{ id: 'a1' }]);
    const dispose = mount(root, () => (
      <div>
        {cond.value
          ? <ul data-key="ca">{each(a, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'a' })}</ul>
          : ''}
      </div>
    ));
    // Unbatched: hide, push while hidden, re-show.
    cond.value = false;
    a.push({ id: 'a2' });
    cond.value = true;
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['a1', 'a2']);
    // Batched: hide + push in one commit, then re-show.
    batch(() => { cond.value = false; a.push({ id: 'a3' }); });
    cond.value = true;
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['a1', 'a2', 'a3']);
    dispose();
  });

  it('a duplicate key claimed on a LATER render throws, and the mount recovers on the next good render', () => {
    const cond = signal(false);
    const a = arraySignal([{ id: 'a1' }]);
    const b = arraySignal([{ id: 'b1' }]);
    const dispose = mount(root, () => (
      <div>
        <ul data-key="u1">{each(a, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'dup' })}</ul>
        {cond.value ? <ul data-key="u2">{each(b, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'dup' })}</ul> : ''}
      </div>
    ));
    expect(() => { cond.value = true; }).toThrow(/duplicate list key "dup"/);
    // The previous render's DOM is intact — no half-applied output.
    expect(root.querySelector('ul[data-key="u2"]')).toBeNull();
    expect(root.querySelector('ul[data-key="u1"] li')?.textContent).toBe('a1');
    // A following good render works — the throw did not wedge the effect.
    cond.value = false;
    a.push({ id: 'a2' });
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['a1', 'a2']);
    dispose();
  });

  it('the same key in the two BRANCHES of a conditional is one identity — routing stays correct across the swap', () => {
    const cond = signal(true);
    const a = arraySignal([{ id: 'a1', t: 'A' }]);
    const b = arraySignal([{ id: 'b1', t: 'B' }]);
    const dispose = mount(root, () => (
      <div>
        {cond.value
          ? <ul data-key="u">{each(a, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'x' })}</ul>
          : <ol data-key="u2">{each(b, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'x' })}</ol>}
      </div>
    ));
    cond.value = false;
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['B']);
    // Granular ops after the swap apply to the CURRENT source, never the old one.
    b.push({ id: 'b2', t: 'B2' });
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['B', 'B2']);
    dispose();
  });

  it('mutating the options object between renders changes the list identity (key is read per call)', () => {
    const opts: { key?: string } = { key: 'k1' };
    const bump = signal(0);
    const rows = arraySignal([{ id: 'a' }]);
    const dispose = mount(root, () => {
      void bump.value;
      return <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, opts)}</ul>;
    });
    const row0 = root.querySelector('li');
    opts.key = 'k2';
    bump.value = 1;
    // New key = new list: rebuilt (identity lost), but content stays correct
    // and the old binding is cleaned up rather than leaked.
    expect(root.querySelector('li')).not.toBe(row0);
    expect(root.innerHTML).toContain('<!--kf-list:k:k2-->');
    expect(root.innerHTML).not.toContain('<!--kf-list:k:k1-->');
    rows.push({ id: 'b' });
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['a', 'b']);
    dispose();
  });

  it('a keyed each() outside a mount (SSR toString) renders markerless, keyless output', () => {
    const inner = each([{ id: 'a' }], (r) => <li data-key={r.id}>{r.id}</li>, { key: 'ssr' }).toString();
    expect(inner).toBe('<li data-key="a">a</li>');
    const outer = (
      <ul>{each([{ id: 'a' }], (r) => <li data-key={r.id}>{r.id}</li>, { key: 'ssr' })}</ul>
    ).toString();
    expect(outer).toBe('<ul><li data-key="a">a</li></ul>');
    expect(outer).not.toContain('kf-list');
  });

  it('a keyed list under the html tagged template keeps identity across a sibling toggle and reconciles granularly', () => {
    const rows = arraySignal([{ id: 'a' }]);
    const aux = arraySignal([{ id: 'z' }]);
    const cond = signal(true);
    const dispose = mount(root, () => html`<div>
      ${cond.value ? html`<ul data-key="ca">${each(aux, (r) => html`<li data-key="${r.id}">${r.id}</li>`)}</ul>` : ''}
      <ul data-key="cb">${each(rows, (r) => html`<li data-key="${r.id}">${r.id}</li>`, { key: 'h' })}</ul>
    </div>`);
    const row = root.querySelector('ul[data-key="cb"] li');
    cond.value = false;
    expect(root.querySelector('ul[data-key="cb"] li')).toBe(row);
    rows.push({ id: 'b' });
    expect(Array.from(root.querySelectorAll('ul[data-key="cb"] li')).map((l) => l.textContent))
      .toEqual(['a', 'b']);
    dispose();
  });

  it('the same key on two separate mounts is two separate identities (per-mount contexts)', () => {
    const root2 = document.createElement('div');
    document.body.appendChild(root2);
    const a = arraySignal([{ id: 'a1' }]);
    const b = arraySignal([{ id: 'b1' }]);
    const d1 = mount(root, () => <ul>{each(a, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'k' })}</ul>);
    const d2 = mount(root2, () => <ul>{each(b, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'k' })}</ul>);
    a.push({ id: 'a2' });
    b.push({ id: 'b2' });
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['a1', 'a2']);
    expect(Array.from(root2.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['b1', 'b2']);
    d1();
    d2();
  });

  it('a keyed each() nested in a row render throws the duplicate-key error (misleading; the real boundary is that nested lists degrade)', () => {
    // KNOWN ISSUE KF-398: every row's render claims the same key, so 2+ rows
    // throw "duplicate list key" — a message that misdiagnoses. The real
    // problem is that an each() inside a row render is a degraded shape (row
    // HTML flattens via toString(), so the inner list never binds). Following
    // the error's advice (per-row keys) silences the throw and lands in that
    // silent degradation. This pin holds the CURRENT loud-but-wrong error.
    const rows = arraySignal([
      { id: 'a', subs: [{ id: 's1' }] },
      { id: 'b', subs: [{ id: 's2' }] },
    ]);
    expect(() => mount(root, () => (
      <ul>{each(rows, (r) => (
        <li data-key={r.id}>
          <ol>{each(r.subs, (s) => <li data-key={s.id}>{s.id}</li>, { key: 'nested' })}</ol>
        </li>
      ))}</ul>
    ))).toThrow(/duplicate list key "nested"/);
  });
});

describe('KF-393: list-key marker injection (KNOWN BUG KF-395)', () => {
  it('a key containing --> breaks out of the marker comment: live injected markup, then an internal TypeError', () => {
    // KNOWN BUG KF-395: claimKey validates nothing; the id lands verbatim in
    // <!--kf-list:{id}-->, so a comment terminator in the key ends the marker
    // early. The remainder of the key becomes LIVE markup in the mount root,
    // and bindListsFromMarkers then crashes on the truncated id with a bare
    // TypeError instead of an actionable error. When KF-395 lands (claimKey
    // rejects keys containing "--"), flip this to assert the validation error
    // and that NOTHING was injected.
    const rows = arraySignal([{ id: 'a' }]);
    expect(() => mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'x--><b>pwn</b>' })}</ul>
    ))).toThrow(TypeError);
    expect(root.querySelector('b')).not.toBeNull(); // injected element is LIVE in the DOM
  });

  it('a key containing <!-- happens to parse as a longer comment and works by accident', () => {
    // Same KF-395 family: currently accepted silently. Pinned so a validation
    // fix consciously decides this shape's fate too.
    const rows = arraySignal([{ id: 'a' }]);
    const dispose = mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: '<!--y' })}</ul>
    ));
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['a']);
    dispose();
  });
});

describe('KF-393: identity-shift warning false positives (KNOWN BUG KF-394)', () => {
  it('a KEYED list legitimately swapping its data source fires the shift warning telling the author to add the key it has', () => {
    // KNOWN BUG KF-394 (false positive 1): identity is stable ('k:x'), the
    // snapshot rebuild is correct and unavoidable (different data), yet the
    // always-on warning fires and recommends `{ key: 'my-list' }` — which the
    // list already has. Flip to `toEqual([])` when KF-394 lands.
    const cond = signal(true);
    const a = arraySignal([{ id: 'a1', t: 'A1' }]);
    const b = arraySignal([{ id: 'b1', t: 'B1' }]);
    const dispose = mount(root, () => (
      <ul data-key="c">
        {each(cond.value ? a : b, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'x' })}
      </ul>
    ));
    cond.value = false;
    expect(shiftWarnings().length).toBe(1);
    expect(shiftWarnings()[0]).toContain("'k:x'");
    // The routing itself is right: the list renders its own new source's rows.
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['B1']);
    dispose();
  });

  it('an UNKEYED sole list swapping its source fires the shift warning although its id never shifted', () => {
    // KNOWN BUG KF-394 (false positive 2): `each(cond ? a : b, render)` as the
    // only list in the mount — id '0' is perfectly stable, no each() call was
    // added or removed anywhere, yet the "identified by call order" warning
    // fires on an everyday filter/tab source swap. Flip to `toEqual([])` when
    // KF-394 lands.
    const cond = signal(true);
    const a = arraySignal([{ id: 'a1', t: 'A1' }]);
    const b = arraySignal([{ id: 'b1', t: 'B1' }]);
    const dispose = mount(root, () => (
      <ul data-key="c">
        {each(cond.value ? a : b, (r) => <li data-key={r.id}>{r.t}</li>)}
      </ul>
    ));
    cond.value = false;
    expect(shiftWarnings().length).toBe(1);
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['B1']);
    dispose();
  });

  it('the one-shot dedup is module-level, so a second mount\'s genuine shift on the same id stays silent', () => {
    // KNOWN BUG KF-394 (dedup scope): warnedIds is module-level and keyed on
    // the list id, but ids are per-mount — after mount #1 warns for id '0',
    // mount #2's own genuine shift on ITS id '0' never warns. Flip to
    // expecting 2 warnings when KF-394 scopes dedup per mount.
    const mk = (host: HTMLElement) => {
      const cond = signal(true);
      const a = arraySignal([{ id: 'a1' }]);
      const b = arraySignal([{ id: 'b1' }]);
      const dispose = mount(host, () => (
        <div>
          {cond.value ? <ul data-key="ca">{each(a, (r) => <li data-key={r.id}>{r.id}</li>)}</ul> : ''}
          <ul data-key="cb">{each(b, (r) => <li data-key={r.id}>{r.id}</li>)}</ul>
        </div>
      ));
      return { cond, dispose };
    };
    const m1 = mk(root);
    const root2 = document.createElement('div');
    document.body.appendChild(root2);
    const m2 = mk(root2);
    m1.cond.value = false;
    expect(shiftWarnings().length).toBe(1);
    m2.cond.value = false;
    expect(shiftWarnings().length).toBe(1); // second mount's shift was swallowed
    m1.dispose();
    m2.dispose();
  });
});

describe('KF-393: row-structure tag check × SVG rows (KNOWN BUG KF-396)', () => {
  it('an SVG row with an apostrophe in an attribute falsely fails the first-render tag check', () => {
    // KNOWN BUG KF-396: emitted row HTML has &#39;, serialized outerHTML has a
    // raw apostrophe → mismatch → the fallback re-parse runs WITHOUT the live
    // parent, so <circle> parses HTML-namespaced as tagName 'CIRCLE', which the
    // tag check compares case-sensitively against the live SVG 'circle'. A
    // working list (verified against pre-tag-check mount.ts) now throws a
    // self-contradictory "renders <circle> but wrapped in <circle>" error.
    // Flip to a mounts-cleanly assertion when KF-396 lands.
    const pts = arraySignal([{ id: 'p1', note: "it's" }]);
    expect(() => mount(root, () => (
      <svg viewBox="0 0 10 10">
        {each(pts, (p) => <circle data-key={p.id} data-note={p.note} cx="1" cy="1" r="1" />)}
      </svg>
    ))).toThrow(/renders <circle>.*wrapped the rows in <circle>/);
  });

  it('the same SVG list WITHOUT the serialization-mismatching attribute mounts and reconciles (control)', () => {
    const pts = arraySignal([{ id: 'p1' }]);
    const dispose = mount(root, () => (
      <svg viewBox="0 0 10 10">
        {each(pts, (p) => <circle data-key={p.id} cx="1" cy="1" r="1" />)}
      </svg>
    ));
    pts.push({ id: 'p2' });
    const circles = Array.from(root.querySelectorAll('circle'));
    expect(circles.length).toBe(2);
    expect(circles[1].namespaceURI).toBe('http://www.w3.org/2000/svg');
    dispose();
  });

  it('an HTML row with the same apostrophe attribute passes the check (control — the false positive is SVG-only)', () => {
    const rows = arraySignal([{ id: 'a', note: "it's" }]);
    const dispose = mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id} data-note={r.note}>{r.id}</li>)}</ul>
    ));
    expect(root.querySelector('li')?.getAttribute('data-note')).toBe("it's");
    dispose();
  });
});

describe('KF-393: textarea text fast path form-state sync (KNOWN BUG KF-397)', () => {
  it('a dirty unfocused textarea row goes visibly stale on a granular text-only update', () => {
    // KNOWN BUG KF-397: tryTextContentFastPath patches the child text node raw.
    // A textarea's value lives in that text, and once the control is dirty the
    // property is detached — so the visible value stays the user's old text
    // while the DOM text (and the app's model) say otherwise. Flip the value
    // assertion to 'two' when KF-397 lands.
    const rows = arraySignal([{ id: 'a', v: 'one' }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <textarea data-key={r.id}>{r.v}</textarea>)}</div>
    ));
    const ta = root.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'user typed'; // dirty, not focused
    rows.update(0, (r) => ({ ...r, v: 'two' }));
    expect(root.querySelector('textarea')).toBe(ta); // fast path kept the node
    expect(ta.textContent).toBe('two');
    expect(ta.value).toBe('user typed'); // ← the stale half; should be 'two'
    dispose();
  });

  it('the identical update routed through the morph path syncs the dirty textarea (the route dependency)', () => {
    // Control: an attribute change in the same update() makes the text fast
    // path bail, and morph.ts's syncTextareaValue carries the property along.
    const rows = arraySignal([{ id: 'a', v: 'one', cls: '' }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <li data-key={r.id} class={r.cls}><textarea>{r.v}</textarea></li>)}</div>
    ));
    const ta = root.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'user typed';
    rows.update(0, (r) => ({ ...r, v: 'two', cls: 'x' }));
    expect(root.querySelector('textarea')).toBe(ta);
    expect(ta.value).toBe('two'); // morph route obeys the app
    dispose();
  });

  it('a FOCUSED textarea keeps the user\'s in-progress edit on both routes (already consistent)', () => {
    const rows = arraySignal([{ id: 'a', v: 'one' }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <textarea data-key={r.id}>{r.v}</textarea>)}</div>
    ));
    const ta = root.querySelector('textarea') as HTMLTextAreaElement;
    ta.focus();
    ta.value = 'mid-edit';
    rows.update(0, (r) => ({ ...r, v: 'two' }));
    expect(ta.textContent).toBe('two');
    expect(ta.value).toBe('mid-edit'); // focused exception holds on the fast path too
    dispose();
  });

  it('the in-place snapshot route (plain array + cacheKey) syncs checked through the attribute fast path', () => {
    // The KF-390 sync verified through the OTHER caller of the same ladder —
    // the plain-array in-place path — including the dirty-control direction.
    const sel = signal<string | null>(null);
    const rows = [{ id: 'a' }, { id: 'b' }];
    const dispose = mount(root, () => (
      <div>
        {each(
          rows,
          (r) => <input type="checkbox" data-key={r.id} checked={sel.value === r.id} />,
          (r) => sel.value === r.id,
        )}
      </div>
    ));
    const boxA = root.querySelector('input[data-key="a"]') as HTMLInputElement;
    sel.value = 'a';
    expect(root.querySelector('input[data-key="a"]')).toBe(boxA); // in-place, not rebuilt
    expect(boxA.checked).toBe(true);
    boxA.checked = false; // user unchecks — control is dirty
    sel.value = 'b';
    const boxB = root.querySelector('input[data-key="b"]') as HTMLInputElement;
    expect(boxA.hasAttribute('checked')).toBe(false);
    expect(boxA.checked).toBe(false);
    expect(boxB.checked).toBe(true);
    dispose();
  });
});

describe('KF-393: whole-morph focus capture/restore edges', () => {
  it('a focused element removed by the same morph releases focus without a crash or a ghost restore', () => {
    const show = signal(true);
    const dispose = mount(root, () => (
      <div>
        {show.value ? <input id="gone" /> : ''}
        <p>tail</p>
      </div>
    ));
    (root.querySelector('#gone') as HTMLInputElement).focus();
    show.value = false;
    expect(root.querySelector('#gone')).toBeNull();
    expect(document.activeElement).toBe(document.body);
    dispose();
  });

  it('focus an app moves AFTER a synchronous re-render is not stolen back by the restore', () => {
    // The delegate-handler shape: write a signal (render runs synchronously,
    // capture+restore included), then the handler moves focus. The morph's
    // restore already ran, so the handler's focus() wins — deliberate moves
    // are never fought.
    const n = signal(0);
    const dispose = mount(root, () => (
      <div>
        <p>{String(n.value)}</p>
        <input id="i1" />
        <input id="i2" />
      </div>
    ));
    (root.querySelector('#i1') as HTMLInputElement).focus();
    n.value = 1;
    (root.querySelector('#i2') as HTMLInputElement).focus();
    expect(document.activeElement).toBe(root.querySelector('#i2'));
    dispose();
  });

  it('focus and selection inside a data-morph-skip subtree survive a surrounds change untouched', () => {
    const n = signal(0);
    const dispose = mount(root, () => (
      <div>
        <p>{String(n.value)}</p>
        <div data-morph-skip id="widget"><input id="wi" /></div>
      </div>
    ));
    const wi = root.querySelector('#wi') as HTMLInputElement;
    wi.focus();
    wi.value = 'typed';
    wi.setSelectionRange(2, 4);
    n.value = 1;
    expect(document.activeElement).toBe(wi);
    expect(wi.selectionStart).toBe(2);
    expect(wi.selectionEnd).toBe(4);
    dispose();
  });

  it('focus inside a row the granular path structurally replaces is released (node identity is gone)', () => {
    // Documented consequence, pinned: a top-level row TAG change is a
    // replaceChild — the focused descendant's node is discarded, so there is
    // nothing to restore focus to. (Structure-preserving updates keep focus;
    // that is covered by the reconciler suites.)
    const rows = arraySignal([{ id: 'a', big: false }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => r.big
        ? <section data-key={r.id}><input /></section>
        : <article data-key={r.id}><input /></article>)}</div>
    ));
    (root.querySelector('input') as HTMLInputElement).focus();
    rows.update(0, (r) => ({ ...r, big: true }));
    expect(root.querySelector('section')).not.toBeNull();
    expect(document.activeElement).toBe(document.body);
    dispose();
  });
});

describe('KF-393: row-region bounds and cross-fix interactions', () => {
  it('a KEYED marker run-move carries interlopers and keeps row identity, both toggle directions', () => {
    // Keys × the row-region move: the 2.6 lookahead matches marker data
    // exactly, so a `k:`-namespaced marker must move as a unit like a
    // call-order one — interloper carried, rows before the trailing sibling.
    const hd = signal(true);
    const rows = arraySignal([{ id: 'a' }, { id: 'b' }]);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'main' })}
        <button class="more">more</button>
      </ul>
    ));
    const ul = root.querySelector('ul') as Element;
    const pres = document.createElement('div');
    pres.setAttribute('data-morph-preserve', '');
    ul.insertBefore(pres, root.querySelector('li[data-key="a"]'));
    const rowA = root.querySelector('li[data-key="a"]');

    hd.value = false;
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    // Rows precede the trailing button; the interloper stays where the
    // consumer put it (between marker and rows).
    const order = Array.from(ul.children).map((c) => c.tagName + (c.className ? `.${c.className}` : ''));
    expect(order).toEqual(['DIV', 'LI', 'LI', 'BUTTON.more']);

    hd.value = true;
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    const order2 = Array.from(ul.children).map((c) => c.tagName + (c.className ? `.${c.className}` : ''));
    expect(order2).toEqual(['LI.hd', 'DIV', 'LI', 'LI', 'BUTTON.more']);
    dispose();
  });

  it('two ADJACENT keyed lists survive a leading toggle — neither region absorbs the other', () => {
    const hd = signal(true);
    const a = arraySignal([{ id: 'a1' }, { id: 'a2' }]);
    const b = arraySignal([{ id: 'b1' }]);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(a, (r) => <li data-key={r.id} class="la">{r.id}</li>, { key: 'a' })}
        {each(b, (r) => <li data-key={r.id} class="lb">{r.id}</li>, { key: 'b' })}
        <button>tail</button>
      </ul>
    ));
    const a1 = root.querySelector('li[data-key="a1"]');
    const b1 = root.querySelector('li[data-key="b1"]');
    hd.value = false;
    expect(root.querySelector('li[data-key="a1"]')).toBe(a1);
    expect(root.querySelector('li[data-key="b1"]')).toBe(b1);
    const classes = Array.from((root.querySelector('ul') as Element).querySelectorAll('li'))
      .map((l) => l.className);
    expect(classes).toEqual(['la', 'la', 'lb']); // a-rows first, then b-rows
    // Both lists still reconcile against their own signals after the move.
    batch(() => { a.push({ id: 'a3' }); b.push({ id: 'b2' }); });
    expect(Array.from(root.querySelectorAll('li.la')).map((l) => l.textContent))
      .toEqual(a.value.map((r) => r.id));
    expect(Array.from(root.querySelectorAll('li.lb')).map((l) => l.textContent))
      .toEqual(b.value.map((r) => r.id));
    dispose();
  });

  it('an EMPTY keyed list at the very end of its parent survives a leading toggle and a later refill', () => {
    // afterListRegion's empty-list bound: the region is the bare marker; the
    // toggle moves it alone, and the refill lands rows after it correctly.
    const hd = signal(true);
    const a = arraySignal<{ id: string }>([]);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(a, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'a' })}
      </ul>
    ));
    hd.value = false;
    a.push({ id: 'x' });
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['x']);
    hd.value = true;
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['header', 'x']);
    dispose();
  });

  it('a keyed arraySignal list stays correct through replace() and back onto the granular path', () => {
    // Source guard × keys × replace(): replace routes to snapshot, and the
    // NEXT granular op applies to the rebuilt binding without drift.
    const rows = arraySignal([{ id: 'a' }]);
    const dispose = mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'r' })}</ul>
    ));
    rows.replace([{ id: 'b' }, { id: 'c' }]);
    const rowB = root.querySelector('li[data-key="b"]');
    rows.push({ id: 'd' });
    expect(root.querySelector('li[data-key="b"]')).toBe(rowB); // granular kept identity
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent))
      .toEqual(rows.value.map((r) => r.id));
    dispose();
  });
});
