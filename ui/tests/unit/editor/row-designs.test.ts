// KF-1CRGP1: the editor authors and walks an `$if`-chain `$each` template
// (row designs). Every model walker reaches each branch's node, and the row
// design edits keep `else` required: the last design takes every other item.
import type { ViewDocument, ViewNode } from '@kerfjs/ui/view';
import { validateView } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import {
  controlOf,
  renameItem,
  setCondition,
  setRepeat,
  setTemplate,
} from '../../../src/editor/model/control-flow.js';
import {
  findNode,
  mapTemplate,
  templateBranches,
  templateNodes,
} from '../../../src/editor/model/document.js';
import { insertPlacement } from '../../../src/editor/model/drop.js';
import {
  copyChild,
  eachScopes,
  embedNode,
  setProp,
} from '../../../src/editor/model/edits.js';
import { documentInDeclaredOrder } from '../../../src/editor/model/fields.js';
import { outlineTree } from '../../../src/editor/model/outline.js';
import {
  closeRow,
  eachOf,
  markRows,
} from '../../../src/editor/model/play-values.js';
import { previewSlots } from '../../../src/editor/model/preview-slots.js';
import {
  addKind,
  addRowDesign,
  moveRowDesign,
  removeRowDesign,
  renameKind,
  rowConditionOptions,
  rowDesignChoices,
  rowDesignMoves,
  rowKindOptions,
  setRowCondition,
  setRowKind,
} from '../../../src/editor/model/row-designs.js';
import { defaultCatalog, viewCatalog } from './kerf-catalog.js';

const ui = '@kerfjs/ui';
const LIST = '01JB8Z1M6Q8E1X9V4S7K2R3T01';
const HEADER = '01JB8Z1M6Q8E1X9V4S7K2R3T02';
const ROW = '01JB8Z1M6Q8E1X9V4S7K2R3T03';
const MUTED = '01JB8Z1M6Q8E1X9V4S7K2R3T04';
const header = (): ViewNode => ({
  id: HEADER,
  name: 'sectionHeader',
  type: `${ui}:list-header`,
  props: { label: { $bind: 'item.label' } },
});
const row = (): ViewNode => ({
  id: ROW,
  name: 'itemRow',
  type: `${ui}:list-item`,
  props: { label: { $bind: 'item.label' }, action: { $action: 'open' } },
});
const muted = (): ViewNode => ({
  id: MUTED,
  type: `${ui}:list-item`,
  props: {
    label: { $bind: 'item.label' },
    action: { $action: 'open' },
    disabled: true,
  },
});
const chain = () => ({
  $if: { $bind: 'item.header' },
  then: header(),
  else: row(),
});

/**
 * A Pane holding a List whose rows come from `template`, or (KF-YX6HMT) from
 * `rows`, such as a `templates` map with its `kind`.
 */
const documentWith = (template: unknown, rows?: object): ViewDocument =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Rows',
    catalogs: [ui],
    params: {
      showAll: { type: { kind: 'boolean' } },
      items: {
        type: {
          kind: 'array',
          items: {
            kind: 'object',
            props: [
              { name: 'id', type: { kind: 'string' }, required: true },
              { name: 'label', type: { kind: 'string' }, required: true },
              { name: 'header', type: { kind: 'boolean' }, required: false },
              { name: 'muted', type: { kind: 'boolean' }, required: false },
              { name: 'kind', type: { kind: 'string' }, required: false },
            ],
          },
        },
      },
    },
    root: {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T00',
      type: `${ui}:pane`,
      zones: {
        content: [
          {
            id: LIST,
            type: `${ui}:list`,
            zones: {
              children: [
                {
                  $each: { $param: 'items' },
                  as: 'item',
                  key: 'item.id',
                  ...(rows ?? { template }),
                },
              ],
            },
          },
        ],
      },
    },
  }) as unknown as ViewDocument;

const valid = (document: ViewDocument) =>
  validateView(document, viewCatalog).diagnostics;
const each = (document: ViewDocument) =>
  (document.root!.zones!.content![0] as ViewNode).zones!.children![0] as {
    template: unknown;
  };

describe('template branches', () => {
  it('lists one node, every branch of a chain, and an unfinished chain', () => {
    expect(templateBranches(row())).toEqual([{ node: row() }]);
    expect(templateBranches(chain())).toEqual([
      { node: header(), condition: { $bind: 'item.header' } },
      { node: row() },
    ]);
    const unfinished = { $if: true, then: row() } as never;
    expect(templateNodes(unfinished)).toEqual([row()]);
    expect(
      mapTemplate(unfinished, (node) => ({ ...node, name: 'renamed' })),
    ).toEqual({ $if: true, then: { ...row(), name: 'renamed' } });
    expect(
      templateNodes(
        mapTemplate(chain(), (node) => ({ ...node, name: node.id })),
      ).map((node) => node.name),
    ).toEqual([HEADER, ROW]);
  });

  it('finds every branch node, repeated and in the item scope', () => {
    const document = documentWith(chain());
    expect(valid(document)).toEqual([]);
    expect(findNode(document, HEADER)?.repeated).toBe(true);
    expect(findNode(document, ROW)?.ancestors.at(-1)?.node.id).toBe(LIST);
    expect(eachScopes(document, ROW)).toEqual([
      { as: 'item', source: { $param: 'items' } },
    ]);
    expect(eachScopes(document, HEADER)).toHaveLength(1);
    // A drop beside any design lands beside the whole repeat.
    expect(
      insertPlacement(
        document,
        viewCatalog,
        {
          id: MUTED,
          type: `${ui}:list-item`,
          props: { label: 'All', action: { $action: 'show-all' } },
        },
        HEADER,
        'after',
        () => [],
      ),
    ).toEqual({ parent: LIST, zone: 'children', index: 1 });
  });
});

describe('controlOf', () => {
  it('reports the row designs of a chain, and none for one node', () => {
    const repeat = { source: { $param: 'items' }, as: 'item', key: 'item.id' };
    expect(controlOf(documentWith(row()), ROW)).toEqual({ repeat });
    const document = documentWith(chain());
    expect(controlOf(document, ROW)).toEqual({
      repeat,
      rows: { branches: templateBranches(chain()), index: 1 },
    });
    expect(controlOf(document, HEADER)?.rows?.index).toBe(0);
  });

  it('keeps the chain when the repeat or its condition changes', () => {
    const document = documentWith(chain());
    const shown = setCondition(document, HEADER, { $param: 'showAll' });
    expect(controlOf(shown, ROW)?.condition).toEqual({ $param: 'showAll' });
    expect(controlOf(shown, ROW)?.rows?.branches).toHaveLength(2);
    const resourced = setRepeat(document, ROW, {
      source: { $param: 'items' },
      as: 'entry',
      key: 'entry.id',
    });
    expect(each(resourced).template).toEqual(chain());
    // Stopping the repeat keeps only the selected design.
    const stopped = setRepeat(document, HEADER, undefined);
    expect(
      (stopped.root!.zones!.content![0] as ViewNode).zones!.children,
    ).toEqual([header()]);
  });

  it('renames the item in every design and condition', () => {
    const result = renameItem(documentWith(chain()), ROW, 'entry');
    if (!('document' in result)) throw new Error(result.error);
    expect(each(result.document).template).toEqual({
      $if: { $bind: 'entry.header' },
      then: { ...header(), props: { label: { $bind: 'entry.label' } } },
      else: {
        ...row(),
        props: { label: { $bind: 'entry.label' }, action: { $action: 'open' } },
      },
    });
  });

  it('sets a template only where a repeat holds the node', () => {
    const document = documentWith(row());
    expect(setTemplate(document, LIST, chain())).toBe(document);
    expect(each(setTemplate(document, ROW, chain())).template).toEqual(chain());
  });
});

describe('row design edits', () => {
  it('adds a design before the last one, which takes every other item', () => {
    const one = documentWith(row());
    const two = addRowDesign(one, ROW, header(), { $bind: 'item.header' });
    expect(each(two).template).toEqual(chain());
    expect(valid(two)).toEqual([]);
    const three = addRowDesign(two, HEADER, muted(), { $bind: 'item.muted' });
    expect(each(three).template).toEqual({
      $if: { $bind: 'item.header' },
      then: header(),
      else: { $if: { $bind: 'item.muted' }, then: muted(), else: row() },
    });
    expect(valid(three)).toEqual([]);
    expect(addRowDesign(one, LIST, header(), true)).toBe(one);
  });

  it('removes a design, promoting the one before the last', () => {
    const three = addRowDesign(documentWith(chain()), ROW, muted(), {
      $bind: 'item.muted',
    });
    expect(each(removeRowDesign(three, MUTED)).template).toEqual(chain());
    expect(each(removeRowDesign(three, ROW)).template).toEqual({
      $if: { $bind: 'item.header' },
      then: header(),
      else: muted(),
    });
    // One design left is a plain template again.
    expect(
      each(removeRowDesign(documentWith(chain()), HEADER)).template,
    ).toEqual(row());
    const one = documentWith(row());
    expect(removeRowDesign(one, ROW)).toBe(one);
  });

  it('sets the condition of any design but the last', () => {
    const document = documentWith(chain());
    expect(
      each(setRowCondition(document, HEADER, { $param: 'showAll' })).template,
    ).toEqual({ ...chain(), $if: { $param: 'showAll' } });
    expect(setRowCondition(document, ROW, true)).toBe(document);
    const one = documentWith(row());
    expect(setRowCondition(one, ROW, true)).toBe(one);
  });

  // KF-STBQBG: reordering keeps each design's condition and the else last.
  it('moves a design with its condition, keeping the last one last', () => {
    const three = addRowDesign(documentWith(chain()), ROW, muted(), {
      $bind: 'item.muted',
    });
    const later = moveRowDesign(three, HEADER, 1);
    expect(each(later).template).toEqual({
      $if: { $bind: 'item.muted' },
      then: muted(),
      else: { $if: { $bind: 'item.header' }, then: header(), else: row() },
    });
    expect(valid(later)).toEqual([]);
    expect(each(moveRowDesign(later, HEADER, -1)).template).toEqual(
      each(three).template,
    );
    // The first cannot move earlier, the one before the else cannot pass it,
    // and the else does not move.
    expect(moveRowDesign(three, HEADER, -1)).toBe(three);
    expect(moveRowDesign(three, MUTED, 1)).toBe(three);
    expect(moveRowDesign(three, ROW, -1)).toBe(three);
    expect(rowDesignMoves(three, HEADER)).toEqual({
      earlier: false,
      later: true,
    });
    expect(rowDesignMoves(three, MUTED)).toEqual({
      earlier: true,
      later: false,
    });
    expect(rowDesignMoves(three, ROW)).toEqual({
      earlier: false,
      later: false,
    });
    const one = documentWith(row());
    expect(moveRowDesign(one, ROW, 1)).toBe(one);
    expect(moveRowDesign(one, LIST, 1)).toBe(one);
  });

  it('offers the true/false values in the item scope as conditions', () => {
    const labels = (document: ViewDocument, id: string) =>
      rowConditionOptions(document, viewCatalog, id).map(
        (option) => option.label,
      );
    expect(labels(documentWith(row()), ROW)).toEqual([
      'Param showAll',
      'item.header',
      'item.muted',
    ]);
    expect(labels(documentWith(chain()), HEADER)).toEqual(
      labels(documentWith(row()), ROW),
    );
    expect(labels(documentWith(row()), LIST)).toEqual([]);
  });

  it('offers only components with a data-* channel as designs', () => {
    expect(
      rowDesignChoices(viewCatalog, [
        { value: `${ui}:list-item` },
        { value: `${ui}:collapsible-panel#CollapsiblePanelRelocated` },
        { value: 'missing:component' },
      ]),
    ).toEqual([{ value: `${ui}:list-item` }]);
  });
});

describe('model walkers', () => {
  it('lists each design in the outline with when it shows', () => {
    const tree = outlineTree(
      addRowDesign(documentWith(chain()), ROW, muted(), {
        $bind: 'item.muted',
      }),
      new Map(),
    );
    const rows = tree[0]!.children![0]!.children!;
    expect(rows.map((item) => [item.id, item.detail])).toEqual([
      [
        HEADER,
        expect.stringContaining('for each item in items · if item.header'),
      ],
      [MUTED, expect.stringContaining('else if item.muted')],
      [ROW, expect.stringContaining('otherwise')],
    ]);
    const single = outlineTree(documentWith(row()), new Map());
    expect(single[0]!.children![0]!.children![0]!.detail).not.toContain(
      'otherwise',
    );
  });

  it('edits, copies, and embeds a node in any design', () => {
    const document = documentWith(chain());
    const edited = setProp(document, HEADER, 'label', 'Section');
    expect(findNode(edited, HEADER)?.node.props?.label).toBe('Section');
    let count = 0;
    const copy = copyChild(
      each(document) as never,
      new Set(),
      () => `01JB8Z1M6Q8E1X9V4S7K2R3T${(count += 10)}`,
    ) as { template: unknown };
    expect(
      templateNodes(copy.template as never).map((node) => node.id),
    ).toEqual(['01JB8Z1M6Q8E1X9V4S7K2R3T10', '01JB8Z1M6Q8E1X9V4S7K2R3T20']);
    const embedded = embedNode(
      document,
      ROW,
      { type: `${ui}:list` },
      'children',
    );
    expect(
      embedded && findNode(embedded.document, ROW)?.ancestors.at(-1)?.node.id,
    ).toBe(embedded?.id);
  });

  it('keeps the chain through declared-order and preview-slot rewrites', () => {
    const document = documentWith(chain());
    const ordered = documentInDeclaredOrder(
      document,
      (key) => defaultCatalog.propsByKey.get(key)?.props,
      (key) => viewCatalog.components.get(key)?.definitions ?? {},
    );
    expect(templateNodes(each(ordered).template as never)).toHaveLength(2);
    expect(each(previewSlots(document).document).template).toEqual(chain());
  });

  it('marks and closes rows of every design in play', () => {
    const document = documentWith(chain());
    expect(eachOf(document, HEADER)).toBe(each(document));
    expect(eachOf(document, ROW)).toBe(each(document));
    const marked = each(markRows(document, viewCatalog)).template;
    expect(templateNodes(marked as never).map((node) => node.id)).toEqual([
      HEADER,
      ROW,
    ]);
    const items = [
      { id: 'a', label: 'A', header: true },
      { id: 'b', label: 'B' },
    ];
    expect(closeRow(document, HEADER, { [HEADER]: 'a' }, { items })).toEqual({
      items: [items[1]],
    });
  });
});

// KF-YX6HMT: rows picked by the item's kind from a `templates` map.
const KIND = { $bind: 'item.kind' };
const keyed = (
  templates: Record<string, ViewNode> = {
    header: header(),
    default: row(),
  },
) => documentWith(undefined, { templates, kind: KIND });
const rowsOfEach = (document: ViewDocument) =>
  each(document) as unknown as {
    template?: ViewNode;
    templates?: Record<string, ViewNode>;
    kind?: unknown;
  };

describe('row designs keyed by kind', () => {
  it('reports the kinds, and walks every template', () => {
    const document = keyed();
    expect(valid(document)).toEqual([]);
    expect(controlOf(document, HEADER)?.rows).toEqual({
      branches: [
        { node: header(), kind: 'header' },
        { node: row(), kind: 'default' },
      ],
      index: 0,
      kind: KIND,
    });
    expect(findNode(document, ROW)?.repeated).toBe(true);
    expect(eachScopes(document, HEADER)).toHaveLength(1);
    expect(eachOf(document, ROW)).toBe(each(document));
    // A map with only `default` still edits as one keyed by kind.
    expect(controlOf(keyed({ default: row() }), ROW)?.rows?.kind).toEqual(KIND);
  });

  it('picks a one-node list’s designs by kind, and changes the kind', () => {
    const one = documentWith(row());
    const picked = setRowKind(one, ROW, KIND);
    expect(rowsOfEach(picked)).toMatchObject({
      templates: { default: row() },
      kind: KIND,
    });
    expect(valid(picked)).toEqual([]);
    const relabeled = setRowKind(keyed(), ROW, { $bind: 'item.label' });
    expect(rowsOfEach(relabeled).kind).toEqual({ $bind: 'item.label' });
    expect(Object.keys(rowsOfEach(relabeled).templates!)).toEqual([
      'header',
      'default',
    ]);
    const chained = documentWith(chain());
    expect(setRowKind(chained, ROW, KIND)).toBe(chained);
    expect(setRowKind(one, LIST, KIND)).toBe(one);
  });

  it('offers the text values in the item scope as the kind', () => {
    const labels = (document: ViewDocument, id: string) =>
      rowKindOptions(document, viewCatalog, id).map((option) => option.label);
    expect(labels(documentWith(row()), ROW)).toEqual([
      'item.id',
      'item.label',
      'item.kind',
    ]);
    expect(labels(keyed(), HEADER)).toEqual(labels(documentWith(row()), ROW));
    expect(labels(documentWith(chain()), ROW)).toEqual([]);
    expect(labels(documentWith(row()), LIST)).toEqual([]);
  });

  it('adds and renames kinds, refusing empty and taken names', () => {
    const added = addKind(keyed(), ROW, 'note', muted());
    if (!('document' in added)) throw new Error(added.error);
    expect(Object.keys(rowsOfEach(added.document).templates!)).toEqual([
      'header',
      'default',
      'note',
    ]);
    expect(valid(added.document)).toEqual([]);
    expect(addKind(keyed(), ROW, '', muted())).toEqual({
      error: 'A kind is a name, such as header.',
    });
    expect(addKind(keyed(), ROW, 'header', muted())).toEqual({
      error: 'This list already has a header design.',
    });
    expect(addKind(documentWith(row()), ROW, 'note', muted())).toEqual({
      error: 'This list does not pick its rows by kind.',
    });
    const renamed = renameKind(keyed(), HEADER, 'section');
    if (!('document' in renamed)) throw new Error(renamed.error);
    expect(Object.keys(rowsOfEach(renamed.document).templates!)).toEqual([
      'section',
      'default',
    ]);
    const same = keyed();
    expect(renameKind(same, HEADER, 'header')).toEqual({ document: same });
    expect(renameKind(keyed(), ROW, 'item')).toEqual({
      error: 'The default design keeps its name.',
    });
    expect(renameKind(keyed(), HEADER, 'default')).toEqual({
      error: 'This list already has a default design.',
    });
    expect(renameKind(documentWith(row()), ROW, 'x')).toEqual({
      error: 'This list does not pick its rows by kind.',
    });
  });

  it('removes a kind, keeps default, and collapses to one template', () => {
    const three = addKind(keyed(), ROW, 'note', muted()) as {
      document: ViewDocument;
    };
    expect(
      Object.keys(
        rowsOfEach(removeRowDesign(three.document, MUTED)).templates!,
      ),
    ).toEqual(['header', 'default']);
    expect(removeRowDesign(keyed(), ROW)).toEqual(keyed());
    expect(rowsOfEach(removeRowDesign(keyed(), HEADER))).toMatchObject({
      template: row(),
    });
    expect('kind' in rowsOfEach(removeRowDesign(keyed(), HEADER))).toBe(false);
  });

  // KF-STBQBG: in a map, order is only map order, so every kind moves.
  it('moves a kind, default included, within the map', () => {
    const later = moveRowDesign(keyed(), HEADER, 1);
    expect(Object.keys(rowsOfEach(later).templates!)).toEqual([
      'default',
      'header',
    ]);
    expect(valid(later)).toEqual([]);
    expect(
      Object.keys(rowsOfEach(moveRowDesign(later, HEADER, -1)).templates!),
    ).toEqual(['header', 'default']);
    expect(rowDesignMoves(keyed(), ROW)).toEqual({
      earlier: true,
      later: false,
    });
    expect(rowDesignMoves(keyed(), HEADER)).toEqual({
      earlier: false,
      later: true,
    });
    // An integer-like kind always sorts first, so it cannot move later.
    const numbered = keyed({ '2': header(), default: row() });
    expect(moveRowDesign(numbered, HEADER, 1)).toBe(numbered);
    expect(rowDesignMoves(keyed({ default: row() }), ROW)).toEqual({
      earlier: false,
      later: false,
    });
  });

  it('leaves conditions to $if chains', () => {
    const document = keyed();
    expect(addRowDesign(document, ROW, muted(), true)).toBe(document);
    expect(setRowCondition(document, HEADER, true)).toBe(document);
    expect(rowConditionOptions(document, viewCatalog, HEADER)).toEqual([]);
  });

  it('keeps the map through repeat, item, and walker edits', () => {
    const renamed = renameItem(keyed(), HEADER, 'entry');
    if (!('document' in renamed)) throw new Error(renamed.error);
    expect(rowsOfEach(renamed.document).kind).toEqual({ $bind: 'entry.kind' });
    expect(
      rowsOfEach(renamed.document).templates!.header!.props?.label,
    ).toEqual({ $bind: 'entry.label' });
    const resourced = setRepeat(keyed(), ROW, {
      source: { $param: 'items' },
      as: 'item',
      key: 'item.id',
    });
    expect(rowsOfEach(resourced).templates).toEqual(
      rowsOfEach(keyed()).templates,
    );
    const tree = outlineTree(keyed(), new Map());
    expect(tree[0]!.children![0]!.children!.map((item) => item.detail)).toEqual(
      [
        expect.stringContaining('item.kind is header'),
        expect.stringContaining('otherwise'),
      ],
    );
    const edited = setProp(keyed(), HEADER, 'label', 'Section');
    expect(findNode(edited, HEADER)?.node.props?.label).toBe('Section');
    let count = 0;
    const copy = copyChild(
      each(keyed()) as never,
      new Set(),
      () => `01JB8Z1M6Q8E1X9V4S7K2R3T${(count += 10)}`,
    ) as { templates: Record<string, ViewNode> };
    expect(Object.values(copy.templates).map((node) => node.id)).toEqual([
      '01JB8Z1M6Q8E1X9V4S7K2R3T10',
      '01JB8Z1M6Q8E1X9V4S7K2R3T20',
    ]);
    const embedded = embedNode(
      keyed(),
      ROW,
      { type: `${ui}:list` },
      'children',
    );
    expect(
      embedded && findNode(embedded.document, ROW)?.ancestors.at(-1)?.node.id,
    ).toBe(embedded?.id);
    expect(rowsOfEach(previewSlots(keyed()).document).templates).toEqual(
      rowsOfEach(keyed()).templates,
    );
    const marked = rowsOfEach(markRows(keyed(), viewCatalog));
    expect(Object.keys(marked.templates!)).toEqual(['header', 'default']);
    const items = [
      { id: 'a', label: 'A', kind: 'header' },
      { id: 'b', label: 'B' },
    ];
    expect(closeRow(keyed(), HEADER, { [HEADER]: 'a' }, { items })).toEqual({
      items: [items[1]],
    });
  });
});
