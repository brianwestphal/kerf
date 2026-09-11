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
 *  - the identity-shift warning's false positives — fixed by KF-394;
 *  - the marker-comment key injection — rejected by KF-395 validation;
 *  - the row-structure tag check × SVG cross — fixed by KF-396;
 *  - the textarea text-content fast path's form-state sync — fixed by KF-397;
 *  - whole-morph focus capture/restore edges and row-region bounds — all
 *    correct, pinned asserting.
 *
 * Every regression test asserts the shipped behavior (never `.skip`).
 */
import { afterEach,beforeEach,describe,expect,it,type MockInstance,vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { html } from '../../src/html.js';
import { batch,each,mount,signal } from '../../src/index.js';

let root: HTMLElement;
let warnSpy: MockInstance<typeof console.warn>;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
  warnSpy.mockRestore();
});

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

describe('KF-393: list-key marker injection is rejected (KF-395)', () => {
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
