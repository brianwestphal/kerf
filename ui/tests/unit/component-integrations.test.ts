import { describe, expect, it } from 'vitest';

import {
  collectStyleImports,
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
        rootBarrel: true,
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

  it('keeps an opt-in styled subpath with a browser condition out of the root barrel', () => {
    const optIn = {
      entries: [
        {
          ...catalog.entries[0]!,
          delivery: {
            moduleImport: '@kerfjs/ui/example',
            browserImport: '@kerfjs/ui/example',
            manualCssImport: '@kerfjs/ui/example.css',
          },
        },
      ],
    };
    const surfaces = completeSurfaces();
    surfaces.barrelExports.clear();
    // An opt-in subpath needs no import in styles.css either.
    surfaces.styleImports.clear();
    const [integration] = deriveComponentIntegrations(optIn);
    expect(integration).toMatchObject({
      browserCondition: true,
      rootBarrel: false,
    });
    expect(validateComponentIntegrations([integration!], surfaces)).toEqual([]);
  });

  it('requires a root-barrel stylesheet to reach styles.css (KF-H29W31)', () => {
    const surfaces = completeSurfaces();
    surfaces.styleImports.clear();
    expect(
      validateComponentIntegrations(
        deriveComponentIntegrations(catalog),
        surfaces,
      ),
    ).toEqual([
      {
        surface: 'src/styles.css import',
        expected: './example.css',
        actual: 'missing',
      },
    ]);
  });

  it('collects nested stylesheet imports once each', async () => {
    const files: Record<string, string> = {
      layout: '@import "./pane.css";\n@import "./layout.css";',
      pane: '.kui-pane {}',
    };
    await expect(
      collectStyleImports(
        '@import "./layout.css";\n@import "./missing.css";',
        async (name) => files[name],
      ),
    ).resolves.toEqual(new Set(['layout', 'pane', 'missing']));
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
