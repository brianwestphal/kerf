// KF-58917B: play mode wires the controlled components inside a composed
// document (`#view`): each composed node has a composed id, its adapter
// runs over its `#view`'s play copy, and a value a person changes goes
// where the value comes from (docs/26-ui-editor.md §11.4).
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { setRowField } from '../../../src/editor/model/play-values.js';
import {
  composedId,
  levelsOf,
  playedView,
  playedViews,
  recordComposedValue,
  rowsIn,
  rowsOut,
  topNode,
} from '../../../src/editor/model/play-views.js';
import { PLAY_DOCUMENT, playPageUrl } from '../../../src/editor/player.js';
import { createEditor, viewCatalog } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
  window.history.replaceState(null, '', '/');
});

const id = (n: number) => `01JD0V1EW0000000000000${String(n).padStart(4, '0')}`;
const ids = {
  row: id(1),
  toggle: id(2),
  bar: id(3),
  tabA: id(4),
  tabB: id(5),
  tabC: id(6),
  tabsBar: id(7),
  tabsView: id(16),
  navView: id(17),
  groups: id(18),
  grouped: id(19),
  nav: id(30),
  navFirst: id(31),
  navSecond: id(32),
  pane: id(10),
  bound: id(11),
  unset: id(12),
  solo: id(13),
  param: id(14),
  nested: id(15),
  outerRoot: id(20),
  outerView: id(21),
};

/** A row: a Switch for `on`, and a TabBar of two placed tabs. */
const rowDocument = (): ViewDocument =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'ToggleRow',
    catalogs: ['@kerfjs/ui'],
    params: {
      title: { type: { kind: 'string' } },
      on: { type: { kind: 'boolean' }, default: false },
    },
    root: {
      id: ids.row,
      type: '@kerfjs/ui:row',
      zones: {
        children: [
          {
            id: ids.toggle,
            type: '@kerfjs/ui:switch',
            props: { label: { $param: 'title' }, checked: { $param: 'on' } },
          },
          {
            id: ids.bar,
            type: '@kerfjs/ui:tab-bar',
            props: { id: 'views', label: 'Views' },
            zones: {
              tabs: [
                {
                  id: ids.tabA,
                  type: '@kerfjs/ui:tabs',
                  props: { id: 'a', name: 'A', selected: true },
                },
                {
                  id: ids.tabB,
                  type: '@kerfjs/ui:tabs',
                  props: { id: 'b', name: 'B', closable: true },
                },
              ],
            },
          },
        ],
      },
    },
  }) as unknown as ViewDocument;

/** A TabBar of tabs repeated from a param. */
const tabsDocument = (): ViewDocument =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Tabs',
    catalogs: ['@kerfjs/ui'],
    params: {
      tabs: {
        type: {
          kind: 'array',
          items: {
            kind: 'object',
            props: [{ name: 'id', type: { kind: 'string' }, required: true }],
          },
        },
        default: [{ id: 'c' }],
      },
    },
    root: {
      id: ids.tabsBar,
      type: '@kerfjs/ui:tab-bar',
      props: { id: 'more', label: 'More' },
      zones: {
        tabs: [
          {
            $each: { $param: 'tabs' },
            as: 'tab',
            key: 'tab.id',
            template: {
              id: ids.tabC,
              type: '@kerfjs/ui:tabs',
              props: {
                id: { $bind: 'tab.id' },
                name: { $bind: 'tab.id' },
                closable: true,
              },
            },
          },
        ],
      },
    },
  }) as unknown as ViewDocument;

/** A TabNavigator of two tabs. */
const navDocument = (): ViewDocument =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Sections',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: ids.nav,
      type: '@kerfjs/ui:tab-navigator',
      props: {
        id: 'sections',
        label: 'Sections',
        tabs: [
          { id: 'projects', label: 'Projects' },
          { id: 'search', label: 'Search' },
        ],
        active: 'projects',
      },
      zones: {
        'tabs.0.content': [
          {
            id: ids.navFirst,
            type: '@kerfjs/ui:text',
            props: { children: 'All projects' },
          },
        ],
        'tabs.1.content': [
          {
            id: ids.navSecond,
            type: '@kerfjs/ui:text',
            props: { children: 'Search everything' },
          },
        ],
      },
    },
  }) as unknown as ViewDocument;

/** A document that composes the row once, with a literal `on`. */
const outerDocument = (): ViewDocument =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Outer',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: ids.outerRoot,
      type: '@kerfjs/ui:row',
      zones: {
        children: [
          {
            id: ids.outerView,
            type: '#view',
            src: './row.kui.json',
            props: { title: 'Nested', on: true },
          },
        ],
      },
    },
  }) as unknown as ViewDocument;

const views = {
  'row.kui.json': rowDocument(),
  'tabs.kui.json': tabsDocument(),
  'nav.kui.json': navDocument(),
  'outer.kui.json': outerDocument(),
};

const repeat = (template: object) => ({
  $each: { $param: 'messages' },
  as: 'message',
  key: 'message.id',
  template,
});

/**
 * Rows whose `on` is bound to their item, rows that leave it unset, and
 * single `#view`s with a literal `on`, a `$param` one, and a nested one.
 */
const listDocument = (): ViewDocument =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Toggles',
    catalogs: ['@kerfjs/ui'],
    params: {
      flag: { type: { kind: 'boolean' }, default: false },
      groups: {
        type: {
          kind: 'array',
          items: {
            kind: 'object',
            props: [
              { name: 'id', type: { kind: 'string' }, required: true },
              {
                name: 'messages',
                type: {
                  kind: 'array',
                  items: {
                    kind: 'object',
                    props: [
                      { name: 'id', type: { kind: 'string' }, required: true },
                      {
                        name: 'subject',
                        type: { kind: 'string' },
                        required: true,
                      },
                      { name: 'on', type: { kind: 'boolean' }, required: true },
                    ],
                  },
                },
                required: true,
              },
            ],
          },
        },
        default: [
          { id: 'g1', messages: [{ id: 'x', subject: 'G1 X', on: false }] },
          { id: 'g2', messages: [{ id: 'x', subject: 'G2 X', on: false }] },
        ],
      },
      messages: {
        type: {
          kind: 'array',
          items: {
            kind: 'object',
            props: [
              { name: 'id', type: { kind: 'string' }, required: true },
              { name: 'subject', type: { kind: 'string' }, required: true },
              { name: 'on', type: { kind: 'boolean' }, required: true },
            ],
          },
        },
        default: [
          { id: 'm1', subject: 'First', on: false },
          { id: 'm2', subject: 'Second', on: false },
        ],
      },
    },
    root: {
      id: ids.pane,
      type: '@kerfjs/ui:pane',
      zones: {
        content: [
          repeat({
            id: ids.bound,
            type: '#view',
            src: './row.kui.json',
            props: {
              title: { $bind: 'message.subject' },
              on: { $bind: 'message.on' },
            },
          }),
          repeat({
            id: ids.unset,
            type: '#view',
            src: './row.kui.json',
            props: { title: { $bind: 'message.subject' } },
          }),
          {
            id: ids.solo,
            type: '#view',
            src: './row.kui.json',
            props: { title: 'Solo', on: false },
          },
          {
            id: ids.param,
            type: '#view',
            src: './row.kui.json',
            props: { title: 'Param', on: { $param: 'flag' } },
          },
          { id: ids.nested, type: '#view', src: './outer.kui.json' },
          { id: ids.tabsView, type: '#view', src: './tabs.kui.json' },
          { id: ids.navView, type: '#view', src: './nav.kui.json' },
          // Rows inside rows: each group's messages, bound to their item.
          {
            $each: { $param: 'groups' },
            as: 'group',
            key: 'group.id',
            template: {
              id: ids.groups,
              type: '@kerfjs/ui:row',
              zones: {
                children: [
                  {
                    $each: { $bind: 'group.messages' },
                    as: 'message',
                    key: 'message.id',
                    template: {
                      id: ids.grouped,
                      type: '#view',
                      src: './row.kui.json',
                      props: {
                        title: { $bind: 'message.subject' },
                        on: { $bind: 'message.on' },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    },
  }) as unknown as ViewDocument;

const settled = () =>
  new Promise((resolve) => globalThis.setTimeout(resolve, 0));

/** The play page over `played`, sent with the composed documents. */
const play = async (played: ViewDocument = listDocument()) => {
  window.history.replaceState(null, '', playPageUrl(location.href));
  const root = document.createElement('div');
  document.body.append(root);
  // On the play page, createEditor returns the player.
  const player = createEditor({}) as Extract<
    ReturnType<typeof createEditor>,
    { copies: unknown }
  >;
  const stopMount = mount(root, player.render);
  const unwire = player.wire(root);
  cleanup = () => {
    unwire();
    stopMount();
  };
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type: PLAY_DOCUMENT, document: played, views },
      origin: location.origin,
      source: window,
    }),
  );
  await settled();
  return { root, player };
};

/** The Switch inputs a composed id renders, in document order. */
const switches = (root: HTMLElement, owner: string) => [
  ...root.querySelectorAll<HTMLInputElement>(
    `[data-kerf-node="${composedId(owner, ids.toggle)}"] input`,
  ),
];

const toggle = async (input: HTMLInputElement) => {
  input.checked = !input.checked;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await settled();
};

const messages = (player: { document: { value: ViewDocument } }) =>
  JSON.stringify(player.document.value);

describe('composed documents in play', () => {
  it('routes a Switch in a bound row to its row item', async () => {
    const { root, player } = await play();
    const before = switches(root, ids.bound);
    expect(before).toHaveLength(2);
    await toggle(before[1]!);
    const after = switches(root, ids.bound);
    expect(after[1]!.hasAttribute('checked')).toBe(true);
    expect(after[0]!.hasAttribute('checked')).toBe(false);
    // The value went to the item, not into the play copy's document.
    expect(messages(player)).not.toContain('"on":true');
    await toggle(after[1]!);
    expect(switches(root, ids.bound)[1]!.hasAttribute('checked')).toBe(false);
  });

  it('keeps a Switch in a row whose #view leaves the prop unset to its row', async () => {
    const { root } = await play();
    await toggle(switches(root, ids.unset)[0]!);
    const after = switches(root, ids.unset);
    expect(after[0]!.hasAttribute('checked')).toBe(true);
    expect(after[1]!.hasAttribute('checked')).toBe(false);
  });

  it('sets a single #view’s literal prop, and a $param one’s param', async () => {
    const { root, player } = await play();
    await toggle(switches(root, ids.solo)[0]!);
    expect(switches(root, ids.solo)[0]!.hasAttribute('checked')).toBe(true);
    expect(messages(player)).toContain('"title":"Solo","on":true');
    // A second change to the same value changes nothing.
    const copy = player.document.value;
    const solo = switches(root, ids.solo)[0]!;
    solo.dispatchEvent(new Event('change', { bubbles: true }));
    await settled();
    expect(player.document.value).toBe(copy);
    await toggle(switches(root, ids.param)[0]!);
    expect(switches(root, ids.param)[0]!.hasAttribute('checked')).toBe(true);
  });

  it('changes a nested #view’s literal prop in its play copy', async () => {
    const { root, player } = await play();
    const owner = composedId(ids.nested, ids.outerView);
    const nested = switches(root, owner);
    expect(nested[0]!.hasAttribute('checked')).toBe(true);
    await toggle(nested[0]!);
    expect(switches(root, owner)[0]!.hasAttribute('checked')).toBe(false);
    expect(player.copies.value[ids.nested]).toBeDefined();
    // The document the editor sent is untouched.
    expect(JSON.stringify(player.views.value)).toContain('"on":true');
  });

  it('selects a composed tab in its play copy, and per row in a repeated #view', async () => {
    const { root, player } = await play();
    const tab = (owner: string, which: string) => [
      ...root.querySelectorAll<HTMLElement>(
        `[data-kerf-node="${composedId(owner, which)}"]`,
      ),
    ];
    tab(ids.solo, ids.tabB)[0]!.click();
    await settled();
    expect(tab(ids.solo, ids.tabB)[0]!.dataset.selected).toBe('true');
    expect(tab(ids.solo, ids.tabA)[0]!.dataset.selected).toBe('false');
    expect(player.copies.value[ids.solo]).toBeDefined();
    // In a repeated #view, a tab selects for its row only.
    tab(ids.bound, ids.tabB)[1]!.click();
    await settled();
    expect(tab(ids.bound, ids.tabB)[1]!.dataset.selected).toBe('true');
    expect(tab(ids.bound, ids.tabB)[0]!.dataset.selected).toBe('false');
    expect(player.copies.value[ids.bound]).toBeUndefined();
  });

  it('closes a composed placed tab in its copy, or for its row', async () => {
    const { root, player } = await play();
    const tabs = (owner: string, which: string) => [
      ...root.querySelectorAll<HTMLElement>(
        `[data-kerf-node="${composedId(owner, which)}"]`,
      ),
    ];
    const close = (tab: HTMLElement) =>
      tab.querySelector<HTMLElement>('.kui-tab-bar-item__close')!.click();
    close(tabs(ids.solo, ids.tabB)[0]!);
    await settled();
    expect(tabs(ids.solo, ids.tabB)).toHaveLength(0);
    expect(JSON.stringify(player.copies.value[ids.solo])).not.toContain(
      ids.tabB,
    );
    // In a repeated #view it closes for its row only.
    close(tabs(ids.bound, ids.tabB)[1]!);
    await settled();
    expect(tabs(ids.bound, ids.tabB)).toHaveLength(1);
    // KF-HBRKFH: a repeated tab leaves its #view's items: here the param's
    // default, which the unset prop takes, set on the #view.
    close(tabs(ids.tabsView, ids.tabC)[0]!);
    await settled();
    expect(tabs(ids.tabsView, ids.tabC)).toHaveLength(0);
    expect(messages(player)).toContain('"tabs":[]');
  });

  it('switches a composed TabNavigator’s tab in its play copy', async () => {
    const { root, player } = await play();
    root
      .querySelector<HTMLElement>(
        `[data-kerf-node="${composedId(ids.navView, ids.nav)}"] [data-tab-scaffold-tab="search"]`,
      )!
      .click();
    await settled();
    expect(JSON.stringify(player.copies.value[ids.navView])).toContain(
      '"active":"search"',
    );
    expect(root.textContent).toContain('Search everything');
  });

  it('routes a Switch in a row inside a row to its own item', async () => {
    const { root } = await play();
    const grouped = () => switches(root, ids.grouped);
    expect(grouped()).toHaveLength(2);
    await toggle(grouped()[1]!);
    expect(grouped()[1]!.hasAttribute('checked')).toBe(true);
    // The other group's row with the same key keeps its own value.
    expect(grouped()[0]!.hasAttribute('checked')).toBe(false);
  });

  it('starts every #view over the document sent, and ignores an unknown node', async () => {
    const { root, player } = await play();
    const stray = document.createElement('div');
    stray.dataset.kerfNode = composedId(ids.solo, id(99));
    root.append(stray);
    player.copies.value = { ...player.copies.value };
    await settled();
    expect(() => stray.click()).not.toThrow();
  });
});

describe('play-time composition', () => {
  it('sets a row item’s field, leaving an item that is not an object', () => {
    const top = listDocument();
    const set = (field: string[], messages: unknown[]) =>
      setRowField(top, ids.bound, { [ids.bound]: 'm1' }, field, true, {
        messages,
      });
    expect(set(['meta', 'seen'], [{ id: 'm1', meta: {} }])).toEqual({
      messages: [{ id: 'm1', meta: { seen: true } }],
    });
    expect(set(['meta', 'seen'], [{ id: 'm1', meta: 'x' }])).toEqual({
      messages: [{ id: 'm1', meta: 'x' }],
    });
  });

  it('composes ids and finds a played node’s documents', () => {
    expect(topNode(composedId(ids.nested, ids.outerView))).toBe(ids.nested);
    const resolve = (path: string) =>
      views[path as keyof typeof views] as ViewDocument | undefined;
    const top = listDocument();
    const found = levelsOf(
      top,
      composedId(composedId(ids.nested, ids.outerView), ids.toggle),
      resolve,
    )!;
    expect(found.id).toBe(ids.toggle);
    expect(found.levels.map((level) => level.path)).toEqual([
      undefined,
      'outer.kui.json',
      'row.kui.json',
    ]);
    // A segment that is no #view, a document not sent, and a missing node.
    expect(levelsOf(top, composedId(ids.pane, ids.toggle), resolve)).toBe(
      undefined,
    );
    expect(
      levelsOf(top, composedId(ids.solo, ids.toggle), () => undefined),
    ).toBeUndefined();
    expect(
      levelsOf(top, composedId(ids.solo, id(99)), resolve),
    ).toBeUndefined();
  });

  it('marks a composed document with its #view’s rows', () => {
    const played = playedViews(listDocument());
    const view = JSON.stringify(played);
    expect(view).not.toContain(composedId(ids.pane, ''));
    const key = (played.root!.zones!.content![2] as { src: string }).src;
    const composed = playedView(key, viewCatalog, () => rowDocument());
    expect(composed.root!.id).toBe(composedId(ids.solo, ids.row));
    expect(composed.params).not.toHaveProperty('$kerfPlayRow0');
    // Every row design and condition plays with composed ids; a slot stays.
    const branches = playedViews(
      {
        schema: 'kerf-ui-document/v1',
        root: {
          id: ids.pane,
          type: '@kerfjs/ui:pane',
          zones: {
            content: [
              {
                $if: { $param: 'flag' },
                then: { id: ids.bar, type: '@kerfjs/ui:text' },
                else: { id: ids.tabA, type: '@kerfjs/ui:text' },
              },
              { $if: true, then: { id: ids.tabB, type: '@kerfjs/ui:text' } },
              { $slot: 'extra' },
            ],
          },
        },
      } as unknown as ViewDocument,
      ids.solo,
    );
    const text = JSON.stringify(branches);
    expect(text).toContain(composedId(ids.solo, ids.bar));
    expect(text).toContain(composedId(ids.solo, ids.tabA));
    expect(text).toContain(composedId(ids.solo, ids.tabB));
    expect(text).toContain('"$slot":"extra"');
    // A document with no root plays as it is.
    const empty = { schema: 'kerf-ui-document/v1' } as ViewDocument;
    expect(playedViews(empty, ids.solo)).toBe(empty);
  });

  it('scopes row props to a #view’s composed nodes', () => {
    const state = { every: {}, keys: { '["m1"]': { checked: true } } };
    const rows = {
      [ids.pane]: state,
      [composedId(ids.solo, ids.toggle)]: state,
      [composedId(composedId(ids.solo, ids.row), ids.toggle)]: state,
    };
    expect(rowsIn(rows, ids.solo)).toEqual({ [ids.toggle]: state });
    const next = rowsOut(rows, ids.solo, { [ids.bar]: state });
    expect(Object.keys(next).sort()).toEqual(
      [
        ids.pane,
        composedId(ids.solo, ids.bar),
        composedId(composedId(ids.solo, ids.row), ids.toggle),
      ].sort(),
    );
  });

  it('keeps a value it cannot trace on the node itself', () => {
    const top = listDocument();
    const resolve = (path: string) =>
      views[path as keyof typeof views] as ViewDocument;
    const record = (
      owner: string,
      own: string,
      key: string | undefined,
      value: unknown,
      document: ViewDocument = top,
      prop = 'checked',
    ) => {
      const full = composedId(owner, own);
      const { levels } = levelsOf(document, full, resolve)!;
      return recordComposedValue(levels, {}, full, own, key, prop, value, {});
    };
    // A bound row whose items cannot be traced keeps the value for its row.
    const bound = record(ids.bound, ids.toggle, 'm9', true);
    expect(bound.rows[composedId(ids.bound, ids.toggle)]).toBeDefined();
    // A $bind that does not read the row's own item, and an expression.
    const other = JSON.parse(JSON.stringify(top));
    other.root.zones.content[0].template.props.on = { $bind: 'flag' };
    other.root.zones.content[2].props.on = { $css: 'x' };
    expect(
      record(ids.bound, ids.toggle, 'm1', true, other).rows,
    ).toHaveProperty([composedId(ids.bound, ids.toggle)]);
    const css = record(ids.solo, ids.toggle, undefined, true, other);
    expect(css.copy?.owner).toBe(ids.solo);
    // A literal prop of the composed node changes in its copy, once.
    const label = record(ids.solo, ids.bar, undefined, 'Views', top, 'label');
    expect(label).toEqual({ document: top, rows: {} });
    const renamed = record(ids.solo, ids.bar, undefined, 'Tabs', top, 'label');
    expect(JSON.stringify(renamed.copy!.document)).toContain('"Tabs"');
    // In a row, a literal stays with the row.
    expect(
      record(ids.bound, ids.bar, 'm1', 'Tabs', top, 'label').rows,
    ).toHaveProperty([composedId(ids.bound, ids.bar)]);
    // A nested #view's literal equal to the value changes nothing.
    const nested = record(
      composedId(ids.nested, ids.outerView),
      ids.toggle,
      undefined,
      true,
    );
    expect(nested).toEqual({ document: top, rows: {} });
    const unchangedTop = record(ids.solo, ids.toggle, undefined, false);
    expect(unchangedTop).toEqual({ document: top, rows: {} });
    // A node repeated in its own document changes for its row.
    expect(
      record(ids.tabsView, ids.tabC, 'c', true, top, 'selected').rows,
    ).toHaveProperty([composedId(ids.tabsView, ids.tabC)]);
    // A repeated #view's node outside any row keeps it in the copy.
    expect(record(ids.bound, ids.toggle, undefined, true).copy?.owner).toBe(
      ids.bound,
    );
  });
});
