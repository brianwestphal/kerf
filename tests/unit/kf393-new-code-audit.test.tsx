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
import { html } from '../../src/html.js';
import { batch, each, mount, signal } from '../../src/index.js';

let root: HTMLElement;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
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

  it('an empty-string key is rejected rather than silently becoming an identity', () => {
    // It used to be accepted, producing `<!--kf-list:k:-->`. An empty key is
    // almost certainly a bug at the callsite (an unset variable), and the key
    // validation added for the marker-injection fix rejects it by construction.
    const rows = arraySignal([{ id: 'a' }]);
    expect(() => mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: '' })}</ul>
    ))).toThrow(/invalid list key ""/);
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

  it('a keyed each() nested in a row render names the real boundary, not a duplicate key (KF-398)', () => {
    // Every row's render claims the same key, so this used to surface as
    // "duplicate list key" — which misdiagnoses, and whose literal advice (a
    // per-row key) silences the error and lands the author in the silent
    // degradation instead. The error now names the actual boundary: a nested
    // each() is never reconciled, because the row is flattened to HTML.
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
    ))).toThrow(/nested each\(\) is not reconciled/);
  });
});

describe('KF-393: list-key marker injection (KNOWN BUG KF-395)', () => {
  it('a key containing --> is rejected before anything reaches the DOM (KF-395)', () => {
    // The key lands verbatim inside <!--kf-list:{id}-->, so a comment
    // terminator used to end the marker early: the rest of the key became LIVE
    // markup in the mount root, and binding then died on a bare TypeError.
    // Both halves were wrong — markup in the DOM, and an internal error rather
    // than an actionable one. Keys are now validated up front.
    const rows = arraySignal([{ id: 'a' }]);
    expect(() => mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'x--><b>pwn</b>' })}</ul>
    ))).toThrow(/invalid list key/);
    expect(root.querySelector('b')).toBeNull(); // nothing injected
    expect(root.innerHTML).not.toContain('pwn');
  });

  it('a key containing <!-- is rejected too — it used to work by accident (KF-395)', () => {
    // Previously accepted silently because it happened to parse as a longer
    // comment. The validation decides this shape deliberately instead of
    // leaving it to parser luck.
    const rows = arraySignal([{ id: 'a' }]);
    expect(() => mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: '<!--y' })}</ul>
    ))).toThrow(/invalid list key/);
  });

  it('ordinary keys — letters, digits, _ . : / and single dashes — are accepted (KF-395)', () => {
    // The validation must not be so tight that reasonable keys break. Namespaced
    // and path-ish keys are the shapes real apps reach for.
    for (const key of ['results', 'a-b', 'ns:list', 'a/b', 'ok_1.2']) {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const rows = arraySignal([{ id: 'a' }]);
      const dispose = mount(host, () => (
        <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key })}</ul>
      ));
      expect(host.querySelectorAll('li').length).toBe(1);
      dispose();
      host.remove();
    }
  });
});

describe('KF-393: identity-shift warning fires only on a real shift (KF-394)', () => {
  it('a KEYED list legitimately swapping its data source does NOT warn (KF-394)', () => {
    // Identity is stable, and the snapshot rebuild is correct and unavoidable
    // (different data). The warning used to fire here and recommend adding the
    // key the list already had — telling the author to fix correct code. A key
    // IS the identity, so a keyed list is excluded from the trigger entirely.
    const cond = signal(true);
    const a = arraySignal([{ id: 'a1', t: 'A1' }]);
    const b = arraySignal([{ id: 'b1', t: 'B1' }]);
    const dispose = mount(root, () => (
      <ul data-key="c">
        {each(cond.value ? a : b, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'x' })}
      </ul>
    ));
    cond.value = false;
    expect(shiftWarnings()).toEqual([]);
    // The routing itself was always right: the list renders its new source's rows.
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['B1']);
    dispose();
  });

  it('an UNKEYED sole list swapping its source does NOT warn — its id never shifted (KF-394)', () => {
    // `each(cond ? a : b, render)` as the only list in the mount: id '0' is
    // stable, no each() call was added or removed anywhere. A changed source is
    // not a shift — an everyday filter/tab swap changes source too. The trigger
    // now also requires the render's each() call count to have moved, which is
    // what an id shift actually requires.
    const cond = signal(true);
    const a = arraySignal([{ id: 'a1', t: 'A1' }]);
    const b = arraySignal([{ id: 'b1', t: 'B1' }]);
    const dispose = mount(root, () => (
      <ul data-key="c">
        {each(cond.value ? a : b, (r) => <li data-key={r.id}>{r.t}</li>)}
      </ul>
    ));
    cond.value = false;
    expect(shiftWarnings()).toEqual([]);
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['B1']);
    dispose();
  });

  it('each mount reports its OWN genuine shift — dedup is per mount, not global (KF-394)', () => {
    // Dedup used to be a module-level set keyed on the list id, but ids are
    // per-mount: once mount #1 warned for id '0', every other mount's genuine
    // shift on ITS id '0' was silent forever. Dedup now lives on the per-mount
    // render context.
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
    expect(shiftWarnings().length).toBe(2); // both mounts report their own shift
    m1.dispose();
    m2.dispose();
  });
});

describe('KF-393: row-structure tag check × SVG rows (KNOWN BUG KF-396)', () => {
  it('an SVG row with an apostrophe in an attribute mounts and reconciles (KF-396)', () => {
    // The serialization mismatch is what reaches the fallback re-parse at all:
    // kerf emits `&#39;`, serializers emit a raw apostrophe. That re-parse now
    // runs in the LIVE PARENT's namespace, so <circle> comes back a real SVG
    // element and the tag comparison matches. Previously it parsed HTML —
    // tagName 'CIRCLE' vs the live 'circle' — and the case-sensitive compare
    // rejected a working list with a self-contradictory message.
    const pts = arraySignal([{ id: 'p1', note: "it's" }]);
    const dispose = mount(root, () => (
      <svg viewBox="0 0 10 10">
        {each(pts, (p) => <circle data-key={p.id} data-note={p.note} cx="1" cy="1" r="1" />)}
      </svg>
    ));
    const first = root.querySelector('circle[data-key="p1"]') as Element;
    expect(first.namespaceURI).toBe('http://www.w3.org/2000/svg');
    // and it still reconciles afterwards
    pts.push({ id: 'p2', note: "also's" });
    expect(root.querySelectorAll('circle').length).toBe(2);
    expect((root.querySelector('circle[data-key="p2"]') as Element).namespaceURI)
      .toBe('http://www.w3.org/2000/svg');
    dispose();
  });

  it('the genuine tbody restructure still throws — the tag check is not simply disabled (KF-396)', () => {
    // The guard that KF-396's namespace fix could have silently defeated.
    const rows = [{ id: 'r1' }, { id: 'r2' }];
    expect(() => mount(root, () => (
      <table>{each(rows, (r) => <tr data-key={r.id}><td>{r.id}</td></tr>)}</table>
    ))).toThrow(/wrapped the rows in <tbody>/);
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

describe('KF-393: textarea text fast path form-state sync (KF-397)', () => {
  it('a dirty unfocused textarea row follows a granular text-only update (KF-397)', () => {
    // The fourth writer subject to the KF-335 rule: a textarea's value lives in
    // its child text, so patching that text must carry the property — the morph
    // route already did, which made behavior depend on the internal route.
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
    expect(ta.value).toBe('two'); // was left at 'user typed' before KF-397
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
