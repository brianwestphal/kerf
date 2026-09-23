import { describe, expect, it } from 'vitest';

import {
  deriveComponentIntegrations,
  validateComponentIntegrations,
} from '../../scripts/lib/component-integrations.mjs';

const catalog = {
  entries: [
    {
      id: 'example',
      name: 'Example',
      source: 'kerf',
      kind: 'component',
      publicExports: ['Example', 'ExampleProps'],
      delivery: {
        browserImport: '@kerfjs/ui/example',
        manualCssImport: '@kerfjs/ui/example.css',
      },
      links: { catalogRoute: '?component=example' },
    },
    {
      id: 'recipe-example',
      name: 'Recipe',
      source: 'kerf',
      kind: 'recipe',
      publicExports: [],
      delivery: {},
      links: {},
    },
  ],
};

function completeSurfaces() {
  return {
    packageExports: {
      './example': {
        types: './dist/example.d.ts',
        browser: './dist/browser/example.js',
        import: './dist/example.js',
      },
      './example.css': './dist/styles/example.css',
    },
    tsupEntries: new Set(['example']),
    sourceModules: new Set(['example']),
    styleModules: new Set(['example']),
    barrelExports: new Set(['Example', 'ExampleProps']),
    styleImports: new Set(['example']),
    demoIds: new Set(['example']),
    demoModules: new Set(['example']),
    signatureSpecifiers: new Set(['@kerfjs/ui/example']),
  };
}

describe('component integration surface manifest', () => {
  it('derives first-party public components from catalog facts', () => {
    expect(deriveComponentIntegrations(catalog)).toEqual([
      {
        id: 'example',
        name: 'Example',
        module: 'example',
        specifier: '@kerfjs/ui/example',
        browserCondition: true,
        cssSpecifier: '@kerfjs/ui/example.css',
        publicExports: ['Example', 'ExampleProps'],
        catalogRoute: '?component=example',
      },
    ]);
  });

  it('reports every missing projection in one dry-run-friendly result', () => {
    const surfaces = completeSurfaces();
    surfaces.tsupEntries.clear();
    surfaces.demoIds.clear();
    surfaces.signatureSpecifiers.clear();
    surfaces.packageExports['./example'] = {
      types: './wrong.d.ts',
      browser: './wrong-browser.js',
      import: './wrong.js',
    };

    expect(
      validateComponentIntegrations(
        deriveComponentIntegrations(catalog),
        surfaces,
      ).map(({ surface }) => surface),
    ).toEqual([
      'package.json#exports../example',
      'tsup entries',
      'ux-demo registry',
      'AI public signatures',
    ]);
  });

  it('accepts a component whose complete integration projections agree', () => {
    expect(
      validateComponentIntegrations(
        deriveComponentIntegrations(catalog),
        completeSurfaces(),
      ),
    ).toEqual([]);
  });
});
