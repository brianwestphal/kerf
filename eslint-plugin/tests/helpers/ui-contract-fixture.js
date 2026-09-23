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
          jsx: { prop: 'leading' },
          accepts: ['toolbar-text', 'toolbar-control-group'],
          cardinality: { min: 0, max: 'unbounded' },
        },
        {
          id: 'center',
          jsx: { prop: 'center' },
          accepts: ['toolbar-text'],
          cardinality: { min: 0, max: 1 },
        },
        {
          id: 'trailing',
          jsx: { prop: 'trailing' },
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
    component('pane', 'Pane', {
      zones: [
        {
          id: 'header',
          jsx: { prop: 'header' },
          accepts: ['toolbar'],
          cardinality: { min: 0, max: 1 },
        },
        {
          id: 'content',
          jsx: { prop: 'children' },
          accepts: ['pane-content'],
          cardinality: { min: 0, max: 'unbounded' },
        },
        {
          id: 'footer',
          accepts: ['toolbar'],
          cardinality: { min: 0, max: 1 },
        },
      ],
    }),
    component('tabs', 'AppTab', {
      parents: { mode: 'listed', entries: ['@kerfjs/ui:tab-bar'] },
      zones: [
        {
          id: 'close-icon',
          jsx: { prop: 'closeIcon' },
          accepts: ['lucide-icon'],
          cardinality: { min: 0, max: 1 },
        },
      ],
    }),
    component('tab-bar', 'TabBar', {
      zones: [
        {
          id: 'tabs',
          jsx: { prop: 'children' },
          accepts: ['tabs'],
          cardinality: { min: 1, max: 'unbounded' },
        },
      ],
    }),
    component('lucide-icon', 'LucideIcon'),
    component('split-view', 'SplitView', {
      zones: [
        {
          id: 'list',
          jsx: { prop: 'list' },
          accepts: ['list-region'],
          cardinality: { min: 1, max: 1 },
        },
        {
          id: 'detail',
          jsx: { prop: 'detail' },
          accepts: ['detail-region'],
          cardinality: { min: 1, max: 1 },
        },
      ],
    }),
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
        : entry.id === 'tabs'
          ? { browserImport: '@kerfjs/ui/app-tab' }
          : entry.id === 'tab-bar'
            ? { browserImport: '@kerfjs/ui/tab-bar' }
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
