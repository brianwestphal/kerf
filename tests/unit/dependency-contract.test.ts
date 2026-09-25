/**
 * The published dependency contract, enforced in both directions.
 *
 * The browser runtime (everything under `src/`, which becomes `dist/`) depends
 * on `@preact/signals-core` and nothing else — that is the dependency every
 * app bundle inherits. The Node-only `kerfjs setup` CLI under `setup/` never
 * reaches a browser bundle and may use `minimatch` (workspace globs) and
 * `yaml` (pnpm workspace files). `package.json` `dependencies` must be exactly
 * the union, so adding a package means naming which side needs it here.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = cwd();

const RUNTIME_DEPS = ['@preact/signals-core'];
const SETUP_DEPS = ['minimatch', 'yaml'];

function walk(dir: string, ext: RegExp): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && ext.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

// Real module statements only: comments are stripped first so JSDoc examples
// (` * import { … } from 'kerfjs'`) don't count, and a statement may not span
// a `;`, so generated-config template strings further down don't either.
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const STATIC_IMPORT =
  /^\s*(?:import|export)\b[^'";]*?\bfrom\s+['"]([^'"]+)['"]/gm;

function bareImports(files: string[]): Set<string> {
  const packages = new Set<string>();
  for (const file of files) {
    for (const match of readFileSync(file, 'utf8')
      .replace(BLOCK_COMMENT, '')
      .matchAll(STATIC_IMPORT)) {
      const specifier = match[1]!;
      if (specifier.startsWith('.') || specifier.startsWith('node:')) continue;
      const parts = specifier.split('/');
      packages.add(
        specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!,
      );
    }
  }
  return packages;
}

describe('dependency contract', () => {
  it('package.json dependencies are exactly the runtime + setup allowlists', () => {
    const pkg = JSON.parse(
      readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string> };
    expect(Object.keys(pkg.dependencies ?? {}).sort()).toEqual(
      [...RUNTIME_DEPS, ...SETUP_DEPS].sort(),
    );
  });

  it('the browser runtime imports only @preact/signals-core', () => {
    const imported = bareImports(walk(join(REPO_ROOT, 'src'), /\.tsx?$/));
    expect([...imported].sort()).toEqual(RUNTIME_DEPS);
  });

  it('the setup CLI imports only its declared Node-side dependencies', () => {
    const imported = bareImports(walk(join(REPO_ROOT, 'setup'), /\.m?js$/));
    expect([...imported].sort()).toEqual(SETUP_DEPS);
  });
});
