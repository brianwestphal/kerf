import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
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
import { validateCatalogExtensionReferences } from '../../ui/scripts/component-catalog-extension-validation.mjs';
import { validateComposition } from '../../ui/scripts/component-composition-validation.mjs';

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

test('generates deterministic schema-valid composition metadata and checks drift', () => {
  withScaffold(({ target }) => {
    const [first] = runCatalogCommand({ root: target });
    const firstOutput = readFileSync(first.outputPath, 'utf8');
    assert.deepEqual(validateComposition(first.catalog), []);
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
    assert.deepEqual(validateComposition(result.catalog), []);
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

function makePrivateApplication(target) {
  const manifestPath = join(target, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.private = true;
  delete manifest.exports;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function withPublicExports(target, publicExports) {
  const value = metadata(target);
  value.components[0].publicExports = publicExports;
  writeMetadata(target, value);
}

const rejectsWith = (target, fragment) =>
  assert.throws(
    () => generateCatalogs(target),
    (error) =>
      error instanceof CatalogError &&
      error.diagnostics.some((diagnostic) => diagnostic.includes(fragment)),
  );

test('a private application declares exports by source without an exports map', () => {
  withScaffold(({ target }) => {
    makePrivateApplication(target);
    withPublicExports(target, [{ name: 'Counter' }]);
    const [result] = generateCatalogs(target);
    assert.deepEqual(result.catalog.entries[0].publicExports, [
      { name: 'Counter' },
    ]);
    assert.equal(result.catalog.entries[0].source, 'src/counter.tsx');
    assert.deepEqual(validateComposition(result.catalog), []);

    // The name is still verified, against the component's source file.
    withPublicExports(target, [{ name: 'RenamedCounter' }]);
    rejectsWith(target, 'RenamedCounter is not exported by src/counter.tsx');

    withPublicExports(target, [{ name: 'Counter' }, { name: 'Counter' }]);
    rejectsWith(target, 'publicExports: duplicate Counter');

    // A subpath a private application does declare is checked as before.
    withPublicExports(target, [{ name: 'Counter', subpath: './counter' }]);
    rejectsWith(target, 'package.json does not export subpath ./counter');

    withPublicExports(target, [{ name: 'Counter', subpath: null }]);
    rejectsWith(target, 'publicExports[0].subpath: expected string');
  });
});

test('a publishable package still requires an exports subpath', () => {
  withScaffold(({ target }) => {
    withPublicExports(target, [{ name: 'Counter' }]);
    rejectsWith(
      target,
      'only a private application, package.json#private, may omit subpath',
    );

    // `private` without an exports map is what opts in, not a missing map.
    const manifestPath = join(target, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    delete manifest.exports;
    writeFileSync(manifestPath, JSON.stringify(manifest));
    withPublicExports(target, [{ name: 'Counter', subpath: '.' }]);
    rejectsWith(target, 'package.json does not export subpath .');
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

test('accepts an explicit null root class as a decision, but not an absent one', () => {
  withScaffold(({ target }) => {
    const value = metadata(target);
    value.components[0].boundaries.rootClass = null;
    writeMetadata(target, value);
    const [result] = generateCatalogs(target);
    assert.equal(result.catalog.entries[0].boundaries.rootClass, null);

    delete value.components[0].boundaries.rootClass;
    writeMetadata(target, value);
    assertCatalogDiagnostic(target, '.boundaries.rootClass: is required');
  });
});

test('passes declared placeable classes and their root element through to the composition catalog', () => {
  withScaffold(({ target }) => {
    const value = metadata(target);
    Object.assign(value.components[0].boundaries, {
      publicClasses: ['kerf-counter', 'kerf-counter-row'],
      placeableClasses: ['kerf-counter-row'],
      rootElement: 'div',
    });
    writeMetadata(target, value);
    const [result] = runCatalogCommand({ root: target });
    const { boundaries } = result.catalog.entries[0];
    assert.deepEqual(boundaries.placeableClasses, ['kerf-counter-row']);
    assert.equal(boundaries.rootElement, 'div');
    assert.deepEqual(validateComposition(result.catalog), []);

    // Absent means none: every public class is rendered anatomy.
    delete value.components[0].boundaries.placeableClasses;
    delete value.components[0].boundaries.rootElement;
    writeMetadata(target, value);
    const [withoutPlaceable] = generateCatalogs(target);
    assert.equal(
      'placeableClasses' in withoutPlaceable.catalog.entries[0].boundaries,
      false,
    );
  });
});

test('rejects placeable classes outside publicClasses and a root element without them', () => {
  withScaffold(({ target }) => {
    const value = metadata(target);
    value.components[0].boundaries.placeableClasses = ['kerf-counter-private'];
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      '.boundaries.placeableClasses: kerf-counter-private is not one of publicClasses',
    );

    value.components[0].boundaries.placeableClasses = [
      'kerf-counter',
      'kerf-counter',
    ];
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      '.boundaries.placeableClasses: expected unique items',
    );

    delete value.components[0].boundaries.placeableClasses;
    value.components[0].boundaries.rootElement = 'div';
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      '.boundaries.rootElement: requires a non-empty placeableClasses',
    );

    value.components[0].boundaries.placeableClasses = ['kerf-counter'];
    value.components[0].boundaries.rootElement = 'Div';
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      '.boundaries.rootElement: must match ^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$',
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

test('passes declared wiring-owned state attributes through to the composition catalog', () => {
  withScaffold(({ target }) => {
    withStateAttributes(target, [pressedAttribute]);
    const [result] = runCatalogCommand({ root: target });
    assert.deepEqual(result.catalog.entries[0].wiring.stateAttributes, [
      pressedAttribute,
    ]);
    assert.deepEqual(validateComposition(result.catalog), []);
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

function withRendersAs(target, rendersAs) {
  const value = metadata(target);
  if (rendersAs === undefined) delete value.components[0].composition.rendersAs;
  else value.components[0].composition.rendersAs = rendersAs;
  writeMetadata(target, value);
}

function installCatalog(target, name, keys, manifest = {}) {
  const root = join(target, 'node_modules', ...name.split('/'));
  mkdirSync(join(root, 'ai'), { recursive: true });
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name, ...manifest }),
  );
  const catalogPath = manifest.kerfComponentCatalog
    ? join(root, manifest.kerfComponentCatalog.output)
    : join(root, 'ai', 'component-composition.json');
  writeFileSync(
    catalogPath,
    JSON.stringify({
      package: name,
      entries: keys.map((id) => ({ key: `${name}:${id}`, id })),
    }),
  );
}

test('passes a resolvable rendersAs declaration through to the composition catalog', () => {
  withScaffold(({ target }) => {
    installCatalog(target, '@kerfjs/ui', [
      'toolbar-control-group',
      'toolbar-text',
    ]);
    installCatalog(target, '@acme/widgets', ['picker'], {
      kerfComponentCatalog: {
        source: './kerf.components.json',
        output: './widgets-catalog.json',
      },
    });
    withRendersAs(target, [
      '@kerfjs/ui:toolbar-control-group',
      '@kerfjs/ui:toolbar-text',
      '@acme/widgets:picker',
    ]);
    const [result] = generateCatalogs(target);
    assert.deepEqual(result.catalog.entries[0].rendersAs, [
      '@kerfjs/ui:toolbar-control-group',
      '@kerfjs/ui:toolbar-text',
      '@acme/widgets:picker',
    ]);
    assert.deepEqual(validateComposition(result.catalog), []);

    // Undeclared, the entry carries no rendersAs at all.
    withRendersAs(target, undefined);
    assert.equal(
      'rendersAs' in generateCatalogs(target)[0].catalog.entries[0],
      false,
    );
  });
});

test('rejects a rendersAs root that does not resolve to a cataloged entry', () => {
  withScaffold(({ target }) => {
    const at = 'components.counter.composition.rendersAs';
    installCatalog(target, '@kerfjs/ui', ['toolbar-control-group']);

    withRendersAs(target, ['@kerfjs/ui:toolbar-group']);
    assertCatalogDiagnostic(
      target,
      `${at}: @kerfjs/ui:toolbar-group is not an entry in @kerfjs/ui's catalog`,
    );

    withRendersAs(target, ['@nowhere/pkg:thing']);
    assertCatalogDiagnostic(
      target,
      `${at}: cannot resolve a component catalog for package @nowhere/pkg; install it or generate its catalog`,
    );

    withRendersAs(target, ['my-widgets:counter']);
    assertCatalogDiagnostic(
      target,
      `${at}: my-widgets:counter names the component itself`,
    );

    withRendersAs(target, ['toolbar-control-group']);
    assertCatalogDiagnostic(
      target,
      '.components[0].composition.rendersAs[0]: must match ^[^:]+:[^:]+$',
    );

    withRendersAs(target, []);
    assertCatalogDiagnostic(
      target,
      '.components[0].composition.rendersAs: expected at least 1 item(s)',
    );
  });
});

function withInsetFree(target, field, conditions) {
  const value = metadata(target);
  if (conditions === undefined) delete value.components[0].composition[field];
  else value.components[0].composition[field] = conditions;
  writeMetadata(target, value);
}

test('passes insetFreeChildren and insetFreeWhen through to the composition catalog', () => {
  withScaffold(({ target }) => {
    const children = [
      { prop: 'appearance', equals: 'embedded' },
      { prop: 'density', equals: 2 },
    ];
    const when = [
      { prop: 'flush', equals: true },
      { prop: 'variant', equals: 'span' },
    ];
    withInsetFree(target, 'insetFreeChildren', children);
    withInsetFree(target, 'insetFreeWhen', when);
    const [result] = runCatalogCommand({ root: target });
    assert.deepEqual(result.catalog.entries[0].insetFreeChildren, children);
    assert.deepEqual(result.catalog.entries[0].insetFreeWhen, when);
    // The generated entry satisfies the @kerfjs/ui-side validator too.
    assert.deepEqual(validateComposition(result.catalog), []);
    const written = JSON.parse(readFileSync(result.outputPath, 'utf8'));
    assert.deepEqual(written.entries[0].insetFreeChildren, children);
    assert.deepEqual(written.entries[0].insetFreeWhen, when);
    assert.doesNotThrow(() => runCatalogCommand({ root: target, check: true }));

    // Undeclared, the entry carries neither field.
    withInsetFree(target, 'insetFreeChildren', undefined);
    withInsetFree(target, 'insetFreeWhen', undefined);
    const [entry] = generateCatalogs(target)[0].catalog.entries;
    assert.equal('insetFreeChildren' in entry, false);
    assert.equal('insetFreeWhen' in entry, false);
  });
});

test('passes interactive-content rules through to the composition catalog', () => {
  withScaffold(({ target }) => {
    const content = {
      interactive: [{ kind: 'root', whenProps: ['href'] }],
      exports: { CounterLink: { interactive: [{ kind: 'root' }] } },
    };
    withInsetFree(target, 'content', content);
    const [result] = runCatalogCommand({ root: target });
    assert.deepEqual(result.catalog.entries[0].content, content);
    assert.deepEqual(validateComposition(result.catalog), []);
    withInsetFree(target, 'content', { interactive: [{ kind: 'button' }] });
    assert.throws(
      () => runCatalogCommand({ root: target }),
      /composition\.content\.interactive\[0\]\.kind/,
    );
    withInsetFree(target, 'content', undefined);
    const [entry] = generateCatalogs(target)[0].catalog.entries;
    assert.equal('content' in entry, false);
  });
});

test('rejects malformed inset-free conditions at exact metadata paths', () => {
  withScaffold(({ target }) => {
    const [validEntry] = generateCatalogs(target)[0].catalog.entries;
    for (const field of ['insetFreeChildren', 'insetFreeWhen']) {
      const at = `.components[0].composition.${field}`;
      const invalid = [
        [{ prop: 'appearance', equals: 'embedded' }, `${at}: expected array`],
        [[], `${at}: expected at least 1 item(s)`],
        [['flush'], `${at}[0]: expected object`],
        [[{ prop: 'flush' }], `${at}[0].equals: is required`],
        [[{ equals: true }], `${at}[0].prop: is required`],
        [
          [{ prop: 'data-flush', equals: true }],
          `${at}[0].prop: must match ^[A-Za-z][A-Za-z0-9]*$`,
        ],
        [
          [{ prop: 'flush', equals: null }],
          `${at}[0].equals: expected string or number or boolean`,
        ],
        [
          [{ prop: 'flush', equals: ['a'] }],
          `${at}[0].equals: expected string or number or boolean`,
        ],
        [
          [{ prop: 'flush', equals: true, value: true }],
          `${at}[0].value: additional property is not allowed`,
        ],
      ];
      for (const [conditions, diagnostic] of invalid) {
        withInsetFree(target, field, conditions);
        assertCatalogDiagnostic(target, diagnostic);
        // The ui-side validator rejects the same shape in a generated entry.
        const entry = { ...validEntry, [field]: conditions };
        assert.notDeepEqual(
          validateComposition({ ...uiCatalogShell(), entries: [entry] }),
          [],
          `ui validator should reject ${JSON.stringify(conditions)}`,
        );
      }
      withInsetFree(target, field, undefined);
    }
  });
});

function uiCatalogShell() {
  return {
    schemaVersion: 1,
    package: 'my-widgets',
    compatibility: {
      componentCatalog: 'not-applicable',
      identity: 'package:id',
    },
  };
}

test('validates emitted catalogs against the shipped composition schema', () => {
  withScaffold(({ target }) => {
    const [result] = generateCatalogs(target);
    const schema = JSON.parse(
      readFileSync(
        join(packageRoot, 'component-composition.schema.json'),
        'utf8',
      ),
    );
    result.catalog.entries[0].layout.geometry.shadowOwner = 'self';
    assert.deepEqual(
      validateDocumentAgainstSchema(
        result.catalog,
        schema,
        'component-composition.json',
      ),
      [
        'component-composition.json.entries[0].layout.geometry.shadowOwner: additional property is not allowed',
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
            'component-composition.schema.json',
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
      assert.deepEqual(validateComposition(result.catalog), []);
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
    assert.ok(paths.includes('component-composition.json'));
  });
});

test('the published generator package includes its bin and every schema', () => {
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
    assert.ok(paths.includes('component-composition.schema.json'));
    assert.ok(paths.includes('component-catalog-extension.schema.json'));
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

function withSelection(
  target,
  { selectionOutput = './component-catalog.json' } = {},
) {
  const packagePath = join(target, 'package.json');
  const manifest = JSON.parse(readFileSync(packagePath, 'utf8'));
  manifest.kerfComponentCatalog.selectionOutput = selectionOutput;
  writeFileSync(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);
  const value = metadata(target);
  value.description = 'Reusable counters composed with Kerf UI.';
  value.components[0].selection = {
    useWhen: ['A form needs a bounded numeric stepper with visible value.'],
    avoidWhen: ['The value is free-form numeric input; use a number field.'],
    styleSources: ['src/counter.css'],
    documentation: 'README.md#use-it',
  };
  writeMetadata(target, value);
  return value;
}

function selectionSchemaFromUi() {
  return JSON.parse(
    readFileSync(
      join(
        packageRoot,
        '..',
        'ui',
        'ai',
        'component-catalog-extension.schema.json',
      ),
      'utf8',
    ),
  );
}

test('emits the selection catalog from kerf.components.json and checks its drift', () => {
  withScaffold(({ target }) => {
    withSelection(target);
    const [result] = runCatalogCommand({ root: target });
    assert.equal(
      result.selectionOutputPath,
      join(target, 'component-catalog.json'),
    );
    assert.deepEqual(result.selection, {
      $schema:
        'https://raw.githubusercontent.com/brianwestphal/kerf/main/ui/ai/component-catalog-extension.schema.json',
      schemaVersion: 1,
      package: 'my-widgets',
      description: 'Reusable counters composed with Kerf UI.',
      entries: [
        {
          id: 'counter',
          name: 'Counter',
          kind: 'component',
          purpose:
            'Render a controlled counter with delegated increment and decrement actions.',
          useWhen: [
            'A form needs a bounded numeric stepper with visible value.',
          ],
          avoidWhen: [
            'The value is free-form numeric input; use a number field.',
          ],
          publicClasses: ['kerf-counter'],
          publicTokens: ['--kerf-counter-gap'],
          source: 'src/counter.tsx',
          styleSources: ['src/counter.css'],
          geometry: { margin: 'none', border: 'none', padding: 'none' },
          documentation: 'README.md#use-it',
        },
      ],
    });
    // The composition catalog points at the selection catalog it now ships.
    assert.equal(
      result.catalog.compatibility.componentCatalog,
      './component-catalog.json',
    );
    assert.deepEqual(validateComposition(result.catalog), []);
    // The emitted document satisfies the canonical UI selection contract and
    // its consumer-side reference checks.
    assert.deepEqual(
      validateDocumentAgainstSchema(
        result.selection,
        selectionSchemaFromUi(),
        'component-catalog.json',
      ),
      [],
    );
    assert.deepEqual(
      validateCatalogExtensionReferences(result.selection, { entries: [] }),
      [],
    );
    const written = readFileSync(result.selectionOutputPath, 'utf8');
    assert.equal(written, formatCatalog(result.selection));
    assert.doesNotThrow(() => runCatalogCommand({ root: target, check: true }));

    writeFileSync(result.selectionOutputPath, `${written}\n`);
    assert.throws(
      () => runCatalogCommand({ root: target, check: true }),
      (error) =>
        error instanceof CatalogError &&
        error.diagnostics.some((diagnostic) =>
          diagnostic.endsWith(
            'generated selection catalog is stale; run catalog:generate',
          ),
        ),
    );
    unlinkSync(result.selectionOutputPath);
    assert.throws(
      () => runCatalogCommand({ root: target, check: true }),
      (error) =>
        error instanceof CatalogError &&
        error.diagnostics.some((diagnostic) =>
          diagnostic.endsWith('generated selection catalog is missing'),
        ),
    );
  });
});

test('selection geometry derives from composition geometry, with an override for "composed"', () => {
  withScaffold(({ target }) => {
    const value = withSelection(target);
    value.components[0].composition.layout.geometry = {
      margin: 'parent',
      border: 'composed',
      padding: 'child',
      notes: ['The embedding pane positions the counter.'],
    };
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      'components.counter.selection.geometry: required because composition.layout.geometry uses "composed", which the selection catalog cannot express',
    );
    value.components[0].selection.geometry = {
      margin: 'parent',
      border: 'child',
      padding: 'child',
    };
    writeMetadata(target, value);
    assert.deepEqual(
      generateCatalogs(target)[0].selection.entries[0].geometry,
      {
        margin: 'parent',
        border: 'child',
        padding: 'child',
      },
    );

    delete value.components[0].selection.geometry;
    value.components[0].composition.layout.geometry.border = 'self';
    writeMetadata(target, value);
    assert.deepEqual(
      generateCatalogs(target)[0].selection.entries[0].geometry,
      {
        margin: 'parent',
        border: 'self',
        padding: 'child',
        notes: ['The embedding pane positions the counter.'],
      },
    );
  });
});

test('selection uses resolve to this package or the installed @kerfjs/ui catalog', () => {
  withScaffold(({ target }) => {
    const value = withSelection(target);
    const at = 'components.counter.selection.uses';
    value.components[0].selection.uses = ['chip'];
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      `${at}: cannot resolve chip; install @kerfjs/ui so its selection catalog ids can be checked`,
    );

    const uiAi = join(target, 'node_modules', '@kerfjs', 'ui', 'ai');
    mkdirSync(uiAi, { recursive: true });
    writeFileSync(
      join(uiAi, 'component-catalog.json'),
      JSON.stringify({ entries: [{ id: 'chip' }, { id: 'toolbar' }] }),
    );
    assert.deepEqual(generateCatalogs(target)[0].selection.entries[0].uses, [
      'chip',
    ]);

    value.components[0].selection.uses = ['chips'];
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      `${at}: chips is neither a component in this package nor a @kerfjs/ui catalog entry`,
    );

    value.components[0].selection.uses = ['counter'];
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      `${at}: counter names the component itself`,
    );

    value.components[0].selection.uses = [];
    writeFileSync(
      join(uiAi, 'component-catalog.json'),
      JSON.stringify({ entries: [{ id: 'counter' }] }),
    );
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      'components.counter.id duplicates a @kerfjs/ui catalog id, which the selection catalog cannot disambiguate',
    );
  });
});

test('selection metadata requires decisions and a configured output', () => {
  withScaffold(({ target }) => {
    // Selection facts with no configured output would be silently dropped.
    const value = metadata(target);
    value.description = 'Counters.';
    value.components[0].selection = { useWhen: ['a'], avoidWhen: ['b'] };
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      'description is emitted only to a selection catalog; configure package.json#kerfComponentCatalog.selectionOutput or remove it',
    );
    assertCatalogDiagnostic(
      target,
      'components.counter.selection is emitted only to a selection catalog; configure package.json#kerfComponentCatalog.selectionOutput or remove it',
    );

    const configured = withSelection(target);
    delete configured.description;
    delete configured.components[0].selection;
    writeMetadata(target, configured);
    assertCatalogDiagnostic(
      target,
      '.description: author decision required; the selection catalog needs a package description',
    );
    assertCatalogDiagnostic(
      target,
      'components.counter.selection: author decision required; selectionOutput is configured, so every component and composition needs useWhen and avoidWhen',
    );

    const recipe = withSelection(target);
    recipe.components[0].kind = 'recipe';
    writeMetadata(target, recipe);
    assertCatalogDiagnostic(
      target,
      'components.counter.selection: recipes are not selection catalog entries; remove it',
    );
    delete recipe.components[0].selection;
    writeMetadata(target, recipe);
    assert.deepEqual(generateCatalogs(target)[0].selection.entries, []);
    recipe.components[0].kind = 'component';
    writeMetadata(target, recipe);

    const paths = withSelection(target);
    paths.components[0].selection.demoSource = 'demo/counter.tsx';
    writeMetadata(target, paths);
    assertCatalogDiagnostic(
      target,
      'components.counter.selection: local path does not exist: demo/counter.tsx',
    );
    paths.components[0].selection.demoSource = 'src/counter.tsx';
    paths.components[0].selection.useWhen = [];
    writeMetadata(target, paths);
    assertCatalogDiagnostic(
      target,
      '.components[0].selection.useWhen: expected at least 1 item(s)',
    );

    const mismatch = withSelection(target);
    mismatch.componentCatalog = './elsewhere.json';
    writeMetadata(target, mismatch);
    assertCatalogDiagnostic(
      target,
      '.componentCatalog: ./elsewhere.json disagrees with the configured selectionOutput (./component-catalog.json); remove it or set it to "not-applicable"',
    );

    withSelection(target, { selectionOutput: './component-composition.json' });
    assertCatalogDiagnostic(
      target,
      'package.json#kerfComponentCatalog.selectionOutput: expected a path distinct from output',
    );
  });
});

test('passes zone jsx.prop through and rejects a prop that fills two zones', () => {
  withScaffold(({ target }) => {
    const value = metadata(target);
    const zone = (id, prop) => ({
      id,
      ...(prop ? { jsx: { prop } } : {}),
      accepts: ['content'],
      cardinality: { min: 0, max: 'unbounded' },
      exclusiveWith: [],
    });
    value.components[0].composition.zones = [
      zone('header', 'header'),
      zone('body', 'children'),
      zone('decoration'),
    ];
    writeMetadata(target, value);
    const [result] = generateCatalogs(target);
    assert.deepEqual(
      result.catalog.entries[0].zones.map((item) => item.jsx),
      [{ prop: 'header' }, { prop: 'children' }, undefined],
    );
    assert.deepEqual(validateComposition(result.catalog), []);

    value.components[0].composition.zones[2] = zone('decoration', 'header');
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      'composition.zones.decoration.jsx.prop: header already fills another zone',
    );

    value.components[0].composition.zones[2] = {
      ...zone('decoration'),
      jsx: { prop: '' },
    };
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      '.components[0].composition.zones[2].jsx.prop: expected at least 1 character(s)',
    );
    value.components[0].composition.zones[2] = {
      ...zone('decoration'),
      jsx: { prop: 'footer', slot: 'end' },
    };
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      '.components[0].composition.zones[2].jsx.slot: additional property is not allowed',
    );
  });
});

test('passes verified wiring sources and scope through to the composition catalog', () => {
  withScaffold(({ target }) => {
    const value = metadata(target);
    const wiring = value.components[0].composition.wiring;
    wiring.scope = 'module';
    wiring.sources = [
      {
        export: 'wireCounter',
        source: 'src/counter.tsx',
        returnsDisposer: false,
      },
    ];
    writeMetadata(target, value);
    const [result] = generateCatalogs(target);
    assert.equal(result.catalog.entries[0].wiring.scope, 'module');
    assert.deepEqual(result.catalog.entries[0].wiring.sources, [
      {
        export: 'wireCounter',
        source: 'src/counter.tsx',
        returnsDisposer: false,
      },
    ]);
    assert.deepEqual(validateComposition(result.catalog), []);

    wiring.sources[0].returnsDisposer = 'no';
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      'composition.wiring.sources[0].returnsDisposer: expected boolean',
    );
    wiring.sources[0].returnsDisposer = false;

    const at = 'composition.wiring.sources';
    wiring.sources = [{ export: 'wireCounter', source: 'src/missing.ts' }];
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      `${at}.wireCounter.source: file does not exist: src/missing.ts`,
    );
    wiring.sources = [{ export: 'wireCounter', source: 'src/index.ts' }];
    writeFileSync(join(target, 'src/index.ts'), 'export const other = 1;\n');
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      `${at}.wireCounter: wireCounter is not exported by src/index.ts`,
    );
    wiring.sources = [
      { export: 'createCounter', source: 'src/counter.tsx' },
      { export: 'createCounter', source: 'src/counter.tsx' },
    ];
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      `${at}.createCounter: createCounter is not listed in composition.wiring.helpers`,
    );
    assertCatalogDiagnostic(
      target,
      `${at}.createCounter: declared more than once`,
    );
    wiring.sources = [{ export: 'wireCounter' }];
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      '.components[0].composition.wiring.sources[0].source: is required',
    );
    delete wiring.sources;
    wiring.scope = 'page';
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      '.components[0].composition.wiring.scope: expected one of "application", "module"',
    );
  });
});

test('required wiring may be root-delegated actions instead of a helper', () => {
  withScaffold(({ target }) => {
    const value = metadata(target);
    const wiring = value.components[0].composition.wiring;
    wiring.helpers = [];
    wiring.actions = ['increment', 'decrement'];
    writeMetadata(target, value);
    const [result] = generateCatalogs(target);
    assert.deepEqual(result.catalog.entries[0].wiring.actions, [
      'increment',
      'decrement',
    ]);
    assert.deepEqual(validateComposition(result.catalog), []);

    wiring.actions = [];
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      'composition.wiring: required wiring names at least one helper or action',
    );
    wiring.actions = ['increment', 'increment'];
    writeMetadata(target, value);
    assertCatalogDiagnostic(
      target,
      '.components[0].composition.wiring.actions: expected unique items',
    );
  });
});
