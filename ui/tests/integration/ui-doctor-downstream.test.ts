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
