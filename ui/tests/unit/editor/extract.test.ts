// KF-D9P3NP: Extract to document (row template phase 3): the new document's
// params, the `#view` that replaces the subtree, and the paths around them.
import {
  generateView,
  validateView,
  type ViewDocument,
  type ViewNode,
} from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import {
  documentNameFor,
  type Extraction,
  extractProblem,
  extractSuggestion,
  extractToDocument,
  relativeSrc,
} from '../../../src/editor/model/extract.js';
import { listDocument, rowDocument } from './fixtures-views.js';
import { viewCatalog } from './kerf-catalog.js';

const LIST = 'views/inbox.kui.json';
const ROW = '01JC0V1EW0000000000000000T';
const VIEW = '01JC0V1EW0000000000000000W';

const messages = {
  type: {
    kind: 'array',
    items: {
      kind: 'object',
      props: [
        { name: 'id', type: { kind: 'string' }, required: true },
        { name: 'subject', type: { kind: 'string' }, required: true },
        { name: 'unread', type: { kind: 'boolean' }, required: true },
        {
          name: 'tags',
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
          required: true,
        },
      ],
    },
  },
  default: [
    { id: 'm1', subject: 'Quarterly report', unread: true, tags: [] },
    { id: 'm2', subject: 'Lunch on Friday', unread: false, tags: [] },
  ],
};

const row = (props: Record<string, unknown>): ViewNode =>
  ({
    id: ROW,
    type: '@kerfjs/ui:list-item',
    props: { action: { $action: 'open-message' }, ...props },
  }) as ViewNode;

/** An inbox whose rows are `template`, beside a `subject` param. */
const inbox = (template: unknown, extra: Record<string, unknown> = {}) =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Inbox',
    catalogs: ['@kerfjs/ui'],
    params: {
      subject: { type: { kind: 'string' }, default: 'Inbox' },
      messages,
      ...extra,
    },
    root: {
      id: '01JC0V1EW0000000000000000S',
      type: '@kerfjs/ui:list',
      props: { ariaLabel: { $param: 'subject' } },
      zones: {
        children: [
          {
            $each: { $param: 'messages' },
            as: 'message',
            key: 'message.id',
            template,
          },
        ],
      },
    },
  }) as unknown as ViewDocument;

const extract = (
  document: ViewDocument,
  path = 'views/inbox-row.kui.json',
  id = ROW,
  resolveView?: (src: string) => unknown,
) =>
  extractToDocument(document, id, {
    documentPath: LIST,
    path,
    view: VIEW,
    catalog: viewCatalog,
    resolveView,
  });

const ok = (result: ReturnType<typeof extract>): Extraction => {
  if ('error' in result) throw new Error(result.error);
  return result;
};

const template = (document: ViewDocument) =>
  (document.root!.zones!.children![0] as { template: unknown }).template;

describe('Extract to document', () => {
  it('promotes the item fields and params a row reads, and passes them back', () => {
    const source = inbox(
      row({
        label: { $bind: 'message.subject' },
        selected: { $bind: 'message.unread' },
        description: { $param: 'subject' },
      }),
    );
    const { document, extracted, src, view } = ok(extract(source));
    expect(src).toBe('./inbox-row.kui.json');
    expect(view).toBe(VIEW);
    expect(extracted.name).toBe('InboxRow');
    expect(extracted.catalogs).toEqual(['@kerfjs/ui']);
    // Document params keep their names and definitions; item fields are
    // named for the field and typed from the item.
    expect(extracted.params).toEqual({
      messageSubject: { type: { kind: 'string' } },
      unread: { type: { kind: 'boolean' } },
      subject: { type: { kind: 'string' }, default: 'Inbox' },
    });
    expect(extracted.root).toEqual({
      ...row({}),
      props: {
        action: { $action: 'open-message' },
        label: { $param: 'messageSubject' },
        selected: { $param: 'unread' },
        description: { $param: 'subject' },
      },
    });
    expect(template(document)).toEqual({
      id: VIEW,
      type: '#view',
      src: './inbox-row.kui.json',
      props: {
        messageSubject: { $bind: 'message.subject' },
        unread: { $bind: 'message.unread' },
        subject: { $param: 'subject' },
      },
    });
  });

  it('keeps a document param named like a field, and renames the field', () => {
    const { extracted } = ok(
      extract(
        inbox(
          row({
            label: { $bind: 'message.subject' },
            description: { $param: 'subject' },
          }),
        ),
      ),
    );
    expect(Object.keys(extracted.params!)).toEqual([
      'messageSubject',
      'subject',
    ]);
  });

  it('validates and generates both documents', () => {
    const source = inbox(
      row({
        label: { $bind: 'message.subject' },
        selected: { $bind: 'message.unread' },
      }),
    );
    const { document, extracted, src } = ok(extract(source));
    const resolveView = (name: string) =>
      name === src ? extracted : undefined;
    expect(
      validateView(document, viewCatalog, { resolveView }).diagnostics,
    ).toEqual([]);
    expect(validateView(extracted, viewCatalog).diagnostics).toEqual([]);
    const list = generateView(document, viewCatalog, {
      source: 'inbox.kui.json',
      resolveView,
    });
    expect(list.code).toContain('renderInboxRow');
    expect(list.code).toContain("from './inbox-row.view.js'");
    expect(list.code).toContain('subject: message.subject');
    const own = generateView(extracted, viewCatalog, {
      source: 'inbox-row.kui.json',
    });
    expect(own.code).toContain('export function renderInboxRow');
    expect(own.code).toContain('readonly subject: string');
    expect(own.code).toContain('readonly unread: boolean');
  });

  it('types a nested repeat’s item, and refuses a row that repeats itself', () => {
    const tagged = {
      id: ROW,
      type: '@kerfjs/ui:list',
      props: { ariaLabel: { $bind: 'message.subject' } },
      zones: {
        children: [
          {
            $each: { $bind: 'message.tags' },
            as: 'tag',
            key: 'tag.id',
            template: {
              id: '01JC0V1EW0000000000000000U',
              type: '@kerfjs/ui:list-item',
              props: { label: { $bind: 'tag.label' } },
            },
          },
        ],
      },
    };
    // A row document with its own keyed repeat cannot sit in a row (KUI-V016).
    expect(extract(inbox(tagged))).toEqual({
      error:
        'It cannot be extracted: a document composed into an `$each` row cannot repeat; move the `$each` into the composing document.',
    });
    // The inner row's item is typed through the outer item's field.
    const { extracted, document } = ok(
      extract(inbox(tagged), undefined, '01JC0V1EW0000000000000000U'),
    );
    expect(extracted.params).toEqual({ label: { type: { kind: 'string' } } });
    const inner = document.root!.zones!.children![0] as unknown as {
      template: { zones: { children: { template: unknown }[] } };
    };
    expect(inner.template.zones.children[0]!.template).toMatchObject({
      type: '#view',
      props: { label: { $bind: 'tag.label' } },
    });
  });

  it('keeps a repeat inside the subtree, with its rows and their own item', () => {
    const rowOf = (id: string) => ({
      id,
      type: '@kerfjs/ui:list-item',
      props: { label: { $bind: 'message.subject' } },
    });
    const document = {
      schema: 'kerf-ui-document/v1',
      name: 'Inbox',
      catalogs: ['@kerfjs/ui'],
      params: { messages },
      root: {
        id: '01JC0V1EW0000000000000000S',
        type: '@kerfjs/ui:list',
        props: { ariaLabel: 'Inbox' },
        zones: {
          children: [
            {
              id: ROW,
              type: '@kerfjs/ui:list',
              props: { ariaLabel: 'Messages' },
              zones: {
                children: [
                  {
                    $each: { $param: 'messages' },
                    as: 'message',
                    key: 'message.id',
                    template: {
                      $if: { $bind: 'message.unread' },
                      then: rowOf('01JC0V1EW0000000000000000A'),
                      else: rowOf('01JC0V1EW0000000000000000B'),
                    },
                  },
                  {
                    $each: { $param: 'messages' },
                    as: 'message',
                    key: 'message.id',
                    kind: { $bind: 'message.subject' },
                    templates: {
                      default: rowOf('01JC0V1EW0000000000000000C'),
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    } as unknown as ViewDocument;
    const { extracted } = ok(extract(document));
    expect(extracted.params).toEqual({ messages });
    expect(extracted.root!.zones).toEqual(
      (document.root!.zones!.children![0] as ViewNode).zones,
    );
  });

  it('reads deeper paths and the whole item, and names fields as params', () => {
    const source = inbox(
      row({
        label: { $bind: 'message.meta.title' },
        description: { $bind: 'message' },
      }),
      {},
    );
    // The fixture's item has no `meta`: a read without a type is refused.
    expect(extract(source)).toEqual({
      error:
        'message.meta has no known type, so it cannot become a param. Bind the repeat to a typed param first.',
    });
    const meta = {
      ...messages,
      type: {
        kind: 'array',
        items: {
          kind: 'object',
          props: [
            { name: 'id', type: { kind: 'string' }, required: true },
            {
              name: 'meta',
              type: {
                kind: 'object',
                props: [
                  { name: 'title', type: { kind: 'string' }, required: true },
                ],
              },
              required: true,
            },
            { name: 'first_name', type: { kind: 'string' }, required: true },
            { name: '_', type: { kind: 'string' }, required: true },
          ],
        },
      },
    };
    const deep = ok(
      extract(
        inbox(
          row({
            label: { $bind: 'message.meta.title' },
            description: { $bind: 'message.first_name' },
            badge: { $bind: 'message._' },
            value: { $bind: 'message' },
          }),
          { messages: meta },
        ),
      ),
    );
    expect(Object.keys(deep.extracted.params!)).toEqual([
      'meta',
      'firstName',
      'messageValue',
      'message',
    ]);
    expect(deep.extracted.root!.props).toMatchObject({
      label: { $bind: 'meta.title' },
      description: { $param: 'firstName' },
      value: { $param: 'message' },
    });
    expect(template(deep.document)).toMatchObject({
      props: {
        meta: { $bind: 'message.meta' },
        firstName: { $bind: 'message.first_name' },
        message: { $bind: 'message' },
      },
    });
  });

  it('follows a $bind into a param, nested values, and leaves other values', () => {
    const { extracted } = ok(
      extract(
        inbox(
          row({
            label: { $bind: 'data.title' },
            media: { kind: 'icon', name: { $param: 'subject' }, list: [1] },
          }),
          {
            data: {
              type: {
                kind: 'object',
                props: [
                  { name: 'title', type: { kind: 'string' }, required: true },
                ],
              },
              default: { title: 'Hi' },
            },
          },
        ),
      ),
    );
    expect(Object.keys(extracted.params!)).toEqual(['data', 'subject']);
  });

  it('skips an unknown param, which stays a problem the validator reports', () => {
    const result = extract(inbox(row({ label: { $param: 'missing' } })));
    // The unknown param was already a problem; it moves with the row.
    const { extracted, document } = ok(result);
    expect(extracted.params).toBeUndefined();
    expect(template(document)).not.toHaveProperty('props');
  });

  it('extracts a row design of an $if chain and of a kinds map', () => {
    const header = row({ label: { $bind: 'message.subject' } });
    const plain = (id: string) =>
      ({
        id,
        type: '@kerfjs/ui:list-item',
        props: { label: 'Row' },
      }) as ViewNode;
    // A row document's actions are its own view's, so one the other row
    // designs share in the row's scope is refused.
    const shared = inbox({
      $if: { $bind: 'message.unread' },
      then: header,
      else: { ...row({}), id: '01JC0V1EW0000000000000000X' },
    });
    expect(extract(shared)).toEqual({
      error:
        'It cannot be extracted: action "open-message" is used with both row and view scope.',
    });
    const chain = inbox({
      $if: { $bind: 'message.unread' },
      then: header,
      else: {
        $if: { $bind: 'message.unread' },
        then: plain('01JC0V1EW0000000000000000X'),
        else: plain('01JC0V1EW0000000000000000Y'),
      },
    });
    const fromChain = ok(extract(chain));
    expect((template(fromChain.document) as { then: ViewNode }).then.type).toBe(
      '#view',
    );
    const last = ok(extract(chain, undefined, '01JC0V1EW0000000000000000Y'));
    expect(JSON.stringify(template(last.document))).toContain('#view');
    const kinds = {
      ...inbox(header),
      root: {
        ...inbox(header).root!,
        zones: {
          children: [
            {
              $each: { $param: 'messages' },
              as: 'message',
              key: 'message.id',
              kind: { $bind: 'message.subject' },
              templates: {
                default: header,
                other: plain('01JC0V1EW0000000000000000Z'),
              },
            },
            { $slot: 'footer' },
          ],
        },
      },
    } as unknown as ViewDocument;
    const fromKinds = ok(extract(kinds));
    const each = fromKinds.document.root!.zones!.children![0] as {
      templates: Record<string, ViewNode>;
    };
    expect(each.templates.default!.type).toBe('#view');
    expect(each.templates.other!.type).toBe('@kerfjs/ui:list-item');
  });

  it('extracts a node under an $if, a node in a zone, and keeps its siblings', () => {
    const text = {
      id: '01JC0V1EW0000000000000000T',
      type: '#text',
      value: { $param: 'subject' },
    };
    const document = {
      schema: 'kerf-ui-document/v1',
      name: 'Card',
      catalogs: ['@kerfjs/ui'],
      params: { subject: { type: { kind: 'string' } }, shown: messages },
      root: {
        id: '01JC0V1EW0000000000000000S',
        type: '@kerfjs/ui:list',
        props: { ariaLabel: 'Card' },
        zones: {
          children: [
            {
              $if: true,
              then: {
                id: '01JC0V1EW0000000000000000P',
                type: '@kerfjs/ui:list-item',
                props: { label: 'Kept' },
              },
              else: {
                id: '01JC0V1EW0000000000000000Q',
                type: '@kerfjs/ui:text',
                zones: { default: [text] },
              },
            },
            {
              $if: false,
              then: {
                id: '01JC0V1EW0000000000000000N',
                type: '@kerfjs/ui:list-item',
                props: { label: 'Also kept' },
              },
            },
          ],
        },
      },
    } as unknown as ViewDocument;
    const result = ok(
      extractToDocument(document, '01JC0V1EW0000000000000000Q', {
        documentPath: 'card.kui.json',
        path: 'parts/card-text.kui.json',
        view: VIEW,
        catalog: viewCatalog,
      }),
    );
    expect(result.src).toBe('./parts/card-text.kui.json');
    expect(result.extracted.root!.zones!.default![0]).toEqual(text);
    const branch = result.document.root!.zones!.children![0] as {
      then: ViewNode;
      else: ViewNode;
    };
    expect(branch.then.props!.label).toBe('Kept');
    expect(branch.else).toMatchObject({ type: '#view', id: VIEW });
  });

  it('extracts a subtree that composes documents only into its folder', () => {
    const composed = listDocument();
    const id = composed.root!.id;
    const resolve = () => rowDocument();
    const outer = {
      ...composed,
      root: {
        id: '01JC0V1EW0000000000000000A',
        type: '@kerfjs/ui:list',
        props: { ariaLabel: 'Outer' },
        zones: { children: [composed.root!] },
      },
    } as ViewDocument;
    const beside = ok(
      extractToDocument(outer, id, {
        documentPath: 'views/messages.kui.json',
        path: 'views/messages-list.kui.json',
        view: VIEW,
        catalog: viewCatalog,
        resolveView: resolve,
      }),
    );
    expect(JSON.stringify(beside.extracted)).toContain(
      '"src":"./message-row.kui.json"',
    );
    expect(
      extractToDocument(
        {
          ...composed,
          root: {
            id: '01JC0V1EW0000000000000000A',
            type: '@kerfjs/ui:list',
            props: { ariaLabel: 'Outer' },
            zones: { children: [composed.root!] },
          },
        },
        id,
        {
          documentPath: 'views/messages.kui.json',
          path: 'parts/messages-list.kui.json',
          view: VIEW,
          catalog: viewCatalog,
          resolveView: resolve,
        },
      ),
    ).toEqual({
      error:
        'It composes other documents, so it extracts into the same folder as this document.',
    });
  });

  it('reads repeats over a param’s field, untyped items, and conditions', () => {
    const list = (each: unknown, extra: Record<string, unknown> = {}) =>
      ({
        $schema: 'https://kerf.dev/kerf-ui-document.schema.json',
        schema: 'kerf-ui-document/v1',
        name: 'Inbox',
        catalogs: ['@kerfjs/ui'],
        ...extra,
        root: {
          id: '01JC0V1EW0000000000000000S',
          type: '@kerfjs/ui:list',
          props: { ariaLabel: 'Inbox' },
          zones: {
            children: [
              { as: 'message', key: 'message.id', ...(each as object) },
            ],
          },
        },
      }) as unknown as ViewDocument;
    // A literal source and a list of strings give their items no fields.
    const untyped = list({
      $each: [{ id: 'a' }],
      template: row({ label: { $bind: 'message.id' } }),
    });
    expect(extract(untyped)).toMatchObject({
      error: expect.stringContaining('message.id has no known type'),
    });
    const strings = list(
      {
        $each: { $param: 'names' },
        template: row({ label: { $bind: 'message.id' } }),
      },
      {
        params: {
          names: { type: { kind: 'array', items: { kind: 'string' } } },
        },
      },
    );
    expect(extract(strings)).toMatchObject({
      error: expect.stringContaining('message.id has no known type'),
    });
    // A repeat over a param's field types its item through that field; the
    // $schema stays; a name both the field and its fallback hold gets a count.
    const text = (id: string, value: string) => ({ id, type: '#text', value });
    const data = list(
      {
        $each: { $bind: 'data.messages' },
        template: {
          ...row({
            label: { $bind: 'message.subject' },
            description: { $param: 'subject' },
            badge: { $param: 'messageSubject' },
          }),
          zones: {
            default: [
              {
                $if: { $bind: 'message.unread' },
                then: text('01JC0V1EW0000000000000000D', 'New'),
                else: text('01JC0V1EW0000000000000000E', 'Read'),
              },
              { $if: true, then: text('01JC0V1EW0000000000000000F', '!') },
            ],
          },
        },
      },
      {
        params: {
          subject: { type: { kind: 'string' } },
          messageSubject: { type: { kind: 'string' } },
          data: {
            type: {
              kind: 'object',
              props: [
                { name: 'messages', type: messages.type, required: true },
              ],
            },
          },
        },
      },
    );
    const result = extract(data);
    const extracted = 'error' in result ? undefined : result.extracted;
    expect(extracted?.$schema).toBe(
      'https://kerf.dev/kerf-ui-document.schema.json',
    );
    expect(Object.keys(extracted?.params ?? {})).toEqual([
      'subject2',
      'subject',
      'messageSubject',
      'unread',
    ]);
    expect(extracted?.root!.zones!.default![0]).toMatchObject({
      $if: { $param: 'unread' },
    });
  });

  it('says why a node cannot be extracted', () => {
    const document = inbox(row({}));
    expect(extractProblem(document, 'nope')).toBe('Select a node to extract.');
    expect(extractProblem(document, document.root!.id)).toContain('root');
    const slotted = inbox(row({ media: { $slot: 'icon' } }));
    expect(extractProblem(slotted, ROW)).toContain('slot');
    expect(extract(slotted)).toEqual({ error: extractProblem(slotted, ROW) });
  });
});

describe('Extract paths', () => {
  it('suggests a file beside the document, named from it and the node', () => {
    const document = inbox(row({}));
    expect(extractSuggestion(document, LIST, ROW)).toBe(
      'views/inbox-list-item.kui.json',
    );
    const named = inbox({ ...row({}), name: 'messageRow' });
    expect(extractSuggestion(named, 'inbox.kui.json', ROW)).toBe(
      'inbox-message-row.kui.json',
    );
    // A draft suggests from the document's name, at the project's top.
    expect(extractSuggestion(named, undefined, ROW)).toBe(
      'inbox-message-row.kui.json',
    );
    const odd = inbox({ ...row({}), name: '__' });
    expect(extractSuggestion(odd, LIST, ROW)).toBe('views/inbox-part.kui.json');
  });

  it('names a document’s source relative to the composing document', () => {
    expect(relativeSrc('views/inbox.kui.json', 'views/row.kui.json')).toBe(
      './row.kui.json',
    );
    expect(relativeSrc('views/a/inbox.kui.json', 'rows/row.kui.json')).toBe(
      '../../rows/row.kui.json',
    );
    expect(relativeSrc('inbox.kui.json', 'rows/row.kui.json')).toBe(
      './rows/row.kui.json',
    );
  });

  it('names the new document from its file', () => {
    expect(documentNameFor('views/inbox-message-row.kui.json')).toBe(
      'InboxMessageRow',
    );
    expect(documentNameFor('2-row.json')).toBe('View2Row');
  });
});
