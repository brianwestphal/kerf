import { execFile, execFileSync } from 'node:child_process';
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
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
let offlineTarballs: Record<string, string>;

const offlinePackages = {
  kerfjs: { range: '4.4.1', version: '4.4.1' },
  'eslint-plugin-kerfjs': { range: '4.4.1', version: '4.4.1' },
  '@typescript-eslint/parser': { range: '^8.0.0', version: '8.0.0' },
  eslint: { range: '^9.0.0', version: '9.0.0' },
  typescript: { range: '^5.0.0 || ^6.0.0', version: '5.0.0' },
};

interface ManagerCase {
  manager: 'npm' | 'pnpm' | 'yarn';
  variant?: 'classic' | 'berry';
  label: string;
  packageManager: string;
  executableEnv: string;
  executable: string;
  version: string;
  lockName: string;
  seedArgs: readonly string[];
}

const managerCases: readonly ManagerCase[] = [
  {
    manager: 'npm',
    label: 'npm 10.9.8',
    packageManager: 'npm@10.9.8',
    executableEnv: 'KERF_TEST_NPM_BIN',
    executable: 'npm',
    version: '10.9.8',
    lockName: 'package-lock.json',
    seedArgs: ['install', '--ignore-scripts'],
  },
  {
    manager: 'pnpm',
    label: 'pnpm 9.12.0',
    packageManager: 'pnpm@9.12.0',
    executableEnv: 'KERF_TEST_PNPM_BIN',
    executable: 'pnpm',
    version: '9.12.0',
    lockName: 'pnpm-lock.yaml',
    seedArgs: ['install', '--ignore-scripts'],
  },
  {
    manager: 'yarn',
    variant: 'classic',
    label: 'Yarn Classic 1.22.22',
    packageManager: 'yarn@1.22.22',
    executableEnv: 'KERF_TEST_YARN_CLASSIC_BIN',
    executable: 'yarn',
    version: '1.22.22',
    lockName: 'yarn.lock',
    seedArgs: ['install', '--ignore-scripts'],
  },
  {
    manager: 'yarn',
    variant: 'berry',
    label: 'Yarn Berry 4.6.0',
    packageManager: 'yarn@4.6.0',
    executableEnv: 'KERF_TEST_YARN_BERRY_BIN',
    executable: 'yarn',
    version: '4.6.0',
    lockName: 'yarn.lock',
    seedArgs: ['install', '--mode=skip-builds'],
  },
];

function detectManager(managerCase: ManagerCase): {
  executable?: string;
  reason?: string;
} {
  const requested =
    process.env[managerCase.executableEnv] ?? managerCase.executable;
  try {
    const executable = requested.startsWith('/')
      ? requested
      : execFileSync('which', [requested], { encoding: 'utf8' }).trim();
    const version = execFileSync(executable, ['--version'], {
      encoding: 'utf8',
    }).trim();
    if (version !== managerCase.version)
      return {
        reason: `requires ${managerCase.version}; detected ${version} at ${executable}`,
      };
    return { executable };
  } catch {
    return {
      reason: `requires ${managerCase.executableEnv} or ${managerCase.executable} on PATH`,
    };
  }
}

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

async function packStub(name: string, version: string) {
  const safeName = name.replaceAll('/', '-').replaceAll('@', '');
  const source = resolve(temporaryRoot, 'offline-stubs', safeName);
  const destination = resolve(temporaryRoot, 'offline-tarballs');
  await mkdir(source, { recursive: true });
  await mkdir(destination, { recursive: true });
  await writeFile(
    resolve(source, 'package.json'),
    `${JSON.stringify({ name, version })}\n`,
  );
  const { stdout } = await exec(
    'npm',
    ['pack', '--json', '--ignore-scripts', '--pack-destination', destination],
    {
      cwd: source,
      env: {
        ...process.env,
        HUSKY: '0',
        npm_config_cache: resolve(temporaryRoot, 'npm-cache'),
      },
    },
  );
  const [{ filename }] = JSON.parse(stdout.slice(stdout.indexOf('[\n')));
  return resolve(destination, filename);
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
    'minimatch',
    'yaml',
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
  offlineTarballs = Object.fromEntries(
    await Promise.all(
      [
        ['kerfjs', '4.4.1'],
        ['eslint-plugin-kerfjs', '4.4.1'],
        ['@typescript-eslint/parser', '8.0.0'],
        ['eslint', '9.0.0'],
        ['typescript', '5.0.0'],
      ].map(async ([name, version]) => [name, await packStub(name, version)]),
    ),
  );
  for (const name of [
    'eslint',
    'postcss',
    'typescript',
    'minimatch',
    'yaml',
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
    await writeFile(
      resolve(root, 'tsconfig.json'),
      `{
  // Packed consumers commonly start from JSONC.
  "compilerOptions": {
    "strict": true,
  },
  "include": ["src",],
}
`,
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
    const configuredTsconfig = await readFile(
      resolve(root, 'tsconfig.json'),
      'utf8',
    );
    expect(configuredTsconfig).toContain(
      '// Packed consumers commonly start from JSONC.',
    );
    expect(configuredTsconfig).toContain('"include": ["src",],');
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

  for (const managerCase of managerCases) {
    const availability = detectManager(managerCase);
    const test = availability.executable ? it : it.skip;
    test(`uses a real packed CLI with ${managerCase.label} local-artifact offline hit/miss rollback${availability.reason ? ` [skipped: ${availability.reason}]` : ''}`, async () => {
      const executable = availability.executable!;
      const manager = managerCase.manager;
      const packageManager = managerCase.packageManager;
      const manifest = {
        name: `${manager}-offline-consumer`,
        private: true,
        type: 'module',
        packageManager,
        dependencies: { kerfjs: '' },
        devDependencies: Object.fromEntries(
          Object.keys(offlinePackages)
            .filter((name) => name !== 'kerfjs')
            .map((name) => [name, '']),
        ),
      };
      const createCase = async (label: string, missing = false) => {
        const id = `${manager}-${managerCase.variant ?? 'default'}-${label}`;
        const root = resolve(temporaryRoot, id);
        const artifacts = resolve(root, 'artifacts');
        await mkdir(artifacts, { recursive: true });
        const localTarballs: Record<string, string> = {};
        for (const [name, source] of Object.entries(offlineTarballs)) {
          const destination = resolve(
            artifacts,
            `${name.replaceAll('/', '-').replaceAll('@', '')}.tgz`,
          );
          await copyFile(source, destination);
          localTarballs[name] = destination;
        }
        manifest.dependencies.kerfjs = `file:${localTarballs.kerfjs}`;
        manifest.devDependencies = Object.fromEntries(
          Object.keys(offlinePackages)
            .filter((name) => name !== 'kerfjs')
            .map((name) => [name, `file:${localTarballs[name]}`]),
        );
        await writeFile(
          resolve(root, 'package.json'),
          `${JSON.stringify(manifest)}\n`,
        );
        if (managerCase.variant === 'berry')
          await writeFile(
            resolve(root, '.yarnrc.yml'),
            'enableGlobalCache: false\nenableNetwork: false\nnodeLinker: node-modules\n',
          );
        const bin = resolve(root, '.manager-bin');
        await mkdir(bin);
        const wrapper = resolve(bin, manager);
        await writeFile(
          wrapper,
          `#!/bin/sh\nexec ${JSON.stringify(executable)} "$@"\n`,
        );
        await chmod(wrapper, 0o755);
        const environment = {
          ...process.env,
          PATH: `${bin}:${process.env.PATH ?? ''}`,
          npm_config_cache: resolve(root, '.npm-cache'),
          npm_config_registry: 'http://127.0.0.1:9',
          npm_config_store_dir: resolve(root, '.pnpm-store'),
          YARN_CACHE_FOLDER: resolve(root, '.yarn-classic-cache'),
          YARN_REGISTRY: 'http://127.0.0.1:9',
          YARN_ENABLE_NETWORK: '0',
        };
        await exec(executable, [...managerCase.seedArgs], {
          cwd: root,
          env: environment,
        });
        await rm(resolve(root, 'node_modules'), {
          recursive: true,
          force: true,
        });
        if (missing) {
          await rm(localTarballs.kerfjs);
          await rm(resolve(root, '.npm-cache'), {
            recursive: true,
            force: true,
          });
          await rm(resolve(root, '.pnpm-store'), {
            recursive: true,
            force: true,
          });
          await rm(resolve(root, '.yarn-classic-cache'), {
            recursive: true,
            force: true,
          });
          await rm(resolve(root, '.yarn/cache'), {
            recursive: true,
            force: true,
          });
        }
        return { environment, root };
      };
      const resolutionArgs = [
        'package.json#dependencies.kerfjs',
        ...Object.keys(offlinePackages)
          .filter((name) => name !== 'kerfjs')
          .map((name) => `package.json#devDependencies.${name}`),
      ].flatMap((id) => ['--resolve', `${id}=keep`]);
      const hit = await createCase('hit');
      await exec(
        resolve(packedModules, 'kerfjs/setup/cli.mjs'),
        ['--core', ...resolutionArgs, '--offline', '--write', '--yes'],
        { cwd: hit.root, env: hit.environment },
      );
      expect(
        JSON.parse(
          await readFile(resolve(hit.root, '.kerf-ai-setup.json'), 'utf8'),
        ).packageManager,
      ).toBe(manager);

      const miss = await createCase('miss', true);
      const originalManifest = await readFile(
        resolve(miss.root, 'package.json'),
        'utf8',
      );
      const originalLock = await readFile(
        resolve(miss.root, managerCase.lockName),
        'utf8',
      );
      await expect(
        exec(
          resolve(packedModules, 'kerfjs/setup/cli.mjs'),
          ['--core', ...resolutionArgs, '--offline', '--write', '--yes'],
          {
            cwd: miss.root,
            env: miss.environment,
          },
        ),
      ).rejects.toThrow();
      expect(await readFile(resolve(miss.root, 'package.json'), 'utf8')).toBe(
        originalManifest,
      );
      expect(
        await readFile(resolve(miss.root, managerCase.lockName), 'utf8'),
      ).toBe(originalLock);
      await expect(
        readFile(resolve(miss.root, '.kerf-ai-setup.json')),
      ).rejects.toThrow();
      expect(await readdir(miss.root)).not.toContain('.kerf-ai-setup.lock');
      expect(
        (await readdir(miss.root)).some((name) =>
          name.includes('.kerf-setup-'),
        ),
      ).toBe(false);
    }, 60_000);
  }
});
