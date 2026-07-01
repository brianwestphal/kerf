/**
 * Convention guards that pin requirement-level invariants line/branch coverage
 * can't express (KF-286, the in-suite complement to
 * `scripts/check-doc-api-coverage.mjs` + `scripts/check-feature-coverage.mjs`):
 *
 *  - The public **export surface** of `kerfjs` and its subpaths is EXACTLY the
 *    expected set — a stray new export, an accidental rename, or a dropped one
 *    fails here rather than only being noticed in review.
 *  - kerf is **named-exports only**: no entry point ships a `default` export.
 *  - The `each()` **row contract** (exactly one top-level element per row) — the
 *    invariant every reconcile path relies on — holds at its enforcement point.
 *
 * These are structural facts about the API, not behaviors of a single function,
 * so 100% line coverage says nothing about them.
 */
import { describe, expect, it } from 'vitest';

import * as arraySignalSubpath from '../src/array-signal.js';
import * as barrel from '../src/index.js';
import * as jsxRuntime from '../src/jsx-runtime.js';
import * as testingSubpath from '../src/testing.js';
import { parseRowTemplate } from '../src/utils/rowContract.js';

/** Runtime (value) exports only — type-only exports are erased and never appear here. */
const runtimeKeys = (ns: object): string[] =>
  Object.keys(ns).filter((k) => k !== '__esModule').sort();

describe('public export surface (KF-286)', () => {
  it('the kerfjs barrel exports exactly the documented runtime surface', () => {
    // Adding/removing a public export? Update this list AND docs/8-api-reference.md
    // AND docs/14-feature-coverage.md in the same change.
    expect(runtimeKeys(barrel)).toEqual([
      'Fragment',
      'SafeHtml',
      'attr',
      'batch',
      'computed',
      'defineStore',
      'delegate',
      'delegateCapture',
      'each',
      'effect',
      'isSafeHtml',
      'morph',
      'mount',
      'raw',
      'resetAllStores',
      'signal',
      'toElement',
    ]);
  });

  it('the kerfjs/array-signal subpath exposes arraySignal + ArraySignal', () => {
    const keys = runtimeKeys(arraySignalSubpath);
    expect(keys).toContain('arraySignal');
    expect(keys).toContain('ArraySignal');
    expect(typeof arraySignalSubpath.arraySignal).toBe('function');
  });

  it('the kerfjs/testing subpath exposes exactly clearStoreRegistry', () => {
    expect(runtimeKeys(testingSubpath)).toEqual(['clearStoreRegistry']);
  });

  it('no entry point ships a default export (kerf is named-exports only)', () => {
    for (const ns of [barrel, jsxRuntime, arraySignalSubpath, testingSubpath]) {
      expect('default' in ns).toBe(false);
    }
  });
});

describe('each() row contract (KF-103)', () => {
  it('one top-level element per row parses to count 1; a two-element row to 2', () => {
    // The reconcilers reject any row whose HTML is not exactly one top-level
    // element; parseRowTemplate is the shared enforcement point.
    expect(parseRowTemplate('<li>ok</li>').count).toBe(1);
    expect(parseRowTemplate('<li>a</li><li>b</li>').count).toBe(2);
    expect(parseRowTemplate('  \n  ').count).toBe(0);
  });
});
