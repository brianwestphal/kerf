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
import { setProp } from './edits.js';
import { cutStack } from './shown-scenes.js';

export const TAB_NAVIGATOR = '@kerfjs/ui:tab-navigator';
export const NAV_STACK = '@kerfjs/ui:nav-stack';
export const TAB_BAR = '@kerfjs/ui:tab-bar';
/** TabBarItem's catalog key. */
export const TAB_BAR_ITEM = '@kerfjs/ui:tabs';
export const WORKBENCH = '@kerfjs/ui:workbench';
export const COLLAPSIBLE_PANEL = '@kerfjs/ui:collapsible-panel';
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

/** NavStack `id`'s back control pops its top view. */
export function popView(document: ViewDocument, id: string): ViewDocument {
  const views = nodeOf(document, id, NAV_STACK)?.props?.views;
  return Array.isArray(views) && views.length > 1
    ? cutStack(document, id, views.length - 2)
    : document;
}

/**
 * TabBarItem `id` becomes its TabBar's selected tab: it is `selected`, and
 * every other TabBarItem placed directly in the same bar is not.
 */
export function selectTabBarItem(
  document: ViewDocument,
  id: string,
): ViewDocument {
  const visit = findNode(document, id);
  const bar = visit?.ancestors.at(-1)?.node;
  if (visit?.node.type !== TAB_BAR_ITEM || bar?.type !== TAB_BAR)
    return document;
  // The item sits in one of the bar's zones.
  const items = Object.values(bar.zones!).flatMap((children) =>
    children.filter(
      (child): child is ViewNode =>
        'type' in child && child.type === TAB_BAR_ITEM,
    ),
  );
  let next = document;
  for (const item of items) {
    const selected = item.id === id;
    if (Boolean(item.props?.selected) !== selected)
      next = setProp(next, item.id, 'selected', selected || undefined);
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
