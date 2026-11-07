import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const binPaths = (
  JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
    bin: Record<string, string>;
  }
).bin;
const bins = Object.entries(binPaths);

// One invocation per bin that must produce observable output (a usage error or
// a report) without touching the network or a browser.
const probes: Record<string, string[]> = {
  'kerf-ui-analyze': ['--format', 'bogus'],
  'kerf-ui-doctor': ['--format', 'bogus'],
  'kerf-ui-evaluate': [],
  'kerf-ui-view': [],
  'kerf-ui-props': [],
  'kerf-catalog-demo': [],
};

let folder: string;
let binDirectory: string;

beforeAll(() => {
  folder = mkdtempSync(join(tmpdir(), 'kerf-ui-bins-'));
  binDirectory = join(folder, 'node_modules', '.bin');
  mkdirSync(binDirectory, { recursive: true });
  for (const [name, path] of bins)
    symlinkSync(resolve(root, path), join(binDirectory, name));
});

afterAll(() => rmSync(folder, { recursive: true, force: true }));

describe('@kerfjs/ui bins', () => {
  it('has a probe for every bin', () => {
    expect(Object.keys(probes).sort()).toEqual(
      bins.map(([name]) => name).sort(),
    );
  });

  // KF-88VC6W: npm runs a bin through its node_modules/.bin symlink, so a
  // main-module guard that compares the unresolved argv[1] silently skipped
  // all work and exited 0.
  it.each(bins)('%s does its work through an npm bin symlink', (name) => {
    const result = spawnSync(
      process.execPath,
      [join(binDirectory, name), ...probes[name]],
      { cwd: folder, encoding: 'utf8' },
    );
    expect(`${result.stdout}${result.stderr}`.trim()).not.toBe('');
    expect(result.status).toBe(2);
  });

  // KF-FSCXYT: every bin prints its usage and exits 0 on --help / -h, without
  // doing work, both run directly and through the npm bin symlink.
  it.each(
    bins.flatMap(([name]) => [
      [name, '--help'],
      [name, '-h'],
    ]),
  )('%s %s prints its usage and exits 0', (name, flag) => {
    for (const entry of [
      resolve(root, binPaths[name]),
      join(binDirectory, name),
    ]) {
      const result = spawnSync(process.execPath, [entry, flag], {
        cwd: folder,
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(new RegExp(`^Usage: ${name}\\b`));
      expect(result.stdout).toContain('--help');
      expect(result.stderr).toBe('');
    }
  });
});
