// KF-HNNWN9: placeholder values for list and object props, built from the
// props catalog's type graph.
import { describe, expect, it } from 'vitest';

import { valueFromControl } from '../../../src/editor/model/controls.js';
import {
  exampleValue,
  isStructured,
  resolveType,
  slotNamer,
  usedSlots,
} from '../../../src/editor/model/examples.js';
import {
  itemSlotRowId,
  itemSlotRowNode,
  itemSlots,
  outlineTree,
} from '../../../src/editor/model/outline.js';

const t = (type: object) => type as never;

describe('exampleValue', () => {
  // KF-FGD8B3: a union seeds a member that renders rather than an empty
  // object (a ReadonlySet), and keeps the empty object only as a last resort.
  it('prefers a union member that is not an empty object', () => {
    const set = { kind: 'object', props: [] };
    const list = { kind: 'array', items: { kind: 'string' } };
    expect(
      exampleValue(t({ kind: 'union', members: [set, list] }), {}, 'expanded'),
    ).toEqual(['Expanded 1', 'Expanded 2', 'Expanded 3']);
    expect(exampleValue(t({ kind: 'union', members: [set] }), {}, 'x')).toEqual(
      {},
    );
    // Rendered content without a slot namer has no placeholder.
    expect(
      exampleValue(
        t({ kind: 'union', members: [{ kind: 'content' }, list] }),
        {},
        'item',
      ),
    ).toEqual(['Item 1', 'Item 2', 'Item 3']);
    // With one, rendered content outside any field is an item slot.
    expect(
      exampleValue(t({ kind: 'content' }), {}, 'body', slotNamer([])),
    ).toEqual({ $slot: expect.any(String) });
  });

  it('numbers list items after the prop they fill', () => {
    expect(
      exampleValue(
        t({ kind: 'array', items: { kind: 'ref', ref: 'Entry' } }),
        {
          Entry: t({
            kind: 'object',
            props: [
              { name: 'id', required: true, type: { kind: 'string' } },
              { name: 'count', required: true, type: { kind: 'number' } },
              { name: 'on', required: true, type: { kind: 'boolean' } },
              {
                name: 'kind',
                required: true,
                type: { kind: 'literal', value: 'entry' },
              },
              {
                name: 'size',
                required: true,
                type: { kind: 'enum', values: ['s', 'm'] },
              },
              {
                name: 'title',
                required: true,
                type: { kind: 'content', acceptsText: true },
              },
              { name: 'note', required: false, type: { kind: 'string' } },
            ],
          }),
        },
        'entries',
      ),
    ).toEqual(
      [1, 2, 3].map((index) => ({
        id: `entry-${index}`,
        count: index,
        on: false,
        kind: 'entry',
        size: 's',
        title: `Entry ${index}`,
      })),
    );
  });

  it('reads a union or object without members as having none', () => {
    expect(exampleValue(t({ kind: 'union' }), {}, 'x')).toBeUndefined();
    expect(exampleValue(t({ kind: 'object' }), {}, 'x')).toEqual({});
  });

  it('takes the first union member it can make', () => {
    expect(
      exampleValue(
        t({
          kind: 'union',
          members: [{ kind: 'function' }, { kind: 'string' }],
        }),
        {},
        'label',
      ),
    ).toBe('Label');
  });

  it('makes nothing for a type no literal can stand in for', () => {
    expect(exampleValue(t({ kind: 'content' }), {}, 'icon')).toBeUndefined();
    expect(
      exampleValue(
        t({ kind: 'union', members: [{ kind: 'function' }] }),
        {},
        'x',
      ),
    ).toBeUndefined();
    expect(
      exampleValue(t({ kind: 'array', items: { kind: 'content' } }), {}, 'x'),
    ).toBeUndefined();
    expect(
      exampleValue(
        t({
          kind: 'object',
          props: [{ name: 'body', required: true, type: { kind: 'content' } }],
        }),
        {},
        'x',
      ),
    ).toBeUndefined();
    // An unknown ref, and a type that nests past the depth limit.
    expect(exampleValue(t({ kind: 'ref', ref: 'Missing' }), {}, 'x')).toBe(
      undefined,
    );
    const deep = { kind: 'array', items: { kind: 'ref', ref: 'Deep' } };
    expect(exampleValue(t(deep), { Deep: t(deep) }, 'x')).toBeUndefined();
  });
});

describe('resolveType and isStructured', () => {
  it('follows refs and stops on a cycle', () => {
    const defs = {
      A: t({ kind: 'ref', ref: 'B' }),
      B: t({ kind: 'object', props: [] }),
      Loop: t({ kind: 'ref', ref: 'Loop' }),
    };
    expect(resolveType(t({ kind: 'ref', ref: 'A' }), defs)?.kind).toBe(
      'object',
    );
    expect(resolveType(t({ kind: 'ref', ref: 'Loop' }), defs)).toBeUndefined();
    expect(isStructured(t({ kind: 'ref', ref: 'A' }), defs)).toBe(true);
    expect(isStructured(t({ kind: 'string' }), defs)).toBe(false);
  });

  it('names an untitled type generically when it refuses a list literal', () => {
    expect(
      valueFromControl('list', '"x"', undefined, {
        type: t({ kind: 'array', items: { kind: 'string' } }),
        definitions: {},
      }),
    ).toEqual({ error: 'Not a value of this type.' });
  });
});

// KF-SXDM56: rendered content inside a value becomes an item slot.
describe('item slots', () => {
  const view = t({
    kind: 'object',
    props: [
      { name: 'key', required: true, type: { kind: 'string' } },
      { name: 'content', required: true, type: { kind: 'content' } },
    ],
  });

  it('seeds content no text can stand for as a named slot', () => {
    const namer = slotNamer(['view1Content']);
    expect(
      exampleValue(t({ kind: 'array', items: view }), {}, 'views', namer),
    ).toEqual([
      { key: 'View 1', content: { $slot: 'view1Content2' } },
      { key: 'View 2', content: { $slot: 'view2Content' } },
      { key: 'View 3', content: { $slot: 'view3Content' } },
    ]);
  });

  it('numbers a nested list after its own field and reads camelCase as words', () => {
    expect(
      exampleValue(
        t({
          kind: 'object',
          props: [
            { name: 'label', required: true, type: { kind: 'string' } },
            { name: 'icon', required: true, type: { kind: 'content' } },
            {
              name: 'items',
              required: true,
              type: { kind: 'array', items: { kind: 'string' } },
            },
          ],
        }),
        {},
        'trailingMenu',
        slotNamer([]),
      ),
    ).toEqual({
      label: 'Trailing menu',
      icon: { $slot: 'trailingMenuIcon' },
      items: ['Item 1', 'Item 2', 'Item 3'],
    });
  });

  it('finds every slot a document uses, in zones and prop values', () => {
    expect([
      ...usedSlots({
        root: {
          id: 'A',
          type: 'x',
          props: { views: [{ content: { $slot: 'a' } }], label: 'L' },
          zones: { children: [{ $slot: 'b' }] },
        },
      } as never),
    ]).toEqual(['a', 'b']);
  });

  it('lists a node’s item slots as outline rows that select the node', () => {
    const node = {
      id: 'N',
      type: 'x',
      props: {
        views: [{ key: 'a', content: { $slot: 'home' } }],
        trailingMenu: { icon: { $slot: 'more' } },
      },
    } as never;
    expect(itemSlots(node)).toEqual([
      {
        name: 'home',
        path: 'views › 1 › content',
        at: ['views', 0, 'content'],
      },
      {
        name: 'more',
        path: 'trailingMenu › icon',
        at: ['trailingMenu', 'icon'],
      },
    ]);
    expect(itemSlots({ id: 'M', type: 'x' } as never)).toEqual([]);
    const id = itemSlotRowId('N', 'views › 1 › content');
    expect(itemSlotRowNode(id)).toBe('N');
    expect(itemSlotRowNode('N')).toBeUndefined();
  });

  it('lists filled field zones among item slots in item order (KF-KA5B40)', () => {
    const tabs = {
      id: 'T',
      type: 'tabs',
      props: {
        label: 'Tabs',
        tabs: [
          { id: 'one' },
          { id: 'two', content: { $slot: 'second' } },
          { id: 'three', content: { $slot: 'third' } },
          ...Array.from({ length: 8 }, (_, index) => ({ id: `more-${index}` })),
        ],
      },
      zones: {
        'tabs.10.content': [{ id: 'L', type: 'last' }],
        trailing: [{ id: 'X', type: 'extra' }],
        'tabs.0.content': [{ id: 'F', type: 'first' }],
      },
    };
    const [root] = outlineTree(
      { schema: 'kerf-ui-document/v1', root: tabs } as never,
      new Map(),
    );
    expect(root!.children!.map(({ label }) => label)).toEqual([
      'first',
      'second slot',
      'third slot',
      'last',
      'extra',
    ]);
  });
});
