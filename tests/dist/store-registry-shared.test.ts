/**
 * Regression test for KF-15 against the *built* `dist/` output.
 *
 * The bug: `dist/testing.js`'s `clearStoreRegistry` was emitted with an
 * empty body. tsup bundles each entry with `splitting: false`, so when
 * esbuild assembled `dist/testing.js` from `src/store.ts` it tree-shook
 * everything except the `clearStoreRegistry` export. The module-level
 * `REGISTRY` array was eliminated (no other store exports landed in this
 * entry to keep it alive), and `REGISTRY.length = 0` became dead-code
 * removed too — leaving the function with no body.
 *
 * Result: a store created via `defineStore()` from `dist/index.js` and the
 * `REGISTRY` referenced by `dist/testing.js`'s `clearStoreRegistry` are
 * physically different arrays. Calling `clearStoreRegistry()` does nothing
 * to the registry that `defineStore` populates.
 *
 * This test verifies that, after the fix, both entries share the same
 * `REGISTRY` array — so `clearStoreRegistry()` actually drops registered
 * stores and a subsequent `resetAllStores()` is a no-op.
 *
 * Run via `npm run test:dist`.
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST_INDEX = resolve(HERE, '../../dist/index.js');
const DIST_TESTING = resolve(HERE, '../../dist/testing.js');

function requireDist(): void {
  if (!existsSync(DIST_INDEX) || !existsSync(DIST_TESTING)) {
    throw new Error(
      `dist/ is missing — run 'npm run build' first. Expected: ${DIST_INDEX}, ${DIST_TESTING}`,
    );
  }
}

describe('dist/ — kerfjs/testing shares the store registry with kerfjs (KF-15)', () => {
  it('clearStoreRegistry has a non-empty body', async () => {
    requireDist();
    const { clearStoreRegistry } = await import(DIST_TESTING) as {
      clearStoreRegistry: () => void;
    };
    // Smoke check that catches the original failure mode directly: an empty
    // function body Function.prototype.toString()s to something like
    // `function clearStoreRegistry() {\n}`. The fix makes this body include
    // a REGISTRY clear (e.g. `REGISTRY.length = 0` or `Sn.length = 0` after
    // minification).
    const src = clearStoreRegistry.toString();
    expect(src).not.toMatch(/function\s+\w+\s*\(\s*\)\s*\{\s*\}/);
  });

  it('a store created via dist/index.js is removed by dist/testing.js clearStoreRegistry', async () => {
    requireDist();
    const indexMod = await import(DIST_INDEX) as {
      defineStore: (spec: {
        initial: () => number;
        actions: (set: (n: number) => void, get: () => number) => { inc: () => void };
      }) => { state: { value: number }; actions: { inc: () => void } };
      resetAllStores: () => void;
    };
    const { clearStoreRegistry } = await import(DIST_TESTING) as {
      clearStoreRegistry: () => void;
    };

    const store = indexMod.defineStore({
      initial: () => 0,
      actions: (set, get) => ({ inc: () => set(get() + 1) }),
    });
    store.actions.inc();
    expect(store.state.value).toBe(1);

    // After clearing the registry, `resetAllStores()` must NOT see this
    // store anymore. If REGISTRY is duplicated across entries (the bug),
    // `resetAllStores()` still sees the store and resets its value to 0.
    clearStoreRegistry();
    indexMod.resetAllStores();
    expect(store.state.value).toBe(1);
  });
});
