// @vitest-environment node
/**
 * KF-8CP37E machine-local path policy: no tracked file may hard-code a
 * developer's home directory or a machine temp path. Such a path only works on
 * one machine and leaks a username into a public repository (the shared Git
 * rule: "a policy test fails on machine-local paths in tracked files").
 *
 * Scans every file `git ls-files` reports, skipping lockfiles and binary
 * assets. Placeholder paths used as fixtures (`/Users/someone/…`) are allowed
 * by name; a whole file is exempt only with a reason recorded below.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = cwd();

const MACHINE_LOCAL_PATH =
  /(?:\/Users\/[A-Za-z0-9._-]+\/|\/home\/[A-Za-z0-9._-]+\/|\/private\/tmp\/)/g;

// Obviously fake home directories that tests use as fixtures.
const PLACEHOLDER_PATHS = new Set([
  '/Users/someone/',
  '/Users/test/',
  '/Users/me/',
  '/Users/you/',
  '/Users/name/',
  '/Users/username/',
  '/home/me/',
  '/home/user/',
  '/home/someone/',
]);

// Whole-file exemptions. Each needs a reason and, ideally, a ticket.
const EXEMPT_FILES = new Map<string, string>([
  [
    '.claude/settings.json',
    // KF-8CP37E: maintainer-owned hook config pointing at a sibling Hot Sheet
    // checkout. Whether it moves to settings.local.json or becomes relative is
    // the maintainer's decision; remove this entry once it is made.
    'maintainer-owned hook configuration',
  ],
]);

const SKIPPED_FILE =
  /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Cargo\.lock)$|\.(?:png|jpe?g|gif|webp|ico|svgz|woff2?|ttf|otf|eot|pdf|mp3|mp4|webm|mov|zip|gz|tgz|wasm)$/i;

function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\0')
    .filter((file) => file !== '' && !SKIPPED_FILE.test(file));
}

function offenders(): string[] {
  const found: string[] = [];
  for (const file of trackedFiles()) {
    if (EXEMPT_FILES.has(file)) continue;
    let text: string;
    try {
      text = readFileSync(join(REPO_ROOT, file), 'utf8');
    } catch {
      continue; // deleted in the worktree but still in the index
    }
    if (text.includes('\0')) continue; // binary
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      for (const match of line.matchAll(MACHINE_LOCAL_PATH)) {
        if (PLACEHOLDER_PATHS.has(match[0])) continue;
        found.push(`${file}:${index + 1}: ${match[0]}`);
      }
    });
  }
  return found;
}

describe('KF-8CP37E machine-local path policy', () => {
  it('no tracked file hard-codes a home directory or machine temp path', () => {
    expect(offenders()).toEqual([]);
    // Reads every tracked text file (~4k); generous under a loaded machine.
  }, 30_000);

  it('every whole-file exemption still names a tracked file', () => {
    const tracked = new Set(trackedFiles());
    for (const file of EXEMPT_FILES.keys())
      expect(tracked.has(file), file).toBe(true);
  }, 30_000);

  it('recognizes the shapes it guards against', () => {
    // Assembled at runtime so this file does not trip its own scan.
    const sample = [
      `cd ${'/Users'}/alice/Documents/kerf`,
      `cat ${'/home'}/bob/log`,
      `rm ${'/private'}/tmp/x`,
      'fixture /Users/someone/a',
    ].join('\n');
    const hits = [...sample.matchAll(MACHINE_LOCAL_PATH)].map((m) => m[0]);
    expect(hits.filter((hit) => !PLACEHOLDER_PATHS.has(hit))).toEqual([
      `${'/Users'}/alice/`,
      `${'/home'}/bob/`,
      `${'/private'}/tmp/`,
    ]);
  });
});
