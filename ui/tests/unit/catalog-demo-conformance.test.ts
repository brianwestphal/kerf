import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  analyzeCatalogDemoSource,
  analyzeCatalogShellSource,
  analyzeRecipeSource,
  applyCatalogDemoExceptions,
  catalogDemoConformanceRules,
  recipeClassVocabulary,
  recipeConformanceRules,
  validateCatalogDemoExceptionManifest,
} from '../../scripts/lib/catalog-demo-conformance.mjs';

const uiRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(
  import.meta.dirname,
  '../fixtures/catalog-demo-conformance',
);
const packageExports = new Set([
  '.',
  './catalog',
  './list-item',
  './state-banner',
]);

async function analyzeFixture(
  name: string,
  route: string,
  kind: 'component' | 'composition',
) {
  const absoluteFilePath = resolve(fixtureRoot, `${name}.tsx.fixture`);
  return analyzeCatalogDemoSource({
    route,
    kind,
    filePath: `tests/fixtures/catalog-demo-conformance/${name}.tsx.fixture`,
    absoluteFilePath,
    source: await readFile(absoluteFilePath, 'utf8'),
    uiRoot,
    packageExports,
  });
}

describe('Catalog demo conformance analysis', () => {
  it('reports malformed TSX with a stable source location instead of throwing', () => {
    const failures = analyzeCatalogDemoSource({
      route: 'malformed',
      kind: 'component',
      filePath: 'malformed.tsx',
      source: 'export const Demo = () => <CatalogExample>',
      uiRoot,
      packageExports,
    });
    expect(failures[0]).toMatchObject({
      rule: catalogDemoConformanceRules.parseError,
      file: 'malformed.tsx',
      line: 1,
    });
  });

  it('accepts nested focused specimens and explicit overlay skips', async () => {
    expect(
      await analyzeFixture('valid-focused', 'focused', 'component'),
    ).toEqual([]);
  });

  it('rejects local stylesheets, inline styles, and custom demo styling classes', () => {
    const failures = analyzeCatalogDemoSource({
      route: 'styled',
      kind: 'component',
      filePath: 'ux-demo/demos/styled.tsx',
      absoluteFilePath: resolve(uiRoot, 'ux-demo/demos/styled.tsx'),
      source: `
        import './styled.css';
        import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
        export function StyledDemo() {
          return <CatalogExampleStack rootAttributes={{ 'data-demo': 'styled' }}>
            <CatalogExample><div class="demo-styled" style="margin: 8px">Styled</div></CatalogExample>
          </CatalogExampleStack>;
        }
      `,
      uiRoot,
      packageExports,
    });
    expect(failures.map((failure) => failure.rule)).toEqual(
      expect.arrayContaining([
        catalogDemoConformanceRules.localStylesheet,
        catalogDemoConformanceRules.inlineStyle,
        catalogDemoConformanceRules.customStyleClass,
      ]),
    );
  });

  it('flags plain-text fragments passed as props, but not fragments with markup', () => {
    const failures = analyzeCatalogDemoSource({
      route: 'notes',
      kind: 'component',
      filePath: 'ux-demo/demos/notes.tsx',
      absoluteFilePath: resolve(uiRoot, 'ux-demo/demos/notes.tsx'),
      source: `
        import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
        export function NotesDemo() {
          return <CatalogExampleStack rootAttributes={{ 'data-demo': 'notes' }}>
            <CatalogExample label="a" note={<>Plain text.</>}><span>A</span></CatalogExample>
            <CatalogExample label="b" note={<>Uses <code>code</code>.</>}><span>B</span></CatalogExample>
            <CatalogExample label="c" note="Plain string."><span>C</span></CatalogExample>
          </CatalogExampleStack>;
        }
      `,
      uiRoot,
      packageExports,
    }).filter(
      (failure) =>
        failure.rule === catalogDemoConformanceRules.textFragmentProp,
    );
    expect(failures).toHaveLength(1);
    expect(failures[0].message).toContain('note');
  });

  it('requires composition demos to use the public example helpers too', async () => {
    expect(
      await analyzeFixture('valid-composition', 'composition', 'composition'),
    ).toEqual([]);
  });

  it.each([
    [
      'invalid-empty-example',
      'empty',
      catalogDemoConformanceRules.emptyExample,
    ],
    [
      'invalid-private-markup',
      'private-markup',
      catalogDemoConformanceRules.privateMarkup,
    ],
    [
      'invalid-private-import',
      'private-import',
      catalogDemoConformanceRules.publicImports,
    ],
  ])('rejects %s with a stable diagnostic id', async (name, route, rule) => {
    const failures = await analyzeFixture(name, route, 'component');
    expect(failures.map((failure) => failure.rule)).toContain(rule);
  });

  it('requires narrow, reviewed, non-stale exceptions', async () => {
    const file = 'ux-demo/demos/exceptional.tsx';
    const failures = (
      await analyzeFixture('exception-required', 'exceptional', 'component')
    ).map((failure) => ({ ...failure, file }));
    const rules = [
      catalogDemoConformanceRules.focusedHelpers,
      catalogDemoConformanceRules.rootAttributes,
    ];
    expect(
      applyCatalogDemoExceptions(failures, [
        {
          route: 'exceptional',
          file,
          rules,
          reason:
            'This fixture proves a reviewed exception can waive only its named structural rules.',
          reviewedIn: 'KF-VTDPPY',
        },
      ]),
    ).toEqual([]);
    expect(
      applyCatalogDemoExceptions(
        [],
        [
          {
            route: 'exceptional',
            file,
            rules: [catalogDemoConformanceRules.focusedHelpers],
            reason: 'This deliberately stale exception should fail closed.',
            reviewedIn: 'KF-VTDPPY',
          },
        ],
      ).map((failure) => failure.rule),
    ).toContain(catalogDemoConformanceRules.exceptionStale);
    expect(
      validateCatalogDemoExceptionManifest({
        schemaVersion: 2,
        exceptions: [],
      }).map((failure) => failure.rule),
    ).toEqual([catalogDemoConformanceRules.exceptionInvalid]);
  });

  it('pins the shell to kind-driven overlays and documented stage modes', async () => {
    const valid = await readFile(
      resolve(fixtureRoot, 'valid-shell.tsx.fixture'),
      'utf8',
    );
    const invalid = await readFile(
      resolve(fixtureRoot, 'invalid-shell.tsx.fixture'),
      'utf8',
    );
    expect(
      analyzeCatalogShellSource({ filePath: 'valid-shell.tsx', source: valid }),
    ).toEqual([]);
    expect(
      analyzeCatalogShellSource({
        filePath: 'invalid-shell.tsx',
        source: invalid,
      }).map((failure) => failure.rule),
    ).toEqual([
      catalogDemoConformanceRules.shellOverlay,
      catalogDemoConformanceRules.shellMode,
    ]);
  });
});

describe('Recipe conformance analysis', () => {
  const recipeExports = new Set([
    ...packageExports,
    './layout.css',
    './pane',
    './webawesome.css',
  ]);
  const allowedClasses = new Set([
    'kui-content',
    'kui-content-item',
    'hide-actions',
  ]);
  const analyze = (source: string) =>
    analyzeRecipeSource({
      route: 'recipe-styled',
      filePath: 'ux-demo/recipes/styled.tsx',
      absoluteFilePath: resolve(uiRoot, 'ux-demo/recipes/styled.tsx'),
      source,
      uiRoot,
      packageExports: recipeExports,
      allowedClasses,
    });

  it('accepts public stylesheets, component configuration, and the published class vocabulary', () => {
    expect(
      analyze(`
        import '@kerfjs/ui/layout.css';
        import '@kerfjs/ui/webawesome.css';
        import '@awesome.me/webawesome/dist/components/dialog/dialog.js';
        import { Pane } from '@kerfjs/ui/pane';
        export const render = () => (
          <Pane rootAttributes={{ 'data-recipe': 'recipe-styled' }}>
            <div class="kui-content-item">Owned geometry</div>
            <wa-dialog class="hide-actions" label="Details"></wa-dialog>
          </Pane>
        );
      `),
    ).toEqual([]);
  });

  it('rejects route stylesheets, inline styles, and styling-only classes with stable ids', () => {
    const failures = analyze(`
      import './styled.css';
      import '@awesome.me/webawesome/dist/styles/utilities.css';
      import { Pane } from '@kerfjs/ui/pane';
      export const render = () => (
        <section data-recipe="recipe-styled" class="recipe-shell kui-content">
          <Pane className="recipe-shell__main" />
          <wa-dialog style="--width: 40rem"></wa-dialog>
          <div style={{ margin: 8 }}></div>
        </section>
      );
    `);
    expect(failures.map(({ rule, line }) => [rule, line])).toEqual([
      [recipeConformanceRules.localStylesheet, 2],
      [recipeConformanceRules.localStylesheet, 3],
      [recipeConformanceRules.customStyleClass, 6],
      [recipeConformanceRules.customStyleClass, 7],
      [recipeConformanceRules.inlineStyle, 8],
      [recipeConformanceRules.inlineStyle, 9],
    ]);
    expect(failures[2]!.message).toContain('"recipe-shell"');
    expect(failures[2]!.message).not.toContain('kui-content');
  });

  it('rejects private or source imports and reports malformed TSX', () => {
    const failures = analyze(`
      import { Pane } from '@kerfjs/ui/src/pane';
      import { Hidden } from '@kerfjs/ui/not-exported';
      import { Private } from '../../src/pane.js';
      export const render = () => <Pane>
    `);
    expect(failures.map((failure) => failure.rule)).toEqual(
      expect.arrayContaining([
        recipeConformanceRules.publicImports,
        recipeConformanceRules.parseError,
      ]),
    );
    expect(
      failures.filter(
        (failure) => failure.rule === recipeConformanceRules.publicImports,
      ),
    ).toHaveLength(3);
  });

  it('derives the class vocabulary from the layout entry and themed Web Awesome entries only', async () => {
    const catalog = JSON.parse(
      await readFile(resolve(uiRoot, 'ai/component-catalog.json'), 'utf8'),
    );
    const vocabulary = recipeClassVocabulary(catalog);
    expect(vocabulary).toContain('kui-content');
    expect(vocabulary).toContain('kui-content-item');
    expect(vocabulary).toContain('kui-control-cluster');
    expect(vocabulary).toContain('hide-actions');
    expect(vocabulary).not.toContain('kui-pane__content');
    expect(vocabulary).not.toContain('kui-list-item');
    expect(recipeClassVocabulary({})).toEqual(new Set());
  });

  it('keeps every shipped recipe source free of route styling', async () => {
    const [catalog, packageJson] = await Promise.all([
      readFile(resolve(uiRoot, 'ai/component-catalog.json'), 'utf8').then(
        JSON.parse,
      ),
      readFile(resolve(uiRoot, 'package.json'), 'utf8').then(JSON.parse),
    ]);
    const directory = resolve(uiRoot, 'ux-demo/recipes');
    const files = await readdir(directory);
    expect(files.filter((file) => file.endsWith('.css'))).toEqual([]);
    for (const file of files.filter((name) => /\.tsx?$/.test(name))) {
      const absoluteFilePath = resolve(directory, file);
      expect(
        analyzeRecipeSource({
          route: file,
          filePath: `ux-demo/recipes/${file}`,
          absoluteFilePath,
          source: await readFile(absoluteFilePath, 'utf8'),
          uiRoot,
          packageExports: new Set(Object.keys(packageJson.exports)),
          allowedClasses: recipeClassVocabulary(catalog),
        }),
      ).toEqual([]);
    }
  });
});
