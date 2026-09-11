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
import { each,mount } from '../../src/index.js';

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

describe('KF-393: row-structure tag check × SVG rows (KF-396)', () => {
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
