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

const shiftWarnings = (): string[] =>
  warnSpy.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('is now a different list'));

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
