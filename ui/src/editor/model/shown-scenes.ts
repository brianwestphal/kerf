// The canvas shows the scene that holds the selected node (KF-YZPBFH): a
// node selected inside an inactive TabNavigator tab is previewed with that
// tab active, so the person sees what they edit and can drop into it. The
// override is the canvas preview's own; the document never carries it.
import type { ViewDocument } from '@kerfjs/ui/view';

import { findNode, visitNodes } from './document.js';
import { setProp } from './edits.js';
import type { FieldPath } from './fields.js';

const TAB_NAVIGATOR = '@kerfjs/ui:tab-navigator';

/** A tab's content zone (`tabs.2.content`), capturing the tab's index. */
const TAB_CONTENT = /^tabs\.(\d+)\.content$/;

/**
 * `document` with each TabNavigator that holds `selected` in a tab's
 * content showing that tab, or `document` itself when nothing changes.
 */
export function shownScenes(
  document: ViewDocument,
  selected: string | undefined,
  /**
   * KF-RMZ2NP: the view each NavStack shows on the canvas, by node id, when
   * it is not the top one. The preview cuts the stack back to that view.
   */
  views: ReadonlyMap<string, number> = new Map(),
): ViewDocument {
  const visit =
    selected === undefined ? undefined : findNode(document, selected);
  let shown = document;
  for (const { node, zone } of visit?.ancestors ?? []) {
    const index = TAB_CONTENT.exec(zone)?.[1];
    if (node.type !== TAB_NAVIGATOR || index === undefined) continue;
    const tabs = node.props?.tabs;
    const id = Array.isArray(tabs)
      ? (tabs[Number(index)] as { id?: unknown } | undefined)?.id
      : undefined;
    if (typeof id === 'string' && node.props?.active !== id)
      shown = setProp(shown, node.id, 'active', id);
  }
  for (const [id, index] of views) shown = cutStack(shown, id, index);
  return shown;
}

const DIALOG_SURFACE = '@kerfjs/ui:surface-scaffold';
/** KF-T1V86Q: a non-modal popover dialog is transient the same way. */
const POPOVER_DIALOG_SURFACE =
  '@kerfjs/ui:surface-scaffold#PopoverDialogSurface';
/**
 * KF-ZWG0B2: a pinnable popover is a closed top-layer overlay until its
 * trigger opens it, so the canvas shows it embedded too.
 */
const PINNABLE_POPOVER_SURFACE =
  '@kerfjs/ui:surface-scaffold#PinnablePopoverSurface';
/** Composed dialogs that render a DialogSurface and take `embedded` (KF-RWJ9KD). */
const COMPOSED_DIALOGS = new Set([
  '@kerfjs/ui:workbench-dialog',
  '@kerfjs/ui:list-detail-dialog',
]);

/**
 * KF-SYGSD0: `document` with every DialogSurface `embedded` (and, KF-RWJ9KD,
 * every WorkbenchDialog and ListDetailDialog `embedded: true`; KF-T1V86Q,
 * every PopoverDialogSurface `embedded`; KF-ZWG0B2, every
 * PinnablePopoverSurface `embedded`), as the edit
 * canvas shows it. A modal dialog renders nothing until something opens it,
 * so on the canvas it sits in flow where the author can see and select its
 * content; play mode keeps the authored presentation. The document itself
 * is unchanged, so the Inspector and the export keep `presentation`.
 */
export function embeddedDialogs(document: ViewDocument): ViewDocument {
  let shown = document;
  for (const { node } of visitNodes(document))
    if (
      (node.type === DIALOG_SURFACE ||
        node.type === POPOVER_DIALOG_SURFACE ||
        node.type === PINNABLE_POPOVER_SURFACE) &&
      node.props?.presentation !== 'embedded'
    )
      shown = setProp(shown, node.id, 'presentation', 'embedded');
    else if (COMPOSED_DIALOGS.has(node.type) && node.props?.embedded !== true)
      shown = setProp(shown, node.id, 'embedded', true);
  return shown;
}

const NAV_STACK = '@kerfjs/ui:nav-stack';

/** A view's field zones (`views.2.content`), capturing the view's index. */
const VIEW_ZONE = /^views\.(\d+)\./;

/**
 * `document` with NavStack `id` cut back to view `index`: the later views and
 * their zones leave the preview, so `index` is the stack's top. Unchanged
 * when `id` is no NavStack or `index` is not one of its lower views.
 */
export function cutStack(
  document: ViewDocument,
  id: string,
  index: number,
): ViewDocument {
  const node = findNode(document, id)?.node;
  const views = node?.props?.views;
  if (
    node?.type !== NAV_STACK ||
    !Array.isArray(views) ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= views.length - 1
  )
    return document;
  const next = setProp(document, id, 'views', views.slice(0, index + 1));
  const cut = findNode(next, id)!.node as { zones?: Record<string, unknown> };
  if (cut.zones)
    cut.zones = Object.fromEntries(
      Object.entries(cut.zones).filter(
        ([key]) => Number(VIEW_ZONE.exec(key)?.[1] ?? -1) <= index,
      ),
    );
  return next;
}

/** KF-KN9CPE: the transient popups a selected node previews open. */
const POPUPS = new Set(['@kerfjs/ui:popup-menu', '@kerfjs/ui:select']);
const POPUP_MENU = '@kerfjs/ui:popup-menu';

/**
 * KF-KN9CPE: `document` with the selected PopupMenu or Select `embedded`, as
 * the edit canvas shows it, or `document` itself when nothing changes. A
 * popup renders only its trigger until something opens it, so while the
 * node is selected the canvas shows its rows (`items`, `choices`) open at
 * the trigger, in the document rather than the top layer, where the
 * Inspector's edits to them can be seen.
 * Only the selected one opens: an open menu on every toolbar trigger would
 * cover the canvas below every toolbar. The document is unchanged, so the
 * Inspector and the export keep the authored props, and play mode keeps the
 * real popup.
 */
export function embeddedPopup(
  document: ViewDocument,
  selected: string | undefined,
  /**
   * KF-M2FGPQ: the Inspector's open field place on the selected node. One
   * inside a PopupMenu item's `submenu` (`items.2.submenu…`) shows that
   * submenu open beside its item too, so its rows can be seen while they
   * are edited.
   */
  field?: { readonly prop: string; readonly path: FieldPath },
): ViewDocument {
  const node =
    selected === undefined ? undefined : findNode(document, selected)?.node;
  if (!node || !POPUPS.has(node.type)) return document;
  const submenu =
    node.type === POPUP_MENU && field?.prop === 'items'
      ? submenuPath(field.path)
      : [];
  let shown =
    node.props?.embedded === true
      ? document
      : setProp(document, node.id, 'embedded', true);
  if (submenu.length > 0)
    shown = setProp(shown, node.id, 'embeddedSubmenu', submenu);
  return shown;
}

/**
 * KF-M2FGPQ: the submenu path (`embeddedSubmenu`) a field place in a
 * PopupMenu's `items` lies inside: each item index followed by `submenu`.
 * `[2, 'submenu', 0, 'label']` is inside the third item's submenu, `[2]`
 * (the item itself) inside none.
 */
export function submenuPath(path: FieldPath): number[] {
  const out: number[] = [];
  for (let at = 0; at + 1 < path.length; at += 2) {
    const index = path[at];
    if (typeof index !== 'number' || path[at + 1] !== 'submenu') break;
    out.push(index);
  }
  return out;
}
