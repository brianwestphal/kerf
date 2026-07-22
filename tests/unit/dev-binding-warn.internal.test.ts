/**
 * Dev-mode warning for silently-stale fine-grained bindings on the fast path
 * (KERF_DEV_WARN_STALE_BINDING=1).
 *
 * `maybeWarnStaleBinding` is called by `mount()` on a fast-path (byte-equal
 * static-surrounds) render. It compares this render's registered holes against
 * the previously-wired holes and warns once per hole whose signal INSTANCE
 * switched — the `class={cond ? sigA : sigB}` anti-pattern that silently goes
 * stale because the fast path never re-binds. Tests cover the opt-out / opt-in /
 * dedup / production-mode paths and the wiring-path retention.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetWarnedForTests } from '../../src/dev-binding-warn.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';

const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;

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
  delete env.KERF_DEV_WARN_STALE_BINDING;
  warnSpy.mockRestore();
});

describe('dev-binding-warn (KERF_DEV_WARN_STALE_BINDING=1, opt-in)', () => {
  it('warns when an attribute hole switches signal instance on a byte-equal render', () => {
    env.KERF_DEV_WARN_STALE_BINDING = '1';
    const cond = signal(true);
    const sigA = signal('a');
    const sigB = signal('b');
    // `cond.value` is read in render() (drives re-render); the bound attr emits
    // only a marker, so the surrounds string is byte-equal across sigA↔sigB.
    mount(root, () => jsx('div', { class: cond.value ? sigA : sigB, children: 'x' }) as never);
    expect(warnSpy).not.toHaveBeenCalled(); // first render — no switch yet

    cond.value = false; // fast-path re-render; hole now wants sigB, effect stuck on sigA
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/different signal instance/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/attr 'class'/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/KERF_DEV_WARN_STALE_BINDING=0/);
  });

  it('warns for a switched text-hole binding too', () => {
    env.KERF_DEV_WARN_STALE_BINDING = '1';
    const cond = signal(true);
    const a = signal('a');
    const b = signal('b');
    mount(root, () => jsx('span', { children: cond.value ? a : b }) as never);
    cond.value = false;
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/text \(id/);
  });

  it('does NOT warn when the same signal instance is re-registered on a byte-equal render', () => {
    env.KERF_DEV_WARN_STALE_BINDING = '1';
    const tick = signal(0);
    const sig = signal('a');
    // Reads `tick` to force a re-render without interpolating it → surrounds
    // byte-equal; the bound attr re-registers the SAME sig instance.
    mount(root, () => {
      void tick.value;
      return jsx('div', { class: sig, children: 'x' }) as never;
    });
    tick.value++;
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn when the env var is unset (default off)', () => {
    const cond = signal(true);
    const sigA = signal('a');
    const sigB = signal('b');
    mount(root, () => jsx('div', { class: cond.value ? sigA : sigB, children: 'x' }) as never);
    cond.value = false;
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn when NODE_ENV === \'production\' even with the env var set', () => {
    env.KERF_DEV_WARN_STALE_BINDING = '1';
    const prevNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      const cond = signal(true);
      const sigA = signal('a');
      const sigB = signal('b');
      mount(root, () => jsx('div', { class: cond.value ? sigA : sigB, children: 'x' }) as never);
      cond.value = false;
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      env.NODE_ENV = prevNodeEnv;
    }
  });

  it('warns at most once per hole (one-shot dedup)', () => {
    env.KERF_DEV_WARN_STALE_BINDING = '1';
    const which = signal(0);
    const sigs = [signal('a'), signal('b'), signal('c')];
    mount(root, () => jsx('div', { class: sigs[which.value], children: 'x' }) as never);
    which.value = 1; // sig1 vs wired sig0 → differ → warn
    which.value = 2; // sig2 vs wired sig0 → differ → but deduped for this hole
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('re-wires and re-arms across a surrounds-changed render (wiring-path retention)', () => {
    env.KERF_DEV_WARN_STALE_BINDING = '1';
    const label = signal('x');
    const cond = signal(true);
    const sigA = signal('a');
    const sigB = signal('b');
    mount(root, () =>
      jsx('div', {
        children: [
          jsx('span', { children: label.value }),
          jsx('b', { class: cond.value ? sigA : sigB, children: 'y' }),
        ],
      }) as never,
    );
    // Surrounds change (span text) → morph + re-wire → prevWired refreshed to sigA.
    label.value = 'z';
    expect(warnSpy).not.toHaveBeenCalled();
    // Fast-path switch afterwards still detected against the refreshed wired list.
    cond.value = false;
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT warn or retain across a surrounds-changed render when the env var is off', () => {
    const label = signal('x');
    const sig = signal('a');
    mount(root, () =>
      jsx('div', {
        children: [
          jsx('span', { children: label.value }),
          jsx('b', { class: sig, children: 'y' }),
        ],
      }) as never,
    );
    label.value = 'z'; // surrounds change, env off → retention false branch, no warn
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
