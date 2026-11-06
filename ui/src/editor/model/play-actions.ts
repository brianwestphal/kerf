// Play mode's actions (KF-RF6RCS: host mock action handlers and the action
// log; docs/26-ui-editor.md §11.4, §11.5). A view's `$action`s are the
// application's to handle. In play mode the host may register a mock
// handler per action name; every action fired is logged in the editor.
import type { ViewDocument, ViewNode } from '@kerfjs/ui/view';

import { findNode, visitNodes } from './document.js';
import { setProp } from './edits.js';
import { NAV_STACK } from './play-state.js';
import { cutStack } from './shown-scenes.js';

/** What a host's mock handler is given. */
export interface PlayActionContext {
  /** The action's name, as the document's `$action` names it. */
  readonly action: string;
  /** The id of the node the action came from. */
  readonly nodeId: string;
  /** The DOM event that fired it. */
  readonly event: Event;
  /** The view's current param values. */
  readonly params: Readonly<Record<string, unknown>>;
  /** The playing view. */
  readonly view: PlayView;
}

/** The playing view, as a mock handler drives it. */
export interface PlayView {
  /** The view's root element, inside the play frame. */
  readonly root: HTMLElement;
  /** The play-time copy of the document. */
  readonly document: ViewDocument;
  /** The `data-key` of the row the action came from, if any. */
  readonly key?: string;
  /** Sets params; the view re-renders with them. */
  setParams(values: Readonly<Record<string, unknown>>): void;
  /**
   * A NavStack in the view, by its node's author name, its `id` prop, or its
   * node id: `push(viewKey)` shows one of the document's views for that
   * stack on top, and `pop()` goes back one.
   */
  navStack(name: string): PlayNavStack | undefined;
}

export interface PlayNavStack {
  push(viewKey: string): void;
  pop(): void;
}

/** A host's mock handler. Its throw (or rejection) is logged; the view runs on. */
export type PlayHandler = (context: PlayActionContext) => unknown;

/** Mock handlers by action name. */
export type PlayHandlers = Readonly<Record<string, PlayHandler>>;

/** Whether a handler ran, was missing, or threw. */
export type ActionOutcome = 'ran' | 'missing' | 'threw';

/** One fired action, as the action log lists it. */
export interface ActionLogEntry {
  readonly action: string;
  /** The node's author name, or its component and id. */
  readonly node: string;
  /** The DOM event's type. */
  readonly event: string;
  readonly outcome: ActionOutcome;
  /** A throw's message. */
  readonly message?: string;
}

/** The action log keeps this many entries, newest first. */
export const ACTION_LOG_CAP = 200;

/** `log` with `entry` added at the top, capped. */
export const logAction = (
  log: readonly ActionLogEntry[],
  entry: ActionLogEntry,
): readonly ActionLogEntry[] => [entry, ...log].slice(0, ACTION_LOG_CAP);

/** Every `$action` name anywhere in a value. */
function actionsIn(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) for (const item of value) actionsIn(item, into);
  else if (value && typeof value === 'object') {
    const action = (value as { $action?: unknown }).$action;
    if (typeof action === 'string') into.add(action);
    else for (const item of Object.values(value)) actionsIn(item, into);
  }
}

/**
 * The document's action names: what its `$action`s name. A component's own
 * `data-action` wiring (a literal action name) is not one.
 */
export function documentActions(
  document: ViewDocument,
  /** KF-85SCQD: composed documents its `#view`s render, whose actions join. */
  composed: Iterable<ViewDocument> = [],
): ReadonlySet<string> {
  const names = new Set<string>();
  for (const each of [document, ...composed])
    for (const { node } of visitNodes(each)) actionsIn(node.props, names);
  return names;
}

/** The NavStack `name` names: its author name, `id` prop, or node id. */
export function findNavStack(
  document: ViewDocument,
  name: string,
): ViewNode | undefined {
  return visitNodes(document).find(
    ({ node }) =>
      node.type === NAV_STACK &&
      (node.id === name || node.name === name || node.props?.id === name),
  )?.node;
}

const VIEW_ZONE = /^views\.(\d+)\.(.+)$/;

/**
 * NavStack `id` in the play copy with `viewKey` on top: cut back to it when
 * it is already in the stack, or else pushed from `original`, the document
 * as edited, with the zones it fills. Returns `play` when neither applies.
 */
export function pushView(
  play: ViewDocument,
  original: ViewDocument,
  id: string,
  viewKey: string,
): ViewDocument {
  const views = findNode(play, id)?.node.props?.views as
    readonly { key?: unknown }[] | undefined;
  if (!Array.isArray(views)) return play;
  const at = views.findIndex((view) => view.key === viewKey);
  if (at >= 0) return cutStack(play, id, at);
  const source = findNode(original, id)?.node;
  const sourceViews = source?.props?.views as
    readonly { key?: unknown }[] | undefined;
  const from = sourceViews?.findIndex((view) => view.key === viewKey) ?? -1;
  if (from < 0) return play;
  const next = setProp(play, id, 'views', [...views, sourceViews![from]!]);
  const node = findNode(next, id)!.node as { zones?: ViewNode['zones'] };
  const zones = { ...node.zones };
  for (const [key, children] of Object.entries(source!.zones ?? {})) {
    const match = VIEW_ZONE.exec(key);
    if (match && Number(match[1]) === from)
      zones[`views.${views.length}.${match[2]}`] = children;
  }
  node.zones = zones;
  return next;
}
