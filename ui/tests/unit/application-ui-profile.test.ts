import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import type {
  ApplicationUiProfile,
  ApplicationUiProfileLayer,
} from '../../ai/application-ui-profile.mjs';
import {
  mergeApplicationUiProfiles,
  validateApplicationUiProfile,
  validateApplicationUiProfileLayers,
} from '../../ai/application-ui-profile.mjs';

const syncProfileContract = createRequire(import.meta.url)(
  '../../ai/application-ui-profile-sync.cjs',
);

const layer = (
  source: string,
  profile: ApplicationUiProfileLayer['profile'],
): ApplicationUiProfileLayer => ({ source, profile });

describe('application UI profile policy', () => {
  it('keeps the synchronous ESLint projection behaviorally aligned', () => {
    const layers = [
      layer('/package/default.json', {
        schemaVersion: 1,
        scope: 'package',
        prefrences: {},
        theme: { density: 'dense' },
        tokens: { '--kui-private': '' },
      } as unknown as ApplicationUiProfileLayer['profile']),
    ];
    const options = {
      source: layers[0].source,
      knownComponents: ['@kerfjs/ui:pane'],
      knownTokens: ['--kui-color-border'],
      knownRules: ['KUI-L101'],
    };
    expect(
      syncProfileContract.validateApplicationUiProfile(
        layers[0].profile,
        options,
      ),
    ).toEqual(validateApplicationUiProfile(layers[0].profile, options));
    expect(syncProfileContract.mergeApplicationUiProfiles(layers)).toEqual(
      mergeApplicationUiProfiles(layers),
    );
    expect(
      syncProfileContract.validateApplicationUiProfileLayers(layers),
    ).toEqual(validateApplicationUiProfileLayers(layers));
  });

  it('accepts composition-only consumer catalogs but keeps Kerf selection required', () => {
    const profile: ApplicationUiProfile = {
      schemaVersion: 1,
      scope: 'workspace',
      catalogs: [
        {
          package: '@acme/ui',
          composition: {
            path: './component-catalog-v2.json',
            schemaVersion: 2,
          },
        },
      ],
    };
    expect(validateApplicationUiProfile(profile)).toEqual([]);
    expect(
      validateApplicationUiProfile({
        ...profile,
        catalogs: [
          {
            package: '@kerfjs/ui',
            composition: {
              path: './component-catalog-v2.json',
              schemaVersion: 2,
            },
          },
        ],
      }).map(({ code, path }) => ({ code, path })),
    ).toContainEqual({ code: 'KUI-P005', path: '$.catalogs[0].selection' });
  });

  it('reports adversarial container types instead of throwing or silently ignoring them', () => {
    const diagnostics = validateApplicationUiProfile({
      schemaVersion: 1,
      scope: 'workspace',
      catalogs: {} as ApplicationUiProfile['catalogs'],
      preferences: [] as unknown as ApplicationUiProfile['preferences'],
      theme: 'dark' as unknown as ApplicationUiProfile['theme'],
      tokens: [] as unknown as ApplicationUiProfile['tokens'],
      layout: [] as unknown as ApplicationUiProfile['layout'],
      exceptions: {} as ApplicationUiProfile['exceptions'],
    });
    expect(diagnostics.filter(({ code }) => code === 'KUI-P030')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '$.catalogs' }),
        expect.objectContaining({ path: '$.preferences' }),
        expect.objectContaining({ path: '$.theme' }),
        expect.objectContaining({ path: '$.tokens' }),
        expect.objectContaining({ path: '$.layout' }),
        expect.objectContaining({ path: '$.exceptions' }),
      ]),
    );
  });

  it('merges package, workspace, and directory policy in deterministic precedence order', () => {
    const resolved = mergeApplicationUiProfiles([
      layer('/package/default.json', {
        schemaVersion: 1,
        scope: 'package',
        preferences: {
          navigation: { preferred: '@kerfjs/ui:list-item' },
          search: { preferred: '@kerfjs/ui:token-search-field' },
        },
        theme: {
          colorScheme: 'light',
          allowedColorSchemes: ['light', 'dark'],
          density: 'standard',
        },
        tokens: { '--kui-color-brand-fill-normal': 'blue' },
        exceptions: [],
      }),
      layer('/workspace/.kerf-ui-profile.json', {
        schemaVersion: 1,
        scope: 'workspace',
        preferences: {
          navigation: { preferred: '@acme/ui:navigation-row' },
        },
        theme: { colorScheme: 'dark' },
        tokens: { '--kui-color-brand-fill-normal': 'navy' },
        exceptions: [
          {
            id: 'legacy-grid',
            rules: ['KUI-C101'],
            target: 'src/legacy/grid.tsx',
            rationale: 'The embedded grid owns its isolated toolbar row.',
          },
        ],
      }),
      layer('/workspace/src/feature/.kerf-ui-profile.json', {
        schemaVersion: 1,
        scope: 'directory',
        theme: { density: 'compact' },
        exceptions: [
          {
            id: 'legacy-grid',
            rules: ['KUI-C101'],
            target: 'grid.tsx',
            rationale: 'The feature-local adapter narrows the same exception.',
          },
        ],
      }),
    ]);

    expect(resolved.profile).toMatchObject({
      scope: 'directory',
      preferences: {
        navigation: { preferred: '@acme/ui:navigation-row' },
        search: { preferred: '@kerfjs/ui:token-search-field' },
      },
      theme: {
        colorScheme: 'dark',
        allowedColorSchemes: ['light', 'dark'],
        density: 'compact',
      },
      tokens: { '--kui-color-brand-fill-normal': 'navy' },
      exceptions: [expect.objectContaining({ target: 'grid.tsx' })],
    });
    expect(resolved.provenance['$preferences.navigation']).toBe(
      '/workspace/.kerf-ui-profile.json',
    );
    expect(resolved.provenance['$theme.density']).toBe(
      '/workspace/src/feature/.kerf-ui-profile.json',
    );
  });

  it('reports conflicts, stale references, unknown tokens, and broad exceptions with source paths', () => {
    const diagnostics = validateApplicationUiProfile(
      {
        schemaVersion: 1,
        scope: 'workspace',
        preferences: {
          navigation: {
            preferred: '@acme/ui:missing',
            avoid: ['@acme/ui:missing'],
          },
        },
        theme: {
          colorScheme: 'dark',
          allowedColorSchemes: ['light'],
          density: 'compact',
          allowedDensities: ['standard'],
        },
        tokens: { '--kui-private-token': 'red' },
        layout: { shell: '@kerfjs/ui:missing-shell' },
        exceptions: [
          {
            id: 'broad',
            rules: ['KUI-C999'],
            target: 'src/**',
            rationale: 'too short',
          },
        ],
      },
      {
        source: 'apps/example/.kerf-ui-profile.json',
        knownComponents: ['@kerfjs/ui:list-item'],
        knownTokens: ['--kui-color-brand-fill-normal'],
        knownRules: ['KUI-C101'],
      },
    );

    expect(diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'KUI-P008',
        'KUI-P009',
        'KUI-P010',
        'KUI-P011',
        'KUI-P013',
        'KUI-P014',
        'KUI-P017',
        'KUI-P018',
        'KUI-P022',
      ]),
    );
    expect(
      diagnostics.every(
        ({ source }) => source === 'apps/example/.kerf-ui-profile.json',
      ),
    ).toBe(true);
    expect(diagnostics.find(({ code }) => code === 'KUI-P009')?.path).toBe(
      '$.preferences.navigation.preferred',
    );
  });

  it('rejects invalid scope order and non-hierarchical directory layers', () => {
    const diagnostics = validateApplicationUiProfileLayers([
      layer('/workspace/.kerf-ui-profile.json', {
        schemaVersion: 1,
        scope: 'workspace',
      }),
      layer('/workspace/apps/a/.kerf-ui-profile.json', {
        schemaVersion: 1,
        scope: 'directory',
      }),
      layer('/workspace/apps/b/.kerf-ui-profile.json', {
        schemaVersion: 1,
        scope: 'directory',
      }),
      layer('/package/default.json', {
        schemaVersion: 1,
        scope: 'package',
      }),
    ]);
    expect(diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['KUI-P027', 'KUI-P029']),
    );
    expect(diagnostics.every(({ path }) => path === '$.scope')).toBe(true);
  });
});
