// KF-3QEZFB: the Inspector binds and promotes a field inside an object prop
// (a ContentItem's `media.src`), not only a whole prop.
import type { ViewDocument, ViewType, ViewValue } from '@kerfjs/ui/view';
import { validateView } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import { findNode } from '../../../src/editor/model/document.js';
import {
  bindingOptions,
  promoteToParam,
  setField,
  setProp,
} from '../../../src/editor/model/edits.js';
import { withRequiredFilled } from '../../../src/editor/model/fields.js';
import { attach } from './editing-harness.js';
import { createEditor, defaultCatalog, viewCatalog } from './kerf-catalog.js';

const ui = '@kerfjs/ui';
const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
const CARD = '01JB8Z1M6Q8E1X9V4S7K2R3T5B';
const LIST = '01JB8Z1M6Q8E1X9V4S7K2R3T5C';
const ROW = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
const string = { kind: 'string' } as const;

const document = {
  schema: 'kerf-ui-document/v1',
  name: 'Feed',
  catalogs: [ui],
  params: {
    title: { type: string },
    count: { type: { kind: 'number' } },
    cards: {
      type: {
        kind: 'array',
        items: {
          kind: 'object',
          props: [
            { name: 'id', type: string, required: true },
            { name: 'art', type: string, required: true },
          ],
        },
      },
    },
  },
  root: {
    id: PANE,
    type: `${ui}:pane`,
    zones: {
      content: [
        {
          id: CARD,
          type: `${ui}:content-item`,
          props: {
            title: 'Skyline',
            media: { src: 'skyline.svg', alt: '' },
          },
        },
        {
          id: LIST,
          type: `${ui}:list`,
          zones: {
            children: [
              {
                $each: { $param: 'cards' },
                as: 'card',
                key: 'card.id',
                template: {
                  id: ROW,
                  type: `${ui}:content-item`,
                  props: {
                    title: 'Card',
                    media: { src: 'placeholder.svg', alt: '' },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
} as unknown as ViewDocument;

const media = (doc: ViewDocument, id: string) =>
  findNode(doc, id)!.node.props?.media;

describe('field-level bind and promote (KF-3QEZFB)', () => {
  it('promotes a field to a param whose default is its literal', () => {
    const result = promoteToParam(
      document,
      CARD,
      'media',
      'mediaSrc',
      { kind: 'string' },
      ['src'],
    );
    expect('document' in result).toBe(true);
    const next = (result as { document: ViewDocument }).document;
    expect(media(next, CARD)).toEqual({ src: { $param: 'mediaSrc' }, alt: '' });
    expect(next.params?.mediaSrc).toEqual({
      type: { kind: 'string' },
      default: 'skyline.svg',
    });
    expect(validateView(next, viewCatalog).diagnostics).toEqual([]);
  });

  it('offers the params and item fields that fit the field', () => {
    expect(
      bindingOptions(document, viewCatalog, CARD, 'media', ['src']).map(
        (option) => option.label,
      ),
    ).toEqual(['Param title']);
    expect(
      bindingOptions(document, viewCatalog, ROW, 'media', ['src']).map(
        (option) => option.label,
      ),
    ).toEqual(['Param title', 'card.id', 'card.art']);
  });

  it('binds a field to an item field and keeps its siblings', () => {
    const next = setField(document, ROW, 'media', ['src'], {
      $bind: 'card.art',
    });
    expect(media(next, ROW)).toEqual({ src: { $bind: 'card.art' }, alt: '' });
    expect(validateView(next, viewCatalog).diagnostics).toEqual([]);
  });

  it('clears a field binding without dropping the object', () => {
    const bound = setField(document, CARD, 'media', ['src'], {
      $param: 'title',
    });
    expect(
      media(setField(bound, CARD, 'media', ['src'], undefined), CARD),
    ).toEqual({ alt: '' });
  });
});

// KF-PTMNSZ: a field's Source judges the field alone. Binding `src` on an
// unset `media` made `{ src }`, which still lacks the required `alt`, and that
// problem rejected every candidate.
describe('binding a field of an unset object (KF-PTMNSZ)', () => {
  const EMPTY = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';
  const withEmptyCard = {
    ...document,
    root: {
      ...document.root,
      zones: {
        content: [
          ...document.root.zones!.content!,
          { id: EMPTY, type: `${ui}:content-item`, props: { title: 'Empty' } },
        ],
      },
    },
  } as unknown as ViewDocument;
  const mediaType = defaultCatalog.propsByKey
    .get(`${ui}:content-item`)!
    .props.find((prop) => prop.name === 'media')!.type as ViewType;
  const definitions = defaultCatalog.viewCatalog.components.get(
    `${ui}:content-item`,
  )!.definitions;
  const prepare = (doc: ViewDocument) =>
    setProp(
      doc,
      EMPTY,
      'media',
      withRequiredFilled(
        findNode(doc, EMPTY)!.node.props?.media as ViewValue | undefined,
        mediaType,
        definitions,
        ['src'],
      ),
    );

  it('fills the other required fields with placeholders, keeping set ones', () => {
    expect(
      withRequiredFilled(undefined, mediaType, definitions, ['src']),
    ).toEqual({ src: 'Src', alt: 'Alt' });
    expect(
      withRequiredFilled({ src: { $param: 'title' } }, mediaType, definitions, [
        'src',
      ]),
    ).toEqual({ src: { $param: 'title' }, alt: 'Alt' });
  });

  it('fills inside a list item and leaves places it cannot follow', () => {
    const item = {
      kind: 'object',
      props: [
        { name: 'a', type: string, required: true },
        { name: 'b', type: string, required: true },
      ],
    } as unknown as ViewType;
    const list = { kind: 'array', items: item } as unknown as ViewType;
    expect(withRequiredFilled([{ a: 'x' }], list, {}, [0, 'a'])).toEqual([
      { a: 'x', b: 'B' },
    ]);
    // No item at the index, a field the type does not declare, and a value
    // that is not a list: nothing to follow, so the value is unchanged.
    expect(withRequiredFilled([], list, {}, [0, 'a'])).toEqual([]);
    expect(withRequiredFilled({ a: 'x', b: 'y' }, item, {}, ['c'])).toEqual({
      a: 'x',
      b: 'y',
    });
    expect(withRequiredFilled('text', list, {}, [0])).toBe('text');
  });

  it('leaves an object whose type declares no fields', () => {
    const empty = { kind: 'object' } as unknown as ViewType;
    expect(withRequiredFilled({ a: 'x' }, empty, {}, [])).toEqual({ a: 'x' });
  });

  it('offers the params that fit the field, not those that do not', () => {
    const labels = (options: readonly { label: string }[]) =>
      options.map((option) => option.label);
    // Judged with the object's missing `alt`, nothing fits.
    expect(
      labels(
        bindingOptions(withEmptyCard, viewCatalog, EMPTY, 'media', ['src']),
      ),
    ).toEqual([]);
    // Judged alone, the string param fits and the number param does not.
    expect(
      labels(
        bindingOptions(
          withEmptyCard,
          viewCatalog,
          EMPTY,
          'media',
          ['src'],
          prepare,
        ),
      ),
    ).toEqual(['Param title']);
  });

  it('lists the param in the Inspector’s Source for an unset object', () => {
    const root = window.document.createElement('div');
    window.document.body.append(root);
    const editor = createEditor({ document: withEmptyCard });
    attach(root, editor);
    editor.selection.value = { kind: 'node', id: EMPTY };
    root
      .querySelector<HTMLElement>(
        `[data-editor-open='${JSON.stringify({ prop: 'media', path: [] })}']`,
      )!
      .click();
    const field = root.querySelector<HTMLElement>(
      '[data-editor-bind="field"]',
    )!;
    expect(field.getAttribute('value')).toBe('src');
    const source = root.querySelector<HTMLElement>(
      '[data-editor-bind="field-source"]',
    )!;
    expect(source.textContent).toContain('Param title');
    expect(source.textContent).not.toContain('Param count');
  });
});
