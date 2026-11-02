// Play mode's state transitions (KF-60BEEJ: play mode core;
// docs/26-ui-editor.md §11.4). Kerf UI's interactive components are
// controlled: their `wire…` helpers report intent and the application
// re-renders with new props. In play mode the editor is that application:
// each transition here maps one reported intent onto the play-time copy of
// the document, which is discarded on exit. The edited document is never
// changed. Each returns `document` itself when nothing applies.
import type {
  ViewChild,
  ViewDocument,
  ViewNode,
  ViewValue,
} from '@kerfjs/ui/view';

import {
  reorderTabs,
  type TabReorder,
} from '../../components/navigation/tab-bar/wiring/wire-tab-bars.js';
import { findNode, visitNodes } from './document.js';
import { removeNode, setProp } from './edits.js';
import {
  type RowKey,
  rowPath,
  type RowProps,
  type RowState,
  setRowProps,
} from './play-values.js';
import { cutStack } from './shown-scenes.js';

export const TAB_NAVIGATOR = '@kerfjs/ui:tab-navigator';
export const NAV_STACK = '@kerfjs/ui:nav-stack';
export const TAB_BAR = '@kerfjs/ui:tab-bar';
/** TabBarItem's catalog key. */
export const TAB_BAR_ITEM = '@kerfjs/ui:tabs';
export const WORKBENCH = '@kerfjs/ui:workbench';
export const COLLAPSIBLE_PANEL = '@kerfjs/ui:collapsible-panel';
export const SPLIT_VIEW = '@kerfjs/ui:split-view';
/** ResizableRegion's catalog key. */
export const RESIZABLE_REGION = '@kerfjs/ui:resize';
export const LIST_ITEM = '@kerfjs/ui:list-item';
const PANEL_TOGGLE = '@kerfjs/ui:collapsible-panel#CollapsiblePanelToggle';
const PANEL_RELOCATED =
  '@kerfjs/ui:collapsible-panel#CollapsiblePanelRelocated';

/** A Workbench's collapsible panels, keyed like its props. */
export const WORKBENCH_PANELS = [
  'leftRail',
  'rightRail',
  'bottomDrawer',
] as const;
export type WorkbenchPanelKey = (typeof WORKBENCH_PANELS)[number];

const nodeOf = (document: ViewDocument, id: string, type: string) => {
  const node = findNode(document, id)?.node;
  return node?.type === type ? node : undefined;
};

/** TabNavigator `id` shows the tab with `tabId`. */
export function selectTab(
  document: ViewDocument,
  id: string,
  tabId: string,
): ViewDocument {
  const node = nodeOf(document, id, TAB_NAVIGATOR);
  if (!node || node.props?.active === tabId) return document;
  return setProp(document, id, 'active', tabId);
}

/**
 * KF-BFE3EC: the play copy a played view starts from. Every NavStack opens
 * at its first (root) view, the way an app launches; a mock handler pushes
 * the rest from the edited document (`view.navStack(name).push(key)`). The
 * later views' zones leave with them, and with those any NavStack nested in
 * them. Returns `document` itself when every stack already shows its root.
 */
export function rootViews(document: ViewDocument): ViewDocument {
  let next = document;
  for (const { node } of visitNodes(document))
    if (node.type === NAV_STACK) next = cutStack(next, node.id, 0);
  return next;
}

/** NavStack `id`'s back control pops its top view. */
export function popView(document: ViewDocument, id: string): ViewDocument {
  const views = nodeOf(document, id, NAV_STACK)?.props?.views;
  return Array.isArray(views) && views.length > 1
    ? cutStack(document, id, views.length - 2)
    : document;
}

/** A TabBar's items: the nodes placed in it, and each `$each` template. */
function barItems(bar: ViewNode) {
  return Object.values(bar.zones ?? {}).flatMap((children) =>
    children.flatMap((child) => {
      const node = '$each' in child ? child.template : child;
      return 'type' in node && node.type === TAB_BAR_ITEM
        ? [{ node, repeated: '$each' in child }]
        : [];
    }),
  );
}

/**
 * A repeated TabBarItem's rows with none selected: the rows inside outer row
 * `outer` (a row path; KF-ZMBST3), or every row when `outer` is undefined.
 * Then row `selected`, when given, is selected. Rows keep their other props.
 */
function deselectRows(
  state: RowState | undefined,
  outer: readonly string[] | undefined,
  selected: readonly string[] | undefined,
): RowState {
  const { every = {}, under = {}, keys = {} } = state ?? {};
  const inScope = (path: string) => {
    if (!outer) return true;
    const parts = JSON.parse(path) as string[];
    return (
      parts.length === outer.length + 1 &&
      outer.every((part, at) => parts[at] === part)
    );
  };
  const nextKeys = Object.fromEntries(
    Object.entries(keys).map(([path, props]) => [
      path,
      inScope(path)
        ? Object.fromEntries(
            Object.entries(props).filter(([prop]) => prop !== 'selected'),
          )
        : props,
    ]),
  );
  if (selected)
    nextKeys[rowPath(selected)] = {
      ...nextKeys[rowPath(selected)],
      selected: true,
    };
  return outer && outer.length > 0
    ? {
        every,
        under: { ...under, [rowPath(outer)]: { selected: false } },
        keys: nextKeys,
      }
    : { every: { ...every, selected: false }, under, keys: nextKeys };
}

/**
 * TabBarItem `id` becomes its TabBar's selected tab: it is `selected`, and
 * every other TabBarItem in the same bar is not. A TabBarItem repeated by
 * `$each` (KF-XV732Q) keeps its selection per row, in `rows`: `key` is the
 * selected row's, and every other row of every repeated item in the bar is
 * not selected. KF-ZMBST3: a bar repeated inside an outer row is one bar per
 * outer row, so `key`'s path scopes that to the selected row's outer row;
 * the other outer rows' bars keep their selection. Returns the inputs
 * themselves when nothing applies.
 */
export function selectTabBarItem(
  document: ViewDocument,
  id: string,
  rows: RowProps = {},
  key?: RowKey,
): { document: ViewDocument; rows: RowProps } {
  const visit = findNode(document, id);
  const bar = visit?.ancestors.at(-1)?.node;
  if (visit?.node.type !== TAB_BAR_ITEM || bar?.type !== TAB_BAR)
    return { document, rows };
  const repeated = visit.repeated && key !== undefined;
  const path = typeof key === 'string' ? [key] : key;
  let next = document;
  let nextRows = rows;
  for (const item of barItems(bar)) {
    if (item.repeated) {
      nextRows = setRowProps(
        nextRows,
        item.node.id,
        deselectRows(
          nextRows[item.node.id],
          repeated ? path!.slice(0, -1) : undefined,
          repeated && item.node.id === id ? path! : undefined,
        ),
      );
      continue;
    }
    const selected = !repeated && item.node.id === id;
    if (Boolean(item.node.props?.selected) !== selected)
      next = setProp(next, item.node.id, 'selected', selected || undefined);
  }
  return { document: next, rows: nextRows };
}

/**
 * TabBarItem `id`, placed directly in its TabBar, closes: it leaves the play
 * copy, and when it was selected the next item (or else the previous one)
 * becomes selected. A repeated item closes through its `$each` source
 * instead (`closeRow`). Returns `document` when nothing applies.
 */
export function closeTabBarItem(
  document: ViewDocument,
  id: string,
): ViewDocument {
  const visit = findNode(document, id);
  const bar = visit?.ancestors.at(-1)?.node;
  if (
    visit?.node.type !== TAB_BAR_ITEM ||
    bar?.type !== TAB_BAR ||
    visit.repeated
  )
    return document;
  const placed = barItems(bar).filter((item) => !item.repeated);
  const at = placed.findIndex((item) => item.node.id === id);
  let next = removeNode(document, id);
  if (visit.node.props?.selected === true) {
    const neighbor = placed[at + 1] ?? placed[at - 1];
    if (neighbor) next = setProp(next, neighbor.node.id, 'selected', true);
  }
  return next;
}

/**
 * A TabBar's draggable tab moves (by drag, or Alt+Shift+Arrow): its items
 * reorder in the bar whose `id` prop is `change.barId`, matched by their
 * `id` props.
 */
export function reorderTabBarItems(
  document: ViewDocument,
  change: Pick<TabReorder, 'barId' | 'sourceId' | 'targetId' | 'position'>,
): ViewDocument {
  const next = globalThis.structuredClone(document);
  const bar = visitNodes(next).find(
    ({ node }) => node.type === TAB_BAR && node.props?.id === change.barId,
  )?.node;
  const tabs = bar?.zones?.tabs;
  if (!tabs) return document;
  const idOf = (child: ViewChild) =>
    'type' in child ? String(child.props?.id ?? '') : '';
  const reordered = reorderTabs(
    tabs,
    idOf,
    change.sourceId,
    change.targetId,
    change.position,
  );
  if (reordered.every((child, index) => child === tabs[index])) return document;
  (bar as { zones: Record<string, readonly ViewChild[]> }).zones = {
    ...bar.zones,
    tabs: reordered,
  };
  return next;
}

/** Workbench `id`'s `panel` is collapsed or not. */
export function setWorkbenchPanelCollapsed(
  document: ViewDocument,
  id: string,
  panel: WorkbenchPanelKey,
  collapsed: boolean,
): ViewDocument {
  const value = nodeOf(document, id, WORKBENCH)?.props?.[panel];
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return document;
  const current = value as Record<string, ViewValue>;
  if (Boolean(current.collapsed) === collapsed) return document;
  return setProp(document, id, panel, { ...current, collapsed });
}

/**
 * The CollapsiblePanel whose `id` prop is `panelId` is collapsed or not,
 * with every toggle and relocated toolbar that names it, so each shows the
 * same state.
 */
export function setSidebarCollapsed(
  document: ViewDocument,
  panelId: string,
  collapsed: boolean,
): ViewDocument {
  let next = document;
  for (const { node } of visitNodes(document)) {
    const names =
      node.type === COLLAPSIBLE_PANEL
        ? node.props?.id === panelId
        : (node.type === PANEL_TOGGLE || node.type === PANEL_RELOCATED) &&
          node.props?.panelId === panelId;
    if (names && Boolean(node.props?.collapsed) !== collapsed)
      next = setProp(next, node.id, 'collapsed', collapsed);
  }
  return next;
}

/**
 * The `data-action` values that toggle the CollapsiblePanel whose `id` prop
 * is `panelId`: its own toolbar toggle's and each CollapsiblePanelToggle's
 * that names it.
 */
export function sidebarToggleActions(
  document: ViewDocument,
  panelId: string,
): string[] {
  const actions = new Set<string>();
  for (const { node } of visitNodes(document)) {
    if (node.type === COLLAPSIBLE_PANEL && node.props?.id === panelId) {
      const toggle = (
        node.props.toolbar as { toggle?: { action?: unknown } } | undefined
      )?.toggle?.action;
      if (typeof toggle === 'string') actions.add(toggle);
    }
    if (
      node.type === PANEL_TOGGLE &&
      node.props?.panelId === panelId &&
      typeof node.props.action === 'string'
    )
      actions.add(node.props.action);
  }
  return [...actions];
}

/** Workbench `id`'s resizable `panel` takes `size` (KF-XV732Q). */
export function setWorkbenchPanelSize(
  document: ViewDocument,
  id: string,
  panel: WorkbenchPanelKey,
  size: number,
): ViewDocument {
  const value = nodeOf(document, id, WORKBENCH)?.props?.[panel];
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return document;
  const current = value as Record<string, ViewValue>;
  if (current.size === size) return document;
  return setProp(document, id, panel, { ...current, size });
}

/**
 * The ResizableRegion whose region id is `regionId` takes `size`: a
 * ResizableRegion node whose `id` prop it is, or the resizable list of the
 * SplitView whose `id` prop is its prefix (SplitView renders its list
 * region as `<id>-list`).
 */
export function setRegionSize(
  document: ViewDocument,
  regionId: string,
  size: number,
): ViewDocument {
  for (const { node } of visitNodes(document)) {
    if (node.type === RESIZABLE_REGION && node.props?.id === regionId)
      return node.props.size === size
        ? document
        : setProp(document, node.id, 'size', size);
    const resizable = node.props?.resizable;
    if (
      node.type === SPLIT_VIEW &&
      `${String(node.props?.id)}-list` === regionId &&
      resizable &&
      typeof resizable === 'object' &&
      !Array.isArray(resizable)
    ) {
      const current = resizable as Record<string, ViewValue>;
      return current.size === size
        ? document
        : setProp(document, node.id, 'resizable', { ...current, size });
    }
  }
  return document;
}

/**
 * Every SplitView whose `compact` is not an expression follows the played
 * device: `compact` is the frame's `deviceClass().compact`, as the
 * component asks an app to derive it. Leaving compact drops a pushed
 * detail.
 */
export function followCompact(
  document: ViewDocument,
  compact: boolean,
): ViewDocument {
  let next = document;
  for (const { node } of visitNodes(document)) {
    if (node.type !== SPLIT_VIEW) continue;
    const current = node.props?.compact;
    if (current !== undefined && typeof current !== 'boolean') continue;
    if (Boolean(current) === compact) continue;
    next = setProp(next, node.id, 'compact', compact || undefined);
    if (!compact && node.props?.detailActive === true)
      next = setProp(next, node.id, 'detailActive', undefined);
  }
  return next;
}

/** SplitView `id` shows its detail over the list (compact) or not. */
export function setDetailActive(
  document: ViewDocument,
  id: string,
  active: boolean,
): ViewDocument {
  const node = nodeOf(document, id, SPLIT_VIEW);
  if (!node || Boolean(node.props?.detailActive) === active) return document;
  return setProp(document, id, 'detailActive', active || undefined);
}

/**
 * ListItem `id`, placed in a list, becomes its list's selected row: it is
 * `selected`, and every other ListItem placed beside it is not.
 */
export function selectListItem(
  document: ViewDocument,
  id: string,
): ViewDocument {
  const visit = findNode(document, id);
  const parent = visit?.ancestors.at(-1);
  if (visit?.node.type !== LIST_ITEM || !parent || visit.repeated)
    return document;
  let next = document;
  for (const child of parent.node.zones![parent.zone]!) {
    if (!('type' in child) || child.type !== LIST_ITEM) continue;
    const selected = child.id === id;
    if (Boolean(child.props?.selected) !== selected)
      next = setProp(next, child.id, 'selected', selected || undefined);
  }
  return next;
}
