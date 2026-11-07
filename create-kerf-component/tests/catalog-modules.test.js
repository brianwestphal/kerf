// Unit tests for the catalog command's extracted modules: the schema
// validator, the component validators, and the selection catalog builder,
// exercised directly rather than through a scaffolded package.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { validateDocumentAgainstSchema } from '../catalog/schema-validate.js';
import { buildSelectionCatalog } from '../catalog/selection.js';
import {
  validateComponent,
  validateComposition,
  validateStringList,
} from '../catalog/validate-component.js';

test('schema validator reports each failure at its JSON path', () => {
  const schema = {
    type: 'object',
    required: ['id', 'tags'],
    additionalProperties: false,
    properties: {
      id: { type: 'string', minLength: 2, pattern: '^[a-z]+$' },
      tags: {
        type: 'array',
        minItems: 1,
        uniqueItems: true,
        items: { $ref: '#/$defs/tag' },
      },
      count: { type: 'integer', minimum: 1 },
      equals: { anyOf: [{ type: 'string' }, { type: 'boolean' }] },
      mode: { enum: ['a', 'b'] },
      version: { const: 1 },
      shape: {
        anyOf: [{ type: 'object', required: ['x'] }, { type: 'array' }],
      },
      broken: { $ref: '#/$defs/missing' },
    },
    $defs: { tag: { type: 'string' } },
  };
  assert.deepEqual(
    validateDocumentAgainstSchema(
      {
        id: 'A',
        tags: ['x', 'x', 3],
        count: 0,
        equals: 4,
        mode: 'c',
        version: 2,
        shape: {},
        broken: true,
        extra: true,
      },
      schema,
      'doc',
    ),
    [
      'doc.id: expected at least 2 character(s)',
      'doc.id: must match ^[a-z]+$',
      'doc.tags: expected unique items',
      'doc.tags[2]: expected string',
      'doc.count: expected a value >= 1',
      'doc.equals: expected string or boolean',
      'doc.mode: expected one of "a", "b"',
      'doc.version: expected 1',
      'doc.shape: does not match any allowed schema variant',
      'doc.broken: schema reference #/$defs/missing does not exist',
      'doc.extra: additional property is not allowed',
    ],
  );
  assert.deepEqual(validateDocumentAgainstSchema({}, schema, 'doc'), [
    'doc.id: is required',
    'doc.tags: is required',
  ]);
  assert.deepEqual(
    validateDocumentAgainstSchema({ id: 'ab', tags: ['x'] }, schema, 'doc'),
    [],
  );
  assert.throws(
    () => validateDocumentAgainstSchema(1, { $ref: 'other.json#/x' }, 'doc'),
    /unsupported schema reference/,
  );
});

test('string lists must be unique, non-empty strings', () => {
  const diagnostics = [];
  validateStringList(['a', 'b'], 'ok', diagnostics);
  validateStringList([], 'empty', diagnostics, { nonempty: true });
  validateStringList(['a', 'a'], 'dup', diagnostics);
  validateStringList(['a', ''], 'blank', diagnostics);
  validateStringList('a', 'scalar', diagnostics);
  assert.deepEqual(diagnostics, [
    'empty: expected a non-empty unique string list',
    'dup: expected a unique string list',
    'blank: expected a unique string list',
    'scalar: expected a unique string list',
  ]);
});

const validComposition = () => ({
  parents: { mode: 'any', entries: [] },
  contexts: [],
  zones: [
    {
      id: 'leading',
      jsx: { prop: 'leading' },
      accepts: ['item'],
      cardinality: { min: 0, max: 'unbounded' },
      exclusiveWith: [],
    },
  ],
  children: { mode: 'none', concepts: [], requiredConcepts: [] },
  state: [{ id: 'open', owner: 'application', required: false }],
  wiring: { required: false, helpers: [], obligations: [] },
  responsive: { owner: 'not-applicable', behaviors: [] },
  layout: {
    roles: ['structure'],
    geometry: { margin: 'self', border: 'self', padding: 'self' },
  },
});

test('composition validator accepts a consistent block', () => {
  const diagnostics = [];
  validateComposition(
    { composition: validComposition() },
    'pkg:x',
    diagnostics,
    '.',
  );
  assert.deepEqual(diagnostics, []);
});

test('composition validator reports inconsistent zones, state, wiring, and layout', () => {
  const composition = validComposition();
  composition.zones.push({
    id: 'leading',
    jsx: { prop: 'leading' },
    accepts: ['item'],
    cardinality: { min: 2, max: 1 },
    exclusiveWith: ['nowhere'],
  });
  composition.children = {
    mode: 'listed',
    concepts: ['row'],
    requiredConcepts: ['cell'],
  };
  composition.state.push({ id: 'open', owner: 'nobody', required: 'yes' });
  composition.wiring = {
    required: true,
    helpers: [],
    obligations: [],
    stateAttributes: [{ name: 'aria-open', helper: 'wireX' }],
  };
  composition.layout.geometry.padding = 'inherited';
  const diagnostics = [];
  validateComposition({ composition }, 'pkg:x', diagnostics, '.');
  assert.deepEqual(diagnostics, [
    'pkg:x.composition.zones.leading.id: expected a unique non-empty id',
    'pkg:x.composition.zones.leading.jsx.prop: leading already fills another zone',
    'pkg:x.composition.zones.leading.cardinality.max: expected unbounded or an integer >= min',
    'pkg:x.composition.zones.leading.exclusiveWith: unknown or self-referential zone nowhere',
    'pkg:x.composition.children.requiredConcepts: cell is not an allowed concept',
    'pkg:x.composition.state: state ids must be unique and non-empty',
    'pkg:x.composition.state.open.owner: invalid owner',
    'pkg:x.composition.state.open.required: expected boolean',
    'pkg:x.composition.wiring: required wiring names at least one helper or action',
    'pkg:x.composition.wiring.stateAttributes.aria-open.name: expected a data-* attribute name',
    'pkg:x.composition.wiring.stateAttributes.aria-open.on: expected a non-empty string',
    'pkg:x.composition.wiring.stateAttributes.aria-open.meaning: expected a non-empty string',
    'pkg:x.composition.wiring.stateAttributes.aria-open.helper: wireX is not listed in composition.wiring.helpers',
    'pkg:x.composition.layout.geometry.padding: invalid geometry owner',
  ]);
});

test('component validator checks decisions, exports, boundaries, and diagnostic ids', () => {
  const root = mkdtempSync(join(tmpdir(), 'kerf-catalog-modules-'));
  try {
    mkdirSync(join(root, 'src'));
    writeFileSync(
      join(root, 'src/meter.tsx'),
      'export function Meter() { return null; }\n',
    );
    const packageJson = {
      name: 'acme',
      exports: { './meter': { import: './dist/meter.js' } },
    };
    const component = {
      id: 'meter',
      name: 'Meter',
      kind: 'component',
      purpose: 'Shows a value.',
      source: 'src/meter.tsx',
      publicExports: [
        { name: 'Meter', subpath: './meter' },
        { name: 'Gauge', subpath: './meter' },
        { name: 'Dial' },
      ],
      sourceLinks: ['src/meter.tsx', 'docs/missing.md#usage'],
      composition: validComposition(),
      boundaries: {
        rootClass: null,
        publicClasses: ['acme-meter'],
        placeableClasses: ['acme-other'],
        publicTokens: [],
      },
      accessibility: { obligations: [] },
      diagnostics: [{ id: 'KUI-C001', severity: 'fatal' }],
      provenance: { selection: 'authored', composition: 'authored' },
    };
    const ids = new Set();
    const diagnosticIds = new Set(['KUI-C001']);
    const diagnostics = [];
    validateComponent(
      component,
      root,
      packageJson,
      ids,
      diagnosticIds,
      diagnostics,
    );
    assert.deepEqual(diagnostics, [
      'acme:meter.publicExports: Gauge is not exported by src/meter.tsx',
      'acme:meter.publicExports: every export requires name and subpath (only a private application, package.json#private, may omit subpath)',
      'acme:meter.sourceLinks: local source link does not exist: docs/missing.md#usage',
      'acme:meter.boundaries.placeableClasses: acme-other is not one of publicClasses',
      'acme:meter.diagnostics: ids must be unique KUI-C### values',
      'acme:meter.diagnostics.KUI-C001.severity: invalid severity',
      'acme:meter.diagnostics.KUI-C001: when and message are required',
    ]);
    assert.deepEqual([...ids], ['meter']);

    // A private application may name a source-only export, checked against
    // the component's own source file; a second component with the same id
    // is a duplicate.
    const privateDiagnostics = [];
    validateComponent(
      {
        ...component,
        publicExports: [{ name: 'Meter' }, { name: 'Missing' }],
        sourceLinks: ['src/meter.tsx'],
        boundaries: { rootClass: null, publicClasses: [], publicTokens: [] },
        diagnostics: [],
      },
      root,
      { name: 'acme-app', private: true },
      ids,
      new Set(),
      privateDiagnostics,
    );
    assert.deepEqual(privateDiagnostics, [
      'acme-app:meter.id: duplicate component id',
      'acme-app:meter.publicExports: Missing is not exported by src/meter.tsx',
    ]);

    // A missing decision is reported rather than inferred.
    const undecided = [];
    validateComponent(
      { id: 'blank' },
      root,
      packageJson,
      new Set(),
      new Set(),
      undecided,
    );
    assert.ok(
      undecided.includes(
        'acme:blank.composition.layout.geometry.margin: author decision required; the generator does not infer semantics or geometry from rendered appearance',
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('selection builder rejects selection metadata without a selectionOutput', () => {
  const diagnostics = [];
  const catalog = buildSelectionCatalog({
    packageRoot: '.',
    packageJson: { name: 'acme' },
    metadata: {
      description: 'Widgets.',
      components: [{ id: 'meter', selection: { useWhen: [], avoidWhen: [] } }],
    },
    metadataPath: 'kerf.components.json',
    outputPath: 'component-composition.json',
    selectionOutputPath: null,
    diagnostics,
  });
  assert.equal(catalog, null);
  assert.deepEqual(diagnostics, [
    'kerf.components.json: description is emitted only to a selection catalog; configure package.json#kerfComponentCatalog.selectionOutput or remove it',
    'kerf.components.json: components.meter.selection is emitted only to a selection catalog; configure package.json#kerfComponentCatalog.selectionOutput or remove it',
  ]);
});
