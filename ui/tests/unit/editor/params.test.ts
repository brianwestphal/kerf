import type { ViewDocument } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import { renameParam } from '../../../src/editor/model/edits.js';
import {
  changeParam,
  createParam,
  paramIsReferenced,
  removeParam,
} from '../../../src/editor/model/params.js';
import { sample, viewCatalog } from './kerf-catalog.js';

const changed = (result: ReturnType<typeof createParam>) => {
  if ('error' in result) throw new Error(result.error);
  return result.document;
};

describe('document param edits', () => {
  it('creates typed inputs and validates defaults against their type', () => {
    const withFlag = changed(
      createParam(sample, viewCatalog, 'showDetails', { kind: 'boolean' }),
    );
    expect(withFlag.params?.showDetails).toEqual({ type: { kind: 'boolean' } });
    expect(
      changeParam(withFlag, viewCatalog, 'showDetails', {
        type: { kind: 'boolean' },
        default: true,
      }),
    ).toMatchObject({
      document: { params: { showDetails: { default: true } } },
    });
    expect(
      changeParam(withFlag, viewCatalog, 'showDetails', {
        type: { kind: 'boolean' },
        default: 'yes',
      }),
    ).toEqual({ error: 'the default is not a valid boolean' });
    expect(
      createParam(sample, viewCatalog, 'Bad Name', { kind: 'string' }),
    ).toEqual({
      error: 'A param name is a camelCase identifier.',
    });
    expect(
      createParam(sample, viewCatalog, 'title', { kind: 'string' }),
    ).toEqual({
      error: 'There is already a param named title.',
    });
  });

  it('accepts a list with an item schema for Repeat for each', () => {
    const result = createParam(sample, viewCatalog, 'cards', {
      kind: 'array',
      items: {
        kind: 'object',
        props: [
          { name: 'id', type: { kind: 'string' }, required: true },
          { name: 'title', type: { kind: 'string' }, required: true },
        ],
      },
    });
    expect(result).toHaveProperty('document');
    expect(
      changeParam(changed(result), viewCatalog, 'cards', {
        type: {
          kind: 'array',
          items: {
            kind: 'object',
            props: [{ name: 'id', type: { kind: 'string' }, required: true }],
          },
        },
        default: [{ id: 'a' }],
      }),
    ).toHaveProperty('document');
  });

  it('rewrites direct and path references on rename, then refuses removal', () => {
    const document: ViewDocument = {
      ...sample,
      params: {
        ...sample.params,
        cards: {
          type: {
            kind: 'array',
            items: {
              kind: 'object',
              props: [{ name: 'id', type: { kind: 'string' }, required: true }],
            },
          },
        },
      },
      root: {
        ...sample.root!,
        zones: {
          ...sample.root!.zones,
          content: [
            {
              $if: { $param: 'showEmpty' },
              then: {
                id: '01JB8Z1M6Q8E1X9V4S7K2R3T9A',
                type: '@kerfjs/ui:text',
                props: { children: { $bind: 'title' } },
              },
            },
            {
              $each: { $param: 'cards' },
              as: 'card',
              key: 'card.id',
              template: {
                id: '01JB8Z1M6Q8E1X9V4S7K2R3T9B',
                type: '@kerfjs/ui:list-item',
                props: { label: { $bind: 'card.id' } },
              },
            },
          ],
        },
      },
    };
    const renamed = renameParam(document, 'title', 'heading');
    expect(renamed).toHaveProperty('document');
    if ('error' in renamed) return;
    expect(paramIsReferenced(renamed.document, 'title')).toBe(false);
    expect(paramIsReferenced(renamed.document, 'heading')).toBe(true);
    expect(removeParam(renamed.document, viewCatalog, 'heading')).toEqual({
      error: 'Param heading is used in this view. Remove its bindings first.',
    });
    expect(removeParam(document, viewCatalog, 'cards')).toEqual({
      error: 'Param cards is used in this view. Remove its bindings first.',
    });
    expect(removeParam(document, viewCatalog, 'missing')).toEqual({
      error: 'No param missing.',
    });
  });

  it('removes unused params and refuses a type that breaks existing bindings', () => {
    const unused = changed(
      createParam(sample, viewCatalog, 'unused', { kind: 'number' }),
    );
    expect(removeParam(unused, viewCatalog, 'unused')).toEqual({
      document: sample,
    });
    expect(
      changeParam(sample, viewCatalog, 'showEmpty', {
        type: { kind: 'string' },
      }),
    ).toHaveProperty('error');
    expect(
      changeParam(sample, viewCatalog, 'missing', { type: { kind: 'string' } }),
    ).toEqual({ error: 'No param missing.' });
  });

  it('recognizes path reads and preserves pre-existing diagnostics', () => {
    expect(
      paramIsReferenced(
        {
          ...sample,
          root: {
            id: '01JB8Z1M6Q8E1X9V4S7K2R3T9C',
            type: '@kerfjs/ui:text',
            props: { children: { $bind: 'record.label' } },
          },
        },
        'record',
      ),
    ).toBe(true);
    const invalid: ViewDocument = {
      ...sample,
      params: {
        ...sample.params,
        bad: { type: { kind: 'enum', values: [] } },
      },
    };
    expect(
      createParam(invalid, viewCatalog, 'other', { kind: 'number' }),
    ).toHaveProperty('document');
  });

  it('handles an empty param map and removes its final unused declaration', () => {
    const empty: ViewDocument = { ...sample, params: undefined };
    expect(
      createParam(empty, viewCatalog, 'first', { kind: 'string' }),
    ).toHaveProperty('document');
    expect(
      changeParam(empty, viewCatalog, 'missing', { type: { kind: 'string' } }),
    ).toEqual({
      error: 'No param missing.',
    });
    expect(removeParam(empty, viewCatalog, 'missing')).toEqual({
      error: 'No param missing.',
    });
    const one: ViewDocument = {
      ...sample,
      params: { unused: { type: { kind: 'string' } } },
      root: undefined,
    };
    expect(removeParam(one, viewCatalog, 'unused')).toEqual({
      document: { ...one, params: undefined },
    });
  });
});
