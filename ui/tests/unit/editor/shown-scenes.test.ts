// KF-YZPBFH: the canvas shows the tab that holds the selected node; the
// document keeps the tab it opens on.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import {
  embeddedDialogs,
  embeddedPopup,
  shownScenes,
  submenuPath,
} from '../../../src/editor/model/shown-scenes.js';
import { createEditor } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

const ids = {
  pane: '01JB8Z1M6Q8E1X9V4S7K2R3T7A',
  tabs: '01JB8Z1M6Q8E1X9V4S7K2R3T7B',
  first: '01JB8Z1M6Q8E1X9V4S7K2R3T7C',
  second: '01JB8Z1M6Q8E1X9V4S7K2R3T7D',
  inner: '01JB8Z1M6Q8E1X9V4S7K2R3T7E',
  icon: '01JB8Z1M6Q8E1X9V4S7K2R3T7F',
};

const spacer = (id: string) => ({ id, type: '@kerfjs/ui:spacer' });

/** A Pane holding a TabNavigator whose second tab holds a ContentItem. */
const sample = () =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Tabs',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: ids.pane,
      type: '@kerfjs/ui:pane',
      zones: {
        content: [
          {
            id: ids.tabs,
            type: '@kerfjs/ui:tab-navigator',
            props: {
              id: 'sections',
              label: 'Sections',
              tabs: [
                { id: 'one', label: 'One' },
                { id: 'two', label: 'Two' },
              ],
              active: 'one',
            },
            zones: {
              'tabs.0.content': [spacer(ids.first)],
              'tabs.1.content': [
                {
                  id: ids.second,
                  type: '@kerfjs/ui:content-item',
                  zones: { children: [spacer(ids.inner)] },
                },
              ],
              'tabs.1.icon': [spacer(ids.icon)],
            },
          },
        ],
      },
    },
  }) as unknown as ViewDocument;

const activeOf = (document: ViewDocument) =>
  (
    document.root!.zones!.content![0] as unknown as {
      props: { active: string };
    }
  ).props.active;

describe('the scene the canvas shows', () => {
  it('shows the tab whose content holds the selected node, at any depth', () => {
    const document = sample();
    expect(activeOf(shownScenes(document, ids.second))).toBe('two');
    expect(activeOf(shownScenes(document, ids.inner))).toBe('two');
    // The document itself keeps the tab it opens on.
    expect(activeOf(document)).toBe('one');
  });

  it('leaves the document alone otherwise', () => {
    const document = sample();
    // Nothing selected, the navigator itself, a node in the active tab, and
    // a tab's icon (which shows in the bar whatever the tab).
    for (const selected of [undefined, ids.tabs, ids.first, ids.icon, 'gone'])
      expect(shownScenes(document, selected)).toBe(document);
  });

  it('previews the selected node’s tab and exports the document’s', () => {
    const root = globalThis.document.createElement('div');
    globalThis.document.body.append(root);
    const editor = createEditor();
    const stopMount = mount(root, editor.render);
    const unwireEditor = editor.wire(root);
    cleanup = () => {
      unwireEditor();
      stopMount();
    };
    editor.document.value = sample();
    const scene = (id: string) =>
      root
        .querySelector(`[data-editor-canvas] [data-kerf-node="${id}"]`)!
        .closest('.kui-tab-scaffold__scene')!;
    expect(scene(ids.first).getAttribute('data-active')).toBe('true');
    editor.selection.value = { kind: 'node', id: ids.inner };
    expect(scene(ids.second).getAttribute('data-active')).toBe('true');
    expect(scene(ids.first).getAttribute('data-active')).toBe('false');
    expect(activeOf(editor.document.value)).toBe('one');
    editor.selection.value = { kind: 'node', id: ids.tabs };
    expect(scene(ids.first).getAttribute('data-active')).toBe('true');
  });
});

// KF-RMZ2NP: Show this view cuts a NavStack back to a lower view on the
// canvas only.
describe('the NavStack view the canvas shows', () => {
  const STACK = '01JB8Z1M6Q8E1X9V4S7K2R3T7G';
  const stackDocument = () =>
    ({
      schema: 'kerf-ui-document/v1',
      name: 'Stack',
      catalogs: ['@kerfjs/ui'],
      root: {
        id: STACK,
        type: '@kerfjs/ui:nav-stack',
        props: {
          id: 'stack',
          label: 'Stack',
          views: [
            { key: 'library', content: { $slot: 'libraryContent' } },
            { key: 'project', content: { $slot: 'projectContent' } },
          ],
        },
        zones: {
          'views.1.toolbar.trailing': [spacer('01JB8Z1M6Q8E1X9V4S7K2R3T7H')],
        },
      },
    }) as unknown as ViewDocument;
  const views = (document: ViewDocument) =>
    (document.root!.props!.views as { key: string }[]).map(({ key }) => key);

  it('cuts the stack back to the chosen view and drops later zones', () => {
    const document = stackDocument();
    const shown = shownScenes(document, undefined, new Map([[STACK, 0]]));
    expect(views(shown)).toEqual(['library']);
    expect(shown.root!.zones).toEqual({});
    expect(views(document)).toEqual(['library', 'project']);
  });

  it('ignores the top view, an index out of range, and a non-stack', () => {
    const document = stackDocument();
    for (const index of [1, 2, -1, 0.5])
      expect(shownScenes(document, undefined, new Map([[STACK, index]]))).toBe(
        document,
      );
    expect(shownScenes(document, undefined, new Map([['nope', 0]]))).toBe(
      document,
    );
  });

  it('cuts a stack with no zones', () => {
    const document = stackDocument();
    delete (document.root as { zones?: unknown }).zones;
    expect(
      views(shownScenes(document, undefined, new Map([[STACK, 0]]))),
    ).toEqual(['library']);
  });

  it('offers no views for a stack whose views are a param', () => {
    const root = globalThis.document.createElement('div');
    globalThis.document.body.append(root);
    const editor = createEditor();
    const stopMount = mount(root, editor.render);
    const unwireEditor = editor.wire(root);
    cleanup = () => {
      unwireEditor();
      stopMount();
    };
    const document = stackDocument() as unknown as {
      params: Record<string, unknown>;
      root: { props: Record<string, unknown> };
    };
    document.params = {
      stackViews: {
        type: { kind: 'ref', ref: 'NavStackView[]' },
      },
    };
    document.root.props.views = { $param: 'stackViews' };
    editor.document.value = document as unknown as ViewDocument;
    editor.selection.value = { kind: 'node', id: STACK };
    expect(root.querySelector('[data-editor-shown-view]')).toBeNull();
  });

  it('shows a chosen view from the Flow area, and the top view again', () => {
    const root = globalThis.document.createElement('div');
    globalThis.document.body.append(root);
    const editor = createEditor();
    const stopMount = mount(root, editor.render);
    const unwireEditor = editor.wire(root);
    cleanup = () => {
      unwireEditor();
      stopMount();
    };
    editor.document.value = stackDocument();
    editor.selection.value = { kind: 'node', id: STACK };
    const row = (index: number) =>
      root.querySelector<HTMLElement>(
        `[data-editor-show-view='${JSON.stringify({ id: STACK, index })}']`,
      )!;
    const shownView = () =>
      root.querySelector<HTMLElement>('[data-editor-shown-view]')!.dataset
        .editorShownView;
    const canvasViews = () =>
      root.querySelectorAll('[data-editor-canvas] .kui-nav-stack__view').length;
    expect(shownView()).toBe('1');
    expect(canvasViews()).toBe(2);
    row(0).click();
    expect(shownView()).toBe('0');
    expect(canvasViews()).toBe(1);
    expect(views(editor.document.value)).toEqual(['library', 'project']);
    row(1).click();
    expect(shownView()).toBe('1');
    expect(canvasViews()).toBe(2);
  });
});

// KF-SYGSD0: a modal DialogSurface renders nothing while closed, so the edit
// canvas shows every one embedded; the document keeps its presentation.
describe('dialogs on the edit canvas', () => {
  const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3TBA';
  const DIALOG = '01JB8Z1M6Q8E1X9V4S7K2R3TBB';
  const DONE = '01JB8Z1M6Q8E1X9V4S7K2R3TBC';
  const withDialog = (presentation?: string) =>
    ({
      schema: 'kerf-ui-document/v1',
      name: 'Settings',
      catalogs: ['@kerfjs/ui'],
      root: {
        id: PANE,
        type: '@kerfjs/ui:pane',
        zones: {
          content: [
            {
              id: DIALOG,
              type: '@kerfjs/ui:surface-scaffold',
              props: {
                id: 'settings',
                label: 'Settings',
                ...(presentation ? { presentation } : {}),
              },
              zones: {
                children: [
                  {
                    id: DONE,
                    type: '@kerfjs/ui:button',
                    props: {
                      children: 'Done',
                      rootAttributes: { 'data-dialog-close': '' },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    }) as unknown as ViewDocument;
  const presentationOf = (document: ViewDocument) =>
    (
      document.root!.zones!.content![0] as unknown as {
        props: { presentation?: string };
      }
    ).props.presentation;

  it('shows every DialogSurface embedded and leaves the document alone', () => {
    for (const authored of [undefined, 'modal', 'side-sheet', 'bottom-sheet']) {
      const document = withDialog(authored);
      expect(presentationOf(embeddedDialogs(document))).toBe('embedded');
      expect(presentationOf(document)).toBe(authored);
    }
    const embedded = withDialog('embedded');
    expect(embeddedDialogs(embedded)).toBe(embedded);
    // KF-RWJ9KD: the composed dialogs take `embedded`.
    for (const type of [
      '@kerfjs/ui:workbench-dialog',
      '@kerfjs/ui:list-detail-dialog',
    ]) {
      const composed = {
        ...withDialog(),
        root: { id: PANE, type, props: { id: 'composed' } },
      } as unknown as ViewDocument;
      expect(embeddedDialogs(composed).root!.props?.embedded).toBe(true);
      expect(composed.root!.props?.embedded).toBeUndefined();
      const already = {
        ...composed,
        root: { ...composed.root, props: { id: 'composed', embedded: true } },
      } as unknown as ViewDocument;
      expect(embeddedDialogs(already)).toBe(already);
    }
    // KF-T1V86Q: a PopoverDialogSurface is embedded the same way.
    const popover = {
      ...withDialog(),
      root: {
        id: PANE,
        type: '@kerfjs/ui:surface-scaffold#PopoverDialogSurface',
        props: { label: 'Request', dismiss: 'manual' },
      },
    } as unknown as ViewDocument;
    expect(embeddedDialogs(popover).root!.props?.presentation).toBe('embedded');
    expect(popover.root!.props?.presentation).toBeUndefined();
    expect(embeddedDialogs(sample())).toEqual(sample());
  });

  it('renders the dialog open in flow on the canvas, where its content is selectable', () => {
    const root = globalThis.document.createElement('div');
    globalThis.document.body.append(root);
    const editor = createEditor();
    const stopMount = mount(root, editor.render);
    const unwireEditor = editor.wire(root);
    cleanup = () => {
      unwireEditor();
      stopMount();
    };
    editor.document.value = withDialog('side-sheet');
    const canvas = root.querySelector('[data-editor-canvas]')!;
    const dialog = canvas.querySelector<HTMLDialogElement>('dialog#settings')!;
    expect(dialog.open).toBe(true);
    expect(dialog.dataset.presentation).toBe('embedded');
    const done = canvas.querySelector<HTMLElement>(
      `[data-kerf-node="${DONE}"]`,
    )!;
    // Pressing its data-dialog-close control on the canvas selects it and
    // leaves the dialog shown.
    done.click();
    expect(dialog.open).toBe(true);
    expect(editor.selection.value).toEqual({ kind: 'node', id: DONE });
    // The authored presentation is what the Inspector and export keep.
    expect(presentationOf(editor.document.value)).toBe('side-sheet');
  });
});

// KF-KN9CPE: a PopupMenu or Select shows only its trigger until something
// opens it, so the edit canvas shows the selected one's rows open at it;
// the document keeps the authored props and play mode the real popup.
describe('popups on the edit canvas', () => {
  const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3TCA';
  const MENU = '01JB8Z1M6Q8E1X9V4S7K2R3TCB';
  const SELECT = '01JB8Z1M6Q8E1X9V4S7K2R3TCC';
  const withPopups = (embedded?: boolean) =>
    ({
      schema: 'kerf-ui-document/v1',
      name: 'Popups',
      catalogs: ['@kerfjs/ui'],
      root: {
        id: PANE,
        type: '@kerfjs/ui:pane',
        zones: {
          content: [
            {
              id: MENU,
              type: '@kerfjs/ui:popup-menu',
              props: {
                text: 'Sort',
                items: [
                  { label: 'Newest', action: 'sort-newest' },
                  { label: 'Oldest', action: 'sort-oldest' },
                ],
                ...(embedded === undefined ? {} : { embedded }),
              },
            },
            {
              id: SELECT,
              type: '@kerfjs/ui:select',
              props: {
                name: 'size',
                label: 'Size',
                value: 'm',
                choices: [
                  { value: 's', label: 'Small' },
                  { value: 'm', label: 'Medium' },
                ],
              },
            },
          ],
        },
      },
    }) as unknown as ViewDocument;
  const propsOf = (document: ViewDocument, index: number) =>
    (
      document.root!.zones!.content![index] as unknown as {
        props: { embedded?: boolean };
      }
    ).props;

  it('embeds only the selected PopupMenu or Select and leaves the document alone', () => {
    const document = withPopups();
    const menu = embeddedPopup(document, MENU);
    expect(propsOf(menu, 0).embedded).toBe(true);
    expect(propsOf(menu, 1).embedded).toBeUndefined();
    const select = embeddedPopup(document, SELECT);
    expect(propsOf(select, 0).embedded).toBeUndefined();
    expect(propsOf(select, 1).embedded).toBe(true);
    expect(propsOf(document, 0).embedded).toBeUndefined();
    expect(propsOf(document, 1).embedded).toBeUndefined();
    // Nothing selected, another node, an unknown id, or an already-embedded
    // menu: the same document.
    expect(embeddedPopup(document, undefined)).toBe(document);
    expect(embeddedPopup(document, PANE)).toBe(document);
    expect(embeddedPopup(document, '01JB8Z1M6Q8E1X9V4S7K2R3TCZ')).toBe(
      document,
    );
    const already = withPopups(true);
    expect(embeddedPopup(already, MENU)).toBe(already);
  });

  // KF-M2FGPQ: a field place inside an item's submenu opens that submenu.
  it('maps an items field place to the submenu path it lies inside', () => {
    expect(submenuPath([])).toEqual([]);
    expect(submenuPath([2])).toEqual([]);
    expect(submenuPath([2, 'label'])).toEqual([]);
    expect(submenuPath([2, 'submenu'])).toEqual([2]);
    expect(submenuPath([2, 'submenu', 0, 'label'])).toEqual([2]);
    expect(submenuPath([2, 'submenu', 1, 'submenu'])).toEqual([2, 1]);
    expect(submenuPath([2, 'submenu', 1, 'submenu', 0])).toEqual([2, 1]);
    expect(submenuPath(['submenu', 2])).toEqual([]);
  });

  it("opens the submenu of the selected PopupMenu's edited item", () => {
    const document = withPopups();
    const submenuOf = (shown: ViewDocument, index: number) =>
      (propsOf(shown, index) as { embeddedSubmenu?: number[] }).embeddedSubmenu;
    const inside = { prop: 'items', path: [1, 'submenu', 0] };
    const shown = embeddedPopup(document, MENU, inside);
    expect(propsOf(shown, 0).embedded).toBe(true);
    expect(submenuOf(shown, 0)).toEqual([1]);
    // Already embedded, it still opens the submenu.
    expect(submenuOf(embeddedPopup(withPopups(true), MENU, inside), 0)).toEqual(
      [1],
    );
    // A place outside a submenu, another prop, or a Select: no submenu.
    expect(
      submenuOf(embeddedPopup(document, MENU, { prop: 'items', path: [1] }), 0),
    ).toBeUndefined();
    expect(
      submenuOf(
        embeddedPopup(document, MENU, { prop: 'other', path: [1, 'submenu'] }),
        0,
      ),
    ).toBeUndefined();
    expect(
      submenuOf(
        embeddedPopup(document, SELECT, {
          prop: 'items',
          path: [1, 'submenu'],
        }),
        1,
      ),
    ).toBeUndefined();
    expect(submenuOf(document, 0)).toBeUndefined();
  });

  it('shows the selected popup open on the canvas, and its rows only select', () => {
    const root = globalThis.document.createElement('div');
    globalThis.document.body.append(root);
    const editor = createEditor();
    const stopMount = mount(root, editor.render);
    const unwireEditor = editor.wire(root);
    cleanup = () => {
      unwireEditor();
      stopMount();
    };
    editor.document.value = withPopups();
    const canvas = root.querySelector('[data-editor-canvas]')!;
    const menuNode = () =>
      canvas.querySelector<HTMLElement>(`[data-kerf-node="${MENU}"]`)!;
    const selectNode = () =>
      canvas.querySelector<HTMLElement>(`[data-kerf-node="${SELECT}"]`)!;
    // Closed until selected.
    expect(menuNode().hasAttribute('data-embedded')).toBe(false);
    expect(selectNode().hasAttribute('data-embedded')).toBe(false);
    editor.selection.value = { kind: 'node', id: MENU };
    expect(menuNode().hasAttribute('data-embedded')).toBe(true);
    const menu = menuNode().querySelector('.kui-popup-menu__menu')!;
    expect(menu.hasAttribute('popover')).toBe(false);
    expect(
      [...menu.querySelectorAll('.kui-popup-menu__item')].map(
        (item) => item.textContent,
      ),
    ).toEqual(['Newest', 'Oldest']);
    // Its rows carry no data-action, and a click on one selects the menu.
    expect(menu.querySelector('[data-action]')).toBeNull();
    menu.querySelector<HTMLElement>('.kui-popup-menu__item')!.click();
    expect(editor.selection.value).toEqual({ kind: 'node', id: MENU });
    expect(menuNode().hasAttribute('data-embedded')).toBe(true);
    // Selecting the Select closes the menu and opens the Select's listbox.
    editor.selection.value = { kind: 'node', id: SELECT };
    expect(menuNode().hasAttribute('data-embedded')).toBe(false);
    expect(selectNode().hasAttribute('data-embedded')).toBe(true);
    const popup = selectNode().querySelector('.kui-select__popup')!;
    expect(popup.hasAttribute('popover')).toBe(false);
    expect(
      [...popup.querySelectorAll('.kui-select__option-label')].map(
        (label) => label.textContent,
      ),
    ).toEqual(['Small', 'Medium']);
    // The document keeps the authored props.
    expect(propsOf(editor.document.value, 0).embedded).toBeUndefined();
    expect(propsOf(editor.document.value, 1).embedded).toBeUndefined();
  });

  // KF-M2FGPQ: the Inspector's open field place inside an item's submenu
  // shows that submenu open on the canvas.
  it('shows the submenu the Inspector edits open beside its item', () => {
    const root = globalThis.document.createElement('div');
    globalThis.document.body.append(root);
    const editor = createEditor();
    const stopMount = mount(root, editor.render);
    const unwireEditor = editor.wire(root);
    cleanup = () => {
      unwireEditor();
      stopMount();
    };
    const document = globalThis.structuredClone(withPopups()) as unknown as {
      root: { zones: { content: { props: Record<string, unknown> }[] } };
    };
    document.root.zones.content[0]!.props.items = [
      { label: 'Newest', action: 'sort-newest' },
      {
        label: 'More',
        submenu: [{ label: 'By Size', action: 'sort-size' }],
      },
    ];
    editor.document.value = document as unknown as ViewDocument;
    editor.selection.value = { kind: 'node', id: MENU };
    const canvas = root.querySelector('[data-editor-canvas]')!;
    const shownSubmenu = () =>
      canvas.querySelector<HTMLElement>(
        `[data-kerf-node="${MENU}"] [data-submenu][data-embedded-open]`,
      );
    // A list row's action is its inner button; the row carries the place.
    const open = (path: readonly (string | number)[]) => {
      const row = root.querySelector<HTMLElement>(
        `[data-editor-open='${JSON.stringify({ prop: 'items', path })}']`,
      )!;
      (row.querySelector<HTMLElement>('[data-action]') ?? row).click();
    };
    expect(shownSubmenu()).toBeNull();
    open([]);
    open([1]);

    // The item itself: its submenu stays closed.
    expect(shownSubmenu()).toBeNull();
    open([1, 'submenu']);
    expect(shownSubmenu()?.getAttribute('aria-label')).toBe('More');
    expect(shownSubmenu()?.textContent).toContain('By Size');
    // The document keeps the authored props.
    expect(propsOf(editor.document.value, 0)).not.toHaveProperty(
      'embeddedSubmenu',
    );
    // Selecting another node closes the field editor and the submenu.
    editor.selection.value = { kind: 'node', id: SELECT };
    expect(shownSubmenu()).toBeNull();
  });
});
