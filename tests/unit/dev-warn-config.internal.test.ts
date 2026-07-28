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

/**
 * KF-447 — the transition matrix.
 *
 * Every test above runs ONE `enableWarnings()` call from a clean state, and
 * `src/dev-warn-config.ts` sat at 100% coverage on all four metrics because of
 * it. That is precisely the blind spot the coverage report has: each flag is a
 * three-state machine — unset (falls through to `process.env`), explicitly on,
 * explicitly off (which SHADOWS a set env var) — and `applyWarningOptions()`
 * MERGES into the override map rather than replacing it. None of the moves
 * between those states were exercised.
 *
 * The merge is the load-bearing one, because `enableWarnings` reads like a
 * setter and behaves like a patch. An app that opts in from two places (an
 * entry file and a test harness, say) depends on the second call not erasing
 * the first, and nothing pinned that: rewriting the body as
 * `overrides = new Map(Object.entries(...))` would have passed the whole suite.
 *
 * These use `devFlag()` directly — it is the state machine's actual output, so
 * an assertion on it is about this module rather than about whichever warner
 * happens to read it. The end-to-end wiring is already covered above.
 */
describe('enableWarnings() — override transition matrix (adversarial)', () => {
  const A = 'KERF_DEV_WARN_NARROW_SET';
  const B = 'KERF_DEV_WARN_STALE_BINDING';
  // Captured at collection time, before any test has touched it. This suite
  // runs under an ambient KERF_DEV_INVARIANTS from vitest.config.ts; restore it
  // rather than deleting, so these tests can't leak into anything that expects
  // the configured value.
  const AMBIENT_INVARIANTS = env.KERF_DEV_INVARIANTS;

  afterEach(() => {
    delete env[B];
    if (AMBIENT_INVARIANTS === undefined) delete env.KERF_DEV_INVARIANTS;
    else env.KERF_DEV_INVARIANTS = AMBIENT_INVARIANTS;
  });

  it('on(a) → on(b): the second call MERGES, it does not replace', () => {
    enableWarnings({ narrowSet: true });
    enableWarnings({ staleBinding: true });
    expect(devFlag(A), 'the first call must survive the second').toBe('1');
    expect(devFlag(B)).toBe('1');
  });

  it('on → off: last write wins, and still shadows a set env var', () => {
    env[A] = '1';
    enableWarnings({ narrowSet: true });
    enableWarnings({ narrowSet: false });
    expect(devFlag(A)).toBeUndefined();
  });

  it('off → on: the reverse direction recovers', () => {
    enableWarnings({ narrowSet: false });
    expect(devFlag(A)).toBeUndefined();
    enableWarnings({ narrowSet: true });
    expect(devFlag(A)).toBe('1');
  });

  it('on → {} : an empty call is a no-op, not a clear', () => {
    // The documented "spread a bag of optional flags" usage can produce `{}`.
    enableWarnings({ narrowSet: true });
    enableWarnings({});
    expect(devFlag(A)).toBe('1');
  });

  it('on → undefined: an explicitly-undefined key does not clear the override either', () => {
    // `enableWarnings({ narrowSet: opts.narrowSet })` with an absent option
    // lands here. Skipping the key (rather than deleting it) is what makes the
    // spread safe, and it only matters on a SECOND call — from a clean state
    // the two behaviors are indistinguishable, which is why this needs a walk.
    enableWarnings({ narrowSet: true });
    enableWarnings({ narrowSet: undefined });
    expect(devFlag(A)).toBe('1');
  });

  it('override → reset → env fallthrough', () => {
    // The reset only ever ran as test teardown, so "does the env var come back
    // afterwards?" was never asserted.
    env[A] = '1';
    enableWarnings({ narrowSet: false });
    expect(devFlag(A)).toBeUndefined();
    _resetWarningOptionsForTests();
    expect(devFlag(A)).toBe('1');
  });

  it('invariants walks its three values, and an override shadows the environment', () => {
    // The one flag whose value is not just on/off. Set the env explicitly
    // rather than leaning on the ambient value, so the walk does not depend on
    // vitest.config.ts or on which test ran before it.
    env.KERF_DEV_INVARIANTS = 'throw';
    expect(devFlag('KERF_DEV_INVARIANTS')).toBe('throw');
    enableWarnings({ invariants: true });
    expect(devFlag('KERF_DEV_INVARIANTS')).toBe('1');
    enableWarnings({ invariants: 'throw' });
    expect(devFlag('KERF_DEV_INVARIANTS')).toBe('throw');
    enableWarnings({ invariants: false });
    expect(devFlag('KERF_DEV_INVARIANTS')).toBeUndefined();
  });

  it('an unrecognized key in a later call leaves earlier overrides intact', () => {
    // The unknown-key path `continue`s. If it ever threw or short-circuited the
    // loop instead, a typo in one option would silently drop the ones after it.
    enableWarnings({ narrowSet: true });
    enableWarnings({ notARealWarning: true, staleBinding: true } as never);
    expect(devFlag(A)).toBe('1');
    expect(devFlag(B)).toBe('1');
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
