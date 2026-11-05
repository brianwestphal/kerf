// KF-3QEZFB: a `$param` / `$bind` may hold a field inside a list or object
// prop value (a ContentItem's `media.src`), checked against that field's type,
// so app data sits next to fields the document builds.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { SafeHtml } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { ContentItem } from '../../src/content-item.js';
import { Pane } from '../../src/pane.js';
import {
  contractDigest,
  contractOf,
  createViewCatalog,
  generateView,
  interpretView,
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

const ui = '@kerfjs/ui';
const ROOT = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
const ITEM = '01JB8Z1M6Q8E1X9V4S7K2R3T5B';
const string = { kind: 'string' };

/** A Pane holding one ContentItem whose `media` is `media`. */
const card = (
  media: unknown,
  params: Record<string, unknown> = { art: { type: string } },
): Record<string, unknown> => ({
  schema: VIEW_DOCUMENT_SCHEMA_ID,
  name: 'Card',
  catalogs: [ui],
  params,
  root: {
    id: ROOT,
    type: `${ui}:pane`,
    zones: {
      content: [
        {
          id: ITEM,
          type: `${ui}:content-item`,
          props: { title: 'Skyline', media },
        },
      ],
    },
  },
});

/** A List repeating ContentItems over `cards`, each `media.src` bound. */
const feed = (src: unknown): Record<string, unknown> => ({
  schema: VIEW_DOCUMENT_SCHEMA_ID,
  name: 'Feed',
  catalogs: [ui],
  params: {
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
    id: ROOT,
    type: `${ui}:list`,
    zones: {
      children: [
        {
          $each: { $bind: 'cards' },
          as: 'card',
          key: 'card.id',
          template: {
            id: ITEM,
            type: `${ui}:content-item`,
            props: { title: 'Card', media: { src, alt: '' } },
          },
        },
      ],
    },
  },
});

const diagnostics = (document: unknown) =>
  validateView(document, catalog).diagnostics.map(
    ({ code, message }) => `${code} ${message}`,
  );

describe('nested $param / $bind: validation', () => {
  it('accepts a $param at a typed field inside an object prop', () => {
    expect(diagnostics(card({ src: { $param: 'art' }, alt: '' }))).toEqual([]);
  });

  it('accepts a $bind to an $each item field inside an object prop', () => {
    expect(diagnostics(feed({ $bind: 'card.art' }))).toEqual([]);
  });

  it("rejects a param whose type does not fit the field's", () => {
    expect(
      diagnostics(
        card(
          { src: { $param: 'art' }, alt: '' },
          {
            art: { type: { kind: 'number' } },
          },
        ),
      ),
    ).toEqual([
      expect.stringMatching(/^KUI-V004 .* is not a valid ContentItemMedia$/),
    ]);
  });

  it('reports an unknown param once, without a type mismatch', () => {
    expect(diagnostics(card({ src: { $param: 'missing' }, alt: '' }))).toEqual([
      'KUI-V007 `$param` "missing" is not a document param',
    ]);
  });

  it('reports an out-of-scope binding, without a type mismatch', () => {
    const problems = diagnostics(feed({ $bind: 'other.art' }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^KUI-V007 /);
  });

  it('keeps a prop-typed param to a whole prop', () => {
    expect(
      diagnostics(
        card(
          { src: { $param: 'art' }, alt: '' },
          {
            art: {
              type: {
                kind: 'prop',
                component: `${ui}:content-item`,
                prop: 'title',
              },
            },
          },
        ),
      ),
    ).toEqual([
      expect.stringMatching(/^KUI-V004 .* is not a valid ContentItemMedia$/),
    ]);
  });

  it('accepts a $param at a list item field', () => {
    expect(
      diagnostics({
        schema: VIEW_DOCUMENT_SCHEMA_ID,
        name: 'Stack',
        catalogs: [ui],
        params: { homeKey: { type: string } },
        root: {
          id: ROOT,
          type: `${ui}:nav-stack`,
          props: {
            id: 'stack',
            label: 'Stack',
            views: [{ key: { $param: 'homeKey' }, content: { $slot: 'home' } }],
          },
        },
      }),
    ).toEqual([]);
  });

  it('still requires a param default to be a literal', () => {
    expect(
      diagnostics(
        card(
          { src: { $param: 'art' }, alt: '' },
          {
            art: { type: string, default: { $param: 'other' } },
          },
        ),
      ),
    ).not.toEqual([]);
  });
});

describe('nested $param / $bind: interpretView and generateView', () => {
  it('renders the param inside the object, and its default', () => {
    const document = card(
      { src: { $param: 'art' }, alt: '' },
      {
        art: { type: string, default: 'default.svg' },
      },
    );
    const view = (inputs: Record<string, unknown>) =>
      interpretView(document as never, {
        catalog,
        components: {
          [`${ui}:pane`]: Pane,
          [`${ui}:content-item`]: ContentItem,
        } as Record<string, (props: never) => SafeHtml>,
        inputs,
        contract: contractDigest(contractOf(document as never, catalog)),
      }).toString();
    expect(view({ art: 'skyline.svg' })).toContain('src="skyline.svg"');
    expect(view({})).toContain('src="default.svg"');
  });

  it('generates the param in place inside the object literal', () => {
    const { code } = generateView(
      card({ src: { $param: 'art' }, alt: '' }) as never,
      catalog,
      { source: 'card.kui.json' },
    );
    expect(code).toMatch(/src: inputs\.art/);
  });

  it('generates an $each item field in place', () => {
    const { code } = generateView(
      feed({ $bind: 'card.art' }) as never,
      catalog,
      {
        source: 'feed.kui.json',
      },
    );
    expect(code).toMatch(/src: card\.art/);
  });

  it('types the param in the contract like a whole-prop param', () => {
    expect(
      contractOf(card({ src: { $param: 'art' }, alt: '' }) as never, catalog)
        .inputs.art,
    ).toMatchObject({ type: 'string', optional: false });
  });
});
