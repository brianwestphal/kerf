// KF-7YHK22: setup's file reads report the file they failed on. A missing
// file is the only "absent" case; any other read error propagates, and
// malformed JSON names its workspace-relative path.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { planKerfSetup } from '../../setup/index.mjs';

const roots: string[] = [];
async function fixture(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'kerf-setup-read-'));
  roots.push(root);
  for (const [path, source] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), source);
  }
  return root;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

const coreManifest = JSON.stringify({
  name: 'core-app',
  dependencies: { kerfjs: '4.4.1' },
});

describe('setup file-read errors', () => {
  it('names a malformed root package.json instead of a bare parse error', async () => {
    const root = await fixture({ 'package.json': '{ "name": ' });
    await expect(planKerfSetup({ root, version: '4.4.1' })).rejects.toThrow(
      /^package\.json is invalid JSON: /,
    );
  });

  it('reports an unreadable package.json as itself, not as missing', async () => {
    const root = await fixture({});
    await mkdir(join(root, 'package.json'));
    const failure = planKerfSetup({ root, version: '4.4.1' });
    await expect(failure).rejects.toMatchObject({ code: 'EISDIR' });
    await expect(failure).rejects.not.toThrow('has no package.json');
  });

  it('still reports a missing package.json as missing', async () => {
    const root = await fixture({});
    await expect(planKerfSetup({ root, version: '4.4.1' })).rejects.toThrow(
      'has no package.json',
    );
  });

  it('names a malformed setup state file', async () => {
    const root = await fixture({
      'package.json': coreManifest,
      '.kerf-ai-setup.json': '{',
    });
    await expect(planKerfSetup({ root, version: '4.4.1' })).rejects.toThrow(
      /^\.kerf-ai-setup\.json is invalid JSON: /,
    );
  });

  it('names a malformed workspace member manifest', async () => {
    const root = await fixture({
      'package.json': JSON.stringify({
        name: 'workspace',
        private: true,
        workspaces: ['packages/*'],
      }),
      'packages/a/package.json': '{',
    });
    await expect(planKerfSetup({ root, version: '4.4.1' })).rejects.toThrow(
      /^packages\/a\/package\.json is invalid JSON: /,
    );
  });

  it('names a malformed application UI profile', async () => {
    const root = await fixture({
      'package.json': JSON.stringify({
        name: '@acme/ui',
        dependencies: { kerfjs: '4.4.1', '@kerfjs/ui': '4.4.1' },
      }),
      '.kerf-ui-profile.json': '{',
    });
    await expect(planKerfSetup({ root, version: '4.4.1' })).rejects.toThrow(
      /^\.kerf-ui-profile\.json is invalid JSON: /,
    );
  });
});
