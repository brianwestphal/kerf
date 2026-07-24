/**
 * Always-on dev warning for `each()` list identity shifts (KF-392).
 *
 * Unlike the `KERF_DEV_WARN_*` family this one has no env var — it is on in
 * development, like the missing-row-key warning, because it fires only when
 * kerf is about to silently discard row state and it names a one-line fix.
 * Tests cover: it fires on a real shift, it is one-shot per list, a keyed list
 * never triggers it, an ordinary render never triggers it, and production mode
 * is silent.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { _resetWarnedForTests } from '../../src/dev-list-key-warn.js';
import { each } from '../../src/each.js';
import { mount, signal } from '../../src/index.js';

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
  delete (globalThis as { KERF_DEV?: boolean }).KERF_DEV;
  warnSpy.mockRestore();
});

/** A conditional list ahead of an unkeyed one — the id-shifting shape. */
function shiftingTree(keyed: boolean) {
  const cond = signal(true);
  const a = arraySignal([{ id: 'a1' }]);
  const b = arraySignal([{ id: 'b1' }]);
  const opts = keyed ? { key: 'b' } : undefined;
  const dispose = mount(root, () => (
    <div>
      {cond.value
        ? <ul data-key="ca">{each(a, (r) => <li data-key={r.id}>{r.id}</li>)}</ul>
        : ''}
      <ul data-key="cb">{each(b, (r) => <li data-key={r.id}>{r.id}</li>, opts)}</ul>
    </div>
  ));
  return { cond, a, b, dispose };
}

const shiftWarnings = (): string[] =>
  warnSpy.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('is now a different list'));

describe('dev-list-key-warn (always-on identity-shift warning)', () => {
  it('warns when an unkeyed list\'s id is taken over by another list', () => {
    const { cond, b, dispose } = shiftingTree(false);
    // A granular op after the shift is what routes through the detection point.
    cond.value = false;
    b.push({ id: 'b2' });
    expect(shiftWarnings().length).toBe(1);
    const msg = shiftWarnings()[0];
    expect(msg).toMatch(/lose DOM identity, focus/);
    expect(msg).toMatch(/\{ key: 'my-list' \}/);
    dispose();
  });

  it('is one-shot per list across repeated shifts', () => {
    const { cond, b, dispose } = shiftingTree(false);
    for (let i = 0; i < 3; i++) {
      cond.value = false;
      b.push({ id: `x${i}` });
      cond.value = true;
      b.push({ id: `y${i}` });
    }
    expect(shiftWarnings().length).toBe(1);
    dispose();
  });

  it('a KEYED list never triggers it — the key removes the call-order dependency', () => {
    const { cond, b, dispose } = shiftingTree(true);
    cond.value = false;
    b.push({ id: 'b2' });
    cond.value = true;
    b.push({ id: 'b3' });
    expect(shiftWarnings()).toEqual([]);
    dispose();
  });

  it('an ordinary list with no shifting never triggers it', () => {
    const rows = arraySignal([{ id: 'r1' }]);
    const dispose = mount(root, () => (
      <ul data-key="cl">{each(rows, (r) => <li data-key={r.id}>{r.id}</li>)}</ul>
    ));
    rows.push({ id: 'r2' });
    rows.update(0, (r) => ({ ...r }));
    rows.remove(0);
    expect(shiftWarnings()).toEqual([]);
    dispose();
  });

  it('is silent in production mode', () => {
    (globalThis as { KERF_DEV?: boolean }).KERF_DEV = false;
    const { cond, b, dispose } = shiftingTree(false);
    cond.value = false;
    b.push({ id: 'b2' });
    expect(shiftWarnings()).toEqual([]);
    dispose();
  });
});
