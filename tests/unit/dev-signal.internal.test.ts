/**
 * The untracked-signal warning's COVERAGE BOUNDARY notice.
 *
 * This warning is the only member of the family whose reach depends on when
 * `kerfjs/dev` was installed: `signal()` picks its constructor at creation
 * time, so signals created before the install are plain `Signal`s forever.
 * Static imports hoist above a top-level `await import()`, so in the common
 * layout the module-scope signals this warning most wants to catch are created
 * first — and the warning then finds nothing while appearing to work.
 *
 * Retro-fitting is impossible: `Signal.prototype`'s `value` accessor is
 * non-configurable (asserted below, so a future signals-core release that
 * relaxes it is noticed), and reaching live instances would need a per-signal
 * registry production would pay for. So the miss is made LOUD instead — opting
 * in prints the boundary once.
 */

import { Signal } from '@preact/signals-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetCoverageNoticeForTests, noteUntrackedCoverage } from '../../src/dev-signal.js';

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  _resetCoverageNoticeForTests();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  _resetCoverageNoticeForTests();
});

describe('untracked-signal coverage notice', () => {
  it('names the boundary and the fix', () => {
    noteUntrackedCoverage();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const msg = warnSpy.mock.calls[0][0] as string;
    // The actionable parts: what is NOT covered, and the concrete fix.
    expect(msg).toMatch(/only covers signals created AFTER/);
    expect(msg).toMatch(/FIRST STATIC import/);
    // Family message-shape rule: every warning names its own off switch.
    expect(msg).toMatch(/KERF_DEV_WARN_UNTRACKED_SIGNALS=0/);
  });

  it('is one-shot — a second call stays silent', () => {
    noteUntrackedCoverage();
    noteUntrackedCoverage();
    noteUntrackedCoverage();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('the test-only reset re-arms it', () => {
    noteUntrackedCoverage();
    _resetCoverageNoticeForTests();
    noteUntrackedCoverage();
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});

describe('why the boundary cannot simply be removed', () => {
  it('Signal.prototype.value is non-configurable, so it cannot be patched', () => {
    // This is the load-bearing constraint behind the notice. If signals-core
    // ever ships a configurable accessor, this test fails and the far better
    // fix — patch the prototype setter once, covering signals that already
    // exist — becomes available.
    const desc = Object.getOwnPropertyDescriptor(Signal.prototype, 'value');
    expect(desc).toBeDefined();
    expect(desc?.configurable).toBe(false);
    expect(() => {
      Object.defineProperty(Signal.prototype, 'value', { get: () => 0, set: () => {} });
    }).toThrow(/Cannot redefine property/);
  });
});
