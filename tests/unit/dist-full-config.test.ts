/**
 * Unit tests for the `srcToDistPlugin` resolver used by
 * `vitest.config.dist-full.ts`. The dist-full suite remaps every
 * `../../src/<name>.js` import onto the published `dist/` entry points,
 * and deliberately *refuses* to remap a private `src/utils/*` helper —
 * those have no public dist home, so a test reaching one can't be
 * honestly verified against dist and must be a src-only test instead.
 *
 * These tests pin that guard. It regressed once because `moduleName` is
 * `src/`-relative with NO leading slash (e.g. `utils/escapeHtml`), so the
 * previous `moduleName.includes('/utils/')` check never matched the
 * top-level `src/utils/*` case and private-helper imports silently
 * remapped to `dist/index.js` (a confusing runtime "not a function"
 * instead of the loud, designed error).
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';
import { describe, expect, it } from 'vitest';

import { srcToDistPlugin } from '../../vitest.config.dist-full.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

/** Invoke the plugin's `resolveId` hook directly (it ignores `this`). */
function resolveId(source: string, importer: string | undefined) {
  const hook = srcToDistPlugin().resolveId as
    | ((this: unknown, source: string, importer?: string) => unknown)
    | undefined;
  if (typeof hook !== 'function') throw new Error('resolveId is not a function');
  return hook.call(null, source, importer);
}

// A test file living where the real tests live, so a relative
// `../../src/...` import resolves into the repo's `src/` tree.
const TEST_IMPORTER = resolve(ROOT, 'tests', 'unit', 'x.test.ts');

describe('srcToDistPlugin (dist-full resolver)', () => {
  it('is a well-formed vite plugin with a resolveId hook', () => {
    const plugin: Plugin = srcToDistPlugin();
    expect(plugin.name).toBe('kerf-src-to-dist');
    expect(typeof plugin.resolveId).toBe('function');
  });

  it('throws the loud private-helper error for a top-level src/utils/* import', () => {
    expect(() =>
      resolveId('../../src/utils/escapeHtml.js', TEST_IMPORTER),
    ).toThrow(/refused to remap private helper/);
  });

  it('throws for a bare `src/utils` directory import', () => {
    expect(() => resolveId('../../src/utils.js', TEST_IMPORTER)).toThrow(
      /refused to remap private helper/,
    );
  });

  it('throws for a hypothetical nested `.../utils/*` import', () => {
    expect(() =>
      resolveId('../../src/nested/utils/thing.js', TEST_IMPORTER),
    ).toThrow(/refused to remap private helper/);
  });

  it('passes through non-source imports (no importer / non-.js / outside src)', () => {
    expect(resolveId('vitest', TEST_IMPORTER)).toBeNull();
    expect(resolveId('../../src/index.js', undefined)).toBeNull();
    expect(resolveId('../../tests/helper.js', TEST_IMPORTER)).toBeNull();
  });
});
