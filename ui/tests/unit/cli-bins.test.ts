import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import packageJson from '../../package.json' with { type: 'json' };

const root = resolve(import.meta.dirname, '../..');
const bins = Object.entries(packageJson.bin as Record<string, string>);

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
    expect(result.status).not.toBe(0);
  });
});
