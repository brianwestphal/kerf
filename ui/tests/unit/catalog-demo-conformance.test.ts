import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  analyzeCatalogDemoSource,
  analyzeCatalogShellSource,
  applyCatalogDemoExceptions,
  catalogDemoConformanceRules,
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
