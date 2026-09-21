const component = (id, name, overrides = {}) => ({
  key: `@kerfjs/ui:${id}`,
  package: '@kerfjs/ui',
  id,
  name,
  parents: { mode: 'any', entries: [] },
  wiring: { required: false, helpers: [] },
  boundaries: { publicClasses: [], publicTokens: [] },
  ...overrides,
});

export const catalog = {
  schemaVersion: 2,
  package: '@kerfjs/ui',
  entries: [
    component('toolbar', 'Toolbar', {
      zones: [
        {
          id: 'leading',
          accepts: ['toolbar-text', 'toolbar-control-group'],
          cardinality: { min: 0, max: 'unbounded' },
        },
        {
          id: 'center',
          accepts: ['toolbar-text'],
          cardinality: { min: 0, max: 1 },
        },
        {
          id: 'trailing',
          accepts: ['toolbar-text', 'toolbar-control-group'],
          cardinality: { min: 0, max: 'unbounded' },
        },
      ],
      boundaries: {
        publicClasses: ['kui-toolbar'],
        publicTokens: ['--kui-color-border'],
      },
    }),
    component('toolbar-text', 'ToolbarText'),
    component('toolbar-control-group', 'ToolbarControlGroup', {
      parents: {
        mode: 'listed',
        entries: ['@kerfjs/ui:toolbar'],
      },
    }),
    component('segmented-control', 'SegmentedControl'),
    component('wa-button-group', 'WaButtonGroup'),
    component('token-search-field', 'TokenSearchField', {
      wiring: {
        required: true,
        helpers: ['wireTokenSearchFields'],
      },
    }),
    component('select', 'Select', {
      wiring: { required: true, helpers: ['@kerfjs/ui/select/register'] },
    }),
    component('workbench', 'Workbench', {
      boundaries: {
        publicClasses: [
          'kui-workbench',
          'kui-workbench__rail',
          'kui-workbench__rail--left',
          'kui-workbench__rail--right',
          'kui-workbench__center',
          'kui-workbench__main',
          'kui-workbench__drawer',
          'kui-workbench__panel-content',
        ],
        publicTokens: [
          '--kui-workbench-rail-width',
          '--kui-workbench-drawer-height',
        ],
      },
    }),
  ],
};

export const selectionCatalog = {
  schemaVersion: 1,
  package: '@kerfjs/ui',
  entries: catalog.entries.map((entry) => ({
    id: entry.id,
    publicExports:
      entry.id === 'token-search-field'
        ? [entry.name, 'wireTokenSearchFields']
        : [entry.name],
    delivery:
      entry.id === 'workbench'
        ? { moduleImport: '@kerfjs/ui/workbench' }
        : { browserImport: `@kerfjs/ui/${entry.id}` },
    wiring:
      entry.id === 'token-search-field'
        ? [
            {
              export: 'wireTokenSearchFields',
              import: '@kerfjs/ui/wire-token-search-fields',
              required: true,
            },
          ]
        : [],
  })),
};

export const profile = {
  schemaVersion: 1,
  scope: 'package',
  preferences: {
    'segmented-choice': {
      preferred: '@kerfjs/ui:segmented-control',
      avoid: ['@kerfjs/ui:wa-button-group'],
      rationale: 'Use the Kerf interaction contract.',
    },
  },
};

export const uiSettings = (overrides = {}) => ({
  kerfjs: {
    ui: {
      catalog,
      selectionCatalog,
      profile,
      profileContractPath: resolve(
        import.meta.dirname,
        '../../../ui/ai/application-ui-profile-sync.cjs',
      ),
      workspaceRoot: process.cwd(),
      ...overrides,
    },
  },
});
import process from 'node:process';
import { resolve } from 'node:path';
