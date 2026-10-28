import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sketchModule = { exports: {} };
vm.runInNewContext(
  readFileSync(new URL('./migrate-layers.js', import.meta.url), 'utf8'),
  { module: sketchModule },
  { filename: 'migrate-layers.js' },
);
const { migrate, migrationPairs, retree } = sketchModule.exports;

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
    horizontalPins: options.horizontalPins ?? 1,
    text: options.text,
    shapeType: options.shapeType,
    points: options.points,
    closed: options.closed,
  };
}

function symbol(id, layers, width = 200) {
  return { id, frame: { width, height: 44 }, layers };
}

function trees() {
  const textSwatch = { id: 'shared-text' };
  const borderSwatch = { id: 'shared-border' };
  const existing = symbol('master', [
    layer('Group', 'capture', {
      layers: [
        layer('ShapePath', 'border', {
          shapeType: 'Rectangle',
          points: [{ x: 0, y: 0 }],
          closed: true,
          style: {
            fills: [],
            borders: [{ color: '#00001c2e', swatch: borderSwatch }],
          },
        }),
        layer('Text', 'value', {
          text: 'Northstar Migration',
          style: { fills: [{ color: '#1d1d1fff', swatch: textSwatch }] },
        }),
      ],
    }),
  ]);
  const incoming = symbol(
    'preview',
    [
      layer('Group', 'new-capture', {
        layers: [
          layer('ShapePath', 'new-border', {
            shapeType: 'Rectangle',
            points: [{ x: 1, y: 1 }],
            closed: false,
            horizontalPins: 5,
            style: { fills: [], borders: [{ color: '#00001c2e' }] },
          }),
          layer('Text', 'new-value', {
            text: 'Northstar Rollout',
            frame: { width: 120 },
            style: { fills: [{ color: '#1d1d1fff' }] },
          }),
        ],
      }),
    ],
    240,
  );
  return { existing, incoming, textSwatch, borderSwatch };
}

test('edited text and vectors update in place with stable IDs and swatches', () => {
  const { existing, incoming, textSwatch, borderSwatch } = trees();
  assert.equal(migrate(existing, incoming, 'text-field-light', 'list/data'), 3);
  const [border, value] = existing.layers[0].layers;
  assert.equal(existing.layers[0].id, 'capture');
  assert.equal(border.id, 'border');
  assert.deepEqual(border.points, [{ x: 1, y: 1 }]);
  assert.equal(border.closed, false);
  assert.equal(border.horizontalPins, 5);
  assert.equal(border.style.borders[0].swatch, borderSwatch);
  assert.equal(value.id, 'value');
  assert.equal(value.text, 'Northstar Rollout');
  assert.equal(value.frame.width, 120);
  assert.equal(value.style.fills[0].swatch, textSwatch);
  assert.equal(existing.frame.width, 240);
});

test('a changed paint color drops its old Color Variable for rebinding', () => {
  const { existing, incoming } = trees();
  incoming.layers[0].layers[1].style.fills[0].color = '#be060bff';
  migrate(existing, incoming, 'text-field-light', 'list/data');
  assert.equal(existing.layers[0].layers[1].style.fills[0].swatch, undefined);
});

test('incompatible hierarchy changes fail before any layer is mutated', () => {
  const cases = [
    [
      (incoming) => incoming.layers[0].layers.push(layer('ShapePath', 'extra')),
      /new-capture|child count 2 -> 3/,
    ],
    [
      (incoming) => (incoming.layers[0].layers[0].shapeType = 'Oval'),
      /shape type Rectangle -> Oval/,
    ],
    [
      (incoming) => (incoming.layers[0].layers[1].type = 'ShapePath'),
      /layer type Text -> ShapePath/,
    ],
  ];
  for (const [edit, message] of cases) {
    const { existing, incoming } = trees();
    edit(incoming);
    assert.throws(
      () => migrate(existing, incoming, 'text-field-light', 'list/data'),
      {
        message: new RegExp('text-field-light.*' + message.source),
      },
    );
    assert.equal(existing.layers[0].layers[1].text, 'Northstar Migration');
    assert.deepEqual(existing.layers[0].layers[0].points, [{ x: 0, y: 0 }]);
    assert.equal(existing.frame.width, 200);
  }
});

test('reordered sibling Text nodes cannot silently exchange override IDs', () => {
  const existing = symbol('master', [
    layer('Group', 'capture', {
      layers: [
        layer('Text', 'label', { text: 'PROJECT NAME' }),
        layer('Text', 'value', { text: 'Northstar' }),
      ],
    }),
  ]);
  const incoming = symbol('preview', [
    layer('Group', 'new-capture', {
      layers: [
        layer('Text', 'new-value', { text: 'Northstar' }),
        layer('Text', 'new-label', { text: 'PROJECT NAME' }),
      ],
    }),
  ]);
  assert.throws(
    () => migrate(existing, incoming, 'text-field-light', 'list/data'),
    /text may have moved.*explicit override-key migration required/,
  );
  assert.equal(existing.layers[0].layers[0].text, 'PROJECT NAME');
});

function iconTree(children) {
  return symbol('master', [layer('Group', 'icon', { layers: children })]);
}
const line = (id, x = 8) =>
  layer('ShapePath', id, {
    shapeType: 'Custom',
    frame: { x, width: 13, height: 0 },
  });
const dot = (id) =>
  layer('ShapePath', id, {
    shapeType: 'Custom',
    frame: { x: 3, width: 0, height: 0 },
  });

test('inserts added non-Text layers and keeps every published layer ID', () => {
  const existing = iconTree([line('a'), line('b'), line('c')]);
  const incoming = iconTree([
    dot('d1'),
    dot('d2'),
    line('new-a'),
    line('new-b'),
    line('new-c'),
  ]);
  const pairs = migrationPairs(
    existing,
    incoming,
    'list-compact-light',
    'list/data',
  );
  assert.deepEqual(
    Array.from(pairs, (pair) => pair.existing.id),
    ['icon', 'a', 'b', 'c'],
  );
  assert.deepEqual(
    Array.from(pairs.insertions, (insertion) => [
      insertion.layer.id,
      insertion.index,
    ]),
    [
      ['d1', 0],
      ['d2', 1],
    ],
  );
  assert.equal(
    migrate(existing, incoming, 'list-compact-light', 'list/data'),
    6,
  );
});

test('rejects an added Text layer or a removed published layer', () => {
  assert.throws(
    () =>
      migrate(
        iconTree([line('a')]),
        iconTree([line('new-a'), layer('Text', 'label', { text: 'New' })]),
        'list-compact-light',
        'list/data',
      ),
    /child count 1 -> 2/,
  );
  assert.throws(
    () =>
      migrate(
        iconTree([line('a'), line('b', 20)]),
        iconTree([
          dot('d1'),
          line('new-a'),
          layer('ShapePath', 'x', { shapeType: 'Oval' }),
        ]),
        'list-compact-light',
        'list/data',
      ),
    /child count 2 -> 3/,
  );
});

// A minimal native-like tree: assigning parent moves the node, index reorders
// it among its siblings, and remove detaches it.
function node(type, id, options = {}) {
  const frame = { x: 0, y: 0, width: 20, height: 12, ...options.frame };
  const self = {
    type,
    id,
    text: options.text,
    style: options.style ?? { fills: [], borders: [] },
    frame: { ...frame, toJSON: () => ({ ...frame }) },
    layers: [],
    _parent: null,
    get parent() {
      return this._parent;
    },
    set parent(next) {
      if (this._parent)
        this._parent.layers.splice(this._parent.layers.indexOf(this), 1);
      this._parent = next;
      if (next) next.layers.push(this);
    },
    get index() {
      return this._parent.layers.indexOf(this);
    },
    set index(position) {
      const siblings = this._parent.layers;
      siblings.splice(siblings.indexOf(this), 1);
      siblings.splice(position, 0, this);
    },
    remove() {
      this.parent = null;
    },
  };
  (options.children ?? []).forEach((child) => (child.parent = self));
  return self;
}

test('re-tree keeps the master and its Text layer IDs when grouping changed', () => {
  const swatch = { id: 'text' };
  const label = node('Text', 'published-label', {
    text: 'Notifications Paused',
    style: { fills: [{ color: '#111', swatch }] },
  });
  const existing = node('SymbolMaster', 'master', {
    children: [
      node('Group', 'old-root', {
        children: [
          node('Group', 'icon', { children: [node('ShapePath', 'p'), label] }),
        ],
      }),
    ],
  });
  const freshLabel = node('Text', 'fresh-label', {
    text: 'Notifications Paused',
    style: { fills: [{ color: '#111' }] },
    frame: { x: 30 },
  });
  const incoming = node('SymbolMaster', 'preview', {
    children: [
      node('Group', 'new-root', {
        children: [
          node('Group', 'icon', {
            children: [node('ShapePath', 'p'), node('ShapePath', 'dot')],
          }),
          freshLabel,
        ],
      }),
    ],
  });
  assert.equal(
    retree(
      existing,
      incoming,
      'state-banner-warning-light',
      'content/feedback',
    ),
    1,
  );
  assert.equal(existing.layers.length, 1);
  assert.equal(existing.layers[0].id, 'new-root');
  const moved = existing.layers[0].layers[1];
  assert.equal(moved.id, 'published-label');
  assert.equal(moved.frame.x, 30);
  assert.equal(moved.style.fills[0].swatch, swatch);
  assert.equal(incoming.layers.length, 0);
});

test('re-tree refuses a changed Text sequence before mutating', () => {
  const build = (texts) =>
    node('SymbolMaster', 'm', {
      children: [
        node('Group', 'root', {
          children: texts.map((text, i) => node('Text', 't' + i, { text })),
        }),
      ],
    });
  const existing = build(['TITLE', 'VALUE']);
  assert.throws(
    () => retree(existing, build(['VALUE', 'TITLE']), 'x', 'list/data'),
    /text may have moved/,
  );
  assert.throws(
    () => retree(existing, build(['TITLE']), 'x', 'list/data'),
    /Text count 2 -> 1/,
  );
  assert.deepEqual(
    Array.from(existing.layers[0].layers, (layer) => layer.id),
    ['t0', 't1'],
  );
});
