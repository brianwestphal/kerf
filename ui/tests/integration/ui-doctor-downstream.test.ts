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

// Each case spawns the doctor (a full TypeScript program) and ESLint more than
// once. ~5s per case unloaded, but under a loaded full-suite run it measured
// ~28s against the old 30s budget, so it flaked. 60s keeps a real ceiling.
const DOCTOR_TEST_TIMEOUT = 60_000;

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

async function lintTypeScriptFixture(root: string) {
  return execFileAsync(
    process.execPath,
    [resolve(uiRoot, 'node_modules/eslint/bin/eslint.js'), 'src/model.ts'],
    { cwd: root },
  );
}

test(
  'a downstream app moves from broken to clean using the supported doctor loop',
  async () => {
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
          include: ['**/*'],
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
        resolve(root, 'src/model.ts'),
        '// eslint-disable-next-line @typescript-eslint/no-empty-object-type\n' +
          'export interface Model {}\n',
      );
      await writeFile(
        resolve(root, 'eslint.config.js'),
        [
          "import tseslint from '@typescript-eslint/eslint-plugin';",
          "import tsParser from '@typescript-eslint/parser';",
          'export default [{',
          "  files: ['**/*.ts'],",
          "  plugins: { '@typescript-eslint': tseslint },",
          '  languageOptions: { parser: tsParser },',
          "  rules: { '@typescript-eslint/no-empty-object-type': 'error' },",
          '}];',
          '',
        ].join('\n'),
      );
      await writeFile(
        resolve(root, 'kerf.components.json'),
        '{"schemaVersion":1,"components":"not-an-array"}\n',
      );
      await mkdir(resolve(root, '.claude/worktrees/generated/src'), {
        recursive: true,
      });
      await writeFile(
        resolve(root, '.claude/worktrees/generated/src/copied.tsx'),
        'export const copied = missingFromGeneratedCheckout;\n',
      );
      await writeFile(
        resolve(root, '.claude/worktrees/generated/src/copied.css'),
        '.copied { color: var(--kui-not-public); padding: 7px; }\n',
      );
      for (const [directory, token] of [
        ['dist/client', '--kui-toolbar-text-max-lines'],
        ['coverage/unit/lcov-report', '--kui-catalog-example-align'],
      ]) {
        await mkdir(resolve(root, directory), { recursive: true });
        await writeFile(
          resolve(root, directory, 'generated.global.js'),
          `export const generatedStyle = ${JSON.stringify(token)};\nexport const brokenGeneratedReference = missingGeneratedName;\n`,
        );
      }
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
      await link(
        root,
        'typescript',
        resolve(uiRoot, 'node_modules/typescript'),
      );
      await link(root, 'eslint', resolve(uiRoot, 'node_modules/eslint'));
      await link(
        root,
        '@typescript-eslint/eslint-plugin',
        resolve(uiRoot, 'node_modules/@typescript-eslint/eslint-plugin'),
      );
      await link(
        root,
        '@typescript-eslint/parser',
        resolve(uiRoot, 'node_modules/@typescript-eslint/parser'),
      );
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

      // ESLint and the doctor only read the fixture, so run them concurrently;
      // each spawns a TypeScript program and they dominated the wall time.
      const [lintBefore, broken] = await Promise.all([
        lintTypeScriptFixture(root),
        doctor(root),
      ]);
      expect(lintBefore).toMatchObject({ stderr: '' });
      expect(broken.status).toBe(1);
      expect(
        broken.report.diagnostics.map((item: { id: string }) => item.id),
      ).toEqual(
        expect.arrayContaining(['TS2304', 'KUI-L002', 'KUI-L090', 'KUI-D020']),
      );
      for (const id of ['KUI-L002', 'KUI-L090', 'KUI-D020'])
        expect(
          broken.report.diagnostics.find(
            (item: { id: string }) => item.id === id,
          )?.documentation,
        ).toBeTruthy();
      expect(
        broken.report.diagnostics.some(
          (item: { id: string }) => item.id === 'KUI-P022',
        ),
      ).toBe(false);
      expect(
        broken.report.diagnostics.some(
          (item: { id: string }) =>
            item.id === 'eslint:@typescript-eslint/no-empty-object-type',
        ),
      ).toBe(false);
      expect(JSON.stringify(broken.report)).not.toContain(root);
      expect(JSON.stringify(broken.report)).not.toContain('.claude/worktrees');
      expect(JSON.stringify(broken.report)).not.toContain(
        'generated.global.js',
      );
      expect(JSON.stringify(broken.report)).not.toContain(
        '--kui-toolbar-text-max-lines',
      );
      expect(JSON.stringify(broken.report)).not.toContain(
        '--kui-catalog-example-align',
      );

      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"doctor-consumer","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, 'src/view.js'),
        'export const value = 1;\n',
      );
      await writeFile(
        resolve(root, 'src/view.css'),
        '.details-scope { --kui-wa-surface-margin: 0.75rem; --kui-wa-surface-inset: 0.75rem; }\n',
      );
      await rm(resolve(root, '.kerf-ui-profile.json'));
      const [clean, lintAfter] = await Promise.all([
        doctor(root),
        lintTypeScriptFixture(root),
      ]);
      expect(clean.status).toBe(0);
      expect(clean.report.summary.errors).toBe(0);
      expect(lintAfter).toMatchObject({ stderr: '' });
      expect(JSON.stringify(clean.report)).not.toContain('.claude/worktrees');
      expect(JSON.stringify(clean.report)).not.toContain('generated.global.js');
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
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'doctor surfaces catalog-driven CSS value diagnostics for downstream JSX',
  async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-values-'));
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"doctor-values","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            allowJs: true,
            checkJs: true,
            jsx: 'preserve',
            noEmit: true,
            module: 'esnext',
            moduleResolution: 'bundler',
            target: 'es2022',
          },
          include: ['src/**/*'],
        }),
      );
      await writeFile(
        resolve(root, 'src/app.jsx'),
        `import { List } from '@kerfjs/ui'; export const App = () => <List gap="17px" />;\n`,
      );
      await link(
        root,
        'typescript',
        resolve(uiRoot, 'node_modules/typescript'),
      );
      await link(root, 'eslint', resolve(uiRoot, 'node_modules/eslint'));
      await link(
        root,
        'eslint-plugin-kerfjs',
        resolve(repositoryRoot, 'eslint-plugin'),
      );
      await link(root, '@kerfjs/ui', uiRoot);

      const report = await doctor(root);
      expect(report.status).toBe(1);
      expect(report.report.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'KUI-L013',
            message: expect.stringContaining('`List.gap`'),
            documentation: expect.any(String),
          }),
        ]),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);
