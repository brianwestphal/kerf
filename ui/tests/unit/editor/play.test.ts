// KF-60BEEJ: play mode core. The editor's Play and Done, the play page's
// player, and the play-time state adapters that stand in for the
// application of a controlled component (docs/26-ui-editor.md §11.4).
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlayHandlers } from '../../../src/editor/model/play-actions.js';
import { fitScale, scaledBox } from '../../../src/editor/model/play-fit.js';
import {
  popView,
  reorderTabBarItems,
  rootViews,
  selectTab,
  selectTabBarItem,
  setSidebarCollapsed,
  setWorkbenchPanelCollapsed,
  sidebarToggleActions,
} from '../../../src/editor/model/play-state.js';
import {
  PLAY_DOCUMENT,
  PLAY_ENVIRONMENT,
  PLAY_READY,
  playPageUrl,
} from '../../../src/editor/player.js';
import { createEditor } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
  window.history.replaceState(null, '', '/');
});

const ids = {
  pane: '01JB8Z1M6Q8E1X9V4S7K2R3T8A',
  tabs: '01JB8Z1M6Q8E1X9V4S7K2R3T8B',
  stack: '01JB8Z1M6Q8E1X9V4S7K2R3T8C',
  first: '01JB8Z1M6Q8E1X9V4S7K2R3T8D',
  second: '01JB8Z1M6Q8E1X9V4S7K2R3T8E',
  search: '01JB8Z1M6Q8E1X9V4S7K2R3T8F',
  bar: '01JB8Z1M6Q8E1X9V4S7K2R3T8G',
  itemA: '01JB8Z1M6Q8E1X9V4S7K2R3T8H',
  itemB: '01JB8Z1M6Q8E1X9V4S7K2R3T8J',
  workbench: '01JB8Z1M6Q8E1X9V4S7K2R3T8K',
  panel: '01JB8Z1M6Q8E1X9V4S7K2R3T8M',
  toggle: '01JB8Z1M6Q8E1X9V4S7K2R3T8N',
  main: '01JB8Z1M6Q8E1X9V4S7K2R3T8P',
  rail: '01JB8Z1M6Q8E1X9V4S7K2R3T8Q',
  open: '01JB8Z1M6Q8E1X9V4S7K2R3T8R',
};

const text = (id: string, children: string) => ({
  id,
  type: '@kerfjs/ui:text',
  props: { children },
});

/**
 * A TabNavigator whose Projects tab holds a two-view NavStack (Projects,
 * then Atlas) and whose Search tab holds text.
 */
const tabsAndStack = () =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Play',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: ids.tabs,
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
            id: ids.stack,
            type: '@kerfjs/ui:nav-stack',
            props: {
              id: 'projects-stack',
              label: 'Projects Navigation',
              views: [
                { key: 'projects', toolbar: { title: 'Projects' } },
                { key: 'atlas', toolbar: { title: 'Atlas' } },
              ],
            },
            zones: {
              'views.0.content': [
                text(ids.first, 'All projects'),
                {
                  id: ids.open,
                  type: '@kerfjs/ui:button',
                  props: {
                    children: 'Open Atlas',
                    action: { $action: 'open-atlas' },
                  },
                },
              ],
              'views.1.content': [text(ids.second, 'Atlas details')],
            },
          },
        ],
        'tabs.1.content': [text(ids.search, 'Search everything')],
      },
    },
  }) as unknown as ViewDocument;

/** A TabBar of two items, a Workbench with a left rail, and a sidebar. */
const barsAndPanels = () =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Panels',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: ids.pane,
      type: '@kerfjs/ui:pane',
      zones: {
        content: [
          {
            id: ids.bar,
            type: '@kerfjs/ui:tab-bar',
            props: { id: 'bar', label: 'Files' },
            zones: {
              tabs: [
                {
                  id: ids.itemA,
                  type: '@kerfjs/ui:tabs',
                  props: {
                    id: 'a',
                    name: 'A',
                    selected: true,
                    draggable: true,
                  },
                },
                {
                  id: ids.itemB,
                  type: '@kerfjs/ui:tabs',
                  props: { id: 'b', name: 'B' },
                },
              ],
            },
          },
          {
            id: ids.workbench,
            type: '@kerfjs/ui:workbench',
            props: {
              id: 'bench',
              label: 'Bench',
              leftRail: {
                label: 'Files',
                toolbar: {
                  label: 'Files',
                  toggle: { action: 'toggle-files', name: 'Files' },
                },
              },
            },
            zones: {
              main: [text(ids.main, 'Work area')],
              'leftRail.content': [text(ids.rail, 'Rail')],
            },
          },
          {
            id: ids.panel,
            type: '@kerfjs/ui:collapsible-panel',
            props: {
              id: 'side',
              side: 'left',
              label: 'Side',
              toolbar: {
                label: 'Side',
                toggle: { action: 'toggle-side', name: 'Side' },
              },
            },
          },
          {
            id: ids.toggle,
            type: '@kerfjs/ui:collapsible-panel#CollapsiblePanelToggle',
            props: {
              side: 'left',
              collapsed: false,
              action: 'toggle-side',
              panelId: 'side',
            },
          },
        ],
      },
    },
  }) as unknown as ViewDocument;

/** The NavStack node in `tabsAndStack()`. */
const findStack = (document: ViewDocument) =>
  (document.root.zones as Record<string, unknown[]>)['tabs.0.content']![0];

const nodeProps = (document: ViewDocument, id: string) => {
  const find = (node: Record<string, unknown>): Record<string, unknown> => {
    if (node.id === id) return (node.props ?? {}) as Record<string, unknown>;
    for (const children of Object.values(
      (node.zones ?? {}) as Record<string, Record<string, unknown>[]>,
    ))
      for (const child of children) {
        const found = find(child);
        if (found) return found;
      }
    return undefined as never;
  };
  return find(document.root as unknown as Record<string, unknown>);
};

describe('Fit', () => {
  const frame = { width: 404, height: 876 };

  it('scales the frame down to the stage, by its tighter side', () => {
    // A short stage: the height decides.
    expect(fitScale({ width: 1392, height: 438 }, frame)).toBe(0.5);
    // A narrow stage: the width decides.
    expect(fitScale({ width: 202, height: 2000 }, frame)).toBe(0.5);
    expect(scaledBox(frame, 0.5)).toEqual({ width: 202, height: 438 });
  });

  it('never scales up, never below zero, and leaves an unmeasured frame be', () => {
    expect(fitScale({ width: 2000, height: 2000 }, frame)).toBe(1);
    expect(fitScale({ width: -48, height: 400 }, frame)).toBe(0);
    expect(fitScale({ width: 100, height: 100 }, { width: 0, height: 0 })).toBe(
      1,
    );
  });
});

describe('play-time state transitions', () => {
  it('selects a TabNavigator tab, and leaves an unknown node alone', () => {
    const source = tabsAndStack();
    const next = selectTab(source, ids.tabs, 'search');
    expect(nodeProps(next, ids.tabs).active).toBe('search');
    expect(nodeProps(source, ids.tabs).active).toBe('projects');
    expect(selectTab(next, ids.tabs, 'search')).toBe(next);
    expect(selectTab(source, ids.stack, 'search')).toBe(source);
  });

  it('pops a NavStack to its lower view, never past the first', () => {
    const source = tabsAndStack();
    const popped = popView(source, ids.stack);
    expect(nodeProps(popped, ids.stack).views).toHaveLength(1);
    // The popped view's content leaves with it.
    expect(JSON.stringify(popped)).not.toContain('Atlas details');
    expect(popView(popped, ids.stack)).toBe(popped);
    expect(popView(source, ids.tabs)).toBe(source);
  });

  it('starts every NavStack at its root view (KF-BFE3EC)', () => {
    const source = tabsAndStack();
    const started = rootViews(source);
    expect(nodeProps(started, ids.stack).views).toHaveLength(1);
    expect(JSON.stringify(started)).not.toContain('Atlas details');
    expect(nodeProps(source, ids.stack).views).toHaveLength(2);
    // Already at the root: the same document.
    expect(rootViews(started)).toBe(started);
    // A stack nested in a later view leaves with that view.
    const nested = globalThis.structuredClone(source) as ViewDocument;
    const zones = (findStack(nested) as { zones: Record<string, unknown[]> })
      .zones;
    zones['views.1.content'] = [
      {
        ...(globalThis.structuredClone(findStack(source)) as object),
        id: ids.panel,
      },
    ];
    const cut = rootViews(nested);
    expect(JSON.stringify(cut)).not.toContain(ids.panel);
  });

  it('selects one TabBarItem in its bar', () => {
    const source = barsAndPanels();
    const next = selectTabBarItem(source, ids.itemB);
    expect(nodeProps(next, ids.itemB).selected).toBe(true);
    expect(nodeProps(next, ids.itemA).selected).toBeUndefined();
    expect(selectTabBarItem(next, ids.itemB)).toBe(next);
    expect(selectTabBarItem(source, ids.bar)).toBe(source);
  });

  it("reorders a TabBar's items", () => {
    const source = barsAndPanels();
    const order = (document: ViewDocument) =>
      JSON.stringify(document).indexOf(ids.itemB) <
      JSON.stringify(document).indexOf(ids.itemA)
        ? 'ba'
        : 'ab';
    const change = {
      barId: 'bar',
      sourceId: 'a',
      targetId: 'b',
      position: 'after',
    } as const;
    expect(order(reorderTabBarItems(source, change))).toBe('ba');
    expect(order(source)).toBe('ab');
    expect(reorderTabBarItems(source, { ...change, targetId: 'a' })).toBe(
      source,
    );
    expect(reorderTabBarItems(source, { ...change, barId: 'other' })).toBe(
      source,
    );
  });

  it('collapses a Workbench rail, and a sidebar with its toggles', () => {
    const source = barsAndPanels();
    const rail = setWorkbenchPanelCollapsed(
      source,
      ids.workbench,
      'leftRail',
      true,
    );
    expect(
      (nodeProps(rail, ids.workbench).leftRail as { collapsed?: boolean })
        .collapsed,
    ).toBe(true);
    expect(
      setWorkbenchPanelCollapsed(source, ids.workbench, 'rightRail', true),
    ).toBe(source);
    const side = setSidebarCollapsed(source, 'side', true);
    expect(nodeProps(side, ids.panel).collapsed).toBe(true);
    expect(nodeProps(side, ids.toggle).collapsed).toBe(true);
    expect(setSidebarCollapsed(side, 'side', true)).toBe(side);
    expect(
      setWorkbenchPanelCollapsed(rail, ids.workbench, 'leftRail', true),
    ).toBe(rail);
    expect(sidebarToggleActions(source, 'side')).toEqual(['toggle-side']);
    expect(sidebarToggleActions(source, 'other')).toEqual([]);
  });
});

/** Opens the editor on `document` (or the player, on a play page). */
/** KF-BFE3EC: the mock handler that pushes the stack's Atlas view. */
const playHandlers: PlayHandlers = {
  'open-atlas': ({ view }) => view.navStack('projects-stack')!.push('atlas'),
};

function open(document?: ViewDocument) {
  const root = globalThis.document.createElement('div');
  globalThis.document.body.append(root);
  const editor = createEditor(
    document ? { document, playHandlers } : { playHandlers },
  );
  mount(root, editor.render);
  const unwire = editor.wire(root);
  cleanup = unwire;
  return { root, editor };
}

const click = (element: Element | null) => {
  expect(element).not.toBeNull();
  (element as HTMLElement).click();
};

describe('play mode in the editor', () => {
  // happy-dom reports that it loads no frame page.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('replaces the editing UI with the play bar and stage, and Done restores it', () => {
    const { root, editor } = open(tabsAndStack());
    editor.selection.value = { kind: 'node', id: ids.stack };
    const editing = root.querySelector<HTMLElement>('.kui-editor__editing')!;
    click(root.querySelector('[data-action="editor-play"]'));
    expect(editing.hidden).toBe(true);
    const frame = root.querySelector<HTMLIFrameElement>(
      '[data-editor-play-frame]',
    )!;
    // KF-R7KXSN: the default iPhone 17 in a browser tab: its 874 tall
    // screen less the 62 and 34 safe areas the tab's page sits inside.
    expect(frame.getAttribute('width')).toBe('402');
    expect(frame.getAttribute('height')).toBe('778');
    expect(new URL(frame.src).searchParams.has('kerf-ui-play')).toBe(true);
    expect(root.querySelector('[data-editor-stage]')).not.toBeNull();
    // Fit sizes the frame's room and scale (happy-dom lays nothing out, so
    // an unmeasured frame stays at 1).
    const box = root.querySelector<HTMLElement>('.kui-editor__device-box')!;
    expect(box.dataset.scale).toBe('1');
    expect((box.firstElementChild as HTMLElement).style.transform).toBe(
      'scale(1)',
    );
    click(root.querySelector('[data-action="editor-play-done"]'));
    expect(root.querySelector('[data-editor-play-frame]')).toBeNull();
    // The same editing UI, with the same selection.
    expect(root.querySelector('.kui-editor__editing')).toBe(editing);
    expect(editing.hidden).toBe(false);
    expect(editor.selection.value).toEqual({ kind: 'node', id: ids.stack });
  });

  it('leaves on Escape and ignores editing keys while playing', () => {
    const { root, editor } = open(tabsAndStack());
    const before = editor.document.value;
    editor.selection.value = { kind: 'node', id: ids.first };
    click(root.querySelector('[data-action="editor-play"]'));
    for (const key of ['d', 'z'])
      globalThis.document.dispatchEvent(
        new KeyboardEvent('keydown', { key, metaKey: true, bubbles: true }),
      );
    expect(editor.document.value).toBe(before);
    globalThis.document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(root.querySelector('[data-editor-play-frame]')).toBeNull();
  });

  it('sends the document to its own stage only, and a fresh frame each time', () => {
    const { root, editor } = open(tabsAndStack());
    click(root.querySelector('[data-action="editor-play"]'));
    const frame = root.querySelector<HTMLIFrameElement>(
      '[data-editor-play-frame]',
    )!;
    // happy-dom loads no frame page; the stage's frame gets a stand-in.
    const stage = { postMessage: vi.fn() };
    Object.defineProperty(frame, 'contentWindow', { value: stage });
    const post = stage.postMessage;
    const ready = (source: MessageEventSource, origin = location.origin) =>
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: PLAY_READY },
          origin,
          source,
        }),
      );
    ready(window);
    ready(stage as never, 'https://elsewhere.example');
    expect(post).not.toHaveBeenCalled();
    ready(stage as never);
    // The device's safe areas first (none in a browser tab), then the
    // document, so the view renders once with the right insets.
    expect(post.mock.calls).toEqual([
      [
        {
          type: PLAY_ENVIRONMENT,
          safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
        },
        location.origin,
      ],
      [
        { type: PLAY_DOCUMENT, document: editor.document.value },
        location.origin,
      ],
    ]);
    click(root.querySelector('[data-action="editor-play-done"]'));
    click(root.querySelector('[data-action="editor-play"]'));
    expect(root.querySelector('[data-editor-play-frame]')).not.toBe(frame);
  });
});

describe('the play page', () => {
  /** The play page's player, sent `document` by its (same-window) parent. */
  const play = (document: ViewDocument) => {
    window.history.replaceState(null, '', playPageUrl(location.href));
    const opened = open();
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PLAY_DOCUMENT, document },
        origin: location.origin,
        source: window,
      }),
    );
    return opened;
  };
  const settled = () =>
    new Promise((resolve) => globalThis.setTimeout(resolve, 0));

  it('asks its parent for the document and renders nothing until it comes', () => {
    window.history.replaceState(null, '', playPageUrl(location.href));
    const post = vi.spyOn(window, 'postMessage');
    const { root } = open();
    expect(post).toHaveBeenCalledWith({ type: PLAY_READY }, location.origin);
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PLAY_DOCUMENT, document: tabsAndStack() },
        origin: 'https://elsewhere.example',
        source: window,
      }),
    );
    expect(root.querySelector('[data-kerf-node]')).toBeNull();
  });

  it('disposes the wiring of a node a newly sent document no longer has', async () => {
    const { root } = play(tabsAndStack());
    await settled();
    click(root.querySelector('[data-action="open-atlas"]'));
    await settled();
    const stack = root.querySelector('[data-component="nav-stack"]')!;
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PLAY_DOCUMENT, document: barsAndPanels() },
        origin: location.origin,
        source: window,
      }),
    );
    await settled();
    expect(stack.isConnected).toBe(false);
    // The removed stack's back control no longer reaches the play copy.
    expect(() =>
      (stack.querySelector('[data-nav-back]') as HTMLElement).click(),
    ).not.toThrow();
  });

  it("ignores its parent's other messages", async () => {
    const { root } = play(tabsAndStack());
    await settled();
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PLAY_READY },
        origin: location.origin,
        source: window,
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        data: null,
        origin: location.origin,
        source: window,
      }),
    );
    expect(root.textContent).toContain('All projects');
  });

  it('rewires an element the morph reuses for another node', async () => {
    const { root, editor } = play(tabsAndStack());
    await settled();
    const stack = root.querySelector('[data-component="nav-stack"]')!;
    // The same stack under a new node id: the morph keeps its element.
    const renamed = JSON.parse(
      JSON.stringify(tabsAndStack()).replaceAll(ids.stack, ids.panel),
    ) as ViewDocument;
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PLAY_DOCUMENT, document: renamed },
        origin: location.origin,
        source: window,
      }),
    );
    await settled();
    expect(root.querySelector('[data-component="nav-stack"]')).toBe(stack);
    click(root.querySelector('[data-action="open-atlas"]'));
    await settled();
    expect(nodeProps(editor.document.value, ids.panel).views).toHaveLength(2);
    click(root.querySelector('[data-nav-back]'));
    expect(nodeProps(editor.document.value, ids.panel).views).toHaveLength(1);
  });

  it('leaves alone a panel it cannot name or toggle', async () => {
    // A Workbench and a CollapsiblePanel whose ids are params, and a
    // CollapsiblePanel no toggle names.
    const source = barsAndPanels();
    const content = (
      source.root as unknown as {
        zones: { content: Record<string, unknown>[] };
      }
    ).zones.content;
    (content[1]!.props as Record<string, unknown>).id = { $param: 'bench' };
    content.push({
      id: ids.rail.replace(/Q$/, 'R'),
      type: '@kerfjs/ui:collapsible-panel',
      props: { id: { $param: 'side' }, side: 'right', label: 'Other' },
    });
    content.push({
      id: ids.rail.replace(/Q$/, 'S'),
      type: '@kerfjs/ui:collapsible-panel',
      props: { id: 'lonely', side: 'right', label: 'Lonely' },
    });
    (source as { params?: unknown }).params = {
      bench: { type: { kind: 'string' } },
      side: { type: { kind: 'string' } },
    };
    const { root, editor } = play(source);
    await settled();
    const before = editor.document.value;
    click(root.querySelector('[data-workbench-toggle]'));
    expect(editor.document.value).toBe(before);
  });

  it('switches tabs and pops views over its own copy', async () => {
    const source = tabsAndStack();
    const { root, editor } = play(source);
    await settled();
    expect(root.querySelector('[data-editor-canvas]')).toBeNull();
    // KF-BFE3EC: the stack starts at its root view, as an app launches.
    expect(root.textContent).toContain('All projects');
    expect(root.textContent).not.toContain('Atlas details');
    expect(nodeProps(editor.document.value, ids.stack).views).toHaveLength(1);
    // A handler pushes the rest from the document as edited.
    click(root.querySelector('[data-action="open-atlas"]'));
    await settled();
    expect(root.textContent).toContain('Atlas details');
    click(root.querySelector('[data-nav-back]'));
    expect(nodeProps(editor.document.value, ids.stack).views).toHaveLength(1);
    await settled();
    expect(root.textContent).toContain('All projects');
    click(root.querySelector('[data-tab-scaffold-tab="search"]'));
    expect(nodeProps(editor.document.value, ids.tabs).active).toBe('search');
    // The document it was sent is untouched.
    expect(nodeProps(source, ids.tabs).active).toBe('projects');
    expect(nodeProps(source, ids.stack).views).toHaveLength(2);
  });

  it('selects tab bar items and collapses a Workbench rail and a sidebar', async () => {
    const { root, editor } = play(barsAndPanels());
    await settled();
    click(root.querySelector(`[data-kerf-node="${ids.itemB}"]`));
    expect(nodeProps(editor.document.value, ids.itemB).selected).toBe(true);
    await settled();
    // A draggable tab moves with Alt+Shift+Arrow.
    root
      .querySelector(`[data-kerf-node="${ids.itemA}"] [role="tab"]`)!
      .dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          altKey: true,
          shiftKey: true,
          bubbles: true,
        }),
      );
    const text = JSON.stringify(editor.document.value);
    expect(text.indexOf(ids.itemB)).toBeLessThan(text.indexOf(ids.itemA));
    await settled();
    click(root.querySelector('[data-workbench-toggle]'));
    expect(
      (
        nodeProps(editor.document.value, ids.workbench).leftRail as {
          collapsed?: boolean;
        }
      ).collapsed,
    ).toBe(true);
    await settled();
    click(root.querySelector('[data-action="toggle-side"]'));
    expect(nodeProps(editor.document.value, ids.panel).collapsed).toBe(true);
  });
});
