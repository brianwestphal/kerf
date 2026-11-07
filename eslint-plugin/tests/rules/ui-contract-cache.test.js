// The UI contract cache must follow the files it was built from: a long-running
// editor ESLint server lints many files against one contract, and sees a
// regenerated catalog (or a fixed broken one) on its next lint.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';

import plugin from '../../index.js';
import ownership from '../../lib/rules/ui-component-ownership.js';
import { clearUiContractCache, loadUiContract } from '../../lib/ui-contract.js';
import {
  catalog,
  profile,
  uiSettings,
} from '../helpers/ui-contract-fixture.js';

const root = mkdtempSync(join(tmpdir(), 'kerf-contract-cache-'));
const catalogPath = join(root, 'component-composition.json');
let tick = 0;
// Write, then move the modification time forward explicitly so the change is
// visible even on a file system with coarse timestamps.
const write = (path, text) => {
  writeFileSync(path, text);
  tick += 10;
  const time = new Date(Date.UTC(2026, 0, 1) + tick * 1000);
  utimesSync(path, time, time);
};

const settings = uiSettings({
  catalog: undefined,
  catalogPath,
  workspaceRoot: root,
});

const lint = (code, filename = join(root, 'src/view.tsx')) =>
  new Linter({ cwd: root }).verify(
    code,
    [
      {
        files: ['**/*.tsx'],
        plugins: { kerfjs: plugin },
        languageOptions: {
          parser: tsParser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        settings,
        rules: { 'kerfjs/ui-public-boundaries': 'error' },
      },
    ],
    filename,
  );
const codes = (messages) =>
  messages.map(({ message }) => message.slice(0, 8)).sort();

test('a regenerated catalog is picked up between lint runs in one process', () => {
  clearUiContractCache();
  const recreation = '<div class="kui-toolbar" />;';

  write(catalogPath, '{ "schemaVersion": 1, ');
  const broken = lint(recreation);
  assert.deepEqual(codes(broken), ['KUI-L090']);

  // The failure was not cached: the fixed catalog loads on the next lint.
  write(catalogPath, JSON.stringify(catalog));
  assert.deepEqual(codes(lint(recreation)), ['KUI-L103']);

  // Regenerating the catalog without the class turns the recreation report
  // into the unknown-class report the new catalog implies.
  write(
    catalogPath,
    JSON.stringify({
      ...catalog,
      entries: catalog.entries.map((entry) =>
        entry.id === 'toolbar'
          ? {
              ...entry,
              boundaries: { ...entry.boundaries, publicClasses: [] },
            }
          : entry,
      ),
    }),
  );
  assert.deepEqual(codes(lint(recreation)), ['KUI-L101']);
});

test('files that see the same inputs share one loaded contract', () => {
  clearUiContractCache();
  write(catalogPath, JSON.stringify(catalog));
  mkdirSync(join(root, 'src/a'), { recursive: true });
  mkdirSync(join(root, 'src/b'), { recursive: true });
  // Profiles discovered from disk rather than given inline.
  const defaultsPath = join(root, 'defaults.json');
  write(defaultsPath, JSON.stringify(profile));
  const discovered = {
    ...settings.kerfjs.ui,
    profile: undefined,
    profileDefaultsPath: defaultsPath,
  };
  const context = (filename) => ({
    settings: { kerfjs: { ui: discovered } },
    cwd: root,
    filename,
  });
  const first = loadUiContract(context(join(root, 'src/a/one.tsx')));
  const second = loadUiContract(context(join(root, 'src/b/two.tsx')));
  assert.equal(first.error, undefined);
  assert.equal(first, second);

  // A directory profile layer is a different input, so a different contract.
  write(
    join(root, 'src/b/.kerf-ui-profile.json'),
    JSON.stringify({ schemaVersion: 1, scope: 'directory' }),
  );
  const layered = loadUiContract(context(join(root, 'src/b/two.tsx')));
  assert.notEqual(layered, first);
  assert.equal(loadUiContract(context(join(root, 'src/a/one.tsx'))), first);

  // Editing that layer reloads it rather than serving the stale contract.
  write(
    join(root, 'src/b/.kerf-ui-profile.json'),
    JSON.stringify({ schemaVersion: 1, scope: 'workspace' }),
  );
  assert.match(
    loadUiContract(context(join(root, 'src/b/two.tsx'))).error,
    /must have profile scope directory/,
  );
});

test('a renamed package.json changes which package owns a file', () => {
  const app = join(root, 'pkg');
  mkdirSync(join(app, 'src'), { recursive: true });
  const ownSettings = uiSettings({
    catalog: {
      schemaVersion: 2,
      package: '@acme/widgets',
      entries: [
        {
          key: '@acme/widgets:meter',
          package: '@acme/widgets',
          id: 'meter',
          name: 'Meter',
          parents: { mode: 'any', entries: [] },
          wiring: { required: false, helpers: [] },
          boundaries: {
            rootClass: 'acme-meter',
            publicClasses: ['acme-meter'],
            publicTokens: [],
          },
        },
      ],
    },
    selectionCatalog: {
      schemaVersion: 1,
      package: '@acme/widgets',
      entries: [{ id: 'meter', publicExports: ['Meter'], wiring: [] }],
    },
    profile: { schemaVersion: 1, scope: 'package' },
    workspaceRoot: app,
  });
  const run = () =>
    new Linter({ cwd: root }).verify(
      'const css = "--_acme-meter-gap: 2px";',
      [
        {
          plugins: { local: { rules: { ownership } } },
          settings: ownSettings,
          rules: { 'local/ownership': 'error' },
        },
      ],
      join(app, 'src/view.js'),
    );
  write(join(app, 'package.json'), JSON.stringify({ name: 'acme-app' }));
  const outside = run();
  write(join(app, 'package.json'), JSON.stringify({ name: '@acme/widgets' }));
  const inside = run();
  assert.ok(
    outside.some(({ message }) => message.startsWith('KUI-L020')),
    JSON.stringify(outside),
  );
  assert.deepEqual(inside, []);
});
