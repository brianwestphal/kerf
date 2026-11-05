// KF-3QEZFB: the Inspector binds and promotes a field inside an object prop
// (a ContentItem's `media.src`), not only a whole prop.
import type { ViewDocument } from '@kerfjs/ui/view';
import { validateView } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import { findNode } from '../../../src/editor/model/document.js';
import {
  bindingOptions,
  promoteToParam,
  setField,
} from '../../../src/editor/model/edits.js';
import { viewCatalog } from './kerf-catalog.js';

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
