/**
 * Repo-hygiene guard. kerf 0.3.0 dropped the `morphdom` runtime dep and
 * replaced it with `src/diff.ts`, but stale references in source comments,
 * `tsup.config.ts`, and `package.json` keywords lingered for a release (KF-25).
 *
 * This test fails loudly if any of those references creep back in, so the
 * "we no longer depend on X" intent stays enforceable.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

// vitest is invoked from the repo root, so cwd is the project directory.
const REPO_ROOT = cwd();

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// `src/diff.ts` legitimately references morphdom in its MIT attribution
// (the algorithm is derived from it). Every other source file should be free
// of the name now that the dep itself is gone.
const ALLOWED_MORPHDOM_REFS = new Set([join(REPO_ROOT, 'src', 'diff.ts')]);

describe('no stale references to removed deps', () => {
  it('no source file under src/ mentions morphdom (except diff.ts attribution)', () => {
    const offenders: string[] = [];
    for (const path of walk(join(REPO_ROOT, 'src'))) {
      if (!path.endsWith('.ts')) continue;
      if (ALLOWED_MORPHDOM_REFS.has(path)) continue;
      const content = readFileSync(path, 'utf8');
      if (/morphdom/i.test(content)) offenders.push(path);
    }
    expect(offenders).toEqual([]);
  });

  it('tsup.config.ts does not list morphdom as external', () => {
    const content = readFileSync(join(REPO_ROOT, 'tsup.config.ts'), 'utf8');
    expect(content).not.toMatch(/morphdom/i);
  });

  it('package.json keywords does not include morphdom', () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
      keywords?: string[];
      dependencies?: Record<string, string>;
    };
    expect(pkg.keywords ?? []).not.toContain('morphdom');
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain('morphdom');
  });
});
