/**
 * Regression tests for KF-14 against the *built* `dist/` output.
 *
 * The bug: tsup bundles each entry independently with `splitting: false`,
 * so `dist/index.js` and `dist/jsx-runtime.js` each ship their own copy of
 * the `SafeHtml` class. When a consumer imports `raw`/`SafeHtml` from
 * `kerfjs` (the barrel) and the JSX transform resolves `<jsx>` calls via
 * `kerfjs/jsx-runtime`, the `SafeHtml` returned by `raw()` is *not* an
 * `instanceof` the JSX runtime's `SafeHtml` — and the runtime would throw
 * on a perfectly valid `SafeHtml` child.
 *
 * The fix is the `Symbol.for('kerfjs.SafeHtml')` brand: cross-bundle
 * `isSafeHtml()` now returns true regardless of which copy created the
 * instance. These tests exercise the actual published bundles.
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

function requireDist(): void {
  if (!existsSync(DIST_INDEX) || !existsSync(DIST_JSX)) {
    throw new Error(
      `dist/ is missing — run 'npm run build' first. Expected: ${DIST_INDEX}, ${DIST_JSX}`,
    );
  }
}

describe('dist/ — SafeHtml cross-bundle identity (KF-14)', () => {
  it('exposes a SafeHtml class from both entries', async () => {
    requireDist();
    const indexMod = await import(DIST_INDEX) as Record<string, unknown>;
    const jsxMod = await import(DIST_JSX) as Record<string, unknown>;
    expect(typeof indexMod.SafeHtml).toBe('function');
    expect(typeof jsxMod.SafeHtml).toBe('function');
  });

  it('exposes isSafeHtml from the public entry', async () => {
    requireDist();
    const indexMod = await import(DIST_INDEX) as Record<string, unknown>;
    expect(typeof indexMod.isSafeHtml).toBe('function');
  });

  it('a SafeHtml created by the barrel is recognised by the JSX runtime as a valid child (the KF-14 case)', async () => {
    requireDist();
    const { raw } = await import(DIST_INDEX) as { raw: (html: string) => unknown };
    const { jsx } = await import(DIST_JSX) as {
      jsx: (tag: string, props: Record<string, unknown>) => { toString(): string };
    };

    // This is the exact failure mode reported in KF-14: a SafeHtml from
    // the barrel passed as a JSX child. Before the brand fix, `instanceof
    // SafeHtml` inside the JSX runtime returned false (different class
    // identity), and `jsx()` threw.
    const out = jsx('div', { children: raw('<b>x</b>') });
    expect(out.toString()).toBe('<div><b>x</b></div>');
  });

  it('a SafeHtml created by the JSX runtime is recognised by the barrel\'s isSafeHtml()', async () => {
    requireDist();
    const { isSafeHtml } = await import(DIST_INDEX) as {
      isSafeHtml: (v: unknown) => boolean;
    };
    const { jsx } = await import(DIST_JSX) as {
      jsx: (tag: string, props: Record<string, unknown>) => unknown;
    };
    const node = jsx('span', { children: 'hi' });
    expect(isSafeHtml(node)).toBe(true);
  });

  it('the brand is `Symbol.for("kerfjs.SafeHtml")` so any module copy interoperates', async () => {
    requireDist();
    const { raw } = await import(DIST_INDEX) as { raw: (html: string) => Record<symbol, unknown> };
    const instance = raw('<p>x</p>');
    expect(instance[Symbol.for('kerfjs.SafeHtml')]).toBe(true);
  });
});

