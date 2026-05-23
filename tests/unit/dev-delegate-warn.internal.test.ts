/**
 * KF-238: opt-in dev-mode warning when `delegate()` or `delegateCapture()`
 * runs inside an `effect()` body. The wrapper in `src/reactive.ts` only wraps
 * `effect()` when `KERF_DEV_WARN_DELEGATE_IN_EFFECT=1` is read at call time,
 * so flipping the env var per-test is sufficient — but the wrap decision is
 * evaluated when the user calls `effect()`, not when the module is imported.
 *
 * The warning is gated three ways:
 *   1. NODE_ENV !== 'production' (always true in unit tests).
 *   2. KERF_DEV_WARN_DELEGATE_IN_EFFECT === '1'.
 *   3. depth > 0 (`enterEffect()` ran but no matching `exitEffect()` yet).
 *
 * If any gate fails, the warn is silent.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { delegate, delegateCapture } from '../../src/delegate.js';
import { _resetWarnedForTests } from '../../src/dev-delegate-warn.js';
import { effect } from '../../src/reactive.js';

const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;

let root: HTMLElement;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  env.KERF_DEV_WARN_DELEGATE_IN_EFFECT = '1';
  _resetWarnedForTests();
  root = document.createElement('div');
  document.body.appendChild(root);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
  delete env.KERF_DEV_WARN_DELEGATE_IN_EFFECT;
  warnSpy.mockRestore();
});

describe('dev-delegate-warn (KF-238, opt-in)', () => {
  it('warns when delegate() runs inside an effect() body', () => {
    const stop = effect(() => {
      delegate(root, 'click', '.x', () => {});
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/delegate\(\) was called inside an effect\(\) body/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/listener count grows linearly/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/KERF_DEV_WARN_DELEGATE_IN_EFFECT=0/);
    stop();
  });

  it('warns when delegateCapture() runs inside an effect() body', () => {
    const stop = effect(() => {
      delegateCapture(root, 'blur', '.x', () => {});
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/delegateCapture\(\) was called inside an effect\(\) body/);
    stop();
  });

  it('does not warn when delegate() runs outside any effect()', () => {
    const off = delegate(root, 'click', '.x', () => {});
    expect(warnSpy).not.toHaveBeenCalled();
    off();
  });

  it('warns at most once per process (one-shot)', () => {
    const stop1 = effect(() => {
      delegate(root, 'click', '.x', () => {});
    });
    const stop2 = effect(() => {
      delegate(root, 'click', '.y', () => {});
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    stop1();
    stop2();
  });

  it('decrements depth so delegate() after effect() body returns does NOT warn', () => {
    const stop = effect(() => {
      // empty body — no delegate() here
    });
    delegate(root, 'click', '.x', () => {});
    expect(warnSpy).not.toHaveBeenCalled();
    stop();
  });

  it('decrements depth even if the effect body throws', () => {
    expect(() => {
      effect(() => {
        throw new Error('boom');
      });
    }).toThrow('boom');
    // Depth should be back to 0; a subsequent delegate() should not warn.
    delegate(root, 'click', '.x', () => {});
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not warn when the env var is unset (gate off)', () => {
    delete env.KERF_DEV_WARN_DELEGATE_IN_EFFECT;
    _resetWarnedForTests();
    const stop = effect(() => {
      delegate(root, 'click', '.x', () => {});
    });
    expect(warnSpy).not.toHaveBeenCalled();
    stop();
  });

  it('does not warn when NODE_ENV=production even with the gate on', () => {
    const originalNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';
    _resetWarnedForTests();
    try {
      const stop = effect(() => {
        delegate(root, 'click', '.x', () => {});
      });
      expect(warnSpy).not.toHaveBeenCalled();
      stop();
    } finally {
      if (originalNodeEnv === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = originalNodeEnv;
    }
  });

  it('nested effects increment and decrement correctly', () => {
    const inner = (): void => {
      effect(() => {
        delegate(root, 'click', '.inner', () => {});
      });
    };
    const stop = effect(() => {
      inner();
    });
    // The inner effect's delegate() runs at depth 2; the warn fires once for the
    // first such call. The point is that depth tracking accumulates across nested
    // effects without losing count.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    stop();
  });
});
