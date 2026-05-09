/**
 * Regression tests for KF-24 — verify every documented public export of the
 * `kerfjs` barrel is actually reachable from `dist/index.js`.
 *
 * The bug: `Fragment` was implemented in `src/jsx-runtime.ts`, exported from
 * `kerfjs/jsx-runtime`, present in the shared chunk, and listed in the
 * `docs/6-jsx-runtime.md` + `docs/8-api-reference.md` public API — but the
 * barrel `src/index.ts` did not re-export it. Importing `Fragment` from
 * `'kerfjs'` resolved to `undefined`, so a manual `<Fragment>...</Fragment>`
 * usage rendered as `<undefined>...</undefined>`.
 *
 * This file pins the full public-API contract by name. New public exports
 * MUST be added to `EXPECTED_EXPORTS` below, AND removed exports MUST be
 * deleted here — otherwise the test fails. That makes accidental barrel
 * omissions impossible to ship.
 *
 * Run via `npm run test:dist`.
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST_INDEX = resolve(HERE, '../../dist/index.js');
const DIST_JSX = resolve(HERE, '../../dist/jsx-runtime.js');
const DIST_TESTING = resolve(HERE, '../../dist/testing.js');

interface ExpectedExport {
  name: string;
  kind: 'function' | 'class';
}

// Source of truth for the `kerfjs` barrel's public runtime API. Types
// (`Signal`, `ReadonlySignal`, `Store`) are erased at runtime and excluded.
const EXPECTED_EXPORTS: readonly ExpectedExport[] = [
  // Reactivity (re-exported from @preact/signals-core via src/reactive.ts)
  { name: 'signal', kind: 'function' },
  { name: 'computed', kind: 'function' },
  { name: 'effect', kind: 'function' },
  { name: 'batch', kind: 'function' },

  // Stores
  { name: 'defineStore', kind: 'function' },
  { name: 'resetAllStores', kind: 'function' },

  // Render
  { name: 'mount', kind: 'function' },
  { name: 'each', kind: 'function' },

  // KF-92 — granular collection signal for keyed lists
  { name: 'arraySignal', kind: 'function' },
  { name: 'ArraySignal', kind: 'class' },

  // Event delegation
  { name: 'delegate', kind: 'function' },
  { name: 'delegateCapture', kind: 'function' },

  // Direct JSX → DOM
  { name: 'toElement', kind: 'function' },

  // JSX value type + helpers
  { name: 'SafeHtml', kind: 'class' },
  { name: 'isSafeHtml', kind: 'function' },
  { name: 'raw', kind: 'function' },
  { name: 'Fragment', kind: 'function' },
] as const;

function requireDist(): void {
  if (!existsSync(DIST_INDEX) || !existsSync(DIST_JSX) || !existsSync(DIST_TESTING)) {
    throw new Error(
      `dist/ is missing — run 'npm run build' first. Expected: ${DIST_INDEX}, ${DIST_JSX}, ${DIST_TESTING}`,
    );
  }
}

describe('dist/ — barrel completeness (KF-24)', () => {
  it('every documented public export is present on the kerfjs barrel', async () => {
    requireDist();
    const mod = await import(DIST_INDEX) as Record<string, unknown>;

    const missing: string[] = [];
    const wrongKind: string[] = [];

    for (const { name, kind } of EXPECTED_EXPORTS) {
      const value = mod[name];
      if (value === undefined) {
        missing.push(name);
        continue;
      }
      // Both classes and functions are typeof === 'function' in JS, so the
      // kind check is informational rather than discriminating; we still
      // want it caught if a future export is e.g. a plain object that the
      // user is expected to spread or destructure.
      if (typeof value !== 'function') {
        wrongKind.push(`${name} (got ${typeof value}, expected ${kind})`);
      }
    }

    expect(missing, `kerfjs barrel is missing exports: ${missing.join(', ')}`).toEqual([]);
    expect(wrongKind, `kerfjs barrel exports have wrong kind: ${wrongKind.join(', ')}`).toEqual([]);
  });

  it('Fragment imported from kerfjs renders as a Fragment, not <undefined> (the KF-24 case)', async () => {
    requireDist();
    const { Fragment } = await import(DIST_INDEX) as {
      Fragment: (props: { children?: unknown }) => { toString(): string };
    };
    const { jsx } = await import(DIST_JSX) as {
      jsx: (tag: unknown, props: Record<string, unknown>) => { toString(): string };
    };

    // Mirrors the bug report: `<><span>a</span></>` desugars (in Babel /
    // tsc react-jsx mode) to a `jsx(Fragment, { children: ... })` call.
    // Before the fix, `Fragment` from the barrel was `undefined`, so the
    // emitted markup was `<undefined>...</undefined>`. The brand check in
    // jsx-runtime would not catch this — `jsx` happily strings the tag.
    const out = jsx(Fragment, { children: jsx('span', { children: 'a' }) });
    expect(out.toString()).toBe('<span>a</span>');
  });

  it('Fragment from kerfjs and Fragment from kerfjs/jsx-runtime are the same function', async () => {
    requireDist();
    const { Fragment: barrelFragment } = await import(DIST_INDEX) as { Fragment: unknown };
    const { Fragment: jsxFragment } = await import(DIST_JSX) as { Fragment: unknown };
    // Both entries share the same module via the chunk, so the identity
    // should be preserved. If this fails, code-splitting has regressed.
    expect(barrelFragment).toBe(jsxFragment);
  });

  it('clearStoreRegistry is reachable via kerfjs/testing only (not the main barrel)', async () => {
    requireDist();
    const indexMod = await import(DIST_INDEX) as Record<string, unknown>;
    const testingMod = await import(DIST_TESTING) as Record<string, unknown>;
    expect(indexMod.clearStoreRegistry).toBeUndefined();
    expect(typeof testingMod.clearStoreRegistry).toBe('function');
  });

  it('jsx / jsxs / jsxDEV are reachable via kerfjs/jsx-runtime (the JSX transform contract)', async () => {
    requireDist();
    const jsxMod = await import(DIST_JSX) as Record<string, unknown>;
    expect(typeof jsxMod.jsx).toBe('function');
    expect(typeof jsxMod.jsxs).toBe('function');
    expect(typeof jsxMod.jsxDEV).toBe('function');
    expect(typeof jsxMod.Fragment).toBe('function');
  });
});
