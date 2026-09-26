import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CatalogError,
  exportedNamesFromSource,
  formatCatalog,
  generateCatalogs,
  runCatalogCommand,
  validateDocumentAgainstSchema,
} from '../catalog.js';
import { validateCatalogV2 } from '../../ui/scripts/component-catalog-v2-validation.mjs';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(packageRoot, 'index.js');

function scaffold(name = 'my-widgets') {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'kerf-catalog-'));
  const target = join(temporaryRoot, name);
  execFileSync(process.execPath, [cli, target]);
  return { temporaryRoot, target };
}

function withScaffold(fn) {
  const fixture = scaffold();
  try {
    return fn(fixture);
  } finally {
    rmSync(fixture.temporaryRoot, { recursive: true, force: true });
  }
}

function metadata(target) {
  return JSON.parse(readFileSync(join(target, 'kerf.components.json'), 'utf8'));
}

function writeMetadata(target, value) {
  writeFileSync(
    join(target, 'kerf.components.json'),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

test('generates deterministic schema-valid v2 metadata and checks drift', () => {
  withScaffold(({ target }) => {
    const [first] = runCatalogCommand({ root: target });
    const firstOutput = readFileSync(first.outputPath, 'utf8');
    assert.deepEqual(validateCatalogV2(first.catalog), []);
    assert.equal(first.catalog.package, 'my-widgets');
    assert.equal(first.catalog.entries[0].purpose.includes('counter'), true);
    assert.deepEqual(first.catalog.entries[0].publicExports[0], {
      name: 'Counter',
      subpath: '.',
    });
    assert.deepEqual(first.catalog.entries[0].sourceLinks, [
      'README.md#use-it',
      'src/counter.tsx',
    ]);
    assert.equal(first.catalog.entries[0].boundaries.rootClass, 'kerf-counter');

    const [second] = runCatalogCommand({ root: target });
    assert.equal(readFileSync(second.outputPath, 'utf8'), firstOutput);
    assert.equal(firstOutput, formatCatalog(second.catalog));
    assert.doesNotThrow(() => runCatalogCommand({ root: target, check: true }));

    const invalidOutput = JSON.parse(firstOutput);
    invalidOutput.entries[0].layout.geometry.shadowOwner = 'self';
    writeFileSync(second.outputPath, JSON.stringify(invalidOutput));
    assert.throws(
      () => runCatalogCommand({ root: target, check: true }),
      (error) =>
        error instanceof CatalogError &&
        error.diagnostics.some((diagnostic) =>
          diagnostic.endsWith(
            '.entries[0].layout.geometry.shadowOwner: additional property is not allowed',
          ),
        ),
    );

    writeFileSync(second.outputPath, `${firstOutput}\n`);
    assert.throws(
      () => runCatalogCommand({ root: target, check: true }),
      (error) =>
        error instanceof CatalogError &&
        error.diagnostics.some((diagnostic) => diagnostic.includes('is stale')),
    );
  });
});

test('generates a valid empty catalog for a newly initialized consumer app', () => {
  withScaffold(({ target }) => {
    const value = metadata(target);
    value.components = [];
    writeMetadata(target, value);
    const [result] = runCatalogCommand({ root: target });
    assert.deepEqual(result.catalog.entries, []);
    assert.deepEqual(validateCatalogV2(result.catalog), []);
    assert.doesNotThrow(() => runCatalogCommand({ root: target, check: true }));
  });
});

test('reports renamed public exports instead of guessing replacements', () => {
  withScaffold(({ target }) => {
    const value = metadata(target);
    value.components[0].publicExports[0].name = 'RenamedCounter';
    writeMetadata(target, value);
    assert.throws(
      () => generateCatalogs(target),
      (error) =>
        error instanceof CatalogError &&
        error.diagnostics.some((diagnostic) =>
          diagnostic.includes('RenamedCounter is not exported'),
        ),
    );
  });
});

test('requires an explicit public geometry root', () => {
  withScaffold(({ target }) => {
    const value = metadata(target);
    value.components[0].boundaries.rootClass = 'private-counter-root';
    writeMetadata(target, value);
    assert.throws(
      () => generateCatalogs(target),
      (error) =>
        error instanceof CatalogError &&
        error.diagnostics.some((diagnostic) =>
          diagnostic.includes(
            'boundaries.rootClass: expected null or one publicClasses entry',
          ),
        ),
    );
  });
});

test('reports deleted component sources', () => {
  withScaffold(({ target }) => {
    unlinkSync(join(target, 'src/counter.tsx'));
    assert.throws(
      () => generateCatalogs(target),
      (error) =>
        error instanceof CatalogError &&
        error.diagnostics.some((diagnostic) =>
          diagnostic.includes('source: file does not exist'),
        ),
    );
  });
});

test('reports duplicate ids and partial semantic or geometry annotations precisely', () => {
  withScaffold(({ target }) => {
    const duplicate = metadata(target);
    duplicate.components.push(
      JSON.parse(JSON.stringify(duplicate.components[0])),
    );
    writeMetadata(target, duplicate);
    assert.throws(
      () => generateCatalogs(target),
      (error) =>
        error instanceof CatalogError &&
        error.diagnostics.some((diagnostic) =>
          diagnostic.includes('duplicate component id'),
        ),
    );

    const partial = metadata(target);
    partial.components.splice(1);
    delete partial.components[0].purpose;
    delete partial.components[0].composition.layout.geometry.padding;
    writeMetadata(target, partial);
    assert.throws(
      () => generateCatalogs(target),
      (error) => {
        assert.ok(error instanceof CatalogError);
        assert.ok(
          error.diagnostics.some((diagnostic) =>
            diagnostic.endsWith('.components[0].purpose: is required'),
          ),
        );
        assert.ok(
          error.diagnostics.some((diagnostic) =>
            diagnostic.endsWith(
              '.components[0].composition.layout.geometry.padding: is required',
            ),
          ),
        );
        return true;
      },
    );
  });
});

test('rejects unknown fields and wrong types at exact author metadata paths', () => {
  withScaffold(({ target }) => {
    const unknown = metadata(target);
    unknown.components[0].composition.layout.geometry.shadowOwner = 'self';
    writeMetadata(target, unknown);
    assert.throws(
      () => generateCatalogs(target),
      (error) => {
        assert.ok(error instanceof CatalogError);
        assert.ok(
          error.diagnostics.some((diagnostic) =>
            diagnostic.endsWith(
              '.components[0].composition.layout.geometry.shadowOwner: additional property is not allowed',
            ),
          ),
        );
        return true;
      },
    );

    const wrongType = metadata(target);
    wrongType.components[0].sourceLinks = 'README.md';
    writeMetadata(target, wrongType);
    assert.throws(
      () => generateCatalogs(target),
      (error) =>
        error instanceof CatalogError &&
        error.diagnostics.some((diagnostic) =>
          diagnostic.endsWith('.components[0].sourceLinks: expected array'),
        ),
    );
  });
});

function withStateAttributes(target, stateAttributes) {
  const value = metadata(target);
  value.components[0].composition.wiring.stateAttributes = stateAttributes;
  writeMetadata(target, value);
}

function assertCatalogDiagnostic(target, suffix) {
  assert.throws(
    () => generateCatalogs(target),
    (error) => {
      assert.ok(error instanceof CatalogError);
      assert.ok(
        error.diagnostics.some((diagnostic) => diagnostic.endsWith(suffix)),
        `expected a diagnostic ending in ${suffix}, got:\n${error.diagnostics.join('\n')}`,
      );
      return true;
    },
  );
}

const pressedAttribute = {
  name: 'data-pressed',
  on: 'kerf-counter__button',
  helper: 'wireCounter',
  meaning: 'Present while the pointer holds a step button down.',
};

test('passes declared wiring-owned state attributes through to the v2 catalog', () => {
  withScaffold(({ target }) => {
    withStateAttributes(target, [pressedAttribute]);
    const [result] = runCatalogCommand({ root: target });
    assert.deepEqual(result.catalog.entries[0].wiring.stateAttributes, [
      pressedAttribute,
    ]);
    assert.deepEqual(validateCatalogV2(result.catalog), []);
    assert.deepEqual(
      JSON.parse(readFileSync(result.outputPath, 'utf8')).entries[0].wiring
        .stateAttributes,
      [pressedAttribute],
    );

    const withoutDeclaration = metadata(target);
    delete withoutDeclaration.components[0].composition.wiring.stateAttributes;
    writeMetadata(target, withoutDeclaration);
    const [withoutAttributes] = generateCatalogs(target);
    assert.equal(
      'stateAttributes' in withoutAttributes.catalog.entries[0].wiring,
      false,
    );
  });
});

test('rejects malformed wiring-owned state attributes at exact paths', () => {
  withScaffold(({ target }) => {
    const wiring = '.components[0].composition.wiring.stateAttributes';

    withStateAttributes(target, 'data-pressed');
    assertCatalogDiagnostic(target, `${wiring}: expected array`);

    withStateAttributes(target, [{ ...pressedAttribute, name: 'pressed' }]);
    assertCatalogDiagnostic(
      target,
      `${wiring}[0].name: must match ^data-[a-z0-9]+(-[a-z0-9]+)*$`,
    );

    withStateAttributes(target, [{ ...pressedAttribute, on: '' }]);
    assertCatalogDiagnostic(
      target,
      `${wiring}[0].on: expected at least 1 character(s)`,
    );

    const withoutMeaning = { ...pressedAttribute };
    delete withoutMeaning.meaning;
    withStateAttributes(target, [withoutMeaning]);
    assertCatalogDiagnostic(target, `${wiring}[0].meaning: is required`);

    withStateAttributes(target, [{ ...pressedAttribute, owner: 'app' }]);
    assertCatalogDiagnostic(
      target,
      `${wiring}[0].owner: additional property is not allowed`,
    );

    withStateAttributes(target, [pressedAttribute, pressedAttribute]);
    assertCatalogDiagnostic(
      target,
      'composition.wiring.stateAttributes.data-pressed.name: declared more than once',
    );

    withStateAttributes(target, [
      { ...pressedAttribute, helper: 'wireSomethingElse' },
    ]);
    assertCatalogDiagnostic(
      target,
      'composition.wiring.stateAttributes.data-pressed.helper: wireSomethingElse is not listed in composition.wiring.helpers',
    );
  });
});

test('validates emitted catalogs against the shipped v2 schema', () => {
  withScaffold(({ target }) => {
    const [result] = generateCatalogs(target);
    const schema = JSON.parse(
      readFileSync(
        join(packageRoot, 'component-catalog-v2.schema.json'),
        'utf8',
      ),
    );
    result.catalog.entries[0].layout.geometry.shadowOwner = 'self';
    assert.deepEqual(
      validateDocumentAgainstSchema(
        result.catalog,
        schema,
        'component-catalog-v2.json',
      ),
      [
        'component-catalog-v2.json.entries[0].layout.geometry.shadowOwner: additional property is not allowed',
      ],
    );
    assert.deepEqual(
      schema,
      JSON.parse(
        readFileSync(
          join(
            packageRoot,
            '..',
            'ui',
            'ai',
            'component-catalog-v2.schema.json',
          ),
          'utf8',
        ),
      ),
    );
  });
});

test('discovers syntax-tree exports without accepting nested syntax or JSX text', () => {
  const names = exportedNamesFromSource(`
    // export const Commented = 1;
    /* export { BlockCommented }; */
    const string = "export function InAString() {}";
    const template = \`export { InATemplate }\`;
    const expression = /export\\s+class\\s+InARegex/;
    const ratio = 8 / 2;
    export const Real = ratio;
    export const { First, nested: { Second } } = value;
    const Local = 1;
    export { Local as Renamed, type SomeType };
    export { Original as ReExported, type ExternalType } from './other.js';
    export interface Shape { size: number }
    export type Model = { id: string };
    export declare function DeclaredApi(): void;
    export default function DefaultOnly() {}
    function outer() { const text = 'export const Nested = 1'; }
    export function View() {
      return <div>export const Phantom = 1;</div>;
    }
    export const AfterJsx = 2;
  `);
  assert.deepEqual([...names].sort(), [
    'AfterJsx',
    'DeclaredApi',
    'ExternalType',
    'First',
    'Model',
    'ReExported',
    'Real',
    'Renamed',
    'Second',
    'Shape',
    'SomeType',
    'View',
  ]);
});

test('commented and string-only exports do not satisfy public metadata', () => {
  withScaffold(({ target }) => {
    const value = metadata(target);
    value.components[0].publicExports[0].name = 'Phantom';
    writeMetadata(target, value);
    writeFileSync(
      join(target, 'src/counter.tsx'),
      `
        // export function Phantom() {}
        const prose = 'export { Phantom }';
        const matcher = /export\\s+const\\s+Phantom/;
        export function Actual() {
          return <p>export const Phantom = 1; {prose + matcher.source}</p>;
        }
      `,
    );
    assert.throws(
      () => generateCatalogs(target),
      (error) =>
        error instanceof CatalogError &&
        error.diagnostics.some((diagnostic) =>
          diagnostic.includes('Phantom is not exported'),
        ),
    );
  });
});

test('generates each configured package in a multi-package workspace', () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'kerf-workspace-'));
  try {
    writeFileSync(
      join(temporaryRoot, 'package.json'),
      JSON.stringify({ private: true, workspaces: ['packages/*'] }),
    );
    for (const name of ['alpha-widgets', 'beta-widgets']) {
      const target = join(temporaryRoot, 'packages', name);
      execFileSync(process.execPath, [cli, target]);
    }
    const results = runCatalogCommand({ root: temporaryRoot });
    assert.deepEqual(
      results.map((result) => result.catalog.package),
      ['alpha-widgets', 'beta-widgets'],
    );
    for (const result of results)
      assert.deepEqual(validateCatalogV2(result.catalog), []);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('published-package dry run includes source metadata and generated catalog', () => {
  withScaffold(({ target }) => {
    runCatalogCommand({ root: target });
    const output = execFileSync(
      'npm',
      ['pack', '--dry-run', '--ignore-scripts', '--json'],
      {
        cwd: target,
        encoding: 'utf8',
        env: {
          ...process.env,
          npm_config_cache: join(target, '.npm-cache'),
        },
      },
    );
    const [{ files }] = JSON.parse(output);
    const paths = files.map((file) => file.path);
    assert.ok(paths.includes('kerf.components.json'));
    assert.ok(paths.includes('component-catalog-v2.json'));
  });
});

test('the published generator package includes its bin and both schemas', () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'kerf-generator-pack-'));
  try {
    cpSync(packageRoot, join(temporaryRoot, 'package'), {
      recursive: true,
      filter: (source) => !source.includes(`${join('node_modules', '')}`),
    });
    const output = execFileSync(
      'npm',
      ['pack', '--dry-run', '--ignore-scripts', '--json'],
      {
        cwd: join(temporaryRoot, 'package'),
        encoding: 'utf8',
        env: {
          ...process.env,
          npm_config_cache: join(temporaryRoot, 'npm-cache'),
        },
      },
    );
    const [{ files }] = JSON.parse(output);
    const paths = files.map((file) => file.path);
    assert.ok(paths.includes('catalog.js'));
    assert.ok(paths.includes('component-metadata.schema.json'));
    assert.ok(paths.includes('component-catalog-v2.schema.json'));
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
