import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import {
  APPLICATION_UI_PROFILE_FILENAME,
  discoverApplicationUiProfileFiles,
  loadApplicationUiProfile,
} from '../../ai/application-ui-profile.mjs';

const temporaryDirectories: string[] = [];
const execFileAsync = promisify(execFile);
afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

const writeJson = (path: string, value: unknown) =>
  writeFile(path, `${JSON.stringify(value, null, 2)}\n`);

describe('application UI profile discovery', () => {
  it('discovers workspace then parent-to-child directory profiles and applies inheritance', async () => {
    const workspace = await mkdtemp(resolve(tmpdir(), 'kerf-ui-profile-'));
    temporaryDirectories.push(workspace);
    const feature = resolve(workspace, 'apps/example/src/feature');
    await mkdir(feature, { recursive: true });
    const packageProfile = resolve(workspace, 'package-default.json');
    await writeJson(packageProfile, {
      schemaVersion: 1,
      scope: 'package',
      theme: { colorScheme: 'light', density: 'standard' },
    });
    await writeJson(resolve(workspace, APPLICATION_UI_PROFILE_FILENAME), {
      schemaVersion: 1,
      scope: 'workspace',
      theme: { colorScheme: 'dark' },
    });
    await writeJson(
      resolve(workspace, 'apps/example', APPLICATION_UI_PROFILE_FILENAME),
      {
        schemaVersion: 1,
        scope: 'directory',
        theme: { density: 'compact' },
      },
    );

    const files = await discoverApplicationUiProfileFiles({
      workspaceRoot: workspace,
      startDirectory: feature,
      packageProfile,
    });
    expect(files).toEqual([
      packageProfile,
      resolve(workspace, APPLICATION_UI_PROFILE_FILENAME),
      resolve(workspace, 'apps/example', APPLICATION_UI_PROFILE_FILENAME),
    ]);
    const loaded = await loadApplicationUiProfile({
      workspaceRoot: workspace,
      startDirectory: feature,
      packageProfile,
    });
    expect(loaded.diagnostics).toEqual([]);
    expect(loaded.profile?.theme).toEqual({
      colorScheme: 'dark',
      density: 'compact',
    });
  });

  it('returns an actionable source and JSON path for a stale catalog location', async () => {
    const workspace = await mkdtemp(
      resolve(tmpdir(), 'kerf-ui-profile-stale-'),
    );
    temporaryDirectories.push(workspace);
    const packageProfile = resolve(workspace, 'package-default.json');
    await writeJson(packageProfile, {
      schemaVersion: 1,
      scope: 'package',
      catalogs: [
        {
          package: '@acme/ui',
          selection: { path: './missing-v1.json', schemaVersion: 1 },
          composition: { path: './missing-v2.json', schemaVersion: 2 },
        },
      ],
    });

    const loaded = await loadApplicationUiProfile({
      workspaceRoot: workspace,
      startDirectory: workspace,
      packageProfile,
    });
    expect(loaded.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'KUI-P021',
          source: packageProfile,
          path: '$.catalogs[0].selection.path',
        }),
        expect.objectContaining({
          code: 'KUI-P021',
          source: packageProfile,
          path: '$.catalogs[0].composition.path',
        }),
      ]),
    );
  });

  it('adds consumer rule ids to catalog diagnostics for exception validation', async () => {
    const workspace = await mkdtemp(
      resolve(tmpdir(), 'kerf-ui-profile-rules-'),
    );
    temporaryDirectories.push(workspace);
    const packageProfile = resolve(workspace, 'package-default.json');
    await writeJson(packageProfile, {
      schemaVersion: 1,
      scope: 'package',
      exceptions: [
        {
          id: 'lint-migration',
          rules: ['KUI-L101'],
          target: 'src/legacy.tsx',
          rationale: 'Remove after the component migration.',
        },
      ],
    });

    const withoutConsumerRules = await loadApplicationUiProfile({
      workspaceRoot: workspace,
      startDirectory: workspace,
      packageProfile,
    });
    expect(withoutConsumerRules.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'KUI-P022' })]),
    );

    const withConsumerRules = await loadApplicationUiProfile({
      workspaceRoot: workspace,
      startDirectory: workspace,
      packageProfile,
      knownRules: ['KUI-L101'],
    });
    expect(withConsumerRules.diagnostics).toEqual([]);
  });

  it('loads an actually generated composition-only consumer catalog through layered policy', async () => {
    const workspace = await mkdtemp(
      resolve(tmpdir(), 'kerf-ui-profile-consumer-'),
    );
    temporaryDirectories.push(workspace);
    const packageRoot = resolve(workspace, 'packages/consumer-widgets');
    const initializer = resolve(
      import.meta.dirname,
      '../../../create-kerf-component/index.js',
    );
    await execFileAsync(process.execPath, [initializer, packageRoot]);
    await execFileAsync(process.execPath, [
      resolve(import.meta.dirname, '../../../create-kerf-component/catalog.js'),
      '--write',
      '--root',
      packageRoot,
    ]);

    const feature = resolve(workspace, 'apps/example/src/feature');
    await mkdir(feature, { recursive: true });
    const packageProfile = resolve(workspace, 'package-default.json');
    await writeJson(packageProfile, { schemaVersion: 1, scope: 'package' });
    const workspaceProfile = resolve(
      workspace,
      APPLICATION_UI_PROFILE_FILENAME,
    );
    await writeJson(workspaceProfile, {
      schemaVersion: 1,
      scope: 'workspace',
      catalogs: [
        {
          package: 'consumer-widgets',
          composition: {
            path: 'packages/consumer-widgets/component-catalog-v2.json',
            schemaVersion: 2,
          },
        },
      ],
      preferences: {
        counter: { preferred: 'consumer-widgets:counter' },
      },
    });
    await writeJson(
      resolve(workspace, 'apps/example', APPLICATION_UI_PROFILE_FILENAME),
      {
        schemaVersion: 1,
        scope: 'directory',
        theme: { density: 'compact' },
      },
    );

    const loaded = await loadApplicationUiProfile({
      workspaceRoot: workspace,
      startDirectory: feature,
      packageProfile,
    });
    expect(loaded.diagnostics).toEqual([]);
    expect(loaded.profile?.catalogs).toEqual([
      expect.objectContaining({ package: 'consumer-widgets' }),
    ]);
    expect(loaded.profile?.preferences?.counter.preferred).toBe(
      'consumer-widgets:counter',
    );
    expect(loaded.profile?.theme?.density).toBe('compact');

    await writeJson(workspaceProfile, {
      schemaVersion: 1,
      scope: 'workspace',
      catalogs: loaded.profile?.catalogs,
      preferences: {
        counter: { preferred: 'consumer-widgets:missing' },
      },
    });
    const stale = await loadApplicationUiProfile({
      workspaceRoot: workspace,
      startDirectory: feature,
      packageProfile,
    });
    expect(stale.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'KUI-P009',
          source: workspaceProfile,
          path: '$.preferences.counter.preferred',
        }),
      ]),
    );
  });

  it('reports invalid raw layers even when children override them and uses field provenance', async () => {
    const workspace = await mkdtemp(resolve(tmpdir(), 'kerf-ui-profile-raw-'));
    temporaryDirectories.push(workspace);
    const feature = resolve(workspace, 'apps/example/src/feature');
    await mkdir(feature, { recursive: true });
    const packageProfile = resolve(workspace, 'package-default.json');
    await writeJson(packageProfile, {
      schemaVersion: 1,
      scope: 'package',
      theme: { allowedDensities: ['standard'] },
    });
    const workspaceProfile = resolve(
      workspace,
      APPLICATION_UI_PROFILE_FILENAME,
    );
    await writeJson(workspaceProfile, {
      schemaVersion: 1,
      scope: 'workspace',
      prefrences: {},
      theme: { density: 'dense' },
      layout: [],
      preferences: { counter: { preferred: '@acme/ui:missing' } },
    });
    const directoryProfile = resolve(
      workspace,
      'apps/example',
      APPLICATION_UI_PROFILE_FILENAME,
    );
    await writeJson(directoryProfile, {
      schemaVersion: 1,
      scope: 'directory',
      theme: { density: 'standard' },
    });

    const loaded = await loadApplicationUiProfile({
      workspaceRoot: workspace,
      startDirectory: feature,
      packageProfile,
    });
    expect(loaded.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'KUI-P023',
          source: workspaceProfile,
          path: '$.prefrences',
        }),
        expect.objectContaining({
          code: 'KUI-P026',
          source: workspaceProfile,
          path: '$.theme.density',
        }),
        expect.objectContaining({
          code: 'KUI-P030',
          source: workspaceProfile,
          path: '$.layout',
        }),
      ]),
    );
    expect(
      loaded.diagnostics.some(
        ({ code, source }) =>
          code === 'KUI-P026' && source === directoryProfile,
      ),
    ).toBe(false);
  });

  it('loads each layer catalog before validating references and does not hide overridden parent failures', async () => {
    const workspace = await mkdtemp(
      resolve(tmpdir(), 'kerf-ui-profile-layer-catalog-'),
    );
    temporaryDirectories.push(workspace);
    const feature = resolve(workspace, 'apps/example/src');
    await mkdir(feature, { recursive: true });
    const packageProfile = resolve(workspace, 'package-default.json');
    const parentCatalog = resolve(workspace, 'parent-catalog.json');
    await writeJson(parentCatalog, {
      schemaVersion: 2,
      package: '@acme/ui',
      entries: [{ key: '@acme/ui:available', boundaries: {} }],
    });
    await writeJson(packageProfile, {
      schemaVersion: 1,
      scope: 'package',
      catalogs: [
        {
          package: '@acme/ui',
          composition: {
            path: './parent-catalog.json',
            schemaVersion: 2,
          },
        },
        {
          package: '@broken/ui',
          composition: { path: './missing.json', schemaVersion: 2 },
        },
      ],
      preferences: {
        choice: { preferred: '@acme/ui:missing-in-parent' },
      },
    });
    const workspaceProfile = resolve(
      workspace,
      APPLICATION_UI_PROFILE_FILENAME,
    );
    await writeJson(resolve(workspace, 'child-acme.json'), {
      schemaVersion: 2,
      package: '@acme/ui',
      entries: [{ key: '@acme/ui:missing-in-parent', boundaries: {} }],
    });
    await writeJson(resolve(workspace, 'child-broken.json'), {
      schemaVersion: 2,
      package: '@broken/ui',
      entries: [],
    });
    await writeJson(workspaceProfile, {
      schemaVersion: 1,
      scope: 'workspace',
      catalogs: [
        {
          package: '@acme/ui',
          composition: { path: './child-acme.json', schemaVersion: 2 },
        },
        {
          package: '@broken/ui',
          composition: { path: './child-broken.json', schemaVersion: 2 },
        },
      ],
    });

    const loaded = await loadApplicationUiProfile({
      workspaceRoot: workspace,
      startDirectory: feature,
      packageProfile,
    });
    expect(loaded.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'KUI-P009',
          source: packageProfile,
          path: '$.preferences.choice.preferred',
        }),
        expect.objectContaining({
          code: 'KUI-P021',
          source: packageProfile,
          path: '$.catalogs[1].composition.path',
        }),
      ]),
    );
    expect(
      loaded.diagnostics.some(({ source }) => source === workspaceProfile),
    ).toBe(false);
  });
});
