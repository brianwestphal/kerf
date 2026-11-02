// KF-RF6RCS: play mode's host mock action handlers and the action log
// (docs/26-ui-editor.md §11.4, §11.5): the pure model, the player's
// dispatch and logging, and the editor's log.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ACTION_LOG_CAP,
  type ActionLogEntry,
  documentActions,
  findNavStack,
  logAction,
  type PlayHandlers,
  pushView,
} from '../../../src/editor/model/play-actions.js';
import {
  PLAY_ACTION,
  PLAY_DOCUMENT,
  PLAY_READY,
  playPageUrl,
} from '../../../src/editor/player.js';
import { createEditor } from './kerf-catalog.js';

const ids = {
  stack: '01JB8Z1M6Q8E1X9V4S7K2R3T9A',
  list: '01JB8Z1M6Q8E1X9V4S7K2R3T9B',
  row: '01JB8Z1M6Q8E1X9V4S7K2R3T9C',
  detail: '01JB8Z1M6Q8E1X9V4S7K2R3T9D',
  refresh: '01JB8Z1M6Q8E1X9V4S7K2R3T9E',
  title: '01JB8Z1M6Q8E1X9V4S7K2R3T9F',
};

/**
 * A NavStack of orders (a list of rows that open an order, and a Refresh
 * button) over an order view that names the selected order.
 */
const orders = (): ViewDocument =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Orders',
    catalogs: ['@kerfjs/ui'],
    params: {
      orders: {
        type: {
          kind: 'array',
          items: {
            kind: 'object',
            props: [
              { name: 'id', type: { kind: 'string' }, required: true },
              { name: 'title', type: { kind: 'string' }, required: true },
            ],
          },
        },
        default: [
          { id: 'o-1', title: 'Order one' },
          { id: 'o-2', title: 'Order two' },
        ],
      },
      selectedId: { type: { kind: 'string' }, default: 'none' },
      // No default: the canvas's sample value stands in.
      note: { type: { kind: 'string' } },
    },
    root: {
      id: ids.stack,
      name: 'orders',
      type: '@kerfjs/ui:nav-stack',
      props: {
        id: 'orders-stack',
        label: 'Orders',
        views: [
          { key: 'list', toolbar: { title: 'Orders' } },
          { key: 'order', toolbar: { title: 'Order' } },
        ],
      },
      zones: {
        'views.0.content': [
          {
            id: ids.list,
            type: '@kerfjs/ui:list',
            props: { ariaLabel: 'Orders' },
            zones: {
              children: [
                {
                  $each: { $param: 'orders' },
                  as: 'order',
                  key: 'order.id',
                  template: {
                    id: ids.row,
                    name: 'orderRow',
                    type: '@kerfjs/ui:list-item',
                    props: {
                      label: { $bind: 'order.title' },
                      action: { $action: 'open-order' },
                    },
                  },
                },
              ],
            },
          },
          {
            id: ids.refresh,
            type: '@kerfjs/ui:button',
            props: { children: 'Refresh', action: { $action: 'refresh' } },
          },
        ],
        'views.1.content': [
          {
            id: ids.title,
            type: '@kerfjs/ui:text',
            props: { children: { $param: 'selectedId' } },
          },
        ],
      },
    },
  }) as unknown as ViewDocument;

const viewsOf = (document: ViewDocument) =>
  (document.root.props!.views as { key: string }[]).map(({ key }) => key);

describe('the action model', () => {
  it('names the document’s actions, not its literal ones', () => {
    expect([...documentActions(orders())].sort()).toEqual([
      'open-order',
      'refresh',
    ]);
  });

  it('finds a NavStack by its name, id prop, or node id', () => {
    const document = orders();
    for (const name of ['orders', 'orders-stack', ids.stack])
      expect(findNavStack(document, name)?.id).toBe(ids.stack);
    expect(findNavStack(document, 'nothing')).toBeUndefined();
    expect(findNavStack(document, ids.list)).toBeUndefined();
  });

  it('pushes a view from the document, or cuts back to one in the stack', () => {
    const original = orders();
    const list = pushView(original, original, ids.stack, 'list');
    expect(viewsOf(list)).toEqual(['list']);
    expect(Object.keys(list.root.zones!)).toEqual(['views.0.content']);
    const pushed = pushView(list, original, ids.stack, 'order');
    expect(viewsOf(pushed)).toEqual(['list', 'order']);
    expect(pushed.root.zones!['views.1.content']).toEqual(
      original.root.zones!['views.1.content'],
    );
    // An unknown view, or a node that is not a stack, changes nothing.
    expect(pushView(list, original, ids.stack, 'nothing')).toBe(list);
    expect(pushView(list, original, ids.list, 'order')).toBe(list);
    // A stack the edited document no longer has changes nothing.
    const moved = {
      ...original,
      root: { ...original.root, id: '01JB8Z1M6Q8E1X9V4S7K2R3T9Z' },
    } as ViewDocument;
    expect(pushView(list, moved, ids.stack, 'order')).toBe(list);
    // A view the play copy had not got, but the original lost, neither.
    const bare = { ...original, root: { ...original.root, zones: undefined } };
    expect(
      viewsOf(pushView(list, bare as ViewDocument, ids.stack, 'order')),
    ).toEqual(['list', 'order']);
  });

  it('logs newest first, capped', () => {
    let log: readonly ActionLogEntry[] = [];
    for (let index = 0; index < ACTION_LOG_CAP + 5; index++)
      log = logAction(log, {
        action: `a-${index}`,
        node: 'row',
        event: 'click',
        outcome: 'ran',
      });
    expect(log).toHaveLength(ACTION_LOG_CAP);
    expect(log[0]!.action).toBe(`a-${ACTION_LOG_CAP + 4}`);
  });
});

const settled = () =>
  new Promise((resolve) => globalThis.setTimeout(resolve, 0));

describe('the play page’s actions', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.replaceChildren();
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  /** The player over `orders()`, with `handlers`; returns what it posted. */
  const play = async (handlers: PlayHandlers, played = orders()) => {
    window.history.replaceState(null, '', playPageUrl(location.href));
    const post = vi.spyOn(window, 'postMessage');
    const root = document.createElement('div');
    document.body.append(root);
    const player = createEditor({ playHandlers: handlers });
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
    const entries = () =>
      post.mock.calls
        .map(([data]) => data as { type: string; entry?: ActionLogEntry })
        .filter(({ type }) => type === PLAY_ACTION)
        .map(({ entry }) => entry);
    const click = (selector: string) =>
      root.querySelector<HTMLElement>(selector)!.click();
    return { root, entries, click, player };
  };

  it('runs a row’s handler, which pushes a view and sets a param', async () => {
    const { root, entries, click } = await play({
      'open-order': ({ view, params, nodeId, action, event }) => {
        expect([action, nodeId, event.type]).toEqual([
          'open-order',
          ids.row,
          'click',
        ]);
        expect(params.selectedId).toBe('none');
        expect(params.note).toBeDefined();
        expect(view.root).toBe(root);
        expect(view.navStack('nothing')).toBeUndefined();
        view.setParams({ selectedId: view.key! });
        const stack = view.navStack('orders')!;
        stack.pop();
        stack.push('order');
      },
    });
    click('[data-key="o-2"][data-action="open-order"]');
    await settled();
    expect(entries()).toEqual([
      {
        action: 'open-order',
        node: 'orderRow',
        event: 'click',
        outcome: 'ran',
      },
    ]);
    expect(root.textContent).toContain('o-2');
  });

  it('logs an unhandled action, and a throw, without stopping the view', async () => {
    const { entries, click } = await play({
      'open-order': () => {
        throw new Error('no such order');
      },
    });
    click('[data-action="refresh"]');
    click('[data-action="open-order"]');
    // A component's own `data-action` is not the document's: not logged.
    const own = document.createElement('button');
    own.dataset.action = 'nav-internal';
    document.querySelector('[data-kerf-node]')!.append(own);
    own.click();
    expect(entries()).toEqual([
      {
        action: 'refresh',
        node: `Button ${ids.refresh}`,
        event: 'click',
        outcome: 'missing',
      },
      {
        action: 'open-order',
        node: 'orderRow',
        event: 'click',
        outcome: 'threw',
        message: 'no such order',
      },
    ]);
  });

  it('logs an async handler once it settles, and its rejection', async () => {
    let fail = false;
    // A document with no params: the handler gets none.
    const refresh = orders().root.zones!['views.0.content']![1]!;
    const { entries, click } = await play(
      {
        refresh: ({ params }) => {
          expect(params).toEqual({});
          return fail ? Promise.reject('offline') : Promise.resolve();
        },
      },
      {
        ...orders(),
        params: undefined,
        root: refresh,
      } as unknown as ViewDocument,
    );
    click('[data-action="refresh"]');
    fail = true;
    click('[data-action="refresh"]');
    await settled();
    expect(entries().map((entry) => [entry!.outcome, entry!.message])).toEqual([
      ['ran', undefined],
      ['threw', 'offline'],
    ]);
  });
});

describe('the action log', () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => {
    // happy-dom reports that it loads no frame page.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('counts unseen actions, lists them newest first, and clears on entry', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor();
    mount(root, editor.render);
    cleanup = editor.wire(root);
    const enter = () => {
      root.querySelector<HTMLElement>('[data-action="editor-play"]')!.click();
      const frame = root.querySelector<HTMLIFrameElement>(
        '[data-editor-play-frame]',
      )!;
      const stand = { postMessage: vi.fn() };
      Object.defineProperty(frame, 'contentWindow', { value: stand });
      return stand;
    };
    const stand = enter();
    const fire = (entry: ActionLogEntry, source: unknown = stand) =>
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: PLAY_ACTION, entry },
          origin: location.origin,
          source: source as MessageEventSource,
        }),
      );
    const button = () =>
      root.querySelector<HTMLElement>('[data-action="editor-play-log"]')!;
    expect(button().getAttribute('aria-label')).toBe('Action log');
    fire({
      action: 'refresh',
      node: 'Button',
      event: 'click',
      outcome: 'missing',
    });
    fire({
      action: 'open-order',
      node: 'orderRow',
      event: 'click',
      outcome: 'threw',
      message: 'no such order',
    });
    // Another window's message is not the stage's.
    fire({ action: 'x', node: 'y', event: 'click', outcome: 'ran' }, window);
    // Nor is a stage message of another kind.
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PLAY_READY },
        origin: location.origin,
        source: stand as unknown as MessageEventSource,
      }),
    );
    expect(button().getAttribute('aria-label')).toBe('Action log, 2 new');
    expect(button().querySelector('.kui-badge')!.textContent).toBe('2');
    button().click();
    const surface = document.querySelector<HTMLElement>(
      '[data-component="anchored-surface"]',
    )!;
    const listed = () =>
      [
        ...surface.querySelectorAll<HTMLElement>(
          '[data-editor-play-log-entry]',
        ),
      ].map((entry) => entry.dataset.editorPlayLogEntry);
    expect(listed()).toEqual(['threw', 'missing']);
    expect(surface.textContent).toContain('orderRow: no such order');
    expect(button().getAttribute('aria-label')).toBe('Action log');
    // While open, a new action is not counted. (The open list follows the
    // log live in a browser; here kerfjs/overlay is a second kerf copy
    // whose mount does not track this one's signals.)
    fire({ action: 'refresh', node: 'Button', event: 'click', outcome: 'ran' });
    expect(button().getAttribute('aria-label')).toBe('Action log');
    // A second press while open does nothing.
    button().click();
    expect(
      document.querySelectorAll('[data-component="anchored-surface"]'),
    ).toHaveLength(1);
    // Leaving closes it; entering again starts a fresh log.
    root
      .querySelector<HTMLElement>('[data-action="editor-play-done"]')!
      .click();
    await settled();
    const again = enter();
    fire(
      { action: 'refresh', node: 'Button', event: 'click', outcome: 'ran' },
      again,
    );
    for (let index = 0; index < 120; index++)
      fire(
        { action: 'refresh', node: 'Button', event: 'click', outcome: 'ran' },
        again,
      );
    expect(button().querySelector('.kui-badge')!.textContent).toBe('99+');
    button().click();
    const fresh = document.querySelector<HTMLElement>(
      '[data-component="anchored-surface"]',
    )!;
    expect(fresh.querySelectorAll('[data-editor-play-log-entry]')).toHaveLength(
      121,
    );
  });

  it('shows an empty log', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor();
    mount(root, editor.render);
    cleanup = editor.wire(root);
    root.querySelector<HTMLElement>('[data-action="editor-play"]')!.click();
    root.querySelector<HTMLElement>('[data-action="editor-play-log"]')!.click();
    expect(
      document.querySelector('[data-component="anchored-surface"]')!
        .textContent,
    ).toContain('No actions yet');
  });
});
