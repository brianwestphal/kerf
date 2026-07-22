/**
 * Direct unit coverage for `carryOrRewireRowBindings` (KF-347) — the
 * carry-vs-rewire decision the in-place row-update paths delegate to. The
 * end-to-end behavior is pinned in `bindings.test.ts` ("in-place updates
 * re-wire changed binding instances"); this file covers the argument shapes
 * the live call sites can't produce — both sides undefined, and the
 * defensive `undefined` arms of the length normalization (BoundItem.bindings
 * is optional, so a tolerant signature keeps the helper total). Internal
 * import → `.internal.test.ts` so the dist-full suite excludes it.
 */

import { describe, expect, it } from 'vitest';

import { type Binding, carryOrRewireRowBindings } from '../../src/bindings.js';
import { signal } from '../../src/reactive.js';

describe('carryOrRewireRowBindings — argument-shape matrix', () => {
  const el = (): Element => document.createElement('div');

  it('both sides undefined → carries (nothing to dispose, nothing to wire)', () => {
    const out = carryOrRewireRowBindings(el(), undefined, undefined, undefined);
    expect(out.bindings).toBeUndefined();
    expect(out.bindingDisposers).toBeUndefined();
  });

  it('old side undefined, new side empty array → carry-equivalent (lengths match at 0)', () => {
    const out = carryOrRewireRowBindings(el(), undefined, undefined, []);
    expect(out.bindings).toBeUndefined();
    expect(out.bindingDisposers).toBeUndefined();
  });

  it('old side present, new side undefined → disposes old, wires nothing', () => {
    let disposed = 0;
    const oldBindings: Binding[] = [{ kind: 'text', id: 't0', signal: signal('x') }];
    const out = carryOrRewireRowBindings(
      el(), oldBindings, [(): void => { disposed++; }], undefined,
    );
    expect(disposed).toBe(1);
    expect(out.bindings).toBeUndefined();
    expect(out.bindingDisposers).toBeUndefined();
  });

  it('same instances → carries the exact disposer array through', () => {
    const s = signal('x');
    const bindings: Binding[] = [{ kind: 'text', id: 't0', signal: s }];
    const disposers = [(): void => {}];
    const out = carryOrRewireRowBindings(el(), bindings, disposers, [...bindings]);
    expect(out.bindings).toBe(bindings);
    expect(out.bindingDisposers).toBe(disposers);
  });
});
