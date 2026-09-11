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
import { each,mount,signal } from '../../src/index.js';

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
