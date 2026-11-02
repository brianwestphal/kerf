// KF-XV732Q: more play-time state adapters. Resizing, SplitView, value
// controls, sidebars toggled by several actions, TabBarItems repeated by
// `$each`, and tab close, each a pure transition over the play-time copy
// plus its wiring (docs/26-ui-editor.md §11.4). KF-7XQAFR: a value control
// nested inside an `$each` row, and closing a row whose items come through
// a `$bind`.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount, raw } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import {
  closeTabBarItem,
  followCompact,
  selectListItem,
  selectTabBarItem,
  setDetailActive,
  setRegionSize,
  setWorkbenchPanelSize,
} from '../../../src/editor/model/play-state.js';
import {
  closeRow,
  eachOf,
  markRows,
  nodeWithId,
  recordValue,
  rowPropsOf,
  setRowProp,
  withRowProps,
} from '../../../src/editor/model/play-values.js';
import { PLAY_DOCUMENT, playPageUrl } from '../../../src/editor/player.js';
import { createEditor, viewCatalog } from './kerf-catalog.js';

const id = (n: number) =>
  `01JB8Z1M6Q8E1X9V4S7K2R3W${String(n).padStart(2, '0')}`;
const node = (n: number, type: string, props: object, zones?: object) => ({
  id: id(n),
  type: `@kerfjs/ui:${type}`,
  props,
  ...(zones ? { zones } : {}),
});
const doc = (content: object[], params?: object) =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Adapters',
    catalogs: ['@kerfjs/ui'],
    ...(params ? { params } : {}),
    root: { id: id(0), type: '@kerfjs/ui:pane', zones: { content } },
  }) as unknown as ViewDocument;

const propsOf = (document: ViewDocument, n: number) => {
  let found: Record<string, unknown> | undefined;
  const visit = (value: unknown) => {
    if (found || typeof value !== 'object' || value === null) return;
    if ((value as { id?: unknown }).id === id(n) && 'type' in value) {
      found = ((value as { props?: object }).props ?? {}) as Record<
        string,
        unknown
      >;
      return;
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(document);
  return found!;
};

const choices = (...values: string[]) =>
  values.map((value) => ({ value, label: value.toUpperCase() }));

/** Every value control, and a row of Switches repeated by `$each`. */
const controls = () =>
  doc(
    [
      node(1, 'switch', { label: 'Wifi', checked: false }),
      node(2, 'checkbox', { label: 'Agree' }),
      node(3, 'radio-group', {
        label: 'Size',
        name: 'size',
        choices: choices('s', 'm'),
        value: { $param: 'size' },
      }),
      node(4, 'slider', { id: 'volume', label: 'Volume', value: 10 }),
      node(5, 'segmented-control', {
        id: 'view',
        label: 'View',
        value: 'list',
        choices: choices('list', 'grid'),
      }),
      node(6, 'choice-chips', {
        name: 'fruit',
        label: 'Fruit',
        choices: choices('apple', 'pear'),
      }),
      node(7, 'choice-chips', {
        name: 'tags',
        label: 'Tags',
        multiple: 'toggle',
        choices: choices('x', 'y'),
      }),
      node(8, 'choice-chips', {
        name: 'many',
        label: 'Many',
        multiple: true,
        choices: choices('p', 'q'),
      }),
      node(9, 'disclosure', { title: 'More', children: 'Hidden' }),
      node(10, 'list-item', { label: 'Star', action: 'star', pressed: false }),
      node(11, 'list-item', { label: 'Plain', action: 'plain' }),
      node(12, 'select', {
        name: 'color',
        label: 'Color',
        value: 'red',
        choices: choices('red', 'blue'),
      }),
      node(13, 'combobox', {
        id: 'city',
        label: 'City',
        suggestions: choices('oslo', 'rome'),
      }),
      node(14, 'tag-field', { id: 'labels', label: 'Labels', tags: ['a'] }),
      node(15, 'switch', {
        label: 'Bound',
        checked: { $bind: 'flag' },
      }),
      {
        $each: { $param: 'rows' },
        as: 'row',
        key: 'row.id',
        template: node(16, 'switch', { label: { $bind: 'row.name' } }),
      },
    ],
    {
      size: { type: { kind: 'string' }, default: 's' },
      flag: { type: { kind: 'boolean' }, default: false },
      rows: {
        type: {
          kind: 'array',
          items: {
            kind: 'object',
            props: [
              { name: 'id', type: { kind: 'string' }, required: true },
              { name: 'name', type: { kind: 'string' }, required: true },
            ],
          },
        },
        default: [
          { id: 'r1', name: 'One' },
          { id: 'r2', name: 'Two' },
        ],
      },
    },
  );

const tabsParam = {
  type: {
    kind: 'array',
    items: {
      kind: 'object',
      props: [
        { name: 'id', type: { kind: 'string' }, required: true },
        { name: 'name', type: { kind: 'string' }, required: true },
      ],
    },
  },
  default: [
    { id: 't1', name: 'One' },
    { id: 't2', name: 'Two' },
    { id: 't3', name: 'Three' },
  ],
};

/** Tabs (placed and repeated), a region, a Workbench, a SplitView, a sidebar. */
const layouts = () =>
  doc(
    [
      node(
        20,
        'tab-bar',
        { id: 'bar', label: 'Files' },
        {
          tabs: [
            node(21, 'tabs', { id: 'a', name: 'A', selected: true }),
            node(22, 'tabs', { id: 'b', name: 'B' }),
            {
              $each: { $param: 'tabs' },
              as: 'tab',
              key: 'tab.id',
              template: node(23, 'tabs', {
                id: { $bind: 'tab.id' },
                name: { $bind: 'tab.name' },
              }),
            },
          ],
        },
      ),
      node(
        24,
        'resize',
        { id: 'region', label: 'Region', size: 200, min: 100, max: 400 },
        { children: [node(25, 'text', { children: 'Region body' })] },
      ),
      node(
        26,
        'workbench',
        {
          id: 'bench',
          label: 'Bench',
          leftRail: { label: 'Files', resizable: true, size: 240 },
          rightRail: { label: 'Info', resizable: true },
        },
        {
          main: [node(27, 'text', { children: 'Work' })],
          'leftRail.content': [node(28, 'text', { children: 'Rail' })],
          'rightRail.content': [node(29, 'text', { children: 'Info' })],
        },
      ),
      node(
        30,
        'split-view',
        {
          id: 'split',
          label: 'Split',
          listTitle: 'Items',
          detailTitle: 'Item',
          resizable: { size: 260, min: 200, max: 400 },
        },
        {
          list: [
            node(
              31,
              'list',
              { ariaLabel: 'Items' },
              {
                children: [
                  node(32, 'list-item', { label: 'One', action: 'pick' }),
                  node(33, 'list-item', { label: 'Two', action: 'pick' }),
                  node(34, 'list-item', {
                    label: 'Flag',
                    action: 'flag',
                    pressed: false,
                  }),
                ],
              },
            ),
          ],
          detail: [
            node(
              39,
              'list',
              { ariaLabel: 'Related' },
              {
                children: [
                  node(38, 'list-item', {
                    label: 'Related',
                    action: 'related',
                  }),
                ],
              },
            ),
          ],
        },
      ),
      node(36, 'collapsible-panel', {
        id: 'side',
        side: 'left',
        label: 'Side',
        toolbar: {
          label: 'Side',
          toggle: { action: 'toggle-side', name: 'Side' },
        },
      }),
      {
        id: id(37),
        type: '@kerfjs/ui:collapsible-panel#CollapsiblePanelToggle',
        props: {
          side: 'left',
          collapsed: false,
          action: 'open-side',
          panelId: 'side',
        },
      },
    ],
    { tabs: tabsParam },
  );

const rowType = (props: { name: string; type: object }[]) => ({
  kind: 'array',
  items: {
    kind: 'object',
    props: props.map((prop) => ({ ...prop, required: true })),
  },
});
const str = { kind: 'string' };

/** KF-7XQAFR: controls nested inside `$each` rows, and an inner `$each`. */
const nestedRows = () =>
  doc([
    {
      $each: { $param: 'rows' },
      as: 'row',
      key: 'row.id',
      template: node(
        40,
        'list-item',
        { label: { $bind: 'row.name' } },
        {
          trailing: [
            node(41, 'switch', {
              label: 'On',
              rootAttributes: { 'data-x': '1' },
            }),
            node(42, 'switch', { label: 'Off' }),
            {
              $if: { $param: 'flag' },
              then: node(43, 'text', { children: 'then' }),
              else: node(44, 'text', { children: 'else' }),
            },
            { $if: { $param: 'flag' }, then: node(53, 'nope', {}) },
            node(45, 'switch', {
              label: 'Expr',
              rootAttributes: { $param: 'attrs' },
            }),
            { $slot: 'extra' },
            { id: id(49), type: '#text', value: 'hi' },
            node(50, 'wa-badge', {}),
            node(57, 'collapsible-panel#CollapsiblePanelRelocated', {}),
            node(
              46,
              'list-item',
              { label: 'Inner' },
              {
                trailing: [
                  {
                    $each: { $bind: 'row.subs' },
                    as: 'sub',
                    key: 'sub.id',
                    template: node(
                      54,
                      'list-item',
                      { label: 'Sub' },
                      { trailing: [node(47, 'switch', { label: 'Sub' })] },
                    ),
                  },
                ],
              },
            ),
          ],
        },
      ),
    },
    node(48, 'switch', { label: 'Outside' }),
  ]);

/** KF-7XQAFR: a repeated Row holding its item's name and a Switch. */
const switchRows = () =>
  doc(
    [
      {
        $each: { $param: 'rows' },
        as: 'row',
        key: 'row.id',
        template: node(
          51,
          'row',
          {},
          {
            children: [
              node(56, 'text', { children: { $bind: 'row.name' } }),
              node(52, 'switch', { label: 'On' }),
            ],
          },
        ),
      },
    ],
    {
      rows: {
        type: rowType([
          { name: 'id', type: str },
          { name: 'name', type: str },
        ]),
        default: [
          { id: 'r1', name: 'One' },
          { id: 'r2', name: 'Two' },
        ],
      },
    },
  );

/**
 * KF-7XQAFR: TabBars repeated per group, each repeating the group's tabs
 * (a `$bind` to the outer row's array), and a TabBar over a param object's
 * tabs.
 */
const nestedTabs = () => {
  const tabType = rowType([
    { name: 'id', type: str },
    { name: 'name', type: str },
  ]);
  return doc(
    [
      {
        $each: { $param: 'groups' },
        as: 'group',
        key: 'group.id',
        template: node(
          61,
          'tab-bar',
          { id: { $bind: 'group.id' }, label: 'Group' },
          {
            tabs: [
              {
                $each: { $bind: 'group.tabs' },
                as: 'tab',
                key: 'tab.id',
                template: node(62, 'tabs', {
                  id: { $bind: 'tab.id' },
                  name: { $bind: 'tab.name' },
                }),
              },
            ],
          },
        ),
      },
      node(
        63,
        'tab-bar',
        { id: 'data', label: 'Data' },
        {
          tabs: [
            {
              $each: { $bind: 'data.tabs' },
              as: 'tab',
              key: 'tab.id',
              template: node(64, 'tabs', {
                id: { $bind: 'tab.id' },
                name: { $bind: 'tab.name' },
              }),
            },
          ],
        },
      ),
    ],
    {
      groups: {
        type: rowType([
          { name: 'id', type: str },
          { name: 'tabs', type: tabType },
        ]),
        default: [
          {
            id: 'g1',
            tabs: [
              { id: 'a', name: 'A1' },
              { id: 'b', name: 'B1' },
            ],
          },
          {
            id: 'g2',
            tabs: [
              { id: 'a', name: 'A2' },
              { id: 'c', name: 'C2' },
            ],
          },
        ],
      },
      data: {
        type: {
          kind: 'object',
          props: [{ name: 'tabs', type: tabType, required: true }],
        },
        default: {
          tabs: [
            { id: 'p', name: 'P' },
            { id: 'q', name: 'Q' },
          ],
        },
      },
    },
  );
};

describe('play-time values (pure)', () => {
  it('lays per-row props over a repeated row', () => {
    const rows = setRowProp({}, id(16), 'r1', 'checked', true);
    expect(rowPropsOf(rows, id(16), 'r1')).toEqual({ checked: true });
    expect(rowPropsOf(rows, id(16), 'r2')).toEqual({});
    expect(rowPropsOf(rows, id(1), 'r1')).toEqual({});
    const seen: Record<string, unknown>[] = [];
    const components = {
      a: (props: Record<string, unknown>) => {
        seen.push(props);
        return raw('');
      },
      note: 'not a function',
    };
    expect(withRowProps(components, {})).toBe(components);
    const wrapped = withRowProps(components, rows);
    expect(wrapped.note).toBe('not a function');
    wrapped.a({
      rootAttributes: { 'data-kerf-node': id(16), 'data-key': 'r1' },
    });
    wrapped.a({ 'data-kerf-node': id(16), 'data-key': 'r2', label: 'x' });
    wrapped.a({ label: 'plain' });
    expect(seen[0]!.checked).toBe(true);
    expect(seen[1]).toEqual({
      'data-kerf-node': id(16),
      'data-key': 'r2',
      label: 'x',
    });
    expect(seen[2]).toEqual({ label: 'plain' });
  });

  it('records a value where it lives', () => {
    const source = controls();
    // A literal prop changes in the play copy; the same value is a no-op.
    const literal = recordValue(source, {}, id(1), undefined, 'checked', true);
    expect(propsOf(literal.document, 1).checked).toBe(true);
    expect(
      recordValue(source, {}, id(1), undefined, 'checked', false).document,
    ).toBe(source);
    // A param prop changes the param.
    expect(
      recordValue(source, {}, id(3), undefined, 'value', 'm').params,
    ).toEqual({ size: 'm' });
    // Another expression is left alone.
    expect(
      recordValue(source, {}, id(15), undefined, 'checked', true).document,
    ).toBe(source);
    // A repeated node changes for its row, and needs one.
    const row = recordValue(source, {}, id(16), 'r2', 'checked', true);
    expect(row.document).toBe(source);
    expect(rowPropsOf(row.rows, id(16), 'r2')).toEqual({ checked: true });
    expect(recordValue(source, {}, id(16), undefined, 'checked', true)).toEqual(
      { document: source, rows: {} },
    );
    expect(recordValue(source, {}, id(99), undefined, 'x', 1).document).toBe(
      source,
    );
  });

  it('finds nodes by id prop and closes a repeated row', () => {
    const source = layouts();
    expect(nodeWithId(source, '@kerfjs/ui:resize', 'region')).toBe(id(24));
    expect(nodeWithId(source, '@kerfjs/ui:resize', 'nope')).toBeUndefined();
    expect(eachOf(source, id(23))?.as).toBe('tab');
    expect(eachOf(source, id(21))).toBeUndefined();
    const params = { tabs: tabsParam.default };
    expect(closeRow(source, id(23), { [id(23)]: 't2' }, params)).toEqual({
      tabs: [
        { id: 't1', name: 'One' },
        { id: 't3', name: 'Three' },
      ],
    });
    expect(closeRow(source, id(23), { [id(23)]: 't2' }, {})).toBeUndefined();
    expect(closeRow(source, id(23), {}, params)).toBeUndefined();
    expect(closeRow(source, id(21), { [id(21)]: 'a' }, params)).toBeUndefined();
  });

  it('marks the nodes nested in a row with the row’s key (KF-7XQAFR)', () => {
    const marked = markRows(nestedRows(), viewCatalog);
    const mark = (n: number) => propsOf(marked, n);
    const row = { 'data-kerf-row': { $bind: 'row.id' } };
    // The template's root keeps its data-key; outside rows nothing changes.
    expect(mark(40)).toEqual(propsOf(nestedRows(), 40));
    expect(mark(48)).toEqual(propsOf(nestedRows(), 48));
    // A rootAttributes component, beside its own attributes.
    expect(mark(41).rootAttributes).toEqual({ 'data-x': '1', ...row });
    expect(mark(42).rootAttributes).toEqual(row);
    // A native component and a Web Awesome element, as a prop; through `$if`.
    expect(mark(43)['data-kerf-row']).toEqual(row['data-kerf-row']);
    expect(mark(44)['data-kerf-row']).toEqual(row['data-kerf-row']);
    expect(mark(50)['data-kerf-row']).toEqual(row['data-kerf-row']);
    // An expression rootAttributes, a #text, and an unknown type stay as is.
    expect(mark(45).rootAttributes).toEqual({ $param: 'attrs' });
    expect(mark(49)).toEqual({});
    expect(mark(53)).toEqual({});
    // A component with no data channel carries no mark.
    expect(mark(57)).toEqual({});
    // A node holding an inner `$each` takes the outer key; the inner row's
    // root keeps its data-key, and its own nodes take the inner key.
    expect(mark(46).rootAttributes).toEqual(row);
    expect(mark(54).rootAttributes).toBeUndefined();
    expect(mark(47).rootAttributes).toEqual({
      'data-kerf-row': { $bind: 'sub.id' },
    });
    expect(JSON.stringify(marked)).toContain('"$slot":"extra"');
  });

  it('closes a row whose items come through a $bind (KF-7XQAFR)', () => {
    const source = nestedTabs();
    const groups = [
      { id: 'g1', tabs: [{ id: 'a', name: 'A' }] },
      {
        id: 'g2',
        tabs: [
          { id: 'a', name: 'A' },
          { id: 'c', name: 'C' },
        ],
      },
    ];
    const keys = { [id(62)]: 'a', [id(61)]: 'g2' };
    // An outer row's array: only that row's item closes.
    expect(closeRow(source, id(62), keys, { groups })).toEqual({
      groups: [groups[0], { ...groups[1], tabs: [{ id: 'c', name: 'C' }] }],
    });
    // Without the outer row's key, or with one no row has, nothing closes.
    expect(
      closeRow(source, id(62), { [id(62)]: 'a' }, { groups }),
    ).toBeUndefined();
    expect(
      closeRow(source, id(62), { ...keys, [id(61)]: 'g9' }, { groups }),
    ).toBeUndefined();
    // An outer row whose item lacks the array, or a param that is no list.
    expect(
      closeRow(source, id(62), keys, { groups: [{ id: 'g2' }] }),
    ).toBeUndefined();
    expect(closeRow(source, id(62), keys, { groups: 'x' })).toBeUndefined();
    // A `$bind` into a param's object.
    const data = {
      tabs: [
        { id: 'p', name: 'P' },
        { id: 'q', name: 'Q' },
      ],
    };
    expect(closeRow(source, id(64), { [id(64)]: 'p' }, { data })).toEqual({
      data: { tabs: [{ id: 'q', name: 'Q' }] },
    });
    expect(
      closeRow(source, id(64), { [id(64)]: 'p' }, { data: [data] }),
    ).toBeUndefined();
    expect(closeRow(source, id(64), { [id(64)]: 'p' }, {})).toBeUndefined();
    // A source that is neither a param nor a bind closes nothing.
    const literal = doc([
      {
        $each: [{ id: 'x' }],
        as: 'tab',
        key: 'tab.id',
        template: node(70, 'tabs', { name: 'X' }),
      },
    ]);
    expect(closeRow(literal, id(70), { [id(70)]: 'x' }, {})).toBeUndefined();
  });
});

describe('play-time layout transitions (pure)', () => {
  it('selects one repeated tab per row, and clears it for a placed tab', () => {
    const source = layouts();
    const row = selectTabBarItem(source, id(23), {}, 't2');
    expect(propsOf(row.document, 21).selected).toBeUndefined();
    expect(rowPropsOf(row.rows, id(23), 't2')).toEqual({ selected: true });
    expect(rowPropsOf(row.rows, id(23), 't1')).toEqual({ selected: false });
    const placed = selectTabBarItem(row.document, id(22), row.rows);
    expect(propsOf(placed.document, 22).selected).toBe(true);
    expect(rowPropsOf(placed.rows, id(23), 't2')).toEqual({ selected: false });
  });

  it('closes a placed tab and hands its selection on', () => {
    const source = layouts();
    const closed = closeTabBarItem(source, id(21));
    expect(JSON.stringify(closed)).not.toContain(id(21));
    expect(propsOf(closed, 22).selected).toBe(true);
    // The last placed tab hands it back; an unselected one hands nothing.
    const selectedB = selectTabBarItem(source, id(22)).document;
    const lastClosed = closeTabBarItem(selectedB, id(22));
    expect(propsOf(lastClosed, 21).selected).toBe(true);
    expect(propsOf(closeTabBarItem(source, id(22)), 21).selected).toBe(true);
    // Only the last tab, selected, has no neighbor.
    const alone = closeTabBarItem(closeTabBarItem(source, id(22)), id(21));
    expect(JSON.stringify(alone)).not.toContain(id(21));
    // A repeated tab or another node is not closed this way.
    expect(closeTabBarItem(source, id(23))).toBe(source);
    expect(closeTabBarItem(source, id(24))).toBe(source);
  });

  it('sizes Workbench panels and regions', () => {
    const source = layouts();
    const panel = setWorkbenchPanelSize(source, id(26), 'leftRail', 300);
    expect((propsOf(panel, 26).leftRail as { size: number }).size).toBe(300);
    expect(setWorkbenchPanelSize(panel, id(26), 'leftRail', 300)).toBe(panel);
    expect(setWorkbenchPanelSize(source, id(26), 'bottomDrawer', 300)).toBe(
      source,
    );
    const region = setRegionSize(source, 'region', 320);
    expect(propsOf(region, 24).size).toBe(320);
    expect(setRegionSize(region, 'region', 320)).toBe(region);
    const list = setRegionSize(source, 'split-list', 300);
    expect((propsOf(list, 30).resizable as { size: number }).size).toBe(300);
    expect(setRegionSize(list, 'split-list', 300)).toBe(list);
    expect(setRegionSize(source, 'nothing', 1)).toBe(source);
  });

  it('follows the device into compact, and pushes and pops the detail', () => {
    const source = layouts();
    const compact = followCompact(source, true);
    expect(propsOf(compact, 30).compact).toBe(true);
    expect(followCompact(compact, true)).toBe(compact);
    const pushed = setDetailActive(compact, id(30), true);
    expect(propsOf(pushed, 30).detailActive).toBe(true);
    expect(setDetailActive(pushed, id(30), true)).toBe(pushed);
    expect(setDetailActive(pushed, id(24), false)).toBe(pushed);
    // Leaving compact drops the pushed detail.
    const roomy = followCompact(pushed, false);
    expect(propsOf(roomy, 30).compact).toBeUndefined();
    expect(propsOf(roomy, 30).detailActive).toBeUndefined();
    expect(followCompact(followCompact(compact, false), false)).toEqual(
      followCompact(compact, false),
    );
    // A compact the author binds is theirs.
    const bound = setRegionSize(source, 'x', 0);
    (
      bound.root.zones!.content![3] as { props: Record<string, unknown> }
    ).props.compact = { $param: 'tabs' };
    expect(followCompact(bound, true)).toBe(bound);
  });

  it('selects one ListItem among its siblings', () => {
    const source = layouts();
    const one = selectListItem(source, id(32));
    expect(propsOf(one, 32).selected).toBe(true);
    const two = selectListItem(one, id(33));
    expect(propsOf(two, 32).selected).toBeUndefined();
    expect(propsOf(two, 33).selected).toBe(true);
    expect(selectListItem(source, id(30))).toBe(source);
  });
});

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
  window.history.replaceState(null, '', '/');
});

/** happy-dom's own window controls. */
const { happyDOM } = window as unknown as {
  happyDOM: { setViewport(size: { width: number; height: number }): void };
};

const settled = () =>
  new Promise((resolve) => globalThis.setTimeout(resolve, 0));

/** The play page's player over `played`. */
const play = async (played: ViewDocument) => {
  window.history.replaceState(null, '', playPageUrl(location.href));
  const root = document.createElement('div');
  document.body.append(root);
  const player = createEditor({});
  mount(root, player.render);
  cleanup = player.wire(root);
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type: PLAY_DOCUMENT, document: played },
      origin: location.origin,
      source: window,
    }),
  );
  await settled();
  const at = (n: number) =>
    root.querySelector<HTMLElement>(`[data-kerf-node="${id(n)}"]`)!;
  const props = (n: number) => propsOf(player.document.value, n);
  return { root, player, at, props };
};

const change = (target: Element) =>
  target.dispatchEvent(new Event('change', { bubbles: true }));

describe('the play page’s value controls', () => {
  it('records each control’s change in the play copy', async () => {
    const { root, at, props } = await play(controls());
    const input = (n: number) => at(n).querySelector('input')!;
    input(1).checked = true;
    change(input(1));
    expect(props(1).checked).toBe(true);
    input(2).checked = true;
    change(input(2));
    expect(props(2).checked).toBe(true);
    // A param-bound radio group sets its param; the bound Switch follows.
    const medium = at(3).querySelector<HTMLInputElement>('input[value="m"]')!;
    medium.checked = true;
    change(medium);
    await settled();
    expect(
      at(3).querySelector<HTMLInputElement>('input[value="m"]')!.checked,
    ).toBe(true);
    input(4).value = '40';
    change(input(4));
    expect(props(4).value).toBe(40);
    at(5).querySelector<HTMLElement>('[data-segment-value="grid"]')!.click();
    expect(props(5).value).toBe('grid');
    at(5).click();
    expect(props(5).value).toBe('grid');
    const pear = at(6).querySelector<HTMLInputElement>('input[value="pear"]')!;
    pear.checked = true;
    change(pear);
    expect(props(6).value).toBe('pear');
    const y = at(7).querySelector<HTMLInputElement>('input[value="y"]')!;
    y.checked = true;
    change(y);
    expect(props(7).value).toEqual(['y']);
    at(8)
      .querySelector<HTMLElement>('[role="option"][data-choice-value="q"]')!
      .click();
    expect(props(8).value).toEqual(['q']);
    const details = at(9) as HTMLDetailsElement;
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    expect(props(9).open).toBe(true);
    // A toggle event from anything else is not a Disclosure's.
    at(9).querySelector('summary')!.dispatchEvent(new Event('toggle'));
    at(10).click();
    expect(props(10).pressed).toBe(true);
    await settled();
    at(10).click();
    expect(props(10).pressed).toBe(false);
    at(11).click();
    expect(props(11).pressed).toBeUndefined();
    Object.defineProperty(at(12), 'value', { value: 'blue' });
    change(at(12));
    expect(props(12).value).toBe('blue');
    // A change outside any node is nobody's.
    change(root);
    // A repeated Switch keeps its change to its row.
    const rows = root.querySelectorAll<HTMLElement>(
      `[data-kerf-node="${id(16)}"]`,
    );
    const second = rows[1]!.querySelector('input')!;
    second.checked = true;
    change(second);
    await settled();
    const after = root.querySelectorAll<HTMLElement>(
      `[data-kerf-node="${id(16)}"] input`,
    );
    expect((after[0] as HTMLInputElement).checked).toBe(false);
    expect(after[1]!.hasAttribute('checked')).toBe(true);
  });

  it('records a Combobox commit by the field’s id', async () => {
    // happy-dom has no Popover API.
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    proto.showPopover ??= () => {};
    proto.hidePopover ??= () => {};
    const { at, props } = await play(controls());
    const field = at(13).querySelector('input')!;
    field.focus();
    field.value = 'ROME';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(props(13).value).toBe('rome');
  });
});

describe('the play page’s layouts', () => {
  it('selects and closes repeated and placed tabs', async () => {
    const { root, at, props, player } = await play(layouts());
    const row = (key: string) =>
      root.querySelector<HTMLElement>(
        `[data-kerf-node="${id(23)}"][data-key="${key}"]`,
      )!;
    row('t2').click();
    await settled();
    expect(row('t2').dataset.selected).toBe('true');
    expect(row('t1').dataset.selected).toBe('false');
    expect(at(21).dataset.selected).toBe('false');
    // Closing the selected row hands the selection to the next row.
    row('t2').querySelector<HTMLElement>('.kui-tab-bar-item__close')!.click();
    await settled();
    expect(row('t2')).toBeNull();
    expect(row('t3').dataset.selected).toBe('true');
    // The last row hands it back; an unselected row hands nothing.
    row('t3').querySelector<HTMLElement>('.kui-tab-bar-item__close')!.click();
    await settled();
    expect(row('t1').dataset.selected).toBe('true');
    row('t1').querySelector<HTMLElement>('.kui-tab-bar-item__close')!.click();
    await settled();
    expect(row('t1')).toBeNull();
    // A placed tab closes from the play copy; an unselected one hands on
    // nothing.
    at(22).querySelector<HTMLElement>('.kui-tab-bar-item__close')!.click();
    expect(JSON.stringify(player.document.value)).not.toContain(id(22));
    expect(props(21).selected).toBeUndefined();
  });

  it('ignores a close button outside any tab', async () => {
    const { root, player } = await play(layouts());
    const before = player.document.value;
    const stray = document.createElement('button');
    stray.className = 'kui-tab-bar-item__close';
    root.append(stray);
    stray.click();
    expect(player.document.value).toBe(before);
  });

  it('resizes a region, a SplitView list, and a Workbench rail', async () => {
    const { root, props } = await play(layouts());
    const key = (handle: Element, name: string) =>
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { key: name, bubbles: true }),
      );
    const handle = (regionId: string) =>
      root.querySelector(
        `[data-region-id="${regionId}"] [data-kui-resize-handle]`,
      )!;
    key(handle('region'), 'End');
    expect(props(24).size).toBe(400);
    key(handle('split-list'), 'Home');
    expect((props(30).resizable as { size: number }).size).toBe(200);
    key(handle('bench-left-rail'), 'ArrowRight');
    // A rail with no size starts from the Workbench's default.
    key(handle('bench-right-rail'), 'End');
    expect((props(26).rightRail as { size: number }).size).toBeGreaterThan(280);
    expect((props(26).leftRail as { size: number }).size).toBeGreaterThan(240);
  });

  it('selects a SplitView row, and toggles a sidebar from either action', async () => {
    const { at, props, root } = await play(layouts());
    at(33).click();
    expect(props(33).selected).toBe(true);
    // A row in the detail is not the list's.
    at(38).click();
    expect(props(38).selected).toBeUndefined();
    // A toggle row toggles and does not select.
    at(34).click();
    expect(props(34).selected).toBeUndefined();
    expect(props(34).pressed).toBe(true);
    root.querySelector<HTMLElement>('[data-action="open-side"]')!.click();
    expect(props(36).collapsed).toBe(true);
    await settled();
    root.querySelector<HTMLElement>('[data-action="toggle-side"]')!.click();
    expect(props(36).collapsed).toBe(false);
  });

  it('collapses a SplitView on a compact device, pushing and popping its detail', async () => {
    const width = window.innerWidth;
    happyDOM.setViewport({ width: 390, height: 800 });
    try {
      const { at, props, root } = await play(layouts());
      expect(props(30).compact).toBe(true);
      await settled();
      expect(at(30).dataset.splitMode).toBe('compact');
      at(32).click();
      expect(props(30).detailActive).toBe(true);
      await settled();
      root
        .querySelector<HTMLElement>(
          `[data-kerf-node="${id(30)}"] [data-nav-back]`,
        )!
        .click();
      expect(props(30).detailActive).toBeUndefined();
    } finally {
      happyDOM.setViewport({ width, height: 768 });
    }
  });
});

describe('the play page’s nested rows (KF-7XQAFR)', () => {
  it('keeps a Switch nested in a repeated row to its row', async () => {
    const { root, player } = await play(switchRows());
    const switches = () =>
      root.querySelectorAll<HTMLInputElement>(
        `[data-kerf-node="${id(52)}"] input`,
      );
    expect(
      root
        .querySelector(`[data-kerf-node="${id(52)}"]`)!
        .getAttribute('data-kerf-row'),
    ).toBe('r1');
    switches()[1]!.checked = true;
    change(switches()[1]!);
    await settled();
    // The row re-renders with its own value; the other row keeps its own.
    expect(switches()[0]!.hasAttribute('checked')).toBe(false);
    expect(switches()[1]!.hasAttribute('checked')).toBe(true);
    // Only the row's props change, never the play copy's node.
    expect(JSON.stringify(player.document.value)).not.toContain('checked');
    switches()[1]!.checked = false;
    change(switches()[1]!);
    await settled();
    expect(switches()[1]!.hasAttribute('checked')).toBe(false);
  });

  it('closes a tab repeated from a param object’s array', async () => {
    // An `$each` inside another's row does not render yet (KF-CFA1S1), so
    // the play page closes a `$bind` into a param's object. A `$bind` reads
    // no default (KF-8P3H7F), so `data` takes the canvas's sample tabs
    // ("Id", "Id 2", "Id 3").
    const source = nestedTabs();
    const content = (
      source.root.zones as { content: readonly ViewDocument['root'][] }
    ).content;
    const { type } = source.params!.data!;
    const { root, player } = await play({
      ...source,
      params: { data: { type } },
      root: { ...source.root, zones: { content: [content[1]!] } },
    });
    const data = (key: string) =>
      root.querySelector<HTMLElement>(
        `[data-kerf-node="${id(64)}"][data-key="${key}"]`,
      );
    data('Id 2')!
      .querySelector<HTMLElement>('.kui-tab-bar-item__close')!
      .click();
    await settled();
    expect(data('Id 2')).toBeNull();
    expect(data('Id')).not.toBeNull();
    expect(data('Id 3')).not.toBeNull();
    // The play copy is unchanged; the param moved.
    expect(JSON.stringify(player.document.value)).toContain(id(64));
  });
});
