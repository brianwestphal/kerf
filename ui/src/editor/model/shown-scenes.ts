// The canvas shows the scene that holds the selected node (KF-YZPBFH): a
// node selected inside an inactive TabNavigator tab is previewed with that
// tab active, so the person sees what they edit and can drop into it. The
// override is the canvas preview's own; the document never carries it.
import type { ViewDocument } from '@kerfjs/ui/view';

import { findNode } from './document.js';
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
  return shown;
}
