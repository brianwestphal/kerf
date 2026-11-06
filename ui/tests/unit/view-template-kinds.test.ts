// KF-YX6HMT: an `$each` may carry `templates`, one row node per item kind,
// with `kind` (a string in the item's scope) picking one per item, like
// Interface Builder's prototype cells. `default` is required, so an item of
// any other kind still yields exactly one row: a repeat never filters. The
// generated module and the interpreter pick the same template.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { mount, type SafeHtml, signal } from 'kerfjs';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { validateJsonSchemaSubset } from '../../scripts/lib/json-schema-subset.mjs';
import { List } from '../../src/list.js';
import { ListHeader } from '../../src/list-header.js';
import { ListItem } from '../../src/list-item.js';
import { Pane } from '../../src/pane.js';
import { Text } from '../../src/text.js';
import {
  contractOf,
  createMoveCheck,
  createViewCatalog,
  diffContracts,
  generateView,
  interpretView,
  previewView,
  serializeContract,
  validateView,
  walkView,
} from '../../view/index.mjs';
import { generatedViewScratch } from './helpers/generated-view.js';

const root = resolve(import.meta.dirname, '../..');
const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const schema = readJson('ai/view-document.schema.json');
const catalog = createViewCatalog({
  props: [readJson('ai/component-props.json')],
  composition: [readJson('ai/component-composition.json')],
});
const ui = '@kerfjs/ui';
const components = {
  [`${ui}:list`]: List,
  [`${ui}:list-header`]: ListHeader,
  [`${ui}:list-item`]: ListItem,
  [`${ui}:pane`]: Pane,
  [`${ui}:text`]: Text,
} as Record<string, (props: never) => SafeHtml>;

const rowType = {
  kind: 'object',
  props: [
    { name: 'id', type: { kind: 'string' }, required: true },
    { name: 'label', type: { kind: 'string' }, required: true },
    { name: 'kind', type: { kind: 'string' }, required: true },
    { name: 'header', type: { kind: 'boolean' }, required: false },
  ],
};

const id = (n: number) =>
  `01JB8Z1M6Q8E1X9V4S7K2R3T${String(n).padStart(2, '0')}`;
const header = () => ({
  id: id(2),
  name: 'sectionHeader',
  type: `${ui}:list-header`,
  props: { label: { $bind: 'row.label' } },
});
const item = () => ({
  id: id(3),
  name: 'itemRow',
  type: `${ui}:list-item`,
  props: { label: { $bind: 'row.label' }, action: { $action: 'open-row' } },
});
const note = () => ({
  id: id(4),
  type: `${ui}:list-item`,
  props: {
    label: { $bind: 'row.label' },
    action: { $action: 'open-row' },
    disabled: true,
  },
});

type Fixture = Record<string, unknown>;
/** A List of rows with `each` merged into its `$each`. */
const rowsDocument = (each: Record<string, unknown>): Fixture => ({
  schema: 'kerf-ui-document/v1',
  name: 'Rows',
  catalogs: [ui],
  params: { rows: { type: { kind: 'array', items: rowType } } },
  root: {
    id: id(0),
    type: `${ui}:pane`,
    zones: {
      content: [
        {
          id: id(1),
          type: `${ui}:list`,
          zones: {
            children: [
              { $each: { $param: 'rows' }, as: 'row', key: 'row.id', ...each },
            ],
          },
        },
      ],
    },
  },
});
const kinds = () => ({
  templates: { header: header(), note: note(), default: item() },
  kind: { $bind: 'row.kind' },
});

const diagnostics = (document: Fixture) =>
  validateView(document, catalog).diagnostics.map(
    ({ code, path, message }) => ({ code, path, message }),
  );
const at = '$.root.zones.content[0].zones.children[0]';

interface Rows {
  readonly rows: readonly {
    readonly id: string;
    readonly label: string;
    readonly kind: string;
  }[];
}
interface GeneratedRows {
  renderRows(inputs: Rows): SafeHtml;
  wireRows(
    root: HTMLElement,
    handlers: Record<string, (context: { key: string }) => void>,
  ): () => void;
  rowsRefs(root: ParentNode): Record<string, (key: string) => Element | null>;
}
const generated = generatedViewScratch();
afterAll(() => generated.dispose());

const filled: Rows = {
  rows: [
    { id: 'h1', label: 'Recent', kind: 'header' },
    { id: 'a', label: 'Alpha', kind: 'message' },
    { id: 'b', label: 'Beta', kind: 'note' },
    { id: 'c', label: 'Gamma <c>', kind: 'toString' },
  ],
};

describe('validating a templates map', () => {
  it('accepts a map with a default, in the schema too', () => {
    expect(diagnostics(rowsDocument(kinds()))).toEqual([]);
    expect(validateJsonSchemaSubset(schema, rowsDocument(kinds()))).toEqual([]);
    // A literal or a param kind is fine too.
    expect(diagnostics(rowsDocument({ ...kinds(), kind: 'header' }))).toEqual(
      [],
    );
  });

  it('requires a default, so every item yields one row', () => {
    const { header: only, note: other } = kinds().templates;
    const document = rowsDocument({
      templates: { header: only, note: other },
      kind: { $bind: 'row.kind' },
    });
    expect(diagnostics(document)).toEqual([
      {
        code: 'KUI-V008',
        path: `${at}.templates`,
        message:
          '`templates` needs a `default` row design, which an item of any other kind takes',
      },
    ]);
    expect(validateJsonSchemaSubset(schema, document)).toEqual([
      `${at}.templates.default: is required`,
    ]);
  });

  it('takes exactly one of template and templates, and a kind', () => {
    const both = rowsDocument({ ...kinds(), template: item() });
    expect(diagnostics(both)).toContainEqual({
      code: 'KUI-V008',
      path: at,
      message: 'an `$each` has exactly one of `template` and `templates`',
    });
    expect(validateJsonSchemaSubset(schema, both)).toEqual([
      `${at}: matches a forbidden schema`,
    ]);
    const noKind = rowsDocument({ templates: kinds().templates });
    expect(diagnostics(noKind)).toEqual([
      {
        code: 'KUI-V008',
        path: `${at}.kind`,
        message:
          '`templates` needs a `kind` that resolves to a string on the item',
      },
    ]);
    expect(validateJsonSchemaSubset(schema, noKind)).toEqual([
      `${at}.kind: is required`,
    ]);
    const strayKind = rowsDocument({
      template: item(),
      kind: { $bind: 'row.kind' },
    });
    expect(diagnostics(strayKind)).toEqual([
      {
        code: 'KUI-V008',
        path: `${at}.kind`,
        message: '`kind` picks one of `templates`; this `$each` has none',
      },
    ]);
    expect(validateJsonSchemaSubset(schema, strayKind)).toEqual([
      `${at}: matches a forbidden schema`,
    ]);
  });

  it('checks the kind as a string in the item scope', () => {
    expect(
      diagnostics(rowsDocument({ ...kinds(), kind: { $bind: 'row.header' } })),
    ).toEqual([expect.objectContaining({ path: `${at}.kind` })]);
    expect(
      diagnostics(rowsDocument({ ...kinds(), kind: { $bind: 'other.x' } })),
    ).toEqual([expect.objectContaining({ path: `${at}.kind` })]);
  });

  it('checks each entry as one keyable row node', () => {
    const notNode = 'each `templates` entry is exactly one node';
    const chain = {
      ...kinds(),
      templates: {
        ...kinds().templates,
        note: { $if: true, then: note(), else: item() },
      },
    };
    expect(diagnostics(rowsDocument(chain))).toEqual([
      { code: 'KUI-V008', path: `${at}.templates.note`, message: notNode },
    ]);
    expect(
      diagnostics(rowsDocument({ ...kinds(), templates: 'rows' })),
    ).toEqual([expect.objectContaining({ path: `${at}.templates` })]);
    const fragment = {
      ...kinds(),
      templates: {
        ...kinds().templates,
        note: {
          id: id(5),
          type: `${ui}:collapsible-panel#CollapsiblePanelRelocated`,
          props: { panelId: 'p', side: 'left', collapsed: false },
        },
      },
    };
    expect(diagnostics(rowsDocument(fragment))).toContainEqual({
      code: 'KUI-V008',
      path: `${at}.templates.note`,
      message: `${ui}:collapsible-panel#CollapsiblePanelRelocated has no data-* channel to carry the row key`,
    });
    const bare = {
      ...kinds(),
      templates: {
        ...kinds().templates,
        note: { id: id(6), type: `${ui}:list-item` },
      },
    };
    const found = diagnostics(rowsDocument(bare));
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((d) => d.path.startsWith(`${at}.templates.note`))).toBe(
      true,
    );
  });
});

describe('the contract of a templates map', () => {
  it('names refs in every template as keyed row refs, and lists kinds', () => {
    const contract = contractOf(rowsDocument(kinds()) as never, catalog);
    expect(contract.refs.sectionHeader).toMatchObject({
      id: id(2),
      keyed: true,
    });
    expect(contract.refs.itemRow).toMatchObject({ id: id(3), keyed: true });
    expect(contract.kinds).toEqual({ row: ['default', 'header', 'note'] });
    expect(serializeContract(contract)).toContain(
      '"kinds":{"row":["default","header","note"]}',
    );
    const rows: boolean[] = [];
    walkView(rowsDocument(kinds()) as never, (_node, row) => rows.push(row));
    expect(rows).toEqual([false, false, true, true, true]);
  });

  it('leaves a document without one unchanged', () => {
    const contract = contractOf(
      rowsDocument({ template: item() }) as never,
      catalog,
    );
    expect('kinds' in contract).toBe(false);
    expect(serializeContract(contract)).not.toContain('kinds');
  });

  it('diffs kinds: an added one is optional, a removed one breaks', () => {
    const before = contractOf(rowsDocument(kinds()) as never, catalog);
    const { note: _note, ...rest } = kinds().templates;
    void _note;
    const after = contractOf(
      rowsDocument({
        ...kinds(),
        templates: { ...rest, separator: { ...note(), id: id(7) } },
      }) as never,
      catalog,
    );
    expect(diffContracts(before, after)).toEqual([
      {
        member: 'kind',
        name: 'row.note',
        change: 'removed',
        breaking: true,
        detail: 'note',
      },
      {
        member: 'kind',
        name: 'row.separator',
        change: 'added',
        breaking: false,
        detail: 'separator',
      },
    ]);
    const plain = contractOf(
      rowsDocument({ template: item() }) as never,
      catalog,
    );
    // The sectionHeader ref and three kinds.
    expect(diffContracts(plain, before)).toHaveLength(4);
    expect(diffContracts(before, before)).toEqual([]);
  });
});

describe('generating a templates map', () => {
  it('compares the kind per row, falls back to default, and types the kinds', () => {
    const { code } = generateView(rowsDocument(kinds()) as never, catalog);
    expect(code).toContain('each(inputs.rows, (row) => (row.kind === "header"');
    expect(code).toContain(': (row.kind === "note"');
    // The first template keys the list.
    expect(code).toContain(`{ key: ${JSON.stringify(id(2))} })`);
    expect(code.match(/'data-key': String\(row\.id\)/g)).toHaveLength(3);
    expect(code).toContain(
      'export type RowsRowKind = "default" | "header" | "note";',
    );
    expect(code).toContain(
      'readonly sectionHeader: (key: string) => HTMLElement | null;',
    );
    // Deterministic.
    expect(generateView(rowsDocument(kinds()) as never, catalog).code).toBe(
      code,
    );
  });
});

describe('rendering a templates map', () => {
  it('renders each item kind’s template, identically in both paths', async () => {
    const document = rowsDocument(kinds());
    const viewModule = await generated.load<GeneratedRows>(document, catalog);
    const { digest } = generateView(document as never, catalog);
    const state = signal<Rows>({ rows: [] });
    const interpreted = window.document.createElement('div');
    const fromModule = window.document.createElement('div');
    window.document.body.append(interpreted, fromModule);
    mount(interpreted, () =>
      interpretView(document, {
        catalog,
        components,
        inputs: state.value,
        contract: digest,
      }),
    );
    mount(fromModule, () => viewModule.renderRows(state.value));
    const sequence: Rows[] = [
      filled,
      // A row changes kind in place, and rows reorder.
      {
        rows: [
          { id: 'a', label: 'Alpha', kind: 'header' },
          { id: 'h1', label: 'Recent', kind: 'default' },
        ],
      },
      { rows: [] },
      filled,
    ];
    for (const next of sequence) {
      state.value = next;
      expect(interpreted.innerHTML).toBe(fromModule.innerHTML);
    }
    const picked = [...interpreted.querySelectorAll('[data-key]')].map(
      (row) => [
        row.getAttribute('data-key'),
        row.getAttribute('data-kerf-node'),
      ],
    );
    // An unknown kind, even an inherited property name, takes `default`.
    expect(picked).toEqual([
      ['h1', id(2)],
      ['a', id(3)],
      ['b', id(4)],
      ['c', id(3)],
    ]);
    const refs = viewModule.rowsRefs(interpreted);
    expect(refs.sectionHeader!('h1')?.getAttribute('data-key')).toBe('h1');
    expect(refs.sectionHeader!('a')).toBeNull();

    const open = vi.fn();
    const dispose = viewModule.wireRows(interpreted, { 'open-row': open });
    const row = interpreted.querySelector('[data-key="c"]')!;
    (row.querySelector('[data-action]') ?? row).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ key: 'c' }));
    dispose();
    interpreted.remove();
    fromModule.remove();
  });

  it('previews a map, and one with no default yet, without a placeholder', () => {
    const placeholder = vi.fn(() => '' as never);
    const preview = (each: Record<string, unknown>) => {
      const host = window.document.createElement('div');
      mount(host, () =>
        previewView(rowsDocument(each), {
          catalog,
          components,
          inputs: filled,
          broken: new Set(),
          placeholder,
        }),
      );
      return [...host.querySelectorAll('[data-key]')].map((row) =>
        row.getAttribute('data-kerf-node'),
      );
    };
    expect(preview(kinds())).toEqual([id(2), id(3), id(4), id(3)]);
    // With no `default`, an unknown kind renders the first template.
    expect(
      preview({
        templates: { note: note(), header: header() },
        kind: { $bind: 'row.kind' },
      }),
    ).toEqual([id(2), id(4), id(4), id(4)]);
    expect(placeholder).not.toHaveBeenCalled();
  });
});

describe('moving into a templates map', () => {
  it('answers a move into a template node as a full validation does', () => {
    const list = {
      id: id(8),
      type: `${ui}:list`,
      props: { ariaLabel: { $bind: 'row.label' } },
      zones: { children: [] as unknown[] },
    };
    const document = rowsDocument({
      ...kinds(),
      templates: { ...kinds().templates, group: list },
    }) as { root: { zones: { content: unknown[] } } };
    const extra = {
      id: id(9),
      type: `${ui}:list-item`,
      props: { label: 'Extra', action: { $action: 'open-extra' } },
    };
    document.root.zones.content.push(extra);
    const moved = JSON.parse(JSON.stringify(document)) as typeof document;
    moved.root.zones.content.pop();
    (
      moved.root.zones.content[0] as {
        zones: {
          children: {
            templates: { group: { zones: { children: unknown[] } } };
          }[];
        };
      }
    ).zones.children[0]!.templates.group.zones.children.push(extra);
    const before = new Set(
      validateView(document, catalog).diagnostics.map(
        (d) => `${d.code} ${d.message}`,
      ),
    );
    const adds = validateView(moved, catalog).diagnostics.some(
      (d) => !before.has(`${d.code} ${d.message}`),
    );
    const check = createMoveCheck(document as never, catalog, id(9));
    expect(check(id(8), 'children')).toBe(!adds);
  });
});
