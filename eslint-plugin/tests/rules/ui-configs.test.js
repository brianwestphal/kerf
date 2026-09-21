import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import tsParser from '@typescript-eslint/parser';
import { ESLint } from 'eslint';

import plugin from '../../index.js';
import {
  catalog,
  selectionCatalog,
  uiSettings,
} from '../helpers/ui-contract-fixture.js';

const execFileAsync = promisify(execFile);
const pluginRoot = resolve(import.meta.dirname, '../..');
const repositoryRoot = resolve(pluginRoot, '..');
const eslintBin = resolve(
  fileURLToPath(import.meta.resolve('eslint')),
  '../../bin/eslint.js',
);
const profileContractPath = resolve(
  repositoryRoot,
  'ui/ai/application-ui-profile-sync.cjs',
);

async function pack(directory, destination, environment) {
  const { stdout } = await execFileAsync(
    'npm',
    ['pack', '--ignore-scripts', '--json', '--pack-destination', destination],
    { cwd: directory, env: environment },
  );
  const [{ filename }] = JSON.parse(stdout);
  return resolve(destination, filename);
}

test('UI flat configs publish an explicit severity policy', () => {
  assert.deepEqual(
    {
      recommended: [
        plugin.configs['recommended-ui'].rules['kerfjs/ui-public-boundaries'],
        plugin.configs['recommended-ui'].rules['kerfjs/ui-composition'],
        plugin.configs['recommended-ui'].rules['kerfjs/ui-preferences'],
        plugin.configs['recommended-ui'].rules['kerfjs/ui-wiring'],
      ],
      strict: [
        plugin.configs['strict-ui'].rules['kerfjs/ui-public-boundaries'],
        plugin.configs['strict-ui'].rules['kerfjs/ui-composition'],
        plugin.configs['strict-ui'].rules['kerfjs/ui-preferences'],
        plugin.configs['strict-ui'].rules['kerfjs/ui-wiring'],
      ],
    },
    {
      recommended: ['error', 'error', 'warn', 'warn'],
      strict: ['error', 'error', 'error', 'error'],
    },
  );
});

test('recommended-ui applies warning severity to injected unit fixtures', async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser: tsParser,
          parserOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            ecmaFeatures: { jsx: true },
          },
        },
        settings: uiSettings(),
      },
      plugin.configs['recommended-ui'],
    ],
  });
  const [result] = await eslint.lintText(
    "import { WaButtonGroup } from '@kerfjs/ui'; <WaButtonGroup />;",
    { filePath: 'src/view.tsx' },
  );
  assert.deepEqual(
    result.messages
      .filter(({ ruleId }) => ruleId?.startsWith('kerfjs/ui-'))
      .map(({ ruleId, severity, message }) => ({
        ruleId,
        severity,
        code: message.slice(0, 8),
      })),
    [{ ruleId: 'kerfjs/ui-preferences', severity: 1, code: 'KUI-L301' }],
  );
});

test('strict-ui promotes advisory UI contracts without changing diagnostic ids', async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser: tsParser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        settings: uiSettings(),
      },
      plugin.configs['strict-ui'],
    ],
  });
  const [result] = await eslint.lintText(
    "import { WaButtonGroup } from '@kerfjs/ui'; <WaButtonGroup />;",
    { filePath: 'packages/app/src/view.tsx' },
  );
  assert.equal(result.messages[0].severity, 2);
  assert.match(result.messages[0].message, /^KUI-L301:/);
});

test('packed plugin resolves packed @kerfjs/ui assets from an installed flat-config consumer', async (t) => {
  const temporary = await mkdtemp(resolve(tmpdir(), 'kerf-eslint-installed-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const packs = resolve(temporary, 'packs');
  const consumer = resolve(temporary, 'consumer');
  const cache = resolve(temporary, 'npm-cache');
  await mkdir(packs, { recursive: true });
  await mkdir(resolve(consumer, 'src'), { recursive: true });
  const environment = { ...process.env, npm_config_cache: cache };
  const [pluginTarball, uiTarball] = await Promise.all([
    pack(pluginRoot, packs, environment),
    pack(resolve(repositoryRoot, 'ui'), packs, environment),
  ]);
  await writeFile(
    resolve(consumer, 'package.json'),
    `${JSON.stringify({ name: 'kerf-ui-eslint-consumer', private: true, type: 'module' })}\n`,
  );
  const pluginExtract = resolve(temporary, 'plugin-extract');
  const uiExtract = resolve(temporary, 'ui-extract');
  await Promise.all([
    mkdir(pluginExtract),
    mkdir(uiExtract),
    mkdir(resolve(consumer, 'node_modules/@kerfjs'), { recursive: true }),
  ]);
  await Promise.all([
    execFileAsync('tar', ['-xzf', pluginTarball, '-C', pluginExtract]),
    execFileAsync('tar', ['-xzf', uiTarball, '-C', uiExtract]),
  ]);
  await Promise.all([
    rename(
      resolve(pluginExtract, 'package'),
      resolve(consumer, 'node_modules/eslint-plugin-kerfjs'),
    ),
    rename(
      resolve(uiExtract, 'package'),
      resolve(consumer, 'node_modules/@kerfjs/ui'),
    ),
  ]);
  await writeFile(
    resolve(consumer, 'eslint.config.js'),
    `import kerfjs from 'eslint-plugin-kerfjs';
export default [
  { files: ['**/*.jsx'], languageOptions: { parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } } },
  kerfjs.configs['recommended-ui'],
];
`,
  );
  await writeFile(
    resolve(consumer, 'src/view.jsx'),
    `import * as UI from '@kerfjs/ui';
import * as Field from '@kerfjs/ui/token-search-field';
const dispose = UI.wireTokenSearchFields(root);
export const view = <><UI.Toolbar leading={<button>Save</button>} /><Field.TokenSearchField tokens={[]} onTokensChange={() => {}} /></>;
void dispose;
`,
  );
  await mkdir(resolve(consumer, 'invalid'));
  await writeFile(
    resolve(consumer, 'invalid/.kerf-ui-profile.json'),
    JSON.stringify({
      schemaVersion: 1,
      scope: 'directory',
      prefrences: {},
      theme: { density: 'dense' },
    }),
  );
  await writeFile(resolve(consumer, 'invalid/view.jsx'), '<div />;\n');

  let output;
  try {
    ({ stdout: output } = await execFileAsync(
      process.execPath,
      [eslintBin, 'src/view.jsx', 'invalid/view.jsx', '--format', 'json'],
      { cwd: consumer, env: environment },
    ));
  } catch (error) {
    if (error.code !== 1 || !error.stdout) throw error;
    output = error.stdout;
  }
  const results = JSON.parse(output);
  const result = results.find(({ filePath }) =>
    filePath.endsWith('src/view.jsx'),
  );
  const invalid = results.find(({ filePath }) =>
    filePath.endsWith('invalid/view.jsx'),
  );
  assert.equal(
    result.messages.some(({ message }) => message.startsWith('KUI-L090:')),
    false,
  );
  assert.deepEqual(
    result.messages
      .filter(({ ruleId }) => ruleId === 'kerfjs/ui-composition')
      .map(({ message }) => message.slice(0, 8)),
    ['KUI-L202'],
  );
  assert.equal(
    result.messages.some(({ ruleId }) => ruleId === 'kerfjs/ui-wiring'),
    false,
  );
  assert.equal(
    invalid.messages.some(({ message }) => message.startsWith('KUI-L090:')),
    true,
  );
});

test('profile discovery applies package, workspace, then root-to-leaf directory precedence', async (t) => {
  const workspace = await mkdtemp(resolve(tmpdir(), 'kerf-eslint-ui-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const feature = resolve(workspace, 'packages/app/src/feature');
  await mkdir(feature, { recursive: true });
  const defaults = resolve(workspace, 'defaults.json');
  const preference = (scope, avoid) => ({
    schemaVersion: 1,
    scope,
    preferences: {
      choice: { preferred: '@kerfjs/ui:segmented-control', avoid },
    },
  });
  await writeFile(
    defaults,
    JSON.stringify(preference('package', ['@kerfjs/ui:wa-button-group'])),
  );
  await writeFile(
    resolve(workspace, '.kerf-ui-profile.json'),
    JSON.stringify(preference('workspace', [])),
  );
  await writeFile(
    resolve(workspace, 'packages/app/.kerf-ui-profile.json'),
    JSON.stringify(preference('directory', ['@kerfjs/ui:wa-button-group'])),
  );

  const eslint = new ESLint({
    cwd: workspace,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser: tsParser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { kerfjs: plugin },
        settings: {
          kerfjs: {
            ui: {
              catalog,
              selectionCatalog,
              workspaceRoot: workspace,
              profileDefaultsPath: defaults,
              profileContractPath,
            },
          },
        },
        rules: { 'kerfjs/ui-preferences': 'error' },
      },
    ],
  });
  const code = "import { WaButtonGroup } from '@kerfjs/ui'; <WaButtonGroup />;";
  const [nested] = await eslint.lintText(code, {
    filePath: resolve(feature, 'view.tsx'),
  });
  const [workspaceOnly] = await eslint.lintText(code, {
    filePath: resolve(workspace, 'other.tsx'),
  });
  assert.deepEqual(
    nested.messages.map(({ messageId }) => messageId),
    ['preferred'],
  );
  assert.deepEqual(workspaceOnly.messages, []);
});

test('profile discovery reports an invalid layer scope as configuration error', async (t) => {
  const workspace = await mkdtemp(resolve(tmpdir(), 'kerf-eslint-ui-scope-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const defaults = resolve(workspace, 'defaults.json');
  await writeFile(
    defaults,
    JSON.stringify({ schemaVersion: 1, scope: 'directory' }),
  );
  const eslint = new ESLint({
    cwd: workspace,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser: tsParser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { kerfjs: plugin },
        settings: {
          kerfjs: {
            ui: {
              catalog,
              selectionCatalog,
              workspaceRoot: workspace,
              profileDefaultsPath: defaults,
              profileContractPath,
            },
          },
        },
        rules: { 'kerfjs/ui-preferences': 'error' },
      },
    ],
  });
  const [result] = await eslint.lintText('<div />;', {
    filePath: resolve(workspace, 'view.tsx'),
  });
  assert.equal(result.messages[0].messageId, 'config');
  assert.match(result.messages[0].message, /^KUI-L090:/);
});

test('synchronous profile validation rejects malformed settings with KUI-L090', async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser: tsParser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { kerfjs: plugin },
        settings: uiSettings({
          profile: {
            schemaVersion: 1,
            scope: 'package',
            prefrences: {},
            theme: { density: 'dense' },
          },
        }),
        rules: { 'kerfjs/ui-preferences': 'error' },
      },
    ],
  });
  const [result] = await eslint.lintText('<div />;', {
    filePath: 'src/view.tsx',
  });
  assert.equal(result.messages[0].messageId, 'config');
  assert.match(result.messages[0].message, /^KUI-L090:/);
  assert.match(result.messages[0].message, /KUI-P023/);
});

test('synchronous profile validation accepts shared analyzer, browser, doctor, and type diagnostic ids', async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser: tsParser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { kerfjs: plugin },
        settings: uiSettings({
          profile: {
            schemaVersion: 1,
            scope: 'package',
            exceptions: [
              {
                id: 'shared-tool-migration',
                rules: ['KUI-L002', 'KUI-B010', 'KUI-D020', 'KUI-T001'],
                target: 'src/view.tsx',
                rationale: 'Remove after the shared migration is complete.',
              },
            ],
          },
        }),
        rules: { 'kerfjs/ui-preferences': 'error' },
      },
    ],
  });
  const [result] = await eslint.lintText('<div />;', {
    filePath: 'src/view.tsx',
  });
  assert.deepEqual(result.messages, []);
});

test('synchronous discovery preserves invalid parent values overridden by a child', async (t) => {
  const workspace = await mkdtemp(resolve(tmpdir(), 'kerf-eslint-ui-parent-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const feature = resolve(workspace, 'feature');
  await mkdir(feature);
  const defaults = resolve(workspace, 'defaults.json');
  await writeFile(
    defaults,
    JSON.stringify({
      schemaVersion: 1,
      scope: 'package',
      theme: { density: 'dense' },
    }),
  );
  await writeFile(
    resolve(workspace, '.kerf-ui-profile.json'),
    JSON.stringify({
      schemaVersion: 1,
      scope: 'workspace',
      theme: { density: 'standard' },
    }),
  );
  const eslint = new ESLint({
    cwd: workspace,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser: tsParser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { kerfjs: plugin },
        settings: {
          kerfjs: {
            ui: {
              catalog,
              selectionCatalog,
              workspaceRoot: workspace,
              profileDefaultsPath: defaults,
              profileContractPath,
            },
          },
        },
        rules: { 'kerfjs/ui-preferences': 'error' },
      },
    ],
  });
  const [result] = await eslint.lintText('<div />;', {
    filePath: resolve(feature, 'view.tsx'),
  });
  assert.equal(result.messages[0].messageId, 'config');
  assert.match(result.messages[0].message, /KUI-P026/);
  assert.match(result.messages[0].message, /defaults\.json/);
});
