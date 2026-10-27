import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sketchModule = { exports: {} };
vm.runInNewContext(
  readFileSync(new URL('./tasks/migrate.js', import.meta.url), 'utf8'),
  { module: sketchModule },
  { filename: 'tasks/migrate.js' },
);
const migration = sketchModule.exports;

function layer(type, id, options = {}) {
  const frame = { x: 0, y: 0, width: 20, height: 12, ...options.frame };
  return {
    type,
    id,
    name: options.name ?? type,
    frame: { ...frame, toJSON: () => ({ ...frame }) },
    style: options.style ?? { fills: [], borders: [] },
    layers: options.layers ?? [],
    rotation: 0,
    isVisible: true,
    text: options.text,
    shapeType: options.shapeType,
    points: options.points,
    closed: options.closed,
  };
}

function trees() {
  const oldSwatch = { id: 'shared-text' };
  const checkerSwatch = { id: 'shared-checker' };
  const existing = layer('Group', 'root', {
    layers: [
      layer('Text', 'label', {
        text: 'COLOR',
        style: {
          fontFamily: 'system',
          fills: [{ color: '#222222', swatch: oldSwatch }],
          borders: [],
        },
      }),
      layer('Group', 'color-well', {
        layers: [
          layer('Rectangle', 'gradient', {
            style: {
              fills: [{ color: '#ffffff', gradient: { stops: [0, 1] } }],
              borders: [],
            },
          }),
          layer('Rectangle', 'checker-a', {
            style: {
              fills: [{ color: '#888888', swatch: checkerSwatch }],
              borders: [],
            },
          }),
          layer('ShapePath', 'checker-b', {
            shapeType: 'Path',
            points: [{ x: 0, y: 0 }],
            closed: true,
          }),
        ],
      }),
    ],
  });
  const incoming = layer('Group', 'new-root', {
    layers: [
      layer('Text', 'new-label', {
        text: 'ACCENT',
        frame: { width: 36 },
        style: {
          fontFamily: 'Inter',
          fills: [{ color: '#222222' }],
          borders: [],
        },
      }),
      layer('Group', 'new-well', {
        layers: [
          layer('Rectangle', 'new-gradient', {
            style: {
              fills: [{ color: '#ffffff', gradient: { stops: [0, 0.5, 1] } }],
              borders: [],
            },
          }),
          layer('Rectangle', 'new-checker-a', {
            style: { fills: [{ color: '#888888' }], borders: [] },
          }),
          layer('ShapePath', 'new-checker-b', {
            shapeType: 'Path',
            points: [{ x: 1, y: 1 }],
            closed: false,
          }),
        ],
      }),
    ],
  });
  return { existing, incoming, oldSwatch, checkerSwatch };
}

test('edited text, gradients, and checkerboard vectors update in place', () => {
  const { existing, incoming, oldSwatch, checkerSwatch } = trees();
  const pairs = migration.plan(existing, incoming, 'color-picker-light', [
    { id: 'label', value: 'COLOR' },
  ]);
  assert.equal(pairs.length, 6);
  migration.apply(pairs);
  assert.equal(existing.layers[0].id, 'label');
  assert.equal(existing.layers[0].text, 'ACCENT');
  assert.equal(existing.layers[0].frame.width, 36);
  assert.equal(existing.layers[0].style.fontFamily, 'system');
  assert.equal(existing.layers[0].style.fills[0].swatch, oldSwatch);
  const well = existing.layers[1];
  assert.equal(well.layers[0].id, 'gradient');
  assert.deepEqual(well.layers[0].style.fills[0].gradient.stops, [0, 0.5, 1]);
  assert.equal(well.layers[1].style.fills[0].swatch, checkerSwatch);
  assert.equal(well.layers[2].id, 'checker-b');
  assert.deepEqual(well.layers[2].points, [{ x: 1, y: 1 }]);
  assert.equal(well.layers[2].closed, false);
});

test('changed paint color does not retain an unrelated Color Variable', () => {
  const { existing, incoming } = trees();
  incoming.layers[0].style.fills[0].color = '#ff0000';
  migration.apply(
    migration.plan(existing, incoming, 'color-picker-light', [{ id: 'label' }]),
  );
  assert.equal(existing.layers[0].style.fills[0].swatch, undefined);
});

test('unsafe hierarchy change fails before any published layer is mutated', () => {
  const { existing, incoming } = trees();
  incoming.layers[1].layers.push(layer('Rectangle', 'new-checker-square'));
  assert.throws(
    () =>
      migration.plan(existing, incoming, 'color-picker-light', [
        { id: 'label' },
      ]),
    /layer count changed/,
  );
  assert.equal(existing.layers[0].text, 'COLOR');
  assert.deepEqual(
    existing.layers[1].layers[0].style.fills[0].gradient.stops,
    [0, 1],
  );
});

test('published Text ID and path type changes are rejected', () => {
  const { existing, incoming } = trees();
  assert.throws(
    () =>
      migration.plan(existing, incoming, 'color-picker-light', [
        { id: 'other' },
      ]),
    /Text IDs disagree/,
  );
  incoming.layers[1].layers[2].shapeType = 'Oval';
  assert.throws(
    () =>
      migration.plan(existing, incoming, 'color-picker-light', [
        { id: 'label' },
      ]),
    /path type changed/,
  );
});

test('reordered sibling Text nodes cannot silently exchange override IDs', () => {
  const existing = layer('Group', 'root', {
    layers: [
      layer('Text', 'title', { text: 'TITLE' }),
      layer('Text', 'value', { text: 'VALUE' }),
    ],
  });
  const incoming = layer('Group', 'new-root', {
    layers: [
      layer('Text', 'new-value', { text: 'VALUE' }),
      layer('Text', 'new-title', { text: 'TITLE' }),
    ],
  });
  assert.throws(
    () =>
      migration.plan(existing, incoming, 'select-light', [
        { id: 'title' },
        { id: 'value' },
      ]),
    /Text may have moved.*explicit override-key migration required/,
  );
  assert.equal(existing.layers[0].text, 'TITLE');
});
