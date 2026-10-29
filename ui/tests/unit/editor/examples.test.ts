// KF-HNNWN9: placeholder values for list and object props, built from the
// props catalog's type graph.
import { describe, expect, it } from 'vitest';

import { valueFromControl } from '../../../src/editor/model/controls.js';
import {
  exampleValue,
  isStructured,
  resolveType,
} from '../../../src/editor/model/examples.js';

const t = (type: object) => type as never;

describe('exampleValue', () => {
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
