import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
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

  // KF-7NZM4K: a missing flag value, an unknown flag, and an unreadable or
  // malformed input file are usage/input errors (`<bin>: <message>`, exit 2),
  // never a silent fallback or a raw stack trace.
  const missingValue: Record<string, string[]> = {
    'kerf-ui-analyze': ['--format'],
    'kerf-ui-doctor': ['--root'],
    'kerf-ui-evaluate': ['--url'],
    'kerf-ui-view': ['generate', 'a.kui.json', '--target'],
    'kerf-ui-props': ['--write', '--root'],
    'kerf-catalog-demo': ['--extension'],
  };
  const unknownFlag: Record<string, string[]> = {
    'kerf-ui-analyze': ['--fail-on-reviw'],
    'kerf-ui-doctor': ['--fail-on-reviw'],
    'kerf-ui-evaluate': ['--url', 'http://localhost:1', '--fail-on-reviw'],
    'kerf-ui-view': ['generate', 'a.kui.json', '--fail-on-reviw'],
    'kerf-ui-props': ['--write', '--fail-on-reviw'],
    'kerf-catalog-demo': ['--write', '--fail-on-reviw'],
  };

  function runBin(name: string, argv: string[]) {
    return spawnSync(process.execPath, [join(binDirectory, name), ...argv], {
      cwd: folder,
      encoding: 'utf8',
    });
  }

  it('has an error probe for every bin', () => {
    const names = bins.map(([name]) => name).sort();
    expect(Object.keys(missingValue).sort()).toEqual(names);
    expect(Object.keys(unknownFlag).sort()).toEqual(names);
  });

  it.each(bins)('%s rejects a flag with no value', (name) => {
    const result = runBin(name, missingValue[name]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain(
      `${name}: ${missingValue[name].at(-1)} requires a value.`,
    );
  });

  it.each(bins)('%s rejects an unknown flag', (name) => {
    const result = runBin(name, unknownFlag[name]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain(
      `${name}: Unknown arguments: --fail-on-reviw`,
    );
  });

  it('names a missing or malformed input file instead of a stack trace', () => {
    writeFileSync(join(folder, 'bad.json'), '{ "schema": ');
    const packageFolder = join(folder, 'bad-package');
    mkdirSync(packageFolder, { recursive: true });
    writeFileSync(join(packageFolder, 'package.json'), '{');
    const repoBase = ['--repo-base', 'https://example.com/blob/main'];
    const out = ['--out', 'x.ts'];
    const cases: Array<[string, string[], string]> = [
      [
        'kerf-ui-view',
        ['check', 'missing.kui.json', '--no-profile'],
        'kerf-ui-view: missing.kui.json: file not found',
      ],
      [
        'kerf-ui-view',
        ['check', 'bad.json', '--no-profile'],
        'kerf-ui-view: bad.json: invalid JSON:',
      ],
      [
        'kerf-ui-props',
        ['--check', '--root', packageFolder],
        `kerf-ui-props: ${join(packageFolder, 'package.json')}: invalid JSON:`,
      ],
      [
        'kerf-catalog-demo',
        ['--check', '--extension', 'missing.json', ...out, ...repoBase],
        'kerf-catalog-demo: missing.json: file not found',
      ],
      [
        'kerf-catalog-demo',
        ['--check', '--extension', 'bad.json', ...out, ...repoBase],
        'kerf-catalog-demo: bad.json: invalid JSON:',
      ],
      [
        'kerf-ui-analyze',
        ['--root', 'missing-root'],
        `kerf-ui-analyze: ${join(realFolder(), 'missing-root')}: not a directory`,
      ],
    ];
    for (const [name, argv, message] of cases) {
      const result = runBin(name, argv);
      expect(result.status, `${name} ${argv.join(' ')}`).toBe(2);
      expect(result.stderr).toContain(message);
      expect(result.stderr).not.toMatch(/\n\s+at /);
    }
  });
});

/** The temp folder as the child process sees its cwd (macOS /private/var). */
function realFolder() {
  return realpathSync(folder);
}
