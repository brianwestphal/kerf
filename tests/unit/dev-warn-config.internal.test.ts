/**
 * KF-434 — `enableWarnings()`, the switch that works in a browser.
 *
 * Before this, every member of the `KERF_DEV_WARN_*` family read
 * `globalThis.process.env` and nothing else, so in a browser realm (no
 * `process`, and no bundler `define` able to reach the read) the entire opt-in
 * family was permanently off. The browser-shape test below is the regression
 * guard: it deletes `globalThis.process` outright and asserts a warning the
 * consumer asked for still fires.
 *
 * `*.internal.test.ts` — imports non-public modules, so the dist-full suite
 * excludes it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { enableWarnings } from '../../src/dev.js';
import { maybeCheckListInvariants } from '../../src/dev-invariants.js';
import { _resetCoverageNoticeForTests } from '../../src/dev-signal.js';
import { _resetWarningOptionsForTests, devFlag } from '../../src/dev-warn-config.js';
import type { ListBinding } from '../../src/list-binding.js';
import { defineStore } from '../../src/store.js';

const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;

let warnSpy: ReturnType<typeof vi.spyOn>;

/** A store whose one action performs a NARROW set — warns when opted in. */
function narrowSettingStore(): { setA: (a: number) => void } {
  const store = defineStore({
    initial: () => ({ a: 1, b: 2 }),
    actions: (set) => ({ setA: (a: number) => set({ a } as { a: number; b: number }) }),
  });
  return store.actions;
}

beforeEach(() => {
  delete env.KERF_DEV_WARN_NARROW_SET;
  _resetWarningOptionsForTests();
  _resetCoverageNoticeForTests();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  delete env.KERF_DEV_WARN_NARROW_SET;
  _resetWarningOptionsForTests();
  _resetCoverageNoticeForTests();
  warnSpy.mockRestore();
});

describe('enableWarnings() — the in-code switch', () => {
  it('switches a warning on with no env var set', () => {
    enableWarnings({ narrowSet: true });
    narrowSettingStore().setA(9);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/keys missing from the current state/);
  });

  it('leaves everything it was not asked about alone', () => {
    enableWarnings({ staleBinding: true });
    narrowSettingStore().setA(9);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('explicit false wins over an env var that is set', () => {
    env.KERF_DEV_WARN_NARROW_SET = '1';
    enableWarnings({ narrowSet: false });
    narrowSettingStore().setA(9);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('ignores a key it does not recognize instead of throwing', () => {
    expect(() => enableWarnings({ notARealWarning: true } as never)).not.toThrow();
  });

  it('ignores an explicitly-undefined value, so a spread of optional flags is safe', () => {
    env.KERF_DEV_WARN_NARROW_SET = '1';
    enableWarnings({ narrowSet: undefined });
    narrowSettingStore().setA(9);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('takes the invariants mode, including the throw form', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const marker = document.createComment('kf-list:0');
    root.appendChild(marker);
    const binding: ListBinding = { liveParent: root, items: [], marker };
    marker.remove(); // corrupt it: the marker left the tree

    enableWarnings({ invariants: 'throw' });
    expect(() => maybeCheckListInvariants(root, new Map([['0', binding]])))
      .toThrow(/kerf invariant violated after reconcile/);
    document.body.innerHTML = '';
  });

  it('prints the untracked-signal coverage boundary once when that one is enabled', () => {
    enableWarnings({ untrackedSignals: true });
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/only covers signals created AFTER/);
    enableWarnings({ untrackedSignals: true });
    expect(warnSpy).toHaveBeenCalledOnce(); // one-shot
  });
});

describe('devFlag() precedence', () => {
  it('falls through to process.env when no call has overridden it', () => {
    env.KERF_DEV_WARN_NARROW_SET = '1';
    expect(devFlag('KERF_DEV_WARN_NARROW_SET')).toBe('1');
  });

  it('reports undefined for a flag nobody set', () => {
    expect(devFlag('KERF_DEV_WARN_NARROW_SET')).toBeUndefined();
  });
});

describe('browser shape — no `process` object at all (the KF-434 defect)', () => {
  it('a warning enabled through enableWarnings() still fires', () => {
    const realProcess = (globalThis as { process?: unknown }).process;
    delete (globalThis as { process?: unknown }).process;
    try {
      enableWarnings({ narrowSet: true });
      narrowSettingStore().setA(9);
      expect(warnSpy).toHaveBeenCalledOnce();
    } finally {
      (globalThis as { process?: unknown }).process = realProcess;
    }
  });

  it('and the env-var path is genuinely unavailable there — which is why it exists', () => {
    const realProcess = (globalThis as { process?: unknown }).process;
    (realProcess as { env: Record<string, string | undefined> }).env.KERF_DEV_WARN_NARROW_SET = '1';
    delete (globalThis as { process?: unknown }).process;
    try {
      narrowSettingStore().setA(9);
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      (globalThis as { process?: unknown }).process = realProcess;
    }
  });
});
