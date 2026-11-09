// KF-8J8E5V: an `$each` template may be an `$if` chain, so a list picks a
// row design per item (a section header row or an item row). Every branch is
// one keyable node with a data-* channel, and `else` is required, so each
// item yields exactly one row: a repeat never filters. The generated module
// and the interpreter pick the same branch, with the same row marks and
// `data-key`.
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
  generateView,
  interpretView,
  previewView,
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
    { name: 'header', type: { kind: 'boolean' }, required: false },
    { name: 'muted', type: { kind: 'boolean' }, required: false },
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
const mutedItem = () => ({
  id: id(4),
  type: `${ui}:list-item`,
  props: {
    label: { $bind: 'row.label' },
    action: { $action: 'open-row' },
    disabled: true,
  },
});

type Fixture = Record<string, unknown>;
/** A List of rows whose template is `template`. */
const rowsDocument = (template: unknown): Fixture => ({
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
              {
                $each: { $param: 'rows' },
                as: 'row',
                key: 'row.id',
                template,
              },
            ],
          },
        },
      ],
    },
  },
});
const chain = () => ({
  $if: { $bind: 'row.header' },
  then: header(),
  else: item(),
});
const nestedChain = () => ({
  $if: { $bind: 'row.header' },
  then: header(),
  else: { $if: { $bind: 'row.muted' }, then: mutedItem(), else: item() },
});

const diagnostics = (document: Fixture) =>
  validateView(document, catalog).diagnostics.map(
    ({ code, path, message }) => ({ code, path, message }),
  );
const at = '$.root.zones.content[0].zones.children[0].template';

interface Rows {
  readonly rows: readonly {
    readonly id: string;
    readonly label: string;
    readonly header?: boolean;
    readonly muted?: boolean;
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
    { id: 'h1', label: 'Recent', header: true },
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta', muted: true },
    { id: 'h2', label: 'Older', header: true },
    { id: 'c', label: 'Gamma <c>' },
  ],
};

describe('validating an $if-chain template', () => {
  it('accepts a chain and a nested chain', () => {
    expect(diagnostics(rowsDocument(chain()))).toEqual([]);
    expect(diagnostics(rowsDocument(nestedChain()))).toEqual([]);
    expect(validateJsonSchemaSubset(schema, rowsDocument(chain()))).toEqual([]);
    expect(
      validateJsonSchemaSubset(schema, rowsDocument(nestedChain())),
    ).toEqual([]);
  });

  it('requires an else, so every item yields one row', () => {
    const open = { $if: chain().$if, then: header() };
    expect(diagnostics(rowsDocument(open))).toEqual([
      {
        code: 'KUI-V008',
        path: at,
        message:
          'a template `$if` needs an `else`, so every item yields exactly one row',
      },
    ]);
    expect(validateJsonSchemaSubset(schema, rowsDocument(open))).toEqual([
      `${at}.else: is required`,
    ]);
  });

  it('rejects a branch that is not one node', () => {
    const notNode =
      'the template is exactly one node, or an `$if` chain of them';
    const slot = { ...chain(), then: { $slot: 'row' } };
    expect(diagnostics(rowsDocument(slot))).toEqual([
      { code: 'KUI-V008', path: `${at}.then`, message: notNode },
    ]);
    // `then` is one node: a chain nests only in `else`.
    const thenChain = { ...chain(), then: chain() };
    expect(diagnostics(rowsDocument(thenChain))).toEqual([
      { code: 'KUI-V008', path: `${at}.then`, message: notNode },
    ]);
    const repeat = {
      ...chain(),
      else: {
        $each: { $param: 'rows' },
        as: 'x',
        key: 'x.id',
        template: item(),
      },
    };
    expect(diagnostics(rowsDocument(repeat))).toEqual([
      { code: 'KUI-V008', path: `${at}.else`, message: notNode },
    ]);
    expect(diagnostics(rowsDocument({ ...chain(), else: 'row' }))).toEqual([
      { code: 'KUI-V008', path: `${at}.else`, message: notNode },
    ]);
    expect(diagnostics(rowsDocument('row'))).toEqual([
      { code: 'KUI-V008', path: at, message: notNode },
    ]);
  });

  it('rejects a branch without a data-* channel', () => {
    // CollapsiblePanelRelocated renders a fragment, so it has no data-* channel.
    const fragment = {
      ...chain(),
      else: {
        id: id(5),
        type: `${ui}:collapsible-panel#CollapsiblePanelRelocated`,
        props: { panelId: 'p', side: 'left', collapsed: false },
      },
    };
    expect(diagnostics(rowsDocument(fragment))).toContainEqual({
      code: 'KUI-V008',
      path: `${at}.else`,
      message: `${ui}:collapsible-panel#CollapsiblePanelRelocated has no data-* channel to carry the row key`,
    });
  });

  it('checks the condition in the item scope, and unknown fields', () => {
    expect(
      diagnostics(rowsDocument({ ...chain(), $if: { $bind: 'row.label' } })),
    ).toEqual([
      expect.objectContaining({ code: 'KUI-V004', path: `${at}.$if` }),
    ]);
    expect(
      diagnostics(rowsDocument({ ...chain(), $if: { $bind: 'other.x' } })),
    ).toEqual([expect.objectContaining({ path: `${at}.$if` })]);
    expect(diagnostics(rowsDocument({ ...chain(), extra: 1 }))).toEqual([
      { code: 'KUI-V001', path: `${at}.extra`, message: 'unknown `$if` field' },
    ]);
    // A literal and a param condition are fine too.
    expect(diagnostics(rowsDocument({ ...chain(), $if: true }))).toEqual([]);
  });

  it('checks each branch as a row node', () => {
    // A ListItem with no label or action, in the chain's last branch.
    const bare = {
      ...nestedChain(),
      else: {
        ...nestedChain().else,
        else: { id: id(6), type: `${ui}:list-item` },
      },
    };
    const found = diagnostics(rowsDocument(bare));
    expect(found.length).toBeGreaterThan(0);
    expect(
      found.every(
        (d) => d.code === 'KUI-V005' && d.path.startsWith(`${at}.else.else`),
      ),
    ).toBe(true);
  });
});

describe('the contract of an $if-chain template', () => {
  it('names refs in every branch as keyed row refs', () => {
    const { refs } = contractOf(rowsDocument(chain()) as never, catalog);
    expect(refs.sectionHeader).toMatchObject({ id: id(2), keyed: true });
    expect(refs.itemRow).toMatchObject({ id: id(3), keyed: true });
    const rows: boolean[] = [];
    walkView(rowsDocument(nestedChain()) as never, (_node, row) =>
      rows.push(row),
    );
    expect(rows).toEqual([false, false, true, true, true]);
  });

  it('leaves a single-node template document unchanged', () => {
    const single = generateView(rowsDocument(item()) as never, catalog);
    expect(single.code).toContain(
      `each(inputs.rows, (row) => kuiComponent(ListItem)(`,
    );
    expect(single.code).toContain(`{ key: ${JSON.stringify(id(3))} })`);
  });
});

describe('generating an $if-chain template', () => {
  it('emits a conditional row with one keyed each()', () => {
    const { code } = generateView(
      rowsDocument(nestedChain()) as never,
      catalog,
    );
    expect(code).toContain('each(inputs.rows, (row) => (row.header');
    expect(code).toContain('? kuiComponent(ListHeader)(');
    expect(code).toContain(': (row.muted');
    // The first branch's node keys the list.
    expect(code).toContain(`{ key: ${JSON.stringify(id(2))} })`);
    expect(code.match(/'data-key': String\(row\.id\)/g)).toHaveLength(3);
    expect(code).toContain(
      'readonly sectionHeader: (key: string) => HTMLElement | null;',
    );
    // Deterministic.
    expect(
      generateView(rowsDocument(nestedChain()) as never, catalog).code,
    ).toBe(code);
  });
});

describe('rendering an $if-chain template', () => {
  it('renders the chosen branch per row, identically in both paths', async () => {
    const document = rowsDocument(nestedChain());
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
          { id: 'a', label: 'Alpha', header: true },
          { id: 'h1', label: 'Recent' },
          { id: 'c', label: 'Gamma <c>', muted: true },
        ],
      },
      { rows: [] },
      filled,
    ];
    for (const next of sequence) {
      state.value = next;
      expect(interpreted.innerHTML).toBe(fromModule.innerHTML);
    }
    const kinds = [...interpreted.querySelectorAll('[data-key]')].map((row) => [
      row.getAttribute('data-key'),
      row.getAttribute('data-kerf-node'),
    ]);
    expect(kinds).toEqual([
      ['h1', id(2)],
      ['a', id(3)],
      ['b', id(4)],
      ['h2', id(2)],
      ['c', id(3)],
    ]);
    expect(interpreted.textContent).toContain('Gamma <c>');

    // Keyed refs reach a branch's row, or null when the row took another.
    const refs = viewModule.rowsRefs(interpreted);
    expect(refs.sectionHeader!('h2')?.getAttribute('data-key')).toBe('h2');
    expect(refs.sectionHeader!('a')).toBeNull();
    expect(refs.itemRow!('a')?.getAttribute('data-key')).toBe('a');

    // A row action reports its row's key.
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

  it('previews a chain, and an unfinished one, without a placeholder', () => {
    const placeholder = vi.fn(() => '' as never);
    const preview = (template: unknown) => {
      const host = window.document.createElement('div');
      mount(host, () =>
        previewView(rowsDocument(template), {
          catalog,
          components,
          inputs: filled,
          broken: new Set(),
          placeholder,
        }),
      );
      return host;
    };
    expect(preview(chain()).querySelectorAll('[data-key]')).toHaveLength(5);
    // With no `else` yet, every row renders `then` (one element per row).
    const open = { $if: chain().$if, then: header() };
    const host = preview(open);
    expect(
      [...host.querySelectorAll('[data-key]')].map((row) =>
        row.getAttribute('data-kerf-node'),
      ),
    ).toEqual([id(2), id(2), id(2), id(2), id(2)]);
    expect(placeholder).not.toHaveBeenCalled();
  });
});

describe('a repeat inside an $if-chain branch', () => {
  const tabType = {
    kind: 'object',
    props: [
      { name: 'id', type: { kind: 'string' }, required: true },
      { name: 'label', type: { kind: 'string' }, required: true },
    ],
  };
  const groupsDocument = (): Fixture => ({
    schema: 'kerf-ui-document/v1',
    name: 'Groups',
    catalogs: [ui],
    params: {
      groups: {
        type: {
          kind: 'array',
          items: {
            kind: 'object',
            props: [
              { name: 'id', type: { kind: 'string' }, required: true },
              { name: 'label', type: { kind: 'string' }, required: true },
              { name: 'collapsed', type: { kind: 'boolean' }, required: false },
              {
                name: 'tabs',
                type: { kind: 'array', items: tabType },
                required: true,
              },
            ],
          },
        },
      },
    },
    root: {
      id: id(10),
      type: `${ui}:pane`,
      zones: {
        content: [
          {
            $each: { $param: 'groups' },
            as: 'group',
            key: 'group.id',
            template: {
              $if: { $bind: 'group.collapsed' },
              then: {
                id: id(11),
                type: `${ui}:text`,
                props: { children: { $bind: 'group.label' } },
              },
              else: {
                id: id(12),
                type: `${ui}:list`,
                props: { ariaLabel: { $bind: 'group.label' } },
                zones: {
                  children: [
                    {
                      $each: { $bind: 'group.tabs' },
                      as: 'tab',
                      key: 'tab.id',
                      template: {
                        id: id(13),
                        type: `${ui}:list-item`,
                        props: {
                          label: { $bind: 'tab.label' },
                          action: { $action: 'open-tab' },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  });

  it('validates, maps the inner repeat, and renders it in its branch', async () => {
    const document = groupsDocument();
    expect(diagnostics(document)).toEqual([]);
    const { code, digest } = generateView(document as never, catalog);
    expect(code).toContain('group.tabs.map((tab) => ');
    expect(code.match(/each\(/g)).toHaveLength(1);
    const inputs = {
      groups: [
        {
          id: 'g1',
          label: 'One',
          collapsed: true,
          tabs: [{ id: 'x', label: 'X' }],
        },
        {
          id: 'g2',
          label: 'Two',
          tabs: [
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
          ],
        },
      ],
    };
    const interpreted = window.document.createElement('div');
    mount(interpreted, () =>
      interpretView(document, {
        catalog,
        components,
        inputs,
        contract: digest,
      }),
    );
    const viewModule = await generated.load<{
      renderGroups(inputs: object): SafeHtml;
    }>(document, catalog);
    const fromModule = window.document.createElement('div');
    mount(fromModule, () => viewModule.renderGroups(inputs));
    expect(interpreted.innerHTML).toBe(fromModule.innerHTML);
    expect(interpreted.querySelector('[data-key="g1"]')?.textContent).toBe(
      'One',
    );
    expect(interpreted.querySelector('[data-key="x"]')).toBeNull();
    expect(
      interpreted.querySelectorAll('[data-key="g2"] [data-key]'),
    ).toHaveLength(2);
  });

  it('answers a move into a branch node as a full validation does', () => {
    const document = groupsDocument() as {
      root: { zones: { content: unknown[] } };
    };
    const note = {
      id: id(14),
      type: `${ui}:list-item`,
      props: { label: 'Note', action: { $action: 'open-tab' } },
    };
    document.root.zones.content.push(note);
    const moved = JSON.parse(JSON.stringify(document)) as typeof document;
    moved.root.zones.content.pop();
    const branch = (
      moved.root.zones.content[0] as {
        template: { else: { zones: { children: unknown[] } } };
      }
    ).template.else;
    branch.zones.children.push(note);
    const before = new Set(
      validateView(document, catalog).diagnostics.map(
        (d) => `${d.code} ${d.message}`,
      ),
    );
    const adds = validateView(moved, catalog).diagnostics.some(
      (d) => !before.has(`${d.code} ${d.message}`),
    );
    const check = createMoveCheck(document as never, catalog, id(14));
    expect(check(id(12), 'children')).toBe(!adds);
  });
});
