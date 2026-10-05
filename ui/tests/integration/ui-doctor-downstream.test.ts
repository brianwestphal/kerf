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

async function doctor(root: string, args: string[] = []) {
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
        ...args,
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
        '{"name":"doctor-consumer","private":true,"type":"module","kerfComponentCatalog":{"source":"kerf.components.json","output":"component-composition.json"}}\n',
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
        '.view { color: var(--kui-not-public); }\n' +
          '.ticket-inspector__tabs .kui-app-tab__select > svg { width: 0.9rem; }\n',
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
        expect.arrayContaining([
          'TS2304',
          'KUI-L002',
          'KUI-L019',
          'KUI-L090',
          'KUI-D020',
        ]),
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

      await writeFile(
        resolve(root, 'src/view.css'),
        '.theme { --wa-color-brand-fill-loud: #ffffff; --wa-color-brand-on-loud: #ffffff; }\n',
      );
      // The repair loop above exercised every stage. Threshold checks need a
      // real analyzer finding, without rebuilding TypeScript and ESLint four
      // more times inside this one integration case.
      const reviewStages = {
        catalog: false,
        typescript: false,
        eslint: false,
        analyzer: true,
        browser: false,
      };
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({ schemaVersion: 1, stages: reviewStages }),
      );
      const defaultReview = await doctor(root);
      expect(defaultReview.status).toBe(0);
      expect(defaultReview.report.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'KUI-L018', severity: 'review' }),
        ]),
      );
      const strictReview = await doctor(root, ['--fail-on', 'review']);
      expect(strictReview.status).toBe(1);
      expect(strictReview.report.exitCode).toBe(1);
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          stages: reviewStages,
          failOn: 'review',
        }),
      );
      expect((await doctor(root)).status).toBe(1);
      expect((await doctor(root, ['--fail-on', 'error'])).status).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor detects a styled hook on an application component imported through a TS path alias',
  async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-alias-'));
    try {
      await mkdir(resolve(root, 'src/components'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        JSON.stringify({ name: 'app' }),
      );
      await writeFile(
        resolve(root, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            module: 'esnext',
            moduleResolution: 'bundler',
            baseUrl: '.',
            paths: { '@app/*': ['src/*'] },
          },
        }),
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          ownership: 'component',
          stages: { catalog: false, typescript: false, eslint: false },
        }),
      );
      await writeFile(
        resolve(root, '.kerf-ui-profile.json'),
        JSON.stringify({
          schemaVersion: 1,
          scope: 'workspace',
          catalogs: [
            {
              package: 'app',
              composition: { path: './composition.json', schemaVersion: 2 },
              selection: { path: './selection.json', schemaVersion: 1 },
            },
          ],
        }),
      );
      await writeFile(
        resolve(root, 'composition.json'),
        JSON.stringify({
          schemaVersion: 2,
          package: 'app',
          entries: [
            {
              key: 'app:search',
              package: 'app',
              id: 'search',
              name: 'Search',
              kind: 'component',
              source: 'application',
              boundaries: {
                rootClass: 'search',
                publicClasses: ['search'],
                publicTokens: [],
              },
            },
          ],
        }),
      );
      await writeFile(
        resolve(root, 'selection.json'),
        JSON.stringify({
          schemaVersion: 1,
          package: 'app',
          entries: [
            {
              id: 'search',
              source: 'src/components/search.tsx',
              styleSources: ['src/components/search.css'],
            },
          ],
        }),
      );
      await writeFile(
        resolve(root, 'src/components/search.tsx'),
        'export const Search = () => <div class="search" />;\n',
      );
      await writeFile(
        resolve(root, 'src/components/search.css'),
        '.search { color: blue; }\n',
      );
      await writeFile(
        resolve(root, 'src/header.css'),
        '.hook { color: red; }\n',
      );
      await writeFile(
        resolve(root, 'src/header.tsx'),
        "import './header.css';\nimport { Search } from '@app/components/search';\nexport const Header = () => <Search className=\"hook\" />;\n",
      );

      const broken = await doctor(root);
      expect(broken.status).toBe(1);
      expect(broken.report.diagnostics).toMatchObject([{ id: 'KUI-L022' }]);
      expect(broken.report.diagnostics[0].evidence).toMatchObject({
        component: 'app:search',
        className: 'hook',
      });

      await writeFile(
        resolve(root, 'src/header.tsx'),
        "import './header.css';\nimport { Search } from '@app/components/search';\nexport const Header = () => <div class=\"hook\"><Search /></div>;\n",
      );
      const clean = await doctor(root);
      expect(clean.status).toBe(0);
      expect(clean.report.diagnostics).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor opts into ownership between cataloged components in one package',
  async () => {
    const root = await mkdtemp(
      resolve(tmpdir(), 'kerf-ui-doctor-component-ownership-'),
    );
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        JSON.stringify({ name: 'app' }),
      );
      await writeFile(
        resolve(root, '.kerf-ui-profile.json'),
        JSON.stringify({
          schemaVersion: 1,
          scope: 'workspace',
          catalogs: [
            {
              package: 'app',
              composition: { path: './composition.json', schemaVersion: 2 },
              selection: { path: './selection.json', schemaVersion: 1 },
            },
          ],
        }),
      );
      await writeFile(
        resolve(root, 'composition.json'),
        JSON.stringify({
          schemaVersion: 2,
          package: 'app',
          entries: ['search', 'sort'].map((id) => ({
            key: `app:${id}`,
            package: 'app',
            id,
            name: id,
            kind: 'component',
            source: 'application',
            boundaries: {
              rootClass: id,
              publicClasses: [id],
              publicTokens: [],
            },
          })),
        }),
      );
      await writeFile(
        resolve(root, 'selection.json'),
        JSON.stringify({
          schemaVersion: 1,
          package: 'app',
          entries: ['search', 'sort'].map((id) => ({
            id,
            source: `src/${id}.tsx`,
            styleSources: [`src/${id}.css`],
          })),
        }),
      );
      await writeFile(
        resolve(root, 'src/search.css'),
        '.search { color: blue; }\n.sort { color: red; }\n',
      );
      await writeFile(
        resolve(root, 'src/sort.css'),
        '.sort { color: blue; }\n',
      );
      const config = {
        schemaVersion: 1,
        stages: { catalog: false, typescript: false, eslint: false },
      };
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify(config),
      );
      expect((await doctor(root)).status).toBe(0);
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({ ...config, ownership: 'component' }),
      );
      const result = await doctor(root);
      expect(result.status).toBe(1);
      expect(
        result.report.diagnostics.filter(
          (item: { id: string }) => item.id === 'KUI-L019',
        ),
      ).toMatchObject([{ location: { file: 'src/search.css', line: 2 } }]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'doctor reports a composed SVG child and sibling root from selection sources',
  async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-elements-'));
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      const files: Record<string, string> = {
        'package.json': JSON.stringify({ name: 'app' }),
        '.kerf-ui-doctor.json': JSON.stringify({
          schemaVersion: 1,
          ownership: 'component',
          stages: { catalog: false, typescript: false, eslint: false },
        }),
        '.kerf-ui-profile.json': JSON.stringify({
          schemaVersion: 1,
          scope: 'workspace',
          catalogs: [
            {
              package: 'app',
              composition: { path: './composition.json', schemaVersion: 2 },
              selection: { path: './selection.json', schemaVersion: 1 },
            },
          ],
        }),
        'composition.json': JSON.stringify({
          schemaVersion: 2,
          package: 'app',
          entries: [],
        }),
        'selection.json': JSON.stringify({
          schemaVersion: 1,
          package: 'app',
          entries: [
            { id: 'rail', name: 'Rail', source: 'src/rail.tsx' },
            { id: 'search', name: 'Search', source: 'src/search.tsx' },
          ],
        }),
        'src/rail.tsx':
          "import './rail.css';\nimport { LoadingSpinner } from '@kerfjs/ui/loading-spinner';\nexport const Rail = () => <div class=\"active-claim-spinner kui-toolbar\"><LoadingSpinner /></div>;\n",
        'src/rail.css':
          '.active-claim-spinner > svg { color: red; }\n.ticket-search-field svg { color: red; }\n.ticket-search-field .rail { color: red; }\n.kui-toolbar .rail { color: red; }\n[data-component="toolbar"] .rail { color: red; }\n',
        'src/search.tsx':
          'import \'./search.css\';\nexport const Search = () => <div class="ticket-search-field" />;\n',
        'src/search.css': '.ticket-search-field { color: blue; }\n',
      };
      for (const [path, value] of Object.entries(files))
        await writeFile(resolve(root, path), value);
      const result = await doctor(root);
      expect(result.status).toBe(1);
      expect(
        result.report.diagnostics
          .filter((item: { id: string }) => item.id === 'KUI-L019')
          .map(
            (item: { location: { file: string; line: number } }) =>
              `${item.location.file}:${item.location.line}`,
          ),
      ).toEqual(['src/rail.css:1', 'src/rail.css:2']);
      expect(result.report.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'KUI-L023',
            evidence: expect.objectContaining({ className: 'kui-toolbar' }),
          }),
        ]),
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          ownership: 'component',
          ownershipContext: 'any',
          stages: { catalog: false, typescript: false, eslint: false },
        }),
      );
      const strict = await doctor(root);
      expect(
        strict.report.diagnostics
          .filter((item: { id: string }) => item.id === 'KUI-L019')
          .map(
            (item: {
              location: { line: number };
              evidence: { position?: string };
            }) =>
              `${item.location.line}:${item.evidence.position ?? 'subject'}`,
          ),
      ).toEqual(['1:subject', '2:subject', '3:ancestor']);
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          ownership: 'component',
          ownershipContext: 'any-package',
          stages: { catalog: false, typescript: false, eslint: false },
        }),
      );
      const crossPackage = await doctor(root);
      expect(
        crossPackage.report.diagnostics
          .filter((item: { id: string }) => item.id === 'KUI-L019')
          .map(
            (item: {
              location: { line: number };
              evidence: { position?: string; via?: string };
            }) =>
              `${item.location.line}:${item.evidence.position ?? 'subject'}:${item.evidence.via ?? 'subject'}`,
          ),
      ).toEqual([
        '1:subject:descendant',
        '2:subject:descendant',
        '3:ancestor:context',
        '4:ancestor:context',
        '5:ancestor:context',
      ]);
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

test(
  'the doctor accepts ToolbarControlGroup in Toolbar and FloatingToolbar',
  async () => {
    const root = await mkdtemp(
      resolve(tmpdir(), 'kerf-ui-doctor-toolbar-link-'),
    );
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"toolbar-link-consumer","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            jsx: 'react-jsx',
            jsxImportSource: 'kerfjs',
            noEmit: true,
            module: 'esnext',
            moduleResolution: 'bundler',
            target: 'es2022',
            skipLibCheck: true,
          },
          include: ['src'],
        }),
      );
      await writeFile(
        resolve(root, 'src/view.tsx'),
        [
          "import { Toolbar } from '@kerfjs/ui/toolbar';",
          "import { FloatingToolbar } from '@kerfjs/ui/floating-toolbar';",
          "import { ToolbarControlGroup, ToolbarActionLink } from '@kerfjs/ui/toolbar-control-group';",
          'export const view = () => (',
          '  <>',
          '  <Toolbar label="Report" trailing={',
          '    <ToolbarControlGroup label="Actions">',
          '      <ToolbarActionLink href="/report" label="Report" />',
          '    </ToolbarControlGroup>',
          '  } />',
          '  <FloatingToolbar label="Report tools">',
          '    <ToolbarControlGroup label="Actions" single>',
          '      <button type="button" aria-label="Restore report">Restore</button>',
          '    </ToolbarControlGroup>',
          '  </FloatingToolbar>',
          '  <FloatingToolbar label="Inline report tools" placement="inline">',
          '    <ToolbarControlGroup label="Actions" single>',
          '      <button type="button" aria-label="Open report">Open</button>',
          '    </ToolbarControlGroup>',
          '  </FloatingToolbar>',
          '  </>',
          ');',
          '',
        ].join('\n'),
      );
      for (const name of ['typescript', 'eslint', 'kerfjs'])
        await link(root, name, resolve(uiRoot, 'node_modules', name));
      for (const name of [
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
      ])
        await link(root, name, resolve(uiRoot, 'node_modules', name));
      await link(
        root,
        'eslint-plugin-kerfjs',
        resolve(repositoryRoot, 'eslint-plugin'),
      );
      await link(root, '@kerfjs/ui', uiRoot);

      const result = await doctor(root);
      expect(result.report.diagnostics).toEqual([]);
      expect(result.status).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor accepts an app wrapper that declares the cataloged root it renders',
  async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-renders-as-'));
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        JSON.stringify({
          name: 'karwan-app',
          private: true,
          type: 'module',
          exports: {
            './demand-segments-control': './dist/demand-segments-control.js',
          },
          kerfComponentCatalog: {
            source: 'kerf.components.json',
            output: 'component-composition.json',
          },
        }),
      );
      await writeFile(
        resolve(root, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            jsx: 'react-jsx',
            jsxImportSource: 'kerfjs',
            strict: true,
            noEmit: true,
            module: 'esnext',
            moduleResolution: 'bundler',
            target: 'es2022',
            skipLibCheck: true,
          },
          include: ['src'],
        }),
      );
      // The app owns the wrapper's visibility; it renders a ToolbarControlGroup
      // or nothing.
      await writeFile(
        resolve(root, 'src/demand-segments-control.tsx'),
        [
          "import { SegmentedControl } from '@kerfjs/ui/segmented-control';",
          "import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';",
          '',
          'export function DemandSegmentsControl({ visible }: { visible: boolean }) {',
          '  if (!visible) return <></>;',
          '  return (',
          '    <ToolbarControlGroup label="Demand segments">',
          '      <SegmentedControl',
          '        id="demand"',
          '        label="Demand"',
          '        value="all"',
          "        choices={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }]}",
          '      />',
          '    </ToolbarControlGroup>',
          '  );',
          '}',
          '',
        ].join('\n'),
      );
      await writeFile(
        resolve(root, 'src/view.tsx'),
        [
          "import { Toolbar } from '@kerfjs/ui/toolbar';",
          "import { ToolbarText } from '@kerfjs/ui/toolbar-text';",
          '',
          "import { DemandSegmentsControl } from './demand-segments-control.js';",
          '',
          'export const view = () => (',
          '  <Toolbar',
          '    label="Demand"',
          '    leading={<ToolbarText text="Demand" size="xlarge" />}',
          '    trailing={<DemandSegmentsControl visible />}',
          '  />',
          ');',
          '',
        ].join('\n'),
      );
      const component = (rendersAs?: string[]) => ({
        id: 'demand-segments-control',
        name: 'DemandSegmentsControl',
        kind: 'component',
        purpose:
          'Toolbar control group that switches demand segments; renders nothing while hidden.',
        source: 'src/demand-segments-control.tsx',
        publicExports: [
          {
            name: 'DemandSegmentsControl',
            subpath: './demand-segments-control',
          },
        ],
        sourceLinks: ['src/demand-segments-control.tsx'],
        composition: {
          ...(rendersAs ? { rendersAs } : {}),
          parents: { mode: 'any', entries: [] },
          contexts: ['toolbar-controls'],
          zones: [],
          children: { mode: 'none', concepts: [], requiredConcepts: [] },
          state: [],
          wiring: { required: false, helpers: [], obligations: [] },
          responsive: { owner: 'not-applicable', behaviors: [] },
          layout: {
            roles: ['controls'],
            geometry: { margin: 'none', border: 'none', padding: 'none' },
          },
        },
        // The root element is @kerfjs/ui's; the wrapper owns no root class.
        boundaries: { rootClass: null, publicClasses: [], publicTokens: [] },
        accessibility: {
          obligations: ['The segmented control keeps its label.'],
        },
        diagnostics: [],
        provenance: {
          selection: 'src/demand-segments-control.tsx',
          composition: 'src/demand-segments-control.tsx',
        },
      });
      const writeManifest = (rendersAs?: string[]) =>
        writeFile(
          resolve(root, 'kerf.components.json'),
          JSON.stringify({
            schemaVersion: 1,
            componentCatalog: 'not-applicable',
            components: [component(rendersAs)],
          }),
        );
      const generate = () =>
        execFileAsync(
          process.execPath,
          [
            resolve(repositoryRoot, 'create-kerf-component/catalog.js'),
            '--write',
          ],
          { cwd: root },
        );
      await writeFile(
        resolve(root, '.kerf-ui-profile.json'),
        JSON.stringify({
          schemaVersion: 1,
          scope: 'workspace',
          catalogs: [
            {
              package: 'karwan-app',
              composition: {
                path: './component-composition.json',
                schemaVersion: 1,
              },
            },
          ],
        }),
      );
      for (const name of ['typescript', 'eslint', 'kerfjs'])
        await link(root, name, resolve(uiRoot, 'node_modules', name));
      for (const name of [
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
      ])
        await link(root, name, resolve(uiRoot, 'node_modules', name));
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
      const ids = (report: { diagnostics: Array<{ id: string }> }) =>
        report.diagnostics.map((item) => item.id);

      // Declared: the wrapper counts as the ToolbarControlGroup it renders.
      await writeManifest(['@kerfjs/ui:toolbar-control-group']);
      await generate();
      const declared = await doctor(root);
      expect(ids(declared.report)).toEqual([]);
      expect(declared.status).toBe(0);

      // Undeclared: the same wrapper is an unknown child of trailing.
      await writeManifest();
      await generate();
      const undeclared = await doctor(root);
      expect(ids(undeclared.report)).toEqual(['KUI-L202']);
      expect(undeclared.status).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT * 2,
);

test(
  'the doctor routes component-ownership overrides to configuration, then passes',
  async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-ownership-'));
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"ownership-consumer","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          stages: { catalog: false, typescript: false, eslint: false },
        }),
      );
      await writeFile(
        resolve(root, 'src/app.css'),
        '.kui-toolbar { padding: 0; }\n.header { background: red; }\n.app { --_kui-list-gap: 0; --kui-list-gap: 4px; }\n',
      );
      await writeFile(
        resolve(root, 'src/app.tsx'),
        "import './app.css';\nimport { Toolbar } from '@kerfjs/ui/toolbar';\nexport const App = () => <Toolbar className=\"header\" />;\n",
      );
      const broken = await doctor(root);
      expect(broken.status).toBe(1);
      const findings = broken.report.diagnostics.filter(
        (item: { stage: string }) => item.stage === 'analyzer',
      );
      expect(findings.map((item: { id: string }) => item.id).sort()).toEqual([
        'KUI-L019',
        'KUI-L020',
        'KUI-L021',
        'KUI-L022',
      ]);
      for (const item of findings) {
        expect(item.documentation).toBe('@kerfjs/ui/docs/ui-analyzer.md');
        expect(item.message).toContain('report the component gap');
        expect(item.action).toMatch(/typed prop/);
      }

      // Configure the component and style an application-owned wrapper.
      await writeFile(
        resolve(root, 'src/app.css'),
        '.header > .title-slot { margin-inline-start: auto; }\n.header { background: red; }\n',
      );
      await writeFile(
        resolve(root, 'src/app.tsx'),
        "import './app.css';\nimport { List } from '@kerfjs/ui/list';\nimport { Toolbar } from '@kerfjs/ui/toolbar';\nexport const App = () => <div class=\"header\"><Toolbar /><List gap=\"xs\" /></div>;\n",
      );
      const clean = await doctor(root);
      expect(
        clean.report.diagnostics.filter(
          (item: { stage: string }) => item.stage === 'analyzer',
        ),
      ).toEqual([]);
      expect(clean.status).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor reports an application hook on a component nested in JSX props',
  async () => {
    const root = await mkdtemp(
      resolve(tmpdir(), 'kerf-ui-doctor-nested-hook-'),
    );
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"app","type":"module"}\n',
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          ownership: 'component',
          stages: { catalog: false, typescript: false, eslint: false },
        }),
      );
      await writeFile(
        resolve(root, '.kerf-ui-profile.json'),
        JSON.stringify({
          schemaVersion: 1,
          scope: 'workspace',
          catalogs: [
            {
              package: 'app',
              composition: { path: './composition.json', schemaVersion: 2 },
              selection: { path: './selection.json', schemaVersion: 1 },
            },
          ],
        }),
      );
      await writeFile(
        resolve(root, 'composition.json'),
        JSON.stringify({
          schemaVersion: 2,
          package: 'app',
          entries: [
            {
              key: 'app:popover',
              package: 'app',
              id: 'popover',
              name: 'Popover',
              kind: 'component',
              source: 'application',
              boundaries: {
                rootClass: 'popover',
                publicClasses: ['popover'],
                publicTokens: [],
              },
            },
          ],
        }),
      );
      await writeFile(
        resolve(root, 'selection.json'),
        JSON.stringify({
          schemaVersion: 1,
          package: 'app',
          entries: [
            {
              id: 'popover',
              source: 'src/popover.tsx',
              styleSources: ['src/popover.css'],
            },
          ],
        }),
      );
      await writeFile(
        resolve(root, 'src/popover.css'),
        '.popover { display: grid; }\n.popover[data-state="clean"] .popover__icon { background: red; }\n',
      );
      await writeFile(
        resolve(root, 'src/popover.tsx'),
        'import \'./popover.css\';\nimport { Toolbar } from \'@kerfjs/ui/toolbar\';\nimport { ToolbarControlGroup } from \'@kerfjs/ui/toolbar-control-group\';\nexport const Popover = () => <div class="popover" data-state="clean"><Toolbar leading={<ToolbarControlGroup single className="popover__icon" />} /></div>;\n',
      );
      const result = await doctor(root);
      expect(result.status).toBe(1);
      expect(result.report.diagnostics).toMatchObject([
        {
          id: 'KUI-L022',
          stage: 'analyzer',
          evidence: {
            component: '@kerfjs/ui:toolbar-control-group',
            className: 'popover__icon',
            stylesheet: 'src/popover.css',
          },
        },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor accepts co-owned markup from shared stylesheet importers',
  async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-coowners-'));
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"coowner-consumer","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          ownership: 'component',
          implicitComponentOwnership: true,
          stages: { catalog: false, typescript: false, eslint: false },
        }),
      );
      await writeFile(
        resolve(root, 'src/shared.css'),
        '.shared { color: blue; }\n',
      );
      await writeFile(
        resolve(root, 'src/a.tsx'),
        "import './shared.css'; export const A = () => <div class='shared' />;\n",
      );
      await writeFile(
        resolve(root, 'src/b.tsx'),
        "import './shared.css'; export const B = () => <div class='shared' />;\n",
      );
      const clean = await doctor(root);
      expect(clean.status).toBe(0);
      expect(clean.report.diagnostics).toEqual([]);

      await writeFile(
        resolve(root, 'src/outsider.tsx'),
        "export const Outsider = () => <div class='shared' />;\n",
      );
      const borrowed = await doctor(root);
      expect(borrowed.status).toBe(1);
      expect(
        borrowed.report.diagnostics.map((item: { id: string }) => item.id),
      ).toEqual(['KUI-L023', 'KUI-L023']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor attributes unknown SVG child tags only through the LucideIcon root marker',
  async () => {
    const root = await mkdtemp(
      resolve(tmpdir(), 'kerf-ui-doctor-custom-icon-'),
    );
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"custom-icon-consumer","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          ownership: 'component',
          implicitComponentOwnership: true,
          stages: { catalog: false, typescript: false, eslint: false },
        }),
      );
      await writeFile(
        resolve(root, 'src/icon.tsx'),
        [
          "import './icon.css';",
          "import { LucideIcon } from '@kerfjs/ui/lucide-icon';",
          "const CustomNode = [['filter', {}]];",
          'export const Icon = () => <div class="icon"><LucideIcon icon={CustomNode} name="custom" /></div>;',
          '',
        ].join('\n'),
      );
      await writeFile(
        resolve(root, 'src/icon.css'),
        [
          '.icon svg[data-lucide] filter { width: 12px; }',
          '.icon svg filter { width: 12px; }',
          '.icon div filter { width: 12px; }',
          '',
        ].join('\n'),
      );
      const report = await doctor(root);
      expect(report.status).toBe(1);
      expect(
        report.report.diagnostics
          .filter((item: { id: string }) => item.id === 'KUI-L019')
          .map(
            (item: {
              location: { line: number };
              evidence: { component: string };
            }) => `${item.location.line}:${item.evidence.component}`,
          ),
      ).toEqual(['1:@kerfjs/ui:lucide-icon']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor enforces a shell stylesheet ownership group across modules',
  async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-groups-'));
    try {
      await mkdir(resolve(root, 'src/app'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"group-consumer","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          ownership: 'component',
          implicitComponentOwnership: true,
          ownershipGroups: [
            {
              styleSources: ['src/style.css'],
              sources: ['src/main.tsx', 'src/app/'],
            },
          ],
          stages: { catalog: false, typescript: false, eslint: false },
        }),
      );
      await writeFile(
        resolve(root, 'src/style.css'),
        '.ticket-page-more { color: blue; }\n',
      );
      await writeFile(
        resolve(root, 'src/main.tsx'),
        "import './style.css'; export const Main = () => <div class='ticket-page-more' />;\n",
      );
      await writeFile(
        resolve(root, 'src/app/runtime.tsx'),
        "export const Runtime = () => <div class='ticket-page-more' />;\n",
      );
      expect((await doctor(root)).report.diagnostics).toEqual([]);
      await writeFile(
        resolve(root, 'src/other.tsx'),
        "export const Other = () => <div class='ticket-page-more' />;\n",
      );
      await writeFile(
        resolve(root, 'src/other.css'),
        '.ticket-page-more { color: red; }\n',
      );
      const broken = await doctor(root);
      expect(broken.status).toBe(1);
      expect(
        broken.report.diagnostics.map((item: { id: string }) => item.id),
      ).toEqual(['KUI-L019', 'KUI-L023']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor protects dynamic BEM classes through selectors and DOM writes',
  async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-bem-'));
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"bem-consumer","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          ownership: 'component',
          implicitComponentOwnership: true,
          stages: { catalog: false, typescript: false, eslint: false },
        }),
      );
      await writeFile(
        resolve(root, 'src/row.css'),
        '.ticket-row { color: blue; }\n',
      );
      await writeFile(
        resolve(root, 'src/row.tsx'),
        "import './row.css'; export const Row = ({ layout }) => <div class='ticket-row' data-layout={layout} />;\n",
      );
      await writeFile(
        resolve(root, 'src/row-peer.tsx'),
        "import './row.css'; export const RowPeer = () => <div class='ticket-row' />;\n",
      );
      await writeFile(
        resolve(root, 'src/other.css'),
        '.ticket-row--list { color: red; }\n.ticket-row--column { color: red; }\n',
      );
      await writeFile(
        resolve(root, 'src/other.tsx'),
        "import './other.css'; element.classList.add('ticket-row__error');\n",
      );
      const broken = await doctor(root);
      expect(broken.status).toBe(1);
      expect(
        broken.report.diagnostics
          .map((item: { id: string }) => item.id)
          .filter((id: string) => ['KUI-L019', 'KUI-L023'].includes(id)),
      ).toEqual(['KUI-L019', 'KUI-L019', 'KUI-L023', 'KUI-L023']);
      expect(
        broken.report.diagnostics
          .filter((item: { id: string }) => item.id === 'KUI-L019')
          .map(
            (item: { evidence: { components: string[] } }) =>
              item.evidence.components,
          ),
      ).toEqual([
        [
          'bem-consumer:module:src/row-peer.tsx',
          'bem-consumer:module:src/row.tsx',
        ],
        [
          'bem-consumer:module:src/row-peer.tsx',
          'bem-consumer:module:src/row.tsx',
        ],
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor reports selectors that reach a composed LucideIcon',
  async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-icon-'));
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"icon-consumer","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          ownership: 'component',
          implicitComponentOwnership: true,
          stages: { catalog: false, typescript: false, eslint: false },
        }),
      );
      await writeFile(
        resolve(root, 'src/view.css'),
        '.icon-wrap > svg { width: 12px; }\n.icon-wrap path { fill: red; }\n',
      );
      await writeFile(
        resolve(root, 'src/view.tsx'),
        "import './view.css'; import { LucideIcon } from '@kerfjs/ui/lucide-icon'; export const View = () => <div class='icon-wrap'><LucideIcon icon={Star} name='star' /></div>;\n",
      );
      const report = await doctor(root);
      expect(report.status).toBe(1);
      expect(
        report.report.diagnostics.map((item: { id: string }) => item.id),
      ).toEqual(['KUI-L019', 'KUI-L019']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor sees a composed icon through a local function component',
  async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-local-'));
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"local-consumer","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          ownership: 'component',
          implicitComponentOwnership: true,
          stages: { catalog: false, typescript: false, eslint: false },
        }),
      );
      await writeFile(
        resolve(root, 'src/view.css'),
        '.actions svg { width: 12px; }\n',
      );
      await writeFile(
        resolve(root, 'src/view.tsx'),
        "import './view.css'; import { LucideIcon } from '@kerfjs/ui/lucide-icon'; function Actions() { return <button><LucideIcon icon={Star} name='star' /></button>; } export const View = () => <div class='actions'><Actions /></div>;\n",
      );
      const report = await doctor(root);
      expect(report.status).toBe(1);
      expect(
        report.report.diagnostics.map((item: { id: string }) => item.id),
      ).toEqual(['KUI-L019']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor finds borrowed classes in interpolated raw HTML',
  async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-html-'));
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"html-consumer","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          stages: { catalog: false, typescript: false, eslint: false },
        }),
      );
      await writeFile(
        resolve(root, 'src/render.ts'),
        'const html = `<header class="kui-toolbar">${title}<div class="kui-toolbar__leading">x</div></header>`;\n',
      );
      const report = await doctor(root);
      expect(report.status).toBe(1);
      expect(
        report.report.diagnostics.map((item: { id: string }) => item.id),
      ).toEqual(['KUI-L023', 'KUI-L023']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor reports a directly rendered Discouraged Web Awesome element, then passes once the Kerf wrapper replaces it',
  async () => {
    const root = await mkdtemp(
      resolve(tmpdir(), 'kerf-ui-doctor-discouraged-'),
    );
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"discouraged-consumer","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { jsx: 'preserve', noEmit: true },
          include: ['src'],
        }),
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          stages: { catalog: false, typescript: false, analyzer: false },
        }),
      );
      for (const name of [
        'eslint',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
      ])
        await link(root, name, resolve(uiRoot, 'node_modules', name));
      await link(
        root,
        'eslint-plugin-kerfjs',
        resolve(repositoryRoot, 'eslint-plugin'),
      );
      await link(root, '@kerfjs/ui', uiRoot);

      await writeFile(
        resolve(root, 'src/menu.tsx'),
        'export const Menu = () => (\n  <wa-dropdown>\n    <wa-dropdown-item value="open">Open</wa-dropdown-item>\n  </wa-dropdown>\n);\n',
      );
      const broken = await doctor(root);
      const findings = broken.report.diagnostics.filter(
        (item: { stage: string }) => item.stage === 'eslint',
      );
      expect(findings.map((item: { id: string }) => item.id)).toEqual([
        'KUI-L301',
        'KUI-L301',
      ]);
      for (const item of findings)
        expect(item.message).toContain('@kerfjs/ui:popup-menu');

      await writeFile(
        resolve(root, 'src/menu.tsx'),
        "import { PopupMenu } from '@kerfjs/ui/popup-menu';\nexport const Menu = () => <PopupMenu label=\"Actions\" items={[{ value: 'open', label: 'Open' }]} />;\n",
      );
      const clean = await doctor(root);
      expect(
        clean.report.diagnostics.filter(
          (item: { stage: string }) => item.stage === 'eslint',
        ),
      ).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor reports a component recreated by its anatomy classes, then passes once the app renders the component',
  async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-anatomy-'));
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"anatomy-consumer","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { jsx: 'preserve', noEmit: true },
          include: ['src'],
        }),
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          stages: { catalog: false, typescript: false, analyzer: false },
        }),
      );
      for (const name of [
        'eslint',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
      ])
        await link(root, name, resolve(uiRoot, 'node_modules', name));
      await link(
        root,
        'eslint-plugin-kerfjs',
        resolve(repositoryRoot, 'eslint-plugin'),
      );
      await link(root, '@kerfjs/ui', uiRoot);

      await writeFile(
        resolve(root, 'src/sidebar.tsx'),
        'export const Sidebar = () => (\n  <aside class="kui-pane">\n    <nav class="kui-pane__content kui-content">Inbox</nav>\n  </aside>\n);\n',
      );
      // A plain div carrying item geometry is ContentItem recreated; the
      // <ul> carrier keeps the placeable class.
      await writeFile(
        resolve(root, 'src/summary.tsx'),
        'export const Summary = () => (\n  <section class="kui-content">\n    <div class="kui-content-item">Unread</div>\n    <ul class="kui-content-item" />\n  </section>\n);\n',
      );
      const broken = await doctor(root);
      const findings = broken.report.diagnostics.filter(
        (item: { stage: string }) => item.stage === 'eslint',
      );
      expect(findings.map((item: { id: string }) => item.id)).toEqual([
        'KUI-L103',
        'KUI-L103',
        'KUI-L103',
      ]);
      for (const item of findings.slice(0, 2))
        expect(item.message).toContain('`Pane`');
      expect(findings[2].message).toContain('`ContentItem`');
      expect(broken.status).toBe(1);

      await writeFile(
        resolve(root, 'src/sidebar.tsx'),
        'import { Pane } from \'@kerfjs/ui/pane\';\nexport const Sidebar = () => (\n  <Pane element="aside" label="Mail" contentElement="nav">\n    Inbox\n  </Pane>\n);\n',
      );
      await writeFile(
        resolve(root, 'src/summary.tsx'),
        'import { ContentItem } from \'@kerfjs/ui/content-item\';\nexport const Summary = () => (\n  <section class="kui-content">\n    <ContentItem>Unread</ContentItem>\n    <ul class="kui-content-item" />\n  </section>\n);\n',
      );
      const clean = await doctor(root);
      expect(
        clean.report.diagnostics.filter(
          (item: { stage: string }) => item.stage === 'eslint',
        ),
      ).toEqual([]);
      expect(clean.status).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);

test(
  'the doctor reports anatomy classes a kerfjs/html template writes, then passes once the template renders the components',
  async () => {
    const root = await mkdtemp(
      resolve(tmpdir(), 'kerf-ui-doctor-html-anatomy-'),
    );
    try {
      await mkdir(resolve(root, 'src'), { recursive: true });
      await writeFile(
        resolve(root, 'package.json'),
        '{"name":"html-anatomy-consumer","private":true,"type":"module"}\n',
      );
      await writeFile(
        resolve(root, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { noEmit: true }, include: ['src'] }),
      );
      await writeFile(
        resolve(root, '.kerf-ui-doctor.json'),
        JSON.stringify({
          schemaVersion: 1,
          stages: { catalog: false, typescript: false, analyzer: false },
        }),
      );
      for (const name of [
        'eslint',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
      ])
        await link(root, name, resolve(uiRoot, 'node_modules', name));
      await link(
        root,
        'eslint-plugin-kerfjs',
        resolve(repositoryRoot, 'eslint-plugin'),
      );
      await link(root, '@kerfjs/ui', uiRoot);

      // The no-build path: no JSX transform, so the markup lives in
      // `kerfjs/html` tagged templates — one TypeScript file and one plain
      // JavaScript file, so both of the doctor's parser configurations run.
      await writeFile(
        resolve(root, 'src/sidebar.ts'),
        'import { html } from \'kerfjs/html\';\nexport const sidebar = (unread: number) => html`\n  <aside class="kui-pane">\n    <nav class="kui-pane__content kui-content">Inbox (${unread})</nav>\n  </aside>\n`;\n',
      );
      // A plain div carrying item geometry is ContentItem recreated; the
      // <ul> carrier keeps the placeable class. `kui-summary-shell` is not a
      // cataloged class at all.
      await writeFile(
        resolve(root, 'src/summary.js'),
        'import { html } from \'kerfjs/html\';\nexport const summary = (label) => html`\n  <section class="kui-content kui-summary-shell">\n    <div class="kui-content-item">${label}</div>\n    <ul class="kui-content-item"></ul>\n  </section>\n`;\n',
      );
      const broken = await doctor(root);
      const findings = broken.report.diagnostics.filter(
        (item: { stage: string }) => item.stage === 'eslint',
      );
      expect(
        findings.map((item: { id: string; location: { file: string } }) => [
          item.location.file,
          item.id,
        ]),
      ).toEqual([
        ['src/sidebar.ts', 'KUI-L103'],
        ['src/sidebar.ts', 'KUI-L103'],
        ['src/summary.js', 'KUI-L101'],
        ['src/summary.js', 'KUI-L103'],
      ]);
      for (const item of findings.slice(0, 2))
        expect(item.message).toContain('`Pane`');
      expect(findings[2].message).toContain('`kui-summary-shell`');
      expect(findings[3].message).toContain('`ContentItem`');
      expect(findings[3].message).toContain('<div>');
      expect(broken.status).toBe(1);

      await writeFile(
        resolve(root, 'src/sidebar.ts'),
        "import { Pane } from '@kerfjs/ui/pane';\nimport { html } from 'kerfjs/html';\nexport const sidebar = (unread: number) =>\n  html`${Pane({ element: 'aside', label: 'Mail', contentElement: 'nav', children: `Inbox (${unread})` })}`;\n",
      );
      await writeFile(
        resolve(root, 'src/summary.js'),
        'import { ContentItem } from \'@kerfjs/ui/content-item\';\nimport { html } from \'kerfjs/html\';\nexport const summary = (label) => html`\n  <section class="kui-content">\n    ${ContentItem({ children: label })}\n    <ul class="kui-content-item"></ul>\n  </section>\n`;\n',
      );
      const clean = await doctor(root);
      expect(
        clean.report.diagnostics.filter(
          (item: { stage: string }) => item.stage === 'eslint',
        ),
      ).toEqual([]);
      expect(clean.status).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  DOCTOR_TEST_TIMEOUT,
);
