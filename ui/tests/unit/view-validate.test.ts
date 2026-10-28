import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateJsonSchemaSubset } from '../../scripts/lib/json-schema-subset.mjs';
import {
  channelOf,
  createViewCatalog,
  isAssignable,
  isLiteralOf,
  parseCssCall,
  validateView,
  VIEW_DOCUMENT_SCHEMA_ID,
} from '../../view/index.mjs';

const root = resolve(import.meta.dirname, '../..');
const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const catalog = createViewCatalog({
  props: [readJson('ai/component-props.json')],
  composition: [readJson('ai/component-composition.json')],
});
const schema = readJson('ai/view-document.schema.json');

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
let counter = 0;
/** A fresh valid ULID for a fixture node. */
const id = () => {
  counter += 1;
  return `01JB8Z1M6Q8E1X9V4S7K2R${CROCKFORD[Math.floor(counter / 32) % 32]}${CROCKFORD[counter % 32]}AB`;
};
const ui = (name: string) => `@kerfjs/ui:${name}`;
// Loose fixture shapes: these tests feed deliberately invalid documents too.
type Fixture = Record<string, unknown>;
const node = (type: string, rest: Fixture = {}): Fixture => ({
  id: id(),
  type: type.startsWith('#') ? type : ui(type),
  ...rest,
});
const doc = (rootNode: Fixture, rest: Fixture = {}): Fixture => ({
  schema: VIEW_DOCUMENT_SCHEMA_ID,
  name: 'Inbox',
  catalogs: ['@kerfjs/ui'],
  root: rootNode,
  ...rest,
});
const codes = (
  document: unknown,
  options?: Parameters<typeof validateView>[2],
) =>
  validateView(document, catalog, options).diagnostics.map((item) => item.code);
const button = (rest: Fixture = {}) =>
  node('button', {
    ...rest,
    props: { children: 'Save', ...((rest.props as Fixture | undefined) ?? {}) },
  });

const inbox = () =>
  doc(
    node('pane', {
      props: { contentElement: 'nav' },
      zones: {
        header: [
          node('toolbar', {
            zones: {
              leading: [
                node('toolbar-text', {
                  props: { text: { $param: 'title' }, size: 'xlarge' },
                }),
              ],
              trailing: [
                node('button', {
                  name: 'composeButton',
                  props: {
                    children: 'Compose',
                    tone: 'brand',
                    action: { $action: 'compose' },
                  },
                }),
              ],
            },
          }),
        ],
        content: [
          node('list', {
            name: 'folderList',
            zones: {
              children: [
                {
                  $each: { $param: 'items' },
                  as: 'item',
                  key: 'item.id',
                  template: node('list-item', {
                    props: {
                      label: { $bind: 'item.label' },
                      action: { $action: 'open-item' },
                    },
                  }),
                },
              ],
            },
          }),
          { $slot: 'detail', input: { selectedId: { $param: 'selectedId' } } },
          {
            $if: { $param: 'showEmpty' },
            then: node('text', { props: { children: 'Nothing here' } }),
          },
        ],
      },
    }),
    {
      params: {
        title: { type: { kind: 'string' }, default: 'Inbox' },
        showEmpty: { type: { kind: 'boolean' }, default: false },
        selectedId: { type: { kind: 'string' } },
        items: {
          type: {
            kind: 'array',
            items: {
              kind: 'object',
              props: [
                { name: 'id', type: { kind: 'string' }, required: true },
                { name: 'label', type: { kind: 'string' }, required: true },
              ],
            },
          },
        },
      },
      slots: {
        detail: {
          input: {
            kind: 'object',
            props: [
              { name: 'selectedId', type: { kind: 'string' }, required: true },
            ],
          },
        },
      },
    },
  );

describe('validateView: a complete document', () => {
  it('accepts the docs/26 inbox example and reports its action scopes', () => {
    const result = validateView(inbox(), catalog);
    expect(result.diagnostics).toEqual([]);
    expect(result.valid).toBe(true);
    expect(Object.fromEntries(result.actions)).toEqual({
      compose: 'view',
      'open-item': 'row',
    });
  });

  it('agrees with the shipped JSON Schema on the valid document', () => {
    expect(validateJsonSchemaSubset(schema, inbox())).toEqual([]);
  });

  it('rejects a non-object document and a wrong schema id', () => {
    expect(codes('nope')).toEqual(['KUI-V001']);
    const result = validateView(
      { ...inbox(), schema: 'v0', extra: 1, name: 'inbox' },
      catalog,
    );
    expect(result.diagnostics.map((item) => item.path)).toEqual([
      '$.extra',
      '$.schema',
      '$.name',
    ]);
    expect(
      validateJsonSchemaSubset(schema, { ...inbox(), schema: 'v0' }),
    ).not.toEqual([]);
  });
});

describe('validateView: KUI-V001 shape', () => {
  it('reports malformed catalogs, params, slots, and root', () => {
    expect(codes(doc(button(), { catalogs: 'ui' }))).toContain('KUI-V001');
    expect(codes(doc(button(), { params: [] }))).toEqual(['KUI-V001']);
    expect(codes(doc(button(), { params: { Bad: {} } }))).toEqual(['KUI-V001']);
    expect(
      codes(doc(button(), { params: { a: { type: { kind: 'map' } } } })),
    ).toEqual(['KUI-V001']);
    expect(
      codes(
        doc(button(), {
          params: { a: { type: { kind: 'enum', values: [] } } },
        }),
      ),
    ).toEqual(['KUI-V001']);
    expect(
      codes(doc(button(), { params: { a: { type: { kind: 'array' } } } })),
    ).toEqual(['KUI-V001']);
    expect(
      codes(doc(button(), { params: { a: { type: { kind: 'object' } } } })),
    ).toEqual(['KUI-V001']);
    expect(
      codes(
        doc(button(), {
          params: { a: { type: { kind: 'object', props: [{ name: 'x' }] } } },
        }),
      ),
    ).toEqual(['KUI-V001']);
    expect(
      codes(
        doc(button(), {
          params: { a: { type: { kind: 'string' }, extra: 1 } },
        }),
      ),
    ).toEqual(['KUI-V001']);
    expect(
      codes(doc(button(), { slots: { s: { input: { kind: 'string' } } } })),
    ).toEqual(['KUI-V001']);
    expect(codes(doc(button(), { slots: { S: {} } }))).toEqual(['KUI-V001']);
    expect(codes(doc(button(), { slots: { s: { extra: 1 } } }))).toEqual([
      'KUI-V001',
    ]);
    expect(codes(doc([] as unknown as Fixture))).toEqual(['KUI-V001']);
  });

  it('reports unknown $each fields', () => {
    const params = {
      items: {
        type: {
          kind: 'array',
          items: {
            kind: 'object',
            props: [{ name: 'id', type: { kind: 'string' }, required: true }],
          },
        },
      },
    };
    const each = {
      $each: { $param: 'items' },
      as: 'row',
      key: 'row.id',
      template: button(),
      extra: 1,
    };
    expect(
      codes(doc(node('list', { zones: { children: [each] } }), { params })),
    ).toEqual(['KUI-V001']);
  });

  it('reports unknown fields on nodes, text, views, and control flow', () => {
    expect(
      codes(doc(node('button', { props: { children: 'x' }, extra: 1 }))),
    ).toEqual(['KUI-V001']);
    expect(
      codes(
        doc(
          node('button', {
            zones: { children: [node('#text', { value: 'x', extra: 1 })] },
          }),
        ),
      ),
    ).toEqual(['KUI-V001']);
    expect(
      codes(
        doc(
          node('list', {
            zones: {
              children: [node('#view', { src: './a.kui.json', extra: 1 })],
            },
          }),
        ),
      ),
    ).toEqual(['KUI-V001']);
    expect(
      codes(
        doc(
          node('list', {
            zones: {
              children: [
                {
                  $if: true,
                  then: node('text', { props: { children: 'x' } }),
                  extra: 1,
                },
              ],
            },
          }),
        ),
      ),
    ).toEqual(['KUI-V001']);
    expect(
      codes(
        doc(node('list', { zones: { children: [{ $slot: 's', extra: 1 }] } })),
      ),
    ).toEqual(['KUI-V001']);
    expect(codes(doc(node('list', { zones: { children: [7] } })))).toEqual([
      'KUI-V001',
    ]);
    expect(codes(doc(node('list', { zones: { children: 'x' } })))).toEqual([
      'KUI-V001',
    ]);
    expect(codes(doc(node('list', { zones: [] })))).toEqual(['KUI-V001']);
    expect(codes(doc(node('button', { props: [] })))).toContain('KUI-V001');
    expect(
      codes(doc(node('list', { zones: { children: [{ $slot: 'Bad' }] } }))),
    ).toEqual(['KUI-V001']);
    expect(
      codes(
        doc(node('list', { zones: { children: [{ $slot: 's', input: {} }] } })),
      ),
    ).toEqual(['KUI-V001']);
  });
});

describe('validateView: types, props, and values', () => {
  it('KUI-V002: unknown component types and packages missing from catalogs', () => {
    expect(codes(doc(node('nope')))).toEqual(['KUI-V002']);
    expect(codes(doc(node('#nope')))).toEqual(['KUI-V002']);
    expect(codes(doc(button(), { catalogs: ['@acme/ui'] }))).toEqual([
      'KUI-V002',
    ]);
    // A catalog path cannot be resolved to its package here, so it disables the check.
    expect(
      codes(doc(button(), { catalogs: ['./kerf.components.json'] })),
    ).toEqual([]);
  });

  it('KUI-V003: unknown props, zone props, and unknown or doubled zones', () => {
    expect(codes(doc(button({ props: { colour: 'red' } })))).toEqual([
      'KUI-V003',
    ]);
    expect(codes(doc(node('pane', { props: { header: 'x' } })))).toEqual([
      'KUI-V003',
    ]);
    expect(codes(doc(node('pane', { zones: { sidebar: [] } })))).toEqual([
      'KUI-V003',
    ]);
    expect(
      codes(
        doc(
          node('button', {
            props: { children: 'x' },
            zones: { children: [node('text', { props: { children: 'y' } })] },
          }),
        ),
      ),
    ).toEqual(['KUI-V003']);
    // Native attributes the component passes through are accepted.
    expect(
      codes(doc(node('text', { props: { children: 'Hi', lang: 'en' } }))),
    ).toEqual([]);
  });

  it('KUI-V004: literals that do not fit the prop type', () => {
    expect(codes(doc(button({ props: { tone: 'purple' } })))).toEqual([
      'KUI-V004',
    ]);
    expect(codes(doc(button({ props: { disabled: 'yes' } })))).toEqual([
      'KUI-V004',
    ]);
    expect(codes(doc(button({ props: { children: null } })))).toEqual([
      'KUI-V004',
    ]);
    expect(codes(doc(node('pane', { props: { background: 'red' } })))).toEqual([
      'KUI-V004',
    ]);
    expect(
      codes(
        doc(button(), {
          params: { a: { type: { kind: 'number' }, default: 'one' } },
        }),
      ),
    ).toEqual(['KUI-V004']);
  });

  it('KUI-V004: union props types must match one variant', () => {
    // Button is labeled (children) or icon-only (icon + ariaLabel).
    expect(
      codes(doc(node('button', { props: { ariaLabel: 'Close' } }))),
    ).toEqual(['KUI-V004']);
    expect(
      codes(
        doc(
          node('button', {
            props: { ariaLabel: 'Close' },
            zones: { icon: [{ $slot: 'closeIcon' }] },
          }),
        ),
      ),
    ).toEqual([]);
    // ListHeader's toggle mode requires expanded and action; a literal false
    // toggle selects the other modes.
    expect(
      codes(
        doc(node('list-header', { props: { label: 'Files', toggle: true } })),
      ),
    ).toEqual(['KUI-V004']);
    expect(
      codes(
        doc(
          node('list-header', {
            props: {
              label: 'Files',
              toggle: true,
              expanded: true,
              action: { $action: 'toggle' },
            },
          }),
        ),
      ),
    ).toEqual([]);
    expect(
      codes(
        doc(node('list-header', { props: { label: 'Files', toggle: false } })),
      ),
    ).toEqual([]);
  });

  it('KUI-V004: params and bindings must be assignable to the prop', () => {
    const params = {
      count: { type: { kind: 'number' } },
      tone: { type: { kind: 'enum', values: ['brand', 'danger'] } },
      wide: { type: { kind: 'enum', values: ['brand', 'purple'] } },
    };
    expect(
      codes(doc(button({ props: { tone: { $param: 'tone' } } }), { params })),
    ).toEqual([]);
    expect(
      codes(doc(button({ props: { tone: { $param: 'wide' } } }), { params })),
    ).toEqual(['KUI-V004']);
    expect(
      codes(doc(button({ props: { title: { $param: 'count' } } }), { params })),
    ).toEqual(['KUI-V004']);
  });

  it('KUI-V004: #text only in zones whose prop takes text', () => {
    expect(
      codes(
        doc(
          node('button', {
            zones: { children: [node('#text', { value: 'Save' })] },
          }),
        ),
      ),
    ).toEqual([]);
    expect(
      codes(
        doc(
          node('list', {
            zones: { children: [node('#text', { value: 'Save' })] },
          }),
        ),
      ),
    ).toEqual(['KUI-V004']);
    expect(codes(doc(node('#text', { value: 'Save' })))).toEqual(['KUI-V004']);
    // A Web Awesome element's slots are zones, and slotted text is fine.
    expect(
      codes(
        doc(
          node('wa-badge', {
            zones: { default: [node('#text', { value: '3' })] },
          }),
        ),
      ),
    ).toEqual([]);
    expect(codes(doc(node('wa-badge', { zones: { nope: [] } })))).toEqual([
      'KUI-V003',
    ]);
  });

  it('KUI-V005: missing required props', () => {
    expect(
      codes(doc(node('list-item', { props: { action: 'open' } }))),
    ).toEqual(['KUI-V005']);
    expect(
      codes(doc(node('list-item', { props: { label: 'A', action: 'open' } }))),
    ).toEqual([]);
  });
});

describe('validateView: ids, names, scope, and control flow', () => {
  it('KUI-V006: malformed and duplicate ids and names', () => {
    const first = button();
    expect(codes(doc({ ...button(), id: 'n1' }))).toEqual(['KUI-V006']);
    expect(
      codes(
        doc(
          node('list', {
            zones: { children: [first, { ...button(), id: first.id }] },
          }),
        ),
      ),
    ).toEqual(['KUI-V006']);
    expect(
      codes(
        doc(
          node('list', {
            zones: {
              children: [button({ name: 'save' }), button({ name: 'save' })],
            },
          }),
        ),
      ),
    ).toEqual(['KUI-V006']);
    expect(codes(doc(button({ name: 'Save' })))).toEqual(['KUI-V006']);
  });

  it('KUI-V007: unknown params and out-of-scope or invalid bindings', () => {
    expect(
      codes(doc(button({ props: { title: { $param: 'missing' } } }))),
    ).toEqual(['KUI-V007']);
    expect(
      codes(doc(button({ props: { title: { $bind: 'item.label' } } }))),
    ).toEqual(['KUI-V007']);
    expect(codes(doc(button({ props: { title: { $bind: '' } } })))).toEqual([
      'KUI-V007',
    ]);
    const params = {
      user: {
        type: {
          kind: 'object',
          props: [{ name: 'name', type: { kind: 'string' }, required: true }],
        },
      },
    };
    expect(
      codes(
        doc(button({ props: { title: { $bind: 'user.name' } } }), { params }),
      ),
    ).toEqual([]);
    expect(
      codes(
        doc(button({ props: { title: { $bind: 'user.email' } } }), { params }),
      ),
    ).toEqual(['KUI-V007']);
  });

  it('KUI-V008: $each needs an array source, an item name, a key, and one template node', () => {
    const list = (
      each: Fixture,
      params: Fixture = {
        items: {
          type: {
            kind: 'array',
            items: {
              kind: 'object',
              props: [{ name: 'id', type: { kind: 'string' }, required: true }],
            },
          },
        },
      },
    ) => codes(doc(node('list', { zones: { children: [each] } }), { params }));
    const template = button({ props: { title: { $bind: 'row.id' } } });
    expect(
      list({ $each: { $param: 'items' }, as: 'row', key: 'row.id', template }),
    ).toEqual([]);
    expect(
      list({ $each: [1, 2], as: 'row', key: 'row.id', template }),
    ).toContain('KUI-V008');
    expect(
      list({ $each: { $param: 'items' }, as: 'Row', key: 'row.id', template }),
    ).toEqual(['KUI-V008']);
    expect(
      list({ $each: { $param: 'items' }, as: 'row', key: 'id', template }),
    ).toEqual(['KUI-V008']);
    expect(
      list({
        $each: { $param: 'items' },
        as: 'row',
        key: 'row.id',
        template: [template],
      }),
    ).toEqual(['KUI-V008']);
    expect(
      list(
        { $each: { $param: 'flag' }, as: 'row', key: 'row.id', template },
        { flag: { type: { kind: 'boolean' } } },
      ),
    ).toContain('KUI-V008');
    // A binding is out of scope after the template.
    expect(
      codes(
        doc(
          node('list', {
            zones: {
              children: [
                {
                  $each: { $param: 'items' },
                  as: 'row',
                  key: 'row.id',
                  template,
                },
                node('text', { props: { children: { $bind: 'row.id' } } }),
              ],
            },
          }),
          {
            params: {
              items: {
                type: {
                  kind: 'array',
                  items: {
                    kind: 'object',
                    props: [
                      { name: 'id', type: { kind: 'string' }, required: true },
                    ],
                  },
                },
              },
            },
          },
        ),
      ),
    ).toEqual(['KUI-V007']);
  });

  it('KUI-V008: reserved or shadowing item names and keyless templates', () => {
    const params = {
      items: {
        type: {
          kind: 'array',
          items: {
            kind: 'object',
            props: [{ name: 'id', type: { kind: 'string' }, required: true }],
          },
        },
      },
    };
    const each = (as: string, template: Fixture) =>
      codes(
        doc(
          node('list', {
            zones: {
              children: [
                { $each: { $param: 'items' }, as, key: `${as}.id`, template },
              ],
            },
          }),
          { params },
        ),
      );
    expect(each('inputs', button())).toEqual(['KUI-V008']);
    expect(each('items', button())).toEqual(['KUI-V008']);
    // CollapsiblePanelRelocated renders a fragment, so it has no data-* channel.
    expect(
      each(
        'row',
        node('collapsible-panel#CollapsiblePanelRelocated', {
          props: { panelId: 'p', side: 'left', collapsed: false },
        }),
      ),
    ).toContain('KUI-V008');
    const strings = {
      tags: { type: { kind: 'array', items: { kind: 'string' } } },
    };
    expect(
      codes(
        doc(
          node('list', {
            zones: {
              children: [
                {
                  $each: { $param: 'tags' },
                  as: 'tag',
                  key: 'tag',
                  template: button(),
                },
              ],
            },
          }),
          { params: strings },
        ),
      ),
    ).toContain('KUI-V008');
  });

  it('$if conditions are booleans and both branches are validated', () => {
    expect(
      codes(
        doc(
          node('list', {
            zones: {
              children: [
                {
                  $if: 'yes',
                  then: node('text', { props: { children: 'x' } }),
                },
              ],
            },
          }),
        ),
      ),
    ).toEqual(['KUI-V004']);
    expect(
      codes(
        doc(
          node('list', {
            zones: {
              children: [
                {
                  $if: true,
                  then: node('text', { props: { children: 'x' } }),
                  else: node('nope'),
                },
              ],
            },
          }),
        ),
      ),
    ).toEqual(['KUI-V002']);
  });

  it('slots check declared inputs', () => {
    const slots = {
      detail: {
        input: {
          kind: 'object',
          props: [{ name: 'id', type: { kind: 'string' }, required: true }],
        },
      },
    };
    const with_ = (input?: Fixture) =>
      codes(
        doc(
          node('list', {
            zones: {
              children: [{ $slot: 'detail', ...(input ? { input } : {}) }],
            },
          }),
          { slots },
        ),
      );
    expect(with_({ id: 'a' })).toEqual([]);
    expect(with_()).toEqual(['KUI-V005']);
    expect(with_({ id: 'a', extra: 1 })).toEqual(['KUI-V003']);
    expect(with_({ id: 3 })).toEqual(['KUI-V004']);
  });

  it('KUI-V009: $action only on action props and never in both scopes', () => {
    expect(
      codes(doc(button({ props: { title: { $action: 'save' } } }))),
    ).toEqual(['KUI-V009']);
    expect(
      codes(doc(button({ props: { action: { $action: 'Save!' } } }))),
    ).toEqual(['KUI-V001']);
    const mixed = doc(
      node('list', {
        zones: {
          children: [
            button({ props: { action: { $action: 'open' } } }),
            {
              $each: { $param: 'items' },
              as: 'row',
              key: 'row.id',
              template: button({ props: { action: { $action: 'open' } } }),
            },
          ],
        },
      }),
      {
        params: {
          items: {
            type: {
              kind: 'array',
              items: {
                kind: 'object',
                props: [
                  { name: 'id', type: { kind: 'string' }, required: true },
                ],
              },
            },
          },
        },
      },
    );
    expect(codes(mixed)).toEqual(['KUI-V009']);
  });

  it('KUI-V010: $css calls an allowed builder on a css-value prop', () => {
    expect(
      codes(
        doc(
          node('pane', {
            props: { background: { $css: "uiColor('surface-raised')" } },
          }),
        ),
      ),
    ).toEqual([]);
    expect(
      codes(doc(node('pane', { props: { background: { $css: 'red' } } }))),
    ).toEqual(['KUI-V010']);
    expect(codes(doc(button({ props: { title: { $css: 'px(2)' } } })))).toEqual(
      ['KUI-V010'],
    );
    // Arguments are literals or nested builder calls, never code.
    expect(
      codes(
        doc(
          node('pane', {
            props: { background: { $css: 'uiColor(window.x)' } },
          }),
        ),
      ),
    ).toEqual(['KUI-V010']);
    expect(
      codes(
        doc(
          node('pane', { props: { background: { $css: "uiColor('a') + 1" } } }),
        ),
      ),
    ).toEqual(['KUI-V010']);
    expect(
      codes(
        doc(
          node('pane', {
            props: { background: { $css: "colorVar(foo('x'))" } },
          }),
        ),
      ),
    ).toEqual(['KUI-V010']);
    // Object literals are checked against the prop's shape.
    expect(
      codes(
        doc(
          node('pane', { props: { rootAttributes: { 'data-kind': 'inbox' } } }),
        ),
      ),
    ).toEqual([]);
    // Only the index signature's `data-` prefix, and never a protected marker.
    expect(
      codes(doc(node('pane', { props: { rootAttributes: { title: 'x' } } }))),
    ).toEqual(['KUI-V004']);
    expect(
      codes(
        doc(
          node('pane', {
            props: { rootAttributes: { 'data-component': 'x' } },
          }),
        ),
      ),
    ).toEqual(['KUI-V004']);
    // A catalog cssValue restriction narrows the builders.
    expect(
      codes(
        doc(
          node('lucide-icon', {
            props: { icon: [], name: 'x', size: { $css: "uiColor('text')" } },
          }),
        ),
      ),
    ).toEqual(['KUI-V010']);
  });

  it('KUI-V011: only components with a data-* channel can be named', () => {
    expect(
      codes(
        doc(
          node('collapsible-panel#CollapsiblePanelRelocated', {
            name: 'gap',
            props: { panelId: 'p', side: 'left', collapsed: false },
          }),
        ),
      ),
    ).toContain('KUI-V011');
    // Text passes data-* through natively, so it can be named.
    expect(
      codes(doc(node('text', { name: 'intro', props: { children: 'Hi' } }))),
    ).toEqual([]);
    expect(codes(doc(button({ name: 'save' })))).toEqual([]);
  });
});

describe('validateView: composed documents (KUI-V012)', () => {
  const child = doc(
    button({
      props: { title: { $param: 'label' }, action: { $action: 'open' } },
    }),
    {
      name: 'Child',
      params: { label: { type: { kind: 'string' } } },
    },
  );
  const view = (props: Fixture, src = './child.kui.json') =>
    doc(node('list', { zones: { children: [node('#view', { src, props })] } }));
  const resolveView = (src: string) =>
    src === './child.kui.json'
      ? child
      : src === './self.kui.json'
        ? view({}, './self.kui.json')
        : undefined;

  it('checks params against the composed document and merges its actions', () => {
    const result = validateView(view({ label: 'Hi' }), catalog, {
      resolveView,
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.actions.get('open')).toBe('view');
    expect(codes(view({}), { resolveView })).toEqual(['KUI-V012']);
    expect(codes(view({ label: 'Hi', extra: 1 }), { resolveView })).toEqual([
      'KUI-V012',
    ]);
    expect(codes(view({ label: 3 }), { resolveView })).toEqual(['KUI-V004']);
  });

  it('rejects composing a document that declares slots', () => {
    const slotted = doc(button(), { name: 'Slotted', slots: { extra: {} } });
    expect(
      codes(view({}, './slotted.kui.json'), { resolveView: () => slotted }),
    ).toEqual(['KUI-V012']);
  });

  it('reports missing, cyclic, and unnamed sources; shape-only without a resolver', () => {
    expect(codes(view({}, './missing.kui.json'), { resolveView })).toEqual([
      'KUI-V012',
    ]);
    expect(codes(view({}, './self.kui.json'), { resolveView })).toContain(
      'KUI-V012',
    );
    expect(codes(view({}, ''))).toEqual(['KUI-V012']);
    expect(codes(view({ anything: 1 }))).toEqual([]);
  });

  it('prefixes nested diagnostics with the composed source', () => {
    const broken = doc(node('nope'), { name: 'Broken' });
    const result = validateView(view({}, './broken.kui.json'), catalog, {
      resolveView: () => broken,
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'KUI-V002',
        path: '$.root.zones.children[0]{./broken.kui.json}.root.type',
      }),
    ]);
  });
});

describe('validateView: composition (KUI-L201–L204)', () => {
  it('KUI-L201: a ToolbarControlGroup outside a toolbar', () => {
    const group = node('toolbar-control-group', {
      zones: { children: [node('text', { props: { children: 'x' } })] },
    });
    expect(codes(doc(node('list', { zones: { children: [group] } })))).toEqual([
      'KUI-L201',
    ]);
    expect(
      codes(doc(node('toolbar', { zones: { trailing: [group] } }))),
    ).toEqual([]);
    // A second export answers to its own parent contract.
    const link = node('toolbar-control-group#ToolbarActionLink', {
      props: { label: 'Docs', href: '/docs' },
    });
    expect(codes(doc(node('list', { zones: { children: [link] } })))).toEqual([
      'KUI-L201',
    ]);
  });

  it('KUI-L202 and KUI-L203: TabBar zones and cardinality', () => {
    const tab = () => node('tabs', { props: { id: 'a', name: 'A' } });
    const bar = (zones: Fixture) =>
      node('tab-bar', { props: { id: 'tabs', label: 'Files' }, zones });
    expect(codes(doc(bar({ tabs: [tab()] })))).toEqual([]);
    // An empty required zone is both a missing prop and a cardinality error.
    expect(codes(doc(bar({ tabs: [] })))).toEqual(['KUI-V005', 'KUI-L203']);
    expect(
      codes(
        doc(
          bar({
            tabs: [tab()],
            trailing: [
              node('list-item', { props: { label: 'x', action: 'y' } }),
            ],
          }),
        ),
      ),
    ).toEqual(['KUI-L202']);
    expect(
      codes(doc(bar({ tabs: [tab()], trailing: [button(), button()] }))),
    ).toEqual(['KUI-L203']);
    expect(
      codes(doc(bar({ tabs: [tab(), node('#text', { value: 'x' })] }))),
    ).toEqual(['KUI-V004', 'KUI-L202']);
    // $each counts 0..n, $if its branches, a slot exactly one.
    expect(
      codes(
        doc(
          bar({
            tabs: [{ $slot: 'tabs' }],
            trailing: [{ $if: true, then: button() }],
          }),
        ),
      ),
    ).toEqual([]);
  });

  it('KUI-L204: an inset-bearing child inside an embedded Disclosure', () => {
    const disclosure = (child: Fixture) =>
      node('disclosure', {
        props: { title: 'More', appearance: 'embedded' },
        zones: { children: [child] },
      });
    expect(
      codes(doc(disclosure(node('text', { props: { children: 'Body' } })))),
    ).toEqual(['KUI-L204']);
    expect(
      codes(
        doc(
          disclosure(
            node('text', { props: { children: 'Body', flush: true } }),
          ),
        ),
      ),
    ).toEqual([]);
    // A prop the validator cannot read statically counts as inset-free.
    expect(
      codes(
        doc(
          disclosure(
            node('text', {
              props: { children: 'Body', flush: { $param: 'flush' } },
            }),
          ),
          { params: { flush: { type: { kind: 'boolean' } } } },
        ),
      ),
    ).toEqual([]);
  });
});

describe('parseCssCall and channelOf', () => {
  it('accepts literal-argument builder calls only', () => {
    expect(parseCssCall('px(2)')).toEqual(['px']);
    expect(parseCssCall('calc(px(2), plus(rem(1)))')).toEqual([
      'calc',
      'px',
      'plus',
      'rem',
    ]);
    expect(parseCssCall('space("m")')).toEqual(['space']);
    expect(parseCssCall('px( -1.5 )')).toEqual(['px']);
    expect(parseCssCall('flex()')).toEqual(['flex']);
    for (const bad of [
      'red',
      'px(',
      'px(2)+1',
      'px(a)',
      "px('a\\'b')",
      'px(2;3)',
      3,
    ]) {
      expect(parseCssCall(bad)).toBeUndefined();
    }
  });

  it('reads the data-* channel from the catalog entry', () => {
    expect(channelOf({ props: [{ name: 'rootAttributes' }] })).toBe(
      'rootAttributes',
    );
    expect(channelOf({ source: 'webawesome', props: [] })).toBe('attributes');
    expect(channelOf({ props: [] })).toBe('none');
    expect(channelOf({ dataChannel: 'native', props: [] })).toBe('native');
  });
});

describe('isAssignable and isLiteralOf', () => {
  const text = { kind: 'content', acceptsText: true as const };
  it('covers the type grammar', () => {
    expect(isAssignable({ kind: 'string' }, text)).toBe(true);
    expect(isAssignable({ kind: 'string' }, { kind: 'content' })).toBe(false);
    expect(
      isAssignable(
        { kind: 'literal', value: 'a' },
        { kind: 'literal', value: 'a' },
      ),
    ).toBe(true);
    expect(
      isAssignable(
        { kind: 'enum', values: ['a', 'b'] },
        { kind: 'literal', value: 'a' },
      ),
    ).toBe(false);
    expect(
      isAssignable({ kind: 'enum', values: ['a'] }, { kind: 'string' }),
    ).toBe(true);
    expect(
      isAssignable(
        { kind: 'boolean' },
        { kind: 'union', members: [{ kind: 'number' }, { kind: 'boolean' }] },
      ),
    ).toBe(true);
    expect(isAssignable({ kind: 'content' }, { kind: 'content' })).toBe(true);
    expect(
      isAssignable(
        { kind: 'array', items: { kind: 'string' } },
        { kind: 'array', items: { kind: 'string' } },
      ),
    ).toBe(true);
    expect(
      isAssignable({ kind: 'object', props: [] }, { kind: 'record' }),
    ).toBe(true);
    expect(
      isAssignable({ kind: 'object', props: [] }, { kind: 'string' }),
    ).toBe(false);
    expect(
      isAssignable(
        { kind: 'object', props: [] },
        { kind: 'ref', ref: 'Shape' },
        {
          Shape: {
            kind: 'object',
            props: [{ name: 'a', type: { kind: 'string' }, required: true }],
          },
        },
      ),
    ).toBe(false);
    expect(
      isAssignable(
        {
          kind: 'object',
          props: [{ name: 'a', type: { kind: 'string' }, required: false }],
        },
        {
          kind: 'object',
          props: [{ name: 'a', type: { kind: 'string' }, required: true }],
        },
      ),
    ).toBe(false);
    expect(isAssignable({ kind: 'function' }, { kind: 'function' })).toBe(
      false,
    );
    expect(isAssignable({ kind: 'string' }, { kind: 'unknown' })).toBe(true);
  });

  it('checks literals', () => {
    expect(isLiteralOf(3, text)).toBe(true);
    expect(isLiteralOf('x', { kind: 'content' })).toBe(false);
    expect(isLiteralOf(Number.NaN, { kind: 'number' })).toBe(false);
    expect(
      isLiteralOf(['a'], { kind: 'array', items: { kind: 'string' } }),
    ).toBe(true);
    expect(isLiteralOf({ a: 'x' }, { kind: 'record' })).toBe(true);
    expect(isLiteralOf({ a: 1 }, { kind: 'record' })).toBe(false);
    const shape = {
      kind: 'object',
      props: [{ name: 'a', type: { kind: 'string' }, required: true }],
    };
    expect(isLiteralOf({ a: 'x' }, shape)).toBe(true);
    expect(isLiteralOf({}, shape)).toBe(false);
    expect(isLiteralOf({ a: 'x', b: 1 }, shape)).toBe(false);
    expect(isLiteralOf('x', shape)).toBe(false);
    expect(isLiteralOf(null, { kind: 'string', nullable: true })).toBe(true);
    expect(isLiteralOf('a', { kind: 'literal', value: 'a' })).toBe(true);
    expect(isLiteralOf('x', { kind: 'signal' })).toBe(false);
    expect(isLiteralOf('x', { kind: 'ref', ref: 'Missing' })).toBe(true);
  });
});
