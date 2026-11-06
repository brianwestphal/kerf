// KF-HBRKFH: the play adapters that used to reach the top document only,
// inside a composed document (`#view`): the helpers that report a control by
// its `id` prop (Combobox, TagField, ColorPicker, ResizableRegion), TabBar
// reordering, a SplitView following the device, a NavStack starting at its
// root view, and closing a repeated tab whose items come from the `#view`'s
// props (docs/26-ui-editor.md §11.4).
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { findNode } from '../../../src/editor/model/document.js';
import { closingRow } from '../../../src/editor/model/play-values.js';
import {
  changedCopies,
  closeComposedRow,
  composedId,
  keysIn,
  levelsOf,
  playedComposed,
} from '../../../src/editor/model/play-views.js';
import { PLAY_DOCUMENT, playPageUrl } from '../../../src/editor/player.js';
import { createEditor } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
  window.history.replaceState(null, '', '/');
});

const id = (n: number) => `01JD0V1EW0000000000000${String(n).padStart(4, '0')}`;
const node = (n: number, type: string, props: object, zones?: object) => ({
  id: id(n),
  type: `@kerfjs/ui:${type}`,
  props,
  ...(zones ? { zones } : {}),
});
const view = (n: number, src: string, props?: object) => ({
  id: id(n),
  type: '#view',
  src,
  ...(props ? { props } : {}),
});
const document_ = (name: string, content: object[], params?: object) =>
  ({
    schema: 'kerf-ui-document/v1',
    name,
    catalogs: ['@kerfjs/ui'],
    ...(params ? { params } : {}),
    root: {
      id: id(name.length * 10),
      type: '@kerfjs/ui:pane',
      zones: { content },
    },
  }) as unknown as ViewDocument;
const items = (...keys: string[]) => keys.map((key) => ({ id: key }));
const listParam = (fallback: object[]) => ({
  type: {
    kind: 'array',
    items: {
      kind: 'object',
      props: [{ name: 'id', type: { kind: 'string' }, required: true }],
    },
  },
  default: fallback,
});
const choices = (...values: string[]) =>
  values.map((value) => ({ value, label: value.toUpperCase() }));

const ids = {
  city: 101,
  labels: 102,
  tint: 103,
  region: 104,
  bar: 106,
  tabA: 107,
  tabB: 108,
  split: 109,
  stack: 113,
  tabs: 201,
  tab: 202,
  inner: 301,
  kit: 401,
  kits: 402,
  param: 403,
  literal: 404,
  nested: 405,
  nestedLiteral: 406,
  bound: 407,
};

/** Every control a helper reports by its `id` prop, and the layouts. */
const kit = () =>
  document_('Kit', [
    node(ids.city, 'combobox', {
      id: 'city',
      label: 'City',
      suggestions: choices('oslo', 'rome'),
    }),
    node(ids.labels, 'tag-field', {
      id: 'labels',
      label: 'Labels',
      tags: ['a'],
    }),
    node(ids.tint, 'color-picker', {
      id: 'tint',
      label: 'Tint',
      value: '#ff0000',
    }),
    node(
      ids.region,
      'resize',
      { id: 'region', label: 'Region', size: 200, min: 100, max: 400 },
      { children: [node(105, 'text', { children: 'Region body' })] },
    ),
    node(
      ids.bar,
      'tab-bar',
      { id: 'bar', label: 'Files' },
      {
        tabs: [
          node(ids.tabA, 'tabs', {
            id: 'a',
            name: 'A',
            selected: true,
            draggable: true,
          }),
          node(ids.tabB, 'tabs', { id: 'b', name: 'B', draggable: true }),
        ],
      },
    ),
    node(
      ids.split,
      'split-view',
      { id: 'split', label: 'Split', listTitle: 'Items', detailTitle: 'Item' },
      {
        list: [
          node(
            110,
            'list',
            { ariaLabel: 'Items' },
            {
              children: [
                node(111, 'list-item', { label: 'One', action: 'pick' }),
              ],
            },
          ),
        ],
        detail: [node(112, 'text', { children: 'Detail body' })],
      },
    ),
    node(
      ids.stack,
      'nav-stack',
      {
        id: 'stack',
        label: 'Stack',
        views: [
          { key: 'home', toolbar: { title: 'Home' } },
          { key: 'more', toolbar: { title: 'More' } },
        ],
      },
      {
        'views.0.content': [node(114, 'text', { children: 'Home body' })],
        'views.1.content': [node(115, 'text', { children: 'More body' })],
      },
    ),
  ]);

/** A TabBar of closable tabs repeated from its `tabs` param. */
const tabs = () =>
  document_(
    'Tabs',
    [
      node(
        ids.tabs,
        'tab-bar',
        { id: 'more', label: 'More' },
        {
          tabs: [
            {
              $each: { $param: 'tabs' },
              as: 'tab',
              key: 'tab.id',
              template: node(ids.tab, 'tabs', {
                id: { $bind: 'tab.id' },
                name: { $bind: 'tab.id' },
                closable: true,
              }),
            },
          ],
        },
      ),
    ],
    { tabs: listParam(items('c')) },
  );

/** Composes the tabs, passing its own `tabs` param down. */
const outer = () =>
  document_(
    'Outer',
    [view(ids.inner, './tabs.kui.json', { tabs: { $param: 'tabs' } })],
    {
      tabs: listParam(items('n1', 'n2')),
    },
  );

/** Composes the tabs with a literal list. */
const outerLiteral = () =>
  document_('OuterLiteral', [
    view(ids.inner, './tabs.kui.json', { tabs: items('p1', 'p2') }),
  ]);

const views = {
  'kit.kui.json': kit(),
  'tabs.kui.json': tabs(),
  'outer.kui.json': outer(),
  'outer-literal.kui.json': outerLiteral(),
};

const top = () =>
  document_(
    'Top',
    [
      view(ids.kit, './kit.kui.json'),
      {
        $each: { $param: 'messages' },
        as: 'message',
        key: 'message.id',
        template: view(ids.kits, './kit.kui.json'),
      },
      view(ids.param, './tabs.kui.json', { tabs: { $param: 'myTabs' } }),
      view(ids.literal, './tabs.kui.json', { tabs: items('x', 'y') }),
      view(ids.nested, './outer.kui.json'),
      view(ids.nestedLiteral, './outer-literal.kui.json'),
      view(ids.bound, './tabs.kui.json', { tabs: { $bind: 'myTabs' } }),
    ],
    {
      messages: listParam(items('m1', 'm2')),
      myTabs: listParam(items('q1', 'q2')),
    },
  );

const settled = () =>
  new Promise((resolve) => globalThis.setTimeout(resolve, 0));

/** happy-dom's own window controls. */
const { happyDOM } = window as unknown as {
  happyDOM: { setViewport(size: { width: number; height: number }): void };
};

/** The play page over the top document, sent with the composed ones. */
const play = async () => {
  window.history.replaceState(null, '', playPageUrl(location.href));
  const root = document.createElement('div');
  document.body.append(root);
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
      data: { type: PLAY_DOCUMENT, document: top(), views },
      origin: location.origin,
      source: window,
    }),
  );
  await settled();
  /** The elements composed node `n` of `#view` `owner` renders. */
  const at = (owner: number, n: number) => [
    ...root.querySelectorAll<HTMLElement>(
      `[data-kerf-node="${composedId(id(owner), id(n))}"]`,
    ),
  ];
  /** Node `n`'s props in `#view` `owner`'s play copy. */
  const copied = (owner: number, n: number) =>
    findNode(player.copies.value[id(owner)]!, id(n))!.node.props ?? {};
  /** `#view` `n`'s props in the top play document. */
  const topProps = (n: number) =>
    findNode(player.document.value, id(n))!.node.props ?? {};
  return { root, player, at, copied, topProps };
};

const key = (target: Element, name: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true, ...init }),
  );

describe('composed controls reported by their id prop', () => {
  it('records a Combobox commit in its copy, and per row in a repeated #view', async () => {
    const { at, copied, root } = await play();
    const commit = async (field: HTMLInputElement, text: string) => {
      field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      field.focus();
      field.value = text;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      key(field, 'Enter');
      await settled();
    };
    const fields = () =>
      [ids.kit, ids.kits].flatMap((owner) =>
        at(owner, ids.city).map((city) => city.querySelector('input')!),
      );
    expect(fields()).toHaveLength(3);
    await commit(fields()[0]!, 'ROME');
    expect(copied(ids.kit, ids.city).value).toBe('rome');
    // The second row's field: the row keeps its own value.
    await commit(fields()[2]!, 'OSLO');
    // KF-EP2152: the composed rows are keyed, so the row is morphed in place
    // and its focused field keeps both focus and the typed text; the
    // rendered value is the committed one, and only that row has it.
    const [, first, second] = fields();
    expect(document.activeElement).toBe(second);
    expect(second!.getAttribute('value')).toBe('oslo');
    expect(first!.getAttribute('value') ?? '').toBe('');
    expect(first!.value).toBe('');
    expect(root.textContent).toContain('City');
  });

  it('records a TagField and a ColorPicker change in the copy that holds it', async () => {
    const { at, copied } = await play();
    const editor = at(ids.kit, ids.labels)[0]!.querySelector<HTMLElement>(
      '[data-tag-field-editor]',
    )!;
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    const span =
      editor.querySelector<HTMLElement>(
        '[data-search-field-text]:last-of-type',
      ) ?? editor;
    span.textContent = 'b';
    editor.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
    );
    key(editor, 'Enter', { cancelable: true });
    await settled();
    expect(copied(ids.kit, ids.labels).tags).toEqual(['a', 'b']);
    const area = at(ids.kit, ids.tint)[0]!.querySelector<HTMLElement>(
      '.kui-color-picker__area',
    )!;
    key(area, 'ArrowLeft', { shiftKey: true, cancelable: true });
    area.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }),
    );
    await settled();
    expect(copied(ids.kit, ids.tint).value).not.toBe('#ff0000');
  });

  it('resizes a composed region and reorders a composed TabBar in its copy', async () => {
    const { at, copied, player } = await play();
    const handle = at(ids.kit, ids.region)[0]!.querySelector(
      '[data-kui-resize-handle]',
    )!;
    handle.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    key(handle, 'End');
    await settled();
    expect(copied(ids.kit, ids.region).size).toBe(400);
    const tab = at(ids.kit, ids.tabA)[0]!.querySelector('[role="tab"]')!;
    tab.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    key(tab, 'ArrowRight', { altKey: true, shiftKey: true });
    await settled();
    const text = JSON.stringify(player.copies.value[id(ids.kit)]);
    expect(text.indexOf(id(ids.tabB))).toBeLessThan(text.indexOf(id(ids.tabA)));
    // The document the editor sent is untouched.
    const sent = JSON.stringify(player.views.value['kit.kui.json']);
    expect(sent.indexOf(id(ids.tabA))).toBeLessThan(sent.indexOf(id(ids.tabB)));
  });
});

describe('controls no node renders', () => {
  it('records nothing for an id no node of its kind renders', async () => {
    const { at, player, root } = await play();
    const before = player.copies.value;
    // Copies of rendered controls, under new ids and no node of their own,
    // inside the composed document's root node (an app's own markup).
    const host = root.querySelector(
      `[data-kerf-node="${composedId(id(ids.kit), id(30))}"]`,
    )!;
    const ghost = (element: HTMLElement, attribute: string, value: string) => {
      const copy = element.cloneNode(true) as HTMLElement;
      for (const marked of [copy, ...copy.querySelectorAll('[data-kerf-node]')])
        marked.removeAttribute('data-kerf-node');
      (copy.matches(`[${attribute}]`)
        ? copy
        : copy.querySelector(`[${attribute}]`)!
      ).setAttribute(attribute, value);
      host.append(copy);
      return copy;
    };
    // Nothing touched yet: the TagField is the first with its id.
    const tags = ghost(at(ids.kit, ids.labels)[0]!, 'data-tag-field-id', 'x');
    const editor = tags.querySelector<HTMLElement>('[data-tag-field-editor]')!;
    editor.textContent = 'b';
    editor.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
    );
    key(editor, 'Enter', { cancelable: true });
    const city = ghost(at(ids.kit, ids.city)[0]!, 'data-combobox-id', 'x');
    const field = city.querySelector('input')!;
    field.focus();
    field.value = 'ROME';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    key(field, 'Enter');
    const region = ghost(at(ids.kit, ids.region)[0]!, 'data-region-id', 'x');
    await settled();
    key(region.querySelector('[data-kui-resize-handle]')!, 'End');
    const bar = ghost(at(ids.kit, ids.bar)[0]!, 'data-tab-bar-id', 'x');
    key(bar.querySelector('[role="tab"]')!, 'ArrowRight', {
      altKey: true,
      shiftKey: true,
    });
    await settled();
    expect(player.copies.value).toBe(before);
  });
});

describe('composed layouts', () => {
  it('starts a composed NavStack at its root view', async () => {
    const { copied, root } = await play();
    expect(copied(ids.kit, ids.stack).views).toEqual([
      { key: 'home', toolbar: { title: 'Home' } },
    ]);
    expect(root.textContent).toContain('Home body');
    expect(root.textContent).not.toContain('More body');
  });

  it('follows the device into compact in every composed SplitView', async () => {
    const width = window.innerWidth;
    happyDOM.setViewport({ width: 390, height: 800 });
    try {
      const { at, copied } = await play();
      expect(copied(ids.kit, ids.split).compact).toBe(true);
      expect(copied(ids.kits, ids.split).compact).toBe(true);
      await settled();
      expect(at(ids.kit, ids.split)[0]!.dataset.splitMode).toBe('compact');
    } finally {
      happyDOM.setViewport({ width, height: 768 });
    }
  });
});

describe('closing a repeated composed tab', () => {
  const close = async (tab: HTMLElement) => {
    tab.querySelector<HTMLElement>('.kui-tab-bar-item__close')!.click();
    await settled();
  };

  it('closes through a $param in the top param, and a literal in the top document', async () => {
    const { at, topProps } = await play();
    expect(at(ids.param, ids.tab)).toHaveLength(2);
    await close(at(ids.param, ids.tab)[0]!);
    expect(at(ids.param, ids.tab).map((tab) => tab.dataset.key)).toEqual([
      'q2',
    ]);
    // The $bind one shows the same param's items, closed with it.
    expect(at(ids.bound, ids.tab).map((tab) => tab.dataset.key)).toEqual([
      'q2',
    ]);
    // A selected literal tab hands its selection to its neighbor.
    at(ids.literal, ids.tab)[0]!.click();
    await settled();
    expect(at(ids.literal, ids.tab)[0]!.dataset.selected).toBe('true');
    await close(at(ids.literal, ids.tab)[0]!);
    expect(topProps(ids.literal).tabs).toEqual(items('y'));
    expect(at(ids.literal, ids.tab)[0]!.dataset.selected).toBe('true');
  });

  it('closes through a nested #view: an unset prop on top, a literal in its copy', async () => {
    const { at, player, topProps } = await play();
    const nested = composedId(id(ids.nested), id(ids.inner));
    const tabsOf = (owner: string) => [
      ...document.querySelectorAll<HTMLElement>(
        `[data-kerf-node="${composedId(owner, id(ids.tab))}"]`,
      ),
    ];
    await close(tabsOf(nested)[0]!);
    expect(topProps(ids.nested).tabs).toEqual(items('n2'));
    const literal = composedId(id(ids.nestedLiteral), id(ids.inner));
    await close(tabsOf(literal)[1]!);
    expect(
      findNode(player.copies.value[id(ids.nestedLiteral)]!, id(ids.inner))!.node
        .props?.tabs,
    ).toEqual(items('p1'));
    expect(tabsOf(literal).map((tab) => tab.dataset.key)).toEqual(['p1']);
    // A $bind is not traced: its tabs stay.
    expect(at(ids.bound, ids.tab)).toHaveLength(2);
    await close(at(ids.bound, ids.tab)[0]!);
    expect(at(ids.bound, ids.tab)).toHaveLength(2);
  });
});

describe('composed play helpers', () => {
  const resolve = (path: string) =>
    views[path as keyof typeof views] as ViewDocument | undefined;

  it('lists every #view a played document reaches', () => {
    const found = playedComposed(top(), resolve);
    expect(found.map(({ owner }) => owner)).toEqual([
      id(ids.kit),
      id(ids.kits),
      id(ids.param),
      id(ids.literal),
      id(ids.nested),
      composedId(id(ids.nested), id(ids.inner)),
      id(ids.nestedLiteral),
      composedId(id(ids.nestedLiteral), id(ids.inner)),
      id(ids.bound),
    ]);
    // A document not sent, and a cycle, add nothing.
    expect(playedComposed(top(), () => undefined)).toEqual([]);
    const loop = document_('Loop', [view(1, './loop.kui.json')]);
    expect(playedComposed(loop, () => loop)).toHaveLength(1);
    // A change that changes nothing makes no copy.
    expect(changedCopies(top(), resolve, (document) => document)).toEqual({});
  });

  it('scopes row keys to the nodes a #view composes', () => {
    const owner = id(ids.nested);
    expect(
      keysIn(
        {
          [id(ids.tab)]: 'top',
          [composedId(owner, id(ids.tab))]: 'own',
          [composedId(composedId(owner, id(ids.inner)), id(ids.tab))]: 'deeper',
        },
        owner,
      ),
    ).toEqual({ [id(ids.tab)]: 'own' });
  });

  it('closes nothing it cannot trace', () => {
    const levels = (document: ViewDocument, owner: string) =>
      levelsOf(document, composedId(owner, id(ids.tab)), resolve)!.levels;
    const close = (
      document: ViewDocument,
      owner: string,
      keys: Record<string, string>,
      params: Record<string, unknown> = {},
    ) =>
      closeComposedRow(
        levels(document, owner),
        {},
        composedId(owner, id(ids.tab)),
        id(ids.tab),
        keys,
        params,
      );
    const row = { [id(ids.tab)]: 'q1' };
    // No row key, a param whose value is not a list, and a missing key.
    expect(close(top(), id(ids.param), {})).toBeUndefined();
    expect(
      close(top(), id(ids.param), row, { myTabs: 'none' }),
    ).toBeUndefined();
    expect(
      close(top(), id(ids.literal), { [id(ids.tab)]: 'zz' })?.document,
    ).toBeDefined();
    // A #view repeated in its rows shares its literal props with them all.
    const repeated = document_(
      'Repeated',
      [
        {
          $each: { $param: 'messages' },
          as: 'message',
          key: 'message.id',
          template: view(ids.kits, './tabs.kui.json', { tabs: items('r1') }),
        },
      ],
      { messages: listParam(items('m1')) },
    );
    expect(
      close(repeated, id(ids.kits), { [id(ids.tab)]: 'r1' }),
    ).toBeUndefined();
    // A nested #view whose list is not one.
    const broken = { ...outerLiteral() };
    (
      broken.root!.zones!.content![0] as { props: Record<string, unknown> }
    ).props.tabs = 'none';
    const owner = composedId(id(ids.nestedLiteral), id(ids.inner));
    expect(
      closeComposedRow(
        levelsOf(top(), composedId(owner, id(ids.tab)), (path, at) =>
          at === id(ids.nestedLiteral) ? broken : resolve(path),
        )!.levels,
        {},
        composedId(owner, id(ids.tab)),
        id(ids.tab),
        { [id(ids.tab)]: 'p1' },
        {},
      ),
    ).toBeUndefined();
    // A tab that is not repeated has no row to close.
    expect(closingRow(kit(), id(ids.tabA), {})).toBeUndefined();
  });
});
