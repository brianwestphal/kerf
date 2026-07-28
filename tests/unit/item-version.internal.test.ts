/**
 * KF-447 — the `anyVersioned` latch in `src/item-version.ts`.
 *
 * The module is a WeakMap of per-item content versions plus a one-way latch:
 *
 *     export function itemVersion(item: object): number {
 *       return anyVersioned ? versions.get(item) ?? 0 : 0;
 *     }
 *
 * Until some `update()` bumps a real object, every lookup short-circuits to 0
 * without touching the WeakMap, so an app that never mutates in place pays
 * nothing per row. That makes the latch a two-state machine whose states are
 * distinguishable only by a SEQUENCE — from a clean state, "latch false" and
 * "latch true, no versions recorded" both answer 0 to every question. A suite
 * that only ever bumps objects would never tell them apart, and a latch that
 * failed to flip would look identical to one that worked.
 *
 * `anyVersioned` never resets, so these use a fresh module instance per test
 * rather than relying on execution order — the alternative is a file where
 * moving one test silently guts another.
 *
 * Behavior here is reached in anger through `arraySignal.update()`; see
 * `tests/unit/kf418-same-ref-update.test.tsx` for that end of it.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ItemVersionModule from '../../src/item-version.js';

/** A module instance with its own fresh `versions` map and `anyVersioned` latch. */
async function freshModule(): Promise<typeof ItemVersionModule> {
  vi.resetModules();
  return import('../../src/item-version.js');
}

beforeEach(() => {
  vi.resetModules();
});

describe('item-version — the anyVersioned latch (transition walk)', () => {
  it('answers 0 before anything has been versioned', async () => {
    const { itemVersion } = await freshModule();
    expect(itemVersion({ id: 1 })).toBe(0);
  });

  it('a primitive bump does NOT flip the latch — the short-circuit still holds', async () => {
    // `arraySignal<number>` used as a plain signal calls update() with a
    // primitive. That must not throw (a primitive is not a valid WeakMap key)
    // and must not arm the WeakMap path for everyone else.
    const { bumpItemVersion, itemVersion } = await freshModule();
    for (const primitive of [1, 'a', true, Symbol('s'), null, undefined, 0n]) {
      expect(() => bumpItemVersion(primitive)).not.toThrow();
    }
    expect(itemVersion({ id: 1 })).toBe(0);
  });

  it('primitive → object: the first real bump flips the latch and starts counting', async () => {
    // The transition the whole module exists for, and the one that is invisible
    // from a clean state: both sides answer 0 for an unversioned item, so only
    // the item that WAS bumped distinguishes them.
    const { bumpItemVersion, itemVersion } = await freshModule();
    const a = { id: 'a' };
    const b = { id: 'b' };

    bumpItemVersion(42);                       // latch stays down
    expect(itemVersion(a)).toBe(0);

    bumpItemVersion(a);                        // latch flips
    expect(itemVersion(a)).toBe(1);
    expect(itemVersion(b), 'an unbumped item still reads 0 through the WeakMap').toBe(0);
  });

  it('repeated bumps increment that item only', async () => {
    const { bumpItemVersion, itemVersion } = await freshModule();
    const a = { id: 'a' };
    const b = { id: 'b' };
    bumpItemVersion(a);
    bumpItemVersion(a);
    bumpItemVersion(b);
    expect(itemVersion(a)).toBe(2);
    expect(itemVersion(b)).toBe(1);
  });

  it('a function is a valid key — bumping one flips the latch like any object', async () => {
    const { bumpItemVersion, itemVersion } = await freshModule();
    const fn = (): void => {};
    bumpItemVersion(fn);
    expect(itemVersion(fn)).toBe(1);
  });

  it('the latch is one-way: a later primitive bump cannot turn it back off', async () => {
    const { bumpItemVersion, itemVersion } = await freshModule();
    const a = { id: 'a' };
    bumpItemVersion(a);
    bumpItemVersion('not an object');
    expect(itemVersion(a), 'the recorded version must survive').toBe(1);
  });
});
