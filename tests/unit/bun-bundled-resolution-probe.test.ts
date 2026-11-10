// @vitest-environment node
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  assertCanonicalInputs,
  assertResolutionOutcome,
  assertToolingRetained,
  bundledManifestEvidence,
  siteTooling,
} from '../../scripts/bun-bundled-resolution-probe.mjs';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'kerf-bundle-metadata-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function manifest(path: string, value: Record<string, unknown>) {
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, 'package.json'), JSON.stringify(value));
}

describe('bundled resolution evidence (KF-C6HCET)', () => {
  it('distinguishes bundled tarball contents from a registry dependency declaration', () => {
    for (const key of ['bundleDependencies', 'bundledDependencies']) {
      manifest(root, {
        name: 'publisher',
        version: '1.0.0',
        dependencies: { '@private/bundle': '2.0.0', missing: '3.0.0' },
        [key]: ['@private/bundle', 'missing'],
      });
      manifest(join(root, 'node_modules/@private/bundle'), {
        name: '@private/bundle',
        version: '2.0.0',
        private: true,
      });
      const result = bundledManifestEvidence(root);
      expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result.bundles[0]).toMatchObject({
        name: '@private/bundle',
        declared: '2.0.0',
        present: true,
        manifest: { version: '2.0.0', private: true },
      });
      expect(result.bundles[0].sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result.bundles[1]).toEqual({
        name: 'missing',
        declared: '3.0.0',
        present: false,
        manifest: null,
        sha256: null,
      });
    }
  });

  it('accepts only the exact clean bundled-package 404, not hangs or unrelated errors', () => {
    const failure = {
      status: 1,
      signal: null,
      error: null,
      stderr:
        'error: GET https://registry.npmjs.org/@domotion%2ftext-engine - 404\nerror: @domotion/text-engine@0.35.0 failed to resolve',
    };
    expect(() => assertResolutionOutcome(failure, true)).not.toThrow();
    expect(() =>
      assertResolutionOutcome({ ...failure, error: 'ETIMEDOUT' }, true),
    ).toThrow('exit normally');
    expect(() =>
      assertResolutionOutcome({ ...failure, signal: 'SIGTERM' }, true),
    ).toThrow('killed');
    expect(() =>
      assertResolutionOutcome(
        { ...failure, stderr: 'network unavailable' },
        true,
      ),
    ).toThrow();
    expect(() =>
      assertResolutionOutcome({ ...failure, status: 0 }, true),
    ).toThrow();
    expect(() =>
      assertResolutionOutcome({ ...failure, status: 0, stderr: '' }, false),
    ).not.toThrow();
  });

  it('resolves real site tooling and rejects missing or replaced restored packages', () => {
    manifest(root, { name: 'site', version: '1.0.0' });
    for (const name of ['typescript', 'vite', '@playwright/test', 'astro']) {
      const path = join(root, 'node_modules', name);
      manifest(path, { name, version: '1.2.3', main: 'entry.js' });
      writeFileSync(join(path, 'entry.js'), 'module.exports = {};');
    }
    const baseline = siteTooling(root);
    symlinkSync('.', join(root, 'site-alias'));
    expect(() =>
      assertToolingRetained(baseline, siteTooling(join(root, 'site-alias'))),
    ).not.toThrow();
    expect(baseline.map((tool) => tool.name)).toEqual([
      'typescript',
      'vite',
      '@playwright/test',
      'astro',
    ]);
    expect(
      baseline.every(
        (tool) =>
          tool.entry.endsWith('/entry.js') && tool.manifest.version === '1.2.3',
      ),
    ).toBe(true);
    expect(() =>
      assertToolingRetained(baseline, siteTooling(root)),
    ).not.toThrow();
    manifest(join(root, 'node_modules/vite'), {
      name: 'vite',
      version: '2.0.0',
      main: 'entry.js',
    });
    expect(() => assertToolingRetained(baseline, siteTooling(root))).toThrow(
      'changed or lost',
    );
    rmSync(join(root, 'node_modules/astro'), { recursive: true });
    expect(() => siteTooling(root)).toThrow('manifest missing: astro');
  });

  it('rejects canonical changes even when disposable add is permitted to change its own graph', () => {
    const before = {
      'package.json': 'root',
      'package-lock.json': 'lock',
      'site/package.json': 'site',
      'site/package-lock.json': 'site-lock',
    };
    expect(() => assertCanonicalInputs(before, { ...before })).not.toThrow();
    for (const key of Object.keys(before))
      expect(() =>
        assertCanonicalInputs(before, { ...before, [key]: 'changed' }),
      ).toThrow('Canonical');
  });
});
