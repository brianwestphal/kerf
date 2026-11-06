// KF-RDZ7N7 / KF-EP2152: a document composed into an `$each` row. Its root
// carries the row's key as `data-key` (the generated render function's
// optional third argument, and interpretView's own threading), and its
// actions are row actions of the composing document, while its own contract
// keeps them view-scoped.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { mount, type SafeHtml } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { List } from '../../src/list.js';
import { ListItem } from '../../src/list-item.js';
import {
  contractDigest,
  contractOf,
  createViewCatalog,
  generateView,
  interpretView,
  validateView,
  type ViewDocument,
} from '../../view/index.mjs';
import { listDocument, rowDocument } from './editor/fixtures-views.js';

const root = resolve(import.meta.dirname, '../..');
const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const catalog = createViewCatalog({
  props: [readJson('ai/component-props.json')],
  composition: [readJson('ai/component-composition.json')],
});
const components = {
  '@kerfjs/ui:list': List,
  '@kerfjs/ui:list-item': ListItem,
} as Record<string, (props: never) => SafeHtml>;

/** A document whose root is itself a `#view` of the row document. */
const wrapper = (): ViewDocument =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'MessageWrapper',
    catalogs: ['@kerfjs/ui'],
    params: { title: { type: { kind: 'string' } } },
    root: {
      id: '01JC0V1EW0000000000000000W',
      type: '#view',
      src: './message-row.kui.json',
      props: { title: { $param: 'title' } },
    },
  }) as unknown as ViewDocument;

const resolveView = (src: string) =>
  src.includes('wrapper') ? wrapper() : rowDocument();

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
  document.body.replaceChildren();
});

/** Mounts `document` through interpretView and returns its host. */
const render = (document: ViewDocument) => {
  const host = window.document.createElement('div');
  window.document.body.append(host);
  const contract = contractDigest(
    contractOf(document, catalog, { resolveView }),
  );
  stop = mount(host, () =>
    interpretView(document, { catalog, components, resolveView, contract }),
  );
  return host;
};

describe('a document composed into a row', () => {
  it('contributes its actions to the composing document as row actions', () => {
    const list = validateView(listDocument(), catalog, { resolveView });
    expect(list.diagnostics).toEqual([]);
    expect(list.actions.get('open-message')).toBe('row');
    // Standalone it has no row, so its own contract keeps them view-scoped.
    expect(
      validateView(rowDocument(), catalog).actions.get('open-message'),
    ).toBe('view');
    // Through a nested #view the action is still the composing row's.
    const nested = validateView(
      listDocument(
        { title: { $bind: 'message.subject' } },
        './wrapper.kui.json',
      ),
      catalog,
      { resolveView },
    );
    expect(nested.diagnostics).toEqual([]);
    expect(nested.actions.get('open-message')).toBe('row');
  });

  it('reports KUI-V009 when the same document is composed inside and outside a row', () => {
    const both = listDocument();
    (both.root!.zones!.children as unknown[]).push({
      id: '01JC0V1EW0000000000000000T',
      type: '#view',
      src: './message-row.kui.json',
      props: { title: 'Pinned' },
    });
    expect(
      validateView(both, catalog, { resolveView }).diagnostics.map(
        ({ code, message }) => `${code} ${message}`,
      ),
    ).toEqual([
      'KUI-V009 action "open-message" is used with both row and view scope',
    ]);
  });

  it('passes the row key to the composed render function, which puts it on its root', () => {
    const list = generateView(listDocument(), catalog, { resolveView });
    expect(list.contract.actions).toEqual({ 'open-message': 'row' });
    expect(list.code).toContain(
      'renderMessageRow({ title: message.subject }, {}, String(message.id))',
    );
    expect(list.code).toContain('key: rowKey(target)');
    const row = generateView(rowDocument(), catalog);
    expect(row.contract.actions).toEqual({ 'open-message': 'view' });
    expect(row.code).toContain(
      'export function renderMessageRow(inputs: MessageRowInputs, slots: MessageRowSlots = {}, rowKey?: string): SafeHtml {',
    );
    expect(row.code).toContain(
      "...(rowKey === undefined ? {} : { 'data-key': rowKey })",
    );
    // A document whose root is a #view hands its own key on.
    const nested = generateView(wrapper(), catalog, { resolveView });
    expect(nested.code).toContain(
      'renderMessageRow({ title: inputs.title }, {}, rowKey)',
    );
    // Outside a row, a #view is called as before.
    const outside = generateView(
      {
        ...wrapper(),
        name: 'Outside',
        root: {
          id: '01JC0V1EW0000000000000000S',
          type: '@kerfjs/ui:list',
          props: { ariaLabel: 'Pinned' },
          zones: {
            children: [{ ...wrapper().root!, props: { title: 'Pinned' } }],
          },
        },
      } as ViewDocument,
      catalog,
      { resolveView },
    );
    expect(outside.code).toContain('renderMessageRow({ title: "Pinned" }),');
  });

  it('renders each composed row root with its key, through any #view depth', () => {
    const keys = (host: HTMLElement) =>
      [
        ...host.querySelectorAll(
          '[data-kerf-node="01JC0V1EW0000000000000000R"]',
        ),
      ].map((row) => row.getAttribute('data-key'));
    expect(keys(render(listDocument()))).toEqual(['m1', 'm2']);
    stop!();
    document.body.replaceChildren();
    expect(
      keys(
        render(
          listDocument(
            { title: { $bind: 'message.subject' } },
            './wrapper.kui.json',
          ),
        ),
      ),
    ).toEqual(['m1', 'm2']);
    // A standalone row document has no key.
    stop!();
    document.body.replaceChildren();
    expect(
      keys(
        render({
          ...rowDocument(),
          params: {
            ...rowDocument().params,
            title: { type: { kind: 'string' }, default: 'Solo' },
          },
        } as ViewDocument),
      ),
    ).toEqual([null]);
  });
});
