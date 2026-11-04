// The canvas shows the scene that holds the selected node (KF-YZPBFH): a
// node selected inside an inactive TabNavigator tab is previewed with that
// tab active, so the person sees what they edit and can drop into it. The
// override is the canvas preview's own; the document never carries it.
import type { ViewDocument } from '@kerfjs/ui/view';

import { findNode, visitNodes } from './document.js';
import { setProp } from './edits.js';

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

/**
 * KF-SYGSD0: `document` with every DialogSurface `embedded`, as the edit
 * canvas shows it. A modal dialog renders nothing until something opens it,
 * so on the canvas it sits in flow where the author can see and select its
 * content; play mode keeps the authored presentation. The document itself
 * is unchanged, so the Inspector and the export keep `presentation`.
 */
export function embeddedDialogs(document: ViewDocument): ViewDocument {
  let shown = document;
  for (const { node } of visitNodes(document))
    if (node.type === DIALOG_SURFACE && node.props?.presentation !== 'embedded')
      shown = setProp(shown, node.id, 'presentation', 'embedded');
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
