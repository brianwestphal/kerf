import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { expect, test } from 'vitest';

const execFileAsync = promisify(execFile);
const uiRoot = resolve(import.meta.dirname, '../..');
const repositoryRoot = resolve(uiRoot, '..');

async function link(directory: string, name: string, target: string) {
  const path = resolve(directory, 'node_modules', ...name.split('/'));
  await mkdir(dirname(path), { recursive: true });
  await symlink(target, path, 'dir');
}

async function doctor(root: string) {
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        resolve(uiRoot, 'doctor/cli.mjs'),
        '--root',
        root,
        '--format',
        'json',
        '--no-cache',
      ],
      { cwd: root },
    );
    return { status: 0, report: JSON.parse(stdout) };
  } catch (error) {
    const failure = error as { code: number; stdout: string; stderr: string };
    if (!failure.stdout) throw error;
    return { status: failure.code, report: JSON.parse(failure.stdout) };
  }
}

test('a downstream app moves from broken to clean using the supported doctor loop', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-downstream-'));
  try {
    await mkdir(resolve(root, 'src'), { recursive: true });
    await writeFile(
      resolve(root, 'package.json'),
      '{"name":"doctor-consumer","private":true,"type":"module","kerfComponentCatalog":{"source":"kerf.components.json","output":"component-catalog-v2.json"}}\n',
    );
    await writeFile(
      resolve(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          allowJs: true,
          checkJs: true,
          noEmit: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          target: 'es2022',
        },
        include: ['src'],
      }),
    );
    await writeFile(
      resolve(root, 'src/view.js'),
      'export const value = missingName;\n',
    );
    await writeFile(
      resolve(root, 'src/view.css'),
      '.view { color: var(--kui-not-public); }\n',
    );
    await writeFile(
      resolve(root, 'kerf.components.json'),
      '{"schemaVersion":1,"components":"not-an-array"}\n',
    );
    await writeFile(
      resolve(root, '.kerf-ui-profile.json'),
      JSON.stringify({
        schemaVersion: 1,
        scope: 'directory',
        exceptions: [
          {
            id: 'load-contract',
            rules: ['KUI-L090'],
            target: 'src/view.js',
            rationale: 'Exercise the stable ESLint load diagnostic.',
          },
        ],
      }),
    );
    await link(root, 'typescript', resolve(uiRoot, 'node_modules/typescript'));
    await link(root, 'eslint', resolve(uiRoot, 'node_modules/eslint'));
    await link(
      root,
      'eslint-plugin-kerfjs',
      resolve(repositoryRoot, 'eslint-plugin'),
    );
    await link(
      root,
      'create-kerf-component',
      resolve(repositoryRoot, 'create-kerf-component'),
    );
    await link(root, '@kerfjs/ui', uiRoot);

    const broken = await doctor(root);
    expect(broken.status).toBe(1);
    expect(
      broken.report.diagnostics.map((item: { id: string }) => item.id),
    ).toEqual(
      expect.arrayContaining(['TS2304', 'KUI-L002', 'KUI-L090', 'KUI-D020']),
    );
    for (const id of ['KUI-L002', 'KUI-L090', 'KUI-D020'])
      expect(
        broken.report.diagnostics.find((item: { id: string }) => item.id === id)
          ?.documentation,
      ).toBeTruthy();
    expect(
      broken.report.diagnostics.some(
        (item: { id: string }) => item.id === 'KUI-P022',
      ),
    ).toBe(false);
    expect(JSON.stringify(broken.report)).not.toContain(root);

    await writeFile(
      resolve(root, 'package.json'),
      '{"name":"doctor-consumer","private":true,"type":"module"}\n',
    );
    await writeFile(resolve(root, 'src/view.js'), 'export const value = 1;\n');
    await writeFile(
      resolve(root, 'src/view.css'),
      '.view { color: inherit; }\n',
    );
    await rm(resolve(root, '.kerf-ui-profile.json'));
    const clean = await doctor(root);
    expect(clean.status).toBe(0);
    expect(clean.report.summary.errors).toBe(0);
    expect(
      clean.report.diagnostics.some(
        (item: { id: string }) => item.id === 'KUI-L090',
      ),
    ).toBe(false);
    expect(
      clean.report.stages
        .filter((item: { status: string }) => item.status === 'ran')
        .map((item: { id: string }) => item.id),
    ).toEqual(['analyzer', 'catalog', 'eslint', 'typescript']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
