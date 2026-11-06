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
  addRowDesign,
  removeRowDesign,
  rowConditionOptions,
  rowDesignChoices,
  setRowCondition,
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

/** A Pane holding a List whose rows come from `template`. */
const documentWith = (template: unknown): ViewDocument =>
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
                  template,
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
