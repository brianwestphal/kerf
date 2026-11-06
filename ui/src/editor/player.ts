// The play page (KF-60BEEJ: play mode core; docs/26-ui-editor.md §11.3).
// Play mode's stage is an iframe that loads the host's own editor page with
// `?kerf-ui-play`, so it has the same catalogs, registrations, and global CSS
// as the canvas, and neither host needs a second route. `createEditor` sees
// the flag and returns this player instead of the editor. The player asks
// its parent for the document, renders it as the canvas does without the
// editing stand-ins, and wires it for real over a play-time copy
// (play-adapters.ts). Nothing it does reaches the edited document.
import type { ViewDocument } from '@kerfjs/ui/view';
import { batch, delegate, effect, raw, type SafeHtml, signal } from 'kerfjs';

import { openDialog } from '../components/surfaces/surface-scaffold/surface-scaffold.js';
import { deviceClass } from '../shared/environment/device-class.js';
import {
  type ActionLogEntry,
  documentActions,
  findNavStack,
  type PlayActionContext,
  type PlayHandlers,
  pushView,
} from './model/play-actions.js';
import { type DeviceInsets, safeAreaTokens } from './model/play-device.js';
import { placeholderAnchors, popView, rootViews } from './model/play-state.js';
import { fresh, type RowProps } from './model/play-values.js';
import { topNode } from './model/play-views.js';
import { wirePlayState } from './play-adapters.js';

/** The action Kerf UI's dialog wiring opens a DialogSurface with. */
const SHOW_DIALOG = 'show-dialog';

/** The query flag that makes the editor page a play page. */
export const PLAY_PARAM = 'kerf-ui-play';
/** The player's message to its parent once it listens for the document. */
export const PLAY_READY = 'kerf-ui-play:ready';
/**
 * The editor's message carrying the document to play, with `views`: the
 * composed documents its `#view`s render, by path (KF-85SCQD).
 */
export const PLAY_DOCUMENT = 'kerf-ui-play:document';

/** Composed documents by their path from the top document's folder. */
export type PlayViews = Readonly<Record<string, ViewDocument>>;
/**
 * KF-R7KXSN: the editor's message carrying the emulated device's safe areas
 * (physical insets), sent with the document and whenever they change.
 */
export const PLAY_ENVIRONMENT = 'kerf-ui-play:environment';
/**
 * KF-RF6RCS: the player's message to its editor for each fired action, with
 * the action log's entry.
 */
export const PLAY_ACTION = 'kerf-ui-play:action';

/** What the player needs from the editor besides the document. */
export interface PlayerOptions {
  /** The host's mock action handlers (KF-RF6RCS). */
  readonly handlers?: PlayHandlers;
  /** The canvas's sample param values for `document`. */
  readonly inputs: (document: ViewDocument) => Record<string, unknown>;
  /** A node's name in the action log: its author name, or component and id. */
  readonly label: (document: ViewDocument, nodeId: string) => string;
}

/** Whether `location` is a play page. */
export const isPlayPage = (location: Pick<Location, 'search'>): boolean =>
  new URLSearchParams(location.search).has(PLAY_PARAM);

/** The play page for the editor page at `href`. */
export function playPageUrl(href: string): string {
  const url = new URL(href);
  url.hash = '';
  url.searchParams.set(PLAY_PARAM, '');
  return url.href;
}

/** A message from `source` is the editor's or the player's own peer. */
export const fromPeer = (
  event: MessageEvent,
  view: Window,
  source: MessageEventSource | null,
): boolean =>
  event.origin === view.location.origin &&
  source !== null &&
  event.source === source;

/**
 * The player: renders `preview` of the document its parent sends, with
 * real wiring over a play-time copy. Same `render`/`wire` shape as the
 * editor, so a host mounts either one the same way.
 */
export function createPlayer(
  initial: ViewDocument,
  preview: (
    document: ViewDocument,
    overrides: Readonly<Record<string, unknown>>,
    rows: RowProps,
    /** KF-85SCQD: the composed documents the editor sent. */
    views: PlayViews,
  ) => SafeHtml,
  options: PlayerOptions,
) {
  const { handlers = {}, inputs, label } = options;
  /** The play-time copy: what the view's own wiring changes. */
  const document = signal<ViewDocument>(initial);
  /** The document as edited, which a pushed view comes from. */
  let original = initial;
  /** Param values a mock handler set (KF-RF6RCS). */
  const overrides = signal<Readonly<Record<string, unknown>>>({});
  /** Per-row props of repeated nodes (KF-XV732Q). */
  const rows = signal<RowProps>({});
  /** Nothing renders until the editor sends the document to play. */
  const received = signal(false);
  /** The composed documents `#view`s render, as the editor loaded them. */
  const views = signal<PlayViews>({});
  /**
   * KF-58917B: each `#view`'s play copy of the document it composes, by
   * the `#view`'s composed id, once something in it changed.
   */
  const copies = signal<PlayViews>({});

  const render = (): SafeHtml => {
    if (!received.value) return raw('');
    // KF-XV732Q: rows with play-time props render from fresh items, as
    // (KF-58917B) do rows whose composed documents' play copies changed.
    const repeated =
      Object.keys(rows.value).length > 0 ||
      Object.keys(copies.value).length > 0;
    return repeated
      ? preview(
          fresh(document.value),
          fresh(overrides.value),
          rows.value,
          views.value,
        )
      : preview(document.value, overrides.value, rows.value, views.value);
  };
  const setParams = (values: Readonly<Record<string, unknown>>) => {
    overrides.value = { ...overrides.value, ...values };
  };

  /** The view's param values now: defaults, samples, then handler-set values. */
  const params = (): Record<string, unknown> => {
    const current = document.value;
    return {
      ...Object.fromEntries(
        Object.entries(current.params ?? {}).flatMap(([name, param]) =>
          'default' in param ? [[name, param.default]] : [],
        ),
      ),
      ...inputs(current),
      ...overrides.value,
    };
  };

  const wire = (root: HTMLElement) => {
    const view = root.ownerDocument.defaultView!;
    // The class the played view's own deviceClass() reads.
    const device = deviceClass();
    const play = wirePlayState(root, document, {
      rows,
      params,
      setParams,
      device,
      views,
      copies,
    });
    const html = root.ownerDocument.documentElement;
    const onMessage = (event: MessageEvent) => {
      if (!fromPeer(event, view, view.parent)) return;
      const data = event.data as {
        type?: unknown;
        document?: ViewDocument;
        views?: PlayViews;
        safeArea?: DeviceInsets;
      };
      if (data?.type === PLAY_ENVIRONMENT && data.safeArea) {
        // A frame cannot set env(safe-area-inset-*), so the emulated
        // device's insets go into Kerf UI's own tokens on :root.
        const direction =
          html.dir === 'rtl' || view.getComputedStyle(html).direction === 'rtl'
            ? 'rtl'
            : 'ltr';
        for (const [token, value] of Object.entries(
          safeAreaTokens(data.safeArea, direction),
        ))
          html.style.setProperty(token, value);
        return;
      }
      if (data?.type !== PLAY_DOCUMENT || !data.document) return;
      original = data.document;
      // KF-BFE3EC: each NavStack starts at its root view, as an app
      // launches; handlers push the rest from `original`.
      // One render for the document and the composed documents it shows.
      batch(() => {
        document.value = rootViews(data.document!);
        views.value = data.views ?? {};
        copies.value = {};
        rows.value = {};
        received.value = true;
      });
    };
    /** Tells the editor's action log about one fired action. */
    const report = (entry: ActionLogEntry) =>
      view.parent.postMessage(
        { type: PLAY_ACTION, entry },
        view.location.origin,
      );
    // KF-RF6RCS: the document's actions go to the host's mock handlers, as
    // a generated view's `wire…` delegates them, and every one is logged.
    const stopActions = delegate<HTMLElement>(
      root,
      'click',
      '[data-action]',
      (event, target) => {
        const action = target.dataset.action!;
        // KF-SYGSD0: the dialog wiring Kerf UI documents (`show-dialog` with
        // `data-dialog-id`) is built in, as an app's delegate runs it:
        // `openDialog` also wires `data-dialog-close`, Escape, and the
        // backdrop. It is logged like any other action.
        if (action === SHOW_DIALOG && target.dataset.dialogId) {
          const dialog = root.querySelector<HTMLDialogElement>(
            `dialog#${CSS.escape(target.dataset.dialogId)}`,
          );
          const nodeId =
            target.closest<HTMLElement>('[data-kerf-node]')?.dataset.kerfNode;
          if (dialog) openDialog(dialog);
          report({
            action,
            node: nodeId ? label(document.value, topNode(nodeId)) : action,
            event: event.type,
            outcome: dialog ? 'ran' : 'missing',
            message: dialog
              ? undefined
              : `No dialog with id "${target.dataset.dialogId}" in the view`,
          });
          return;
        }
        // A composed document's actions are the view's too (KF-85SCQD).
        if (
          !documentActions(document.value, Object.values(views.value)).has(
            action,
          )
        )
          return;
        // Every rendered node carries its id, so an action has one; a
        // composed node's (KF-58917B) is its top `#view`'s.
        const nodeId = topNode(
          target.closest<HTMLElement>('[data-kerf-node]')!.dataset.kerfNode!,
        );
        const base = {
          action,
          node: label(document.value, nodeId),
          event: event.type,
        };
        const handler = handlers[action];
        if (!handler) {
          report({ ...base, outcome: 'missing' });
          return;
        }
        const failed = (error: unknown) =>
          report({
            ...base,
            outcome: 'threw',
            message: error instanceof Error ? error.message : String(error),
          });
        const context: PlayActionContext = {
          action,
          nodeId,
          event,
          params: params(),
          view: {
            root,
            document: document.value,
            key: target.closest<HTMLElement>('[data-key]')?.dataset.key,
            setParams,
            navStack: (name) => {
              const stack = findNavStack(document.value, name);
              if (!stack) return undefined;
              return {
                push: (viewKey) => {
                  document.value = pushView(
                    document.value,
                    original,
                    stack.id,
                    viewKey,
                  );
                },
                pop: () => {
                  document.value = popView(document.value, stack.id);
                },
              };
            },
          },
        };
        let result: unknown;
        try {
          result = handler(context);
        } catch (error) {
          failed(error);
          return;
        }
        if (result instanceof Promise)
          result.then(() => report({ ...base, outcome: 'ran' }), failed);
        else report({ ...base, outcome: 'ran' });
      },
    );
    view.addEventListener('message', onMessage);
    // That class on the play page's root, so a test (or an author's
    // inspector) can see it follow the device.
    const stopDevice = effect(() => {
      const { size, orientation } = device.value;
      html.dataset.kerfPlayDevice = `${size} ${orientation}`;
    });
    // KF-T1V86Q: the placeholder anchor. The view root carries every CSS
    // anchor name an overlay surface docks to, standing in for the element
    // the application names (its shell's main column).
    const stopAnchors = effect(() => {
      void overrides.value;
      const names = placeholderAnchors(document.value, params());
      if (names.length > 0)
        root.style.setProperty('anchor-name', names.join(', '));
      else root.style.removeProperty('anchor-name');
    });
    // Adapters follow the rendered view: the mount re-renders first.
    const stopSync = effect(() => {
      void document.value;
      void overrides.value;
      void rows.value;
      void copies.value;
      void received.value;
      globalThis.queueMicrotask(play.sync);
    });
    // A play page outside a frame posts to itself, which it ignores.
    view.parent.postMessage({ type: PLAY_READY }, view.location.origin);
    return () => {
      view.removeEventListener('message', onMessage);
      stopActions();
      stopDevice();
      stopAnchors();
      root.style.removeProperty('anchor-name');
      stopSync();
      play.dispose();
    };
  };

  return { render, wire, document, views, copies };
}
