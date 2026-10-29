// KF-SXDM56: a `$slot` at a content-typed position inside a prop value (an
// item slot) — a NavStack view's content, a row menu's icon — is filled by
// the application exactly as a zone's `$slot` is.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { raw, type SafeHtml } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { NavStack } from '../../src/nav-stack.js';
import {
  contractDigest,
  contractOf,
  createViewCatalog,
  generateView,
  interpretView,
  isLiteralOf,
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

const ROOT = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
const navStack = (
  views: unknown,
  rest: Record<string, unknown> = {},
): Record<string, unknown> => ({
  schema: VIEW_DOCUMENT_SCHEMA_ID,
  name: 'Stack',
  catalogs: ['@kerfjs/ui'],
  root: {
    id: ROOT,
    type: '@kerfjs/ui:nav-stack',
    props: { id: 'stack', label: 'Stack', views },
  },
  ...rest,
});
const views = [
  { key: 'home', content: { $slot: 'homeView' } },
  { key: 'detail', content: { $slot: 'detailView' } },
];
const diagnostics = (document: unknown) =>
  validateView(document, catalog).diagnostics.map(
    ({ code, message }) => `${code} ${message}`,
  );

describe('item slots: validation', () => {
  it('accepts a $slot at a content field inside a list item', () => {
    expect(diagnostics(navStack(views))).toEqual([]);
  });

  it('accepts a $slot at a content field of an object prop', () => {
    expect(
      diagnostics({
        ...navStack([]),
        root: {
          id: ROOT,
          type: '@kerfjs/ui:list-action-row',
          props: {
            label: 'Row',
            action: 'open',
            trailingMenu: {
              label: 'More',
              icon: { $slot: 'moreIcon' },
              items: [{ label: 'Rename' }],
            },
          },
        },
      }),
    ).toEqual([]);
  });

  it('rejects a malformed item slot once, without a type mismatch', () => {
    expect(
      diagnostics(navStack([{ key: 'a', content: { $slot: 'a', input: {} } }])),
    ).toEqual(['KUI-V001 a `$slot` in a prop value passes no "input"']);
    expect(
      diagnostics(navStack([{ key: 'a', content: { $slot: 'Bad' } }])),
    ).toEqual(['KUI-V001 a slot name is a camelCase identifier']);
    expect(
      diagnostics(
        navStack([{ key: 'a', content: { $slot: 'withInput' } }], {
          slots: {
            withInput: { input: { kind: 'object', props: [] } },
          },
        }),
      ),
    ).toEqual([
      'KUI-V001 slot "withInput" declares an input, which a `$slot` in a prop value cannot pass',
    ]);
  });

  it('is not content anywhere else', () => {
    // A view's key is a string, not content.
    expect(
      diagnostics(navStack([{ key: { $slot: 'key' }, content: 'Home' }])),
    ).toEqual([
      expect.stringMatching(/^KUI-V004 .* is not a valid NavStackView\[\]$/),
    ]);
    // isLiteralOf, the public literal check, takes no slots.
    expect(
      isLiteralOf({ $slot: 'x' }, { kind: 'content', text: 'SafeHtml' }),
    ).toBe(false);
  });
});

describe('item slots: contract, interpreter, and generator', () => {
  it('puts each item slot in the contract with no input', () => {
    expect(contractOf(navStack(views) as never, catalog).slots).toEqual({
      detailView: null,
      homeView: null,
    });
  });

  it('renders the application content in place of each item slot', () => {
    const document = navStack(views);
    const html = interpretView(document as never, {
      catalog,
      components: {
        '@kerfjs/ui:nav-stack': NavStack,
      } as Record<string, (props: never) => SafeHtml>,
      slots: {
        homeView: () => raw('<p id="home">Home</p>'),
        detailView: () => raw('<p id="detail">Detail</p>'),
      },
      contract: contractDigest(contractOf(document as never, catalog)),
    }).toString();
    expect(html).toContain('<p id="home">Home</p>');
    expect(html).toContain('<p id="detail">Detail</p>');
  });

  it('generates a call to the slot and types it in the Slots interface', () => {
    const { code } = generateView(navStack(views) as never, catalog, {
      source: 'stack.kui.json',
    });
    expect(code).toContain('content: slots.homeView()');
    expect(code).toContain('content: slots.detailView()');
    expect(code).toMatch(
      /export interface StackSlots \{\n {2}detailView\(\): SafeHtml;\n {2}homeView\(\): SafeHtml;\n\}/,
    );
  });
});
