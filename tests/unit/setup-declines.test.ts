import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  applyKerfSetup,
  formatSetupPlan,
  planKerfSetup,
} from '../../setup/index.mjs';

const roots: string[] = [];
async function fixture(manifest: object, files: Record<string, string> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'kerf-setup-declines-'));
  roots.push(root);
  await writeFile(join(root, 'package.json'), JSON.stringify(manifest));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}
const json = async (root: string, path: string) =>
  JSON.parse(await readFile(join(root, path), 'utf8'));
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('setup proposal declines', () => {
  it('remembers missing dependency, script, and JSONC value declines and lets kerf adopt them later', async () => {
    const root = await fixture(
      { name: 'app' },
      {
        'tsconfig.json':
          '{\n  // Preserve this comment.\n  "compilerOptions": {},\n}\n',
      },
    );
    const ids = [
      'package.json#devDependencies.@typescript-eslint/parser',
      'package.json#scripts.kerf:check',
      'tsconfig.json#compilerOptions.strict',
    ];
    const initial = await planKerfSetup({
      root,
      mode: 'core',
      version: '5.0.0',
    });
    for (const id of ids)
      expect(formatSetupPlan(initial)).toContain(`PROPOSAL ${id}`);
    const declined = await planKerfSetup({
      root,
      mode: 'core',
      version: '5.0.0',
      resolutions: Object.fromEntries(ids.map((id) => [id, 'skip' as const])),
    });
    expect(declined.conflicts).toEqual([]);
    await applyKerfSetup(declined, { install: false });
    const manifest = await json(root, 'package.json');
    expect(manifest.devDependencies).not.toHaveProperty(
      '@typescript-eslint/parser',
    );
    expect(manifest.scripts).not.toHaveProperty('kerf:check');
    expect(await readFile(join(root, 'tsconfig.json'), 'utf8')).toContain(
      '// Preserve this comment.',
    );
    expect(await readFile(join(root, 'tsconfig.json'), 'utf8')).not.toContain(
      '"strict"',
    );
    expect(
      (await json(root, '.kerf-ai-setup.json')).packages['.'].resolutions,
    ).toEqual(Object.fromEntries(ids.map((id) => [id, 'skip'])));
    expect((await planKerfSetup({ root, version: '5.0.0' })).actions).toEqual(
      [],
    );
    const adopted = await planKerfSetup({
      root,
      version: '5.0.0',
      resolutions: Object.fromEntries(ids.map((id) => [id, 'kerf' as const])),
    });
    await applyKerfSetup(adopted, { install: false });
    expect((await json(root, 'package.json')).devDependencies).toHaveProperty(
      '@typescript-eslint/parser',
      '^8.0.0',
    );
    expect((await json(root, 'package.json')).scripts['kerf:check']).toBe(
      'tsc --noEmit && eslint .',
    );
    expect(await readFile(join(root, 'tsconfig.json'), 'utf8')).toContain(
      '"strict": true',
    );
    expect(
      (await json(root, '.kerf-ai-setup.json')).packages['.'].resolutions,
    ).toEqual({});
    expect((await planKerfSetup({ root, version: '5.0.0' })).actions).toEqual(
      [],
    );
  });

  it('keeps declined managed upgrades stable, surfaces later authored conflicts, and prunes satisfied skips', async () => {
    const root = await fixture({ name: 'app' });
    const id = 'package.json#devDependencies.eslint-plugin-kerfjs';
    await applyKerfSetup(
      await planKerfSetup({ root, mode: 'core', version: '5.0.0' }),
      { install: false },
    );
    await applyKerfSetup(
      await planKerfSetup({
        root,
        version: '5.1.0',
        resolutions: { [id]: 'skip' },
      }),
      { install: false },
    );
    expect(
      (await json(root, 'package.json')).devDependencies[
        'eslint-plugin-kerfjs'
      ],
    ).toBe('5.0.0');
    expect((await planKerfSetup({ root, version: '5.1.0' })).actions).toEqual(
      [],
    );
    await applyKerfSetup(await planKerfSetup({ root, version: '5.2.0' }), {
      install: false,
    });
    expect((await planKerfSetup({ root, version: '5.2.0' })).actions).toEqual(
      [],
    );
    const manifest = await json(root, 'package.json');
    manifest.devDependencies['eslint-plugin-kerfjs'] = 'custom';
    await writeFile(join(root, 'package.json'), JSON.stringify(manifest));
    expect((await planKerfSetup({ root, version: '5.2.0' })).conflicts).toEqual(
      [expect.objectContaining({ id })],
    );
    await expect(
      planKerfSetup({ root, version: '5.2.0', resolutions: { [id]: 'skip' } }),
    ).rejects.toThrow('cannot skip a conflict');
    manifest.devDependencies['eslint-plugin-kerfjs'] = '5.2.0';
    await writeFile(join(root, 'package.json'), JSON.stringify(manifest));
    await applyKerfSetup(await planKerfSetup({ root, version: '5.2.0' }), {
      install: false,
    });
    expect(
      (await json(root, '.kerf-ai-setup.json')).packages['.'].resolutions,
    ).toEqual({});
    await expect(
      planKerfSetup({ root, version: '5.2.0', resolutions: { [id]: 'skip' } }),
    ).rejects.toThrow('Stale resolution id');
  });

  it('does not let missing-value declines bypass unknown IDs or keep conflict validation', async () => {
    const root = await fixture({ name: 'app' });
    await expect(
      planKerfSetup({ root, mode: 'core', resolutions: { nope: 'skip' } }),
    ).rejects.toThrow('Unknown resolution id');
    await expect(
      planKerfSetup({
        root,
        mode: 'core',
        resolutions: { 'package.json#scripts.kerf:check': 'keep' },
      }),
    ).rejects.toThrow('Stale resolution id');
  });

  it.each([
    'package.json#scripts.catalog:generate',
    'package.json#devDependencies.create-kerf-component',
    'package.json#kerfComponentCatalog',
  ])(
    'applies UI setup without catalog generation when %s is declined',
    async (id) => {
      const root = await fixture(
        { name: 'app' },
        { 'src/index.ts': 'export {};\n' },
      );
      const plan = await planKerfSetup({
        root,
        mode: 'ui',
        resolutions: { [id]: 'skip' },
      });
      const calls: string[][] = [];
      await applyKerfSetup(plan, {
        runner: async (_command: string, args: string[]) => {
          calls.push(args);
        },
      });
      expect(calls).toEqual([['install']]);
      expect(plan.generatedPaths).toEqual([]);
      expect((await planKerfSetup({ root })).actions).toEqual([]);
    },
  );

  it('declines initial profile values and catalog entries without treating them as conflicts', async () => {
    const root = await fixture(
      { name: 'app' },
      { 'src/index.ts': 'export {};\n' },
    );
    const ids = [
      '.kerf-ui-profile.json#scope',
      '.kerf-ui-profile.json#catalogs.app',
    ];
    const plan = await planKerfSetup({
      root,
      mode: 'ui',
      resolutions: Object.fromEntries(ids.map((id) => [id, 'skip' as const])),
    });
    await applyKerfSetup(plan, { install: false });
    const profile = await json(root, '.kerf-ui-profile.json');
    expect(profile).not.toHaveProperty('scope');
    expect(profile.catalogs).toEqual([]);
    expect((await planKerfSetup({ root })).actions).toEqual([]);
  });

  it('isolates declines to the selected workspace package', async () => {
    const root = await fixture(
      { private: true, workspaces: ['packages/*'] },
      {
        'packages/a/package.json': JSON.stringify({
          name: 'a',
          dependencies: { kerfjs: '5.0.0' },
        }),
        'packages/b/package.json': JSON.stringify({
          name: 'b',
          dependencies: { kerfjs: '5.0.0' },
        }),
      },
    );
    const id = 'package.json#devDependencies.@typescript-eslint/parser';
    await applyKerfSetup(
      await planKerfSetup({
        root,
        package: 'a',
        version: '5.0.0',
        resolutions: { [id]: 'skip' },
      }),
      { install: false },
    );
    await applyKerfSetup(
      await planKerfSetup({ root, package: 'b', version: '5.0.0' }),
      { install: false },
    );
    expect(
      (await json(root, 'packages/a/package.json')).devDependencies,
    ).not.toHaveProperty('@typescript-eslint/parser');
    expect(
      (await json(root, 'packages/b/package.json')).devDependencies,
    ).toHaveProperty('@typescript-eslint/parser');
    expect(
      (await planKerfSetup({ root, package: 'a', version: '5.0.0' })).actions,
    ).toEqual([]);
  });
});
