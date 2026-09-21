import { execFile } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, '../..');
let temporaryRoot: string;
let packedModules: string;

async function run(command: string, args: string[], cwd: string) {
  try {
    return await exec(command, args, { cwd });
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    throw new Error(
      `${command} ${args.join(' ')} failed:\n${failure.stdout ?? ''}${failure.stderr ?? ''}`,
      { cause: error },
    );
  }
}

async function link(path: string, target: string) {
  await mkdir(dirname(path), { recursive: true });
  await symlink(target, path, 'dir');
}

async function pack(source: string, packageName: string) {
  const destination = resolve(packedModules, ...packageName.split('/'));
  const packDestination = resolve(temporaryRoot, 'tarballs');
  await mkdir(packDestination, { recursive: true });
  const { stdout } = await exec(
    'npm',
    [
      'pack',
      '--json',
      '--ignore-scripts',
      '--pack-destination',
      packDestination,
    ],
    {
      cwd: resolve(repositoryRoot, source),
      env: {
        ...process.env,
        HUSKY: '0',
        npm_config_cache: resolve(temporaryRoot, 'npm-cache'),
      },
    },
  );
  const jsonStart = stdout.indexOf('[\n');
  if (jsonStart < 0) throw new Error(`npm pack did not emit JSON: ${stdout}`);
  const [{ filename }] = JSON.parse(stdout.slice(jsonStart));
  await mkdir(destination, { recursive: true });
  await exec('tar', [
    '-xzf',
    resolve(packDestination, filename),
    '--strip-components=1',
    '-C',
    destination,
  ]);
}

async function prepareModules(root: string) {
  const modules = resolve(root, 'node_modules');
  for (const name of [
    'kerfjs',
    '@kerfjs/ui',
    'create-kerf-component',
    'eslint-plugin-kerfjs',
  ])
    await link(
      resolve(modules, ...name.split('/')),
      resolve(packedModules, ...name.split('/')),
    );
  for (const name of [
    'eslint',
    'postcss',
    'typescript',
    '@typescript-eslint/parser',
    '@preact/signals-core',
  ])
    await link(
      resolve(modules, ...name.split('/')),
      resolve(repositoryRoot, 'node_modules', ...name.split('/')),
    );
  const bins = resolve(modules, '.bin');
  await mkdir(bins, { recursive: true });
  for (const [name, target] of Object.entries({
    eslint: resolve(repositoryRoot, 'node_modules/.bin/eslint'),
    tsc: resolve(repositoryRoot, 'node_modules/.bin/tsc'),
    'kerf-component-catalog': resolve(
      packedModules,
      'create-kerf-component/catalog.js',
    ),
    'kerf-ui-doctor': resolve(packedModules, '@kerfjs/ui/doctor/cli.mjs'),
    kerfjs: resolve(packedModules, 'kerfjs/setup/cli.mjs'),
  }))
    await symlink(target, resolve(bins, name));
}

beforeAll(async () => {
  temporaryRoot = await mkdtemp(join(tmpdir(), 'kerf-packed-setup-'));
  packedModules = resolve(temporaryRoot, 'packed/node_modules');
  await Promise.all([
    pack('.', 'kerfjs'),
    pack('ui', '@kerfjs/ui'),
    pack('create-kerf-component', 'create-kerf-component'),
    pack('eslint-plugin', 'eslint-plugin-kerfjs'),
  ]);
  for (const name of [
    'eslint',
    'postcss',
    'typescript',
    '@typescript-eslint/parser',
    '@preact/signals-core',
  ])
    await link(
      resolve(packedModules, ...name.split('/')),
      resolve(repositoryRoot, 'node_modules', ...name.split('/')),
    );
}, 60_000);

afterAll(async () => {
  await rm(temporaryRoot, { recursive: true, force: true });
});

describe('packed AI-first setup', () => {
  it('initializes a minimal core consumer that builds, lints, and discovers guidance', async () => {
    const root = resolve(temporaryRoot, 'core-consumer');
    await mkdir(resolve(root, 'src'), { recursive: true });
    await writeFile(
      resolve(root, 'package.json'),
      `${JSON.stringify({ name: 'core-consumer', private: true, type: 'module', scripts: { build: 'tsc --noEmit' } })}\n`,
    );
    await writeFile(
      resolve(root, 'src/index.ts'),
      'export const ready = true;\n',
    );
    await prepareModules(root);
    await exec(
      resolve(root, 'node_modules/.bin/kerfjs'),
      ['--core', '--write', '--yes', '--no-install'],
      { cwd: root },
    );
    await run('npm', ['run', 'build'], root);
    await run('npm', ['run', 'kerf:check'], root);
    expect(
      await readFile(resolve(root, '.claude/skills/kerf-app/SKILL.md'), 'utf8'),
    ).toContain('kerf-skill-version:');
    const { stdout } = await exec(
      resolve(root, 'node_modules/.bin/kerfjs'),
      ['--core'],
      { cwd: root },
    );
    expect(stdout).toContain('No changes.');
    const manifestPath = resolve(root, 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.scripts['kerf:check'] = 'custom-check';
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
    await expect(
      exec(resolve(root, 'node_modules/.bin/kerfjs'), ['--core'], {
        cwd: root,
      }),
    ).rejects.toMatchObject({
      code: 2,
      stdout: expect.stringContaining(
        '--resolve package.json#scripts.kerf:check=keep|kerf',
      ),
    });
    await exec(
      resolve(root, 'node_modules/.bin/kerfjs'),
      [
        '--core',
        '--resolve',
        'package.json#scripts.kerf:check=keep',
        '--write',
        '--yes',
        '--no-install',
      ],
      { cwd: root },
    );
    expect(
      JSON.parse(await readFile(manifestPath, 'utf8')).scripts['kerf:check'],
    ).toBe('custom-check');
  }, 30_000);

  it('initializes a selected UI monorepo package with catalog and doctor discovery', async () => {
    const root = resolve(temporaryRoot, 'ui-workspace');
    const app = resolve(root, 'packages/app');
    await mkdir(resolve(app, 'src'), { recursive: true });
    await writeFile(
      resolve(root, 'package.json'),
      `${JSON.stringify({ name: 'ui-workspace', private: true, workspaces: ['packages/*'] })}\n`,
    );
    await writeFile(
      resolve(app, 'package.json'),
      `${JSON.stringify({ name: '@acme/ui-app', private: true, type: 'module', dependencies: { '@kerfjs/ui': '4.4.1', kerfjs: '4.4.1' }, scripts: { build: 'tsc --noEmit' } })}\n`,
    );
    await writeFile(
      resolve(app, 'src/index.ts'),
      'export const ready = true;\n',
    );
    await prepareModules(root);
    await exec(
      resolve(root, 'node_modules/.bin/kerfjs'),
      ['--package', '@acme/ui-app', '--write', '--yes', '--no-install'],
      { cwd: root },
    );
    await run('npm', ['run', 'build'], app);
    await run('npm', ['run', 'catalog:generate'], app);
    await run('npm', ['run', 'catalog:check'], app);
    await run('npm', ['run', 'kerf:check'], app);
    await run('npm', ['run', 'kerf:doctor'], app);
    const profile = JSON.parse(
      await readFile(resolve(root, '.kerf-ui-profile.json'), 'utf8'),
    );
    expect(profile.catalogs).toContainEqual({
      package: '@acme/ui-app',
      composition: {
        path: './packages/app/component-catalog-v2.json',
        schemaVersion: 2,
      },
    });
    expect(
      JSON.parse(
        await readFile(resolve(app, 'component-catalog-v2.json'), 'utf8'),
      ).entries,
    ).toEqual([]);
  }, 30_000);
});
